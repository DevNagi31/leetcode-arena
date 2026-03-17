require('dotenv').config({ path: './server/.env' });
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const socketIo = require('socket.io');
const { apiLimiter } = require('./middleware/security');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leetcode-arena';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Error:', err.message);
  });

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/universities', require('./routes/university'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/snippets', require('./routes/snippets'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/leetcode', require('./routes/leetcode'));

// Socket.io for real-time chat
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('user_status', { userId, online: true });
  });

  socket.on('send_message', async (data) => {
    try {
      const { to, from, content } = data;
      const Message = require('./models/Message');

      const message = new Message({ from, to, content });
      await message.save();

      const recipientSocketId = onlineUsers.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', {
          _id: message._id, from, to, content, createdAt: message.createdAt
        });
      }

      socket.emit('message_sent', {
        _id: message._id, from, to, content, createdAt: message.createdAt
      });
    } catch (error) {
      console.error('Send message error:', error);
    }
  });

  socket.on('typing', (data) => {
    const recipientSocketId = onlineUsers.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_typing', { from: data.from });
    }
  });

  socket.on('stop_typing', (data) => {
    const recipientSocketId = onlineUsers.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_stopped_typing', { from: data.from });
    }
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user_status', { userId, online: false });
        break;
      }
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});

server.maxHeadersCount = 0;
server.headersTimeout = 120000;

module.exports = app;
