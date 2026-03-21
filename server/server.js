require('dotenv').config({ path: './server/.env' });
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { apiLimiter } = require('./middleware/security');
const Message = require('./models/Message');

// Validate required env vars
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Exiting.');
  process.exit(1);
}

const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000'];

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leetcode-arena';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('FATAL: MongoDB connection failed:', err.message);
    process.exit(1);
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

// Socket.io JWT authentication
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Socket.io for real-time chat
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  io.emit('user_status', { userId, online: true });

  socket.on('send_message', async (data) => {
    try {
      const { to, content } = data;

      const message = new Message({ from: userId, to, content });
      await message.save();

      const recipientSocketId = onlineUsers.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', {
          _id: message._id, from: userId, to, content, createdAt: message.createdAt
        });
      }

      socket.emit('message_sent', {
        _id: message._id, from: userId, to, content, createdAt: message.createdAt
      });
    } catch (error) {
      console.error('Send message error:', error);
    }
  });

  socket.on('typing', (data) => {
    const recipientSocketId = onlineUsers.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_typing', { from: userId });
    }
  });

  socket.on('stop_typing', (data) => {
    const recipientSocketId = onlineUsers.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_stopped_typing', { from: userId });
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('user_status', { userId, online: false });
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

module.exports = app;
