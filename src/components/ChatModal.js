import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { User, MessageCircle, Send, X as XIcon } from 'lucide-react';

export default function ChatModal({ friend, currentUser, onClose, showToast }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/messages/${friend._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;
        setMessages(data.messages || data || []);
      } catch (error) {
        // Silently fail - will retry on next poll
      }
    };

    fetchMessages();

    const newSocket = io(window.location.origin, {
      auth: { token }
    });
    setSocket(newSocket);

    newSocket.on('receive_message', (message) => {
      if (message.from === friend._id) {
        setMessages(prev => {
          if (prev.find(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }
    });

    newSocket.on('message_sent', (message) => {
      setMessages(prev => {
        const withoutOptimistic = prev.filter(m => typeof m._id !== 'number');
        if (withoutOptimistic.find(m => m._id === message._id)) return withoutOptimistic;
        return [...withoutOptimistic, message];
      });
    });

    newSocket.on('user_typing', (data) => {
      if (data.from === friend._id) setIsTyping(true);
    });

    newSocket.on('user_stopped_typing', (data) => {
      if (data.from === friend._id) setIsTyping(false);
    });

    const pollInterval = setInterval(fetchMessages, 30000);

    return () => {
      clearInterval(pollInterval);
      newSocket.disconnect();
    };
  }, [friend._id, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      if (socket) {
        socket.emit('send_message', {
          to: friend._id,
          content: newMessage.trim()
        });
      } else {
        await axios.post('/api/messages/send', {
          to: friend._id,
          content: newMessage.trim()
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      const tempMessage = {
        _id: Date.now(),
        from: currentUser._id || currentUser.id,
        to: friend._id,
        content: newMessage.trim(),
        createdAt: new Date()
      };
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      showToast('Failed to send message', 'error');
    }
  };

  const handleTyping = () => {
    if (!socket) return;
    socket.emit('typing', { to: friend._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { to: friend._id });
    }, 2000);
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDateSeparator = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const shouldShowDate = (msg, idx) => {
    if (idx === 0) return true;
    const prev = new Date(messages[idx - 1].createdAt).toDateString();
    const curr = new Date(msg.createdAt).toDateString();
    return prev !== curr;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <div className="chat-avatar"><User size={20} /></div>
          <div style={{ flex: 1 }}>
            <h3>{friend.username}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {friend.country} • {friend.institutionName?.split(' ').slice(0, 3).join(' ')}
            </p>
          </div>
          <button className="chat-close-btn" onClick={onClose}><XIcon size={20} /></button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <MessageCircle size={48} strokeWidth={1.5} />
              <h4>Start a conversation</h4>
              <p>Send a message to {friend.username}</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = (msg.from?._id || msg.from)?.toString() === (currentUser._id || currentUser.id)?.toString();
              return (
                <React.Fragment key={msg._id || idx}>
                  {shouldShowDate(msg, idx) && (
                    <div className="chat-date-separator">
                      <span>{formatDateSeparator(msg.createdAt)}</span>
                    </div>
                  )}
                  <div className={`chat-message ${isMe ? 'chat-message-me' : 'chat-message-them'}`}>
                    <div className={`chat-bubble ${isMe ? 'bubble-me' : 'bubble-them'}`}>
                      <p>{msg.content}</p>
                      <span className="chat-time">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          {isTyping && (
            <div className="chat-message chat-message-them">
              <div className="chat-bubble bubble-them typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <div className="chat-input-wrapper">
            <input
              type="text"
              className="chat-input"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value.slice(0, 1000))}
              onKeyDown={handleTyping}
              autoFocus
              maxLength={1000}
            />
            {newMessage.length > 900 && (
              <span className="chat-char-count">{newMessage.length}/1000</span>
            )}
          </div>
          <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
