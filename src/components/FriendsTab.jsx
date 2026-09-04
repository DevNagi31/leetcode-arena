import React, { useState, useEffect } from 'react';
import { User, Users, UserPlus, Search, Flame, MessageCircle } from 'lucide-react';
import { authGet, authPost, authDelete } from '../utils/api';
import { FriendCardSkeleton } from './LoadingSkeleton';
import FriendProfileModal from './FriendProfileModal';
import ChatModal from './ChatModal';

export default function FriendsTab({ currentUser, showToast }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('friends');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [chatFriend, setChatFriend] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  const fetchFriends = async () => {
    try {
      const r = await authGet('/friends');
      setFriends(Array.isArray(r.data) ? r.data : []);
    } catch (e) { /* silently fail */ }
    finally { setLoading(false); }
  };

  const fetchRequests = async () => {
    try {
      const r = await authGet('/friends/requests');
      setRequests(Array.isArray(r.data) ? r.data : []);
    } catch (e) { /* silently fail */ }
  };

  const fetchUnreadCounts = async () => {
    try {
      // The endpoint returns an object keyed by sender id ({ "<id>": 3 }).
      // This used to call .forEach on it as if it were an array, which threw
      // and was swallowed — so unread badges never appeared at all.
      const r = await authGet('/messages/unread/count');
      setUnreadCounts(r.data && typeof r.data === 'object' ? r.data : {});
    } catch (e) { /* silently fail */ }
  };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
    fetchUnreadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await authGet(`/friends/search/${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(r.data);
    } catch (e) { showToast('Search failed', 'error'); }
    finally { setSearching(false); }
  };

  const handleSendRequest = async (username) => {
    try {
      await authPost('/friends/send', { username });
      showToast(`Friend request sent to ${username}!`, 'success');
      setSearchResults(prev => prev.filter(u => u.username !== username));
    } catch (e) { showToast(e.response?.data?.message || 'Failed to send request', 'error'); }
  };

  const handleAccept = async (requestId) => {
    try {
      await authPost(`/friends/accept/${requestId}`);
      showToast('Friend request accepted!', 'success');
      fetchFriends();
      fetchRequests();
    } catch (e) { showToast('Failed to accept request', 'error'); }
  };

  const handleDecline = async (requestId) => {
    try {
      await authPost(`/friends/decline/${requestId}`);
      showToast('Request declined', 'info');
      fetchRequests();
    } catch (e) { showToast('Failed to decline request', 'error'); }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await authDelete(`/friends/${friendId}`);
      showToast('Friend removed', 'info');
      setUnreadCounts(prev => { const next = { ...prev }; delete next[friendId]; return next; });
      fetchFriends();
    } catch (e) { showToast('Failed to remove friend', 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['friends', 'requests', 'search'].map(section => (
          <button key={section} className={`pixel-button ${activeSection === section ? 'primary' : ''}`}
            onClick={() => setActiveSection(section)} style={{ position: 'relative' }}>
            {section === 'friends' && <><Users size={14} /> MY FRIENDS ({friends.length})</>}
            {section === 'requests' && <><UserPlus size={14} /> REQUESTS {requests.length > 0 && <span className="notif-badge">{requests.length}</span>}</>}
            {section === 'search' && <><Search size={14} /> FIND FRIENDS</>}
          </button>
        ))}
      </div>

      {activeSection === 'friends' && (
        <div>
          {loading ? (
            <FriendCardSkeleton />
          ) : friends.length === 0 ? (
            <div className="empty-state">
              <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3>No friends yet!</h3>
              <p>Search for friends to add them</p>
              <button className="pixel-button primary" style={{ marginTop: '16px' }} onClick={() => setActiveSection('search')}>
                <Search size={14} /> FIND FRIENDS
              </button>
            </div>
          ) : (
            <div className="friends-list">
              {friends.map(friend => (
                <div key={friend._id} className="friend-card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setSelectedFriend(friend)}>
                  <div className="friend-avatar">
                    <User size={24} />
                    {unreadCounts[friend._id] > 0 && (
                      <span className="unread-badge">{unreadCounts[friend._id]}</span>
                    )}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name">{friend.username}</div>
                    <div className="friend-meta">{friend.country} • {friend.institutionName?.split(' ').slice(0,3).join(' ')}</div>
                    <div className="friend-stats">
                      <span className="friend-stat"><Flame size={12} /> {friend.currentStreak || 0} streak</span>
                      <span className="friend-stat" style={{ color: '#4CAF50' }}>E: {friend.easy || 0}</span>
                      <span className="friend-stat" style={{ color: '#FF9800' }}>M: {friend.medium || 0}</span>
                      <span className="friend-stat" style={{ color: '#F44336' }}>H: {friend.hard || 0}</span>
                      <span className="friend-stat">Total: {friend.problems || 0}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="pixel-button primary" style={{ fontSize: '11px', padding: '6px 12px' }}
                      onClick={(e) => { e.stopPropagation(); setUnreadCounts(prev => ({ ...prev, [friend._id]: 0 })); setChatFriend(friend); }}>
                      <MessageCircle size={12} />
                    </button>
                    <button className="pixel-button" style={{ fontSize: '11px', padding: '6px 12px' }}
                      onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend._id); }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <div className="empty-state">
              <UserPlus size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3>No pending requests</h3>
              <p>When someone sends you a friend request, it'll appear here</p>
            </div>
          ) : (
            <div className="friends-list">
              {requests.map(req => (
                <div key={req._id} className="friend-card">
                  <div className="friend-avatar"><User size={24} /></div>
                  <div className="friend-info">
                    <div className="friend-name">{req.from.username}</div>
                    <div className="friend-meta">{req.from.country} • {req.from.problems} problems solved</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="pixel-button primary" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => handleAccept(req._id)}>Accept</button>
                    <button className="pixel-button" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => handleDecline(req._id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'search' && (
        <div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input type="text" className="pixel-input" placeholder="Search by username..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1 }} />
            <button type="submit" className="pixel-button primary" disabled={searching}>
              <Search size={14} /> {searching ? 'SEARCHING...' : 'SEARCH'}
            </button>
          </form>
          {searchResults.length === 0 && searchQuery && !searching && (
            <div className="empty-state"><p>No users found for "{searchQuery}"</p></div>
          )}
          <div className="friends-list">
            {searchResults.map(user => (
              <div key={user._id} className="friend-card">
                <div className="friend-avatar"><User size={24} /></div>
                <div className="friend-info">
                  <div className="friend-name">{user.username}</div>
                  <div className="friend-meta">{user.country} • {user.institutionName?.split(' ').slice(0,3).join(' ')}</div>
                  <div className="friend-stats">
                    <span className="friend-stat" style={{ color: '#4CAF50' }}>E: {user.easy || 0}</span>
                    <span className="friend-stat" style={{ color: '#FF9800' }}>M: {user.medium || 0}</span>
                    <span className="friend-stat" style={{ color: '#F44336' }}>H: {user.hard || 0}</span>
                    <span className="friend-stat">Total: {user.problems || 0}</span>
                  </div>
                </div>
                <button className="pixel-button primary" style={{ fontSize: '11px', padding: '6px 12px' }}
                  onClick={() => handleSendRequest(user.username)}>
                  <UserPlus size={12} /> ADD
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedFriend && (
        <FriendProfileModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onMessage={(friend) => {
            setSelectedFriend(null);
            setUnreadCounts(prev => ({ ...prev, [friend._id]: 0 }));
            setChatFriend(friend);
          }}
          onRemove={(friendId) => {
            handleRemoveFriend(friendId);
            setSelectedFriend(null);
          }}
        />
      )}

      {chatFriend && (
        <ChatModal
          friend={chatFriend}
          currentUser={currentUser}
          onClose={() => { setChatFriend(null); fetchUnreadCounts(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
