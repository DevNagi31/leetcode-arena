require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const path = require('path');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { apiLimiter } = require('./middleware/security');
const Message = require('./models/Message');
const User = require('./models/User');

// Validate required env vars
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Exiting.');
  process.exit(1);
}

const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000'];

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
    next();
  });
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
}));
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ limit: '100kb', extended: false }));
app.disable('x-powered-by');

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// MongoDB Connection with auto-reconnect
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leetcode-arena';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('FATAL: MongoDB connection failed:', err.message);
    process.exit(1);
  });

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting reconnect...');
});

// Health check
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', db: dbState, timestamp: new Date().toISOString() });
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

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
  });
}

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

// Socket.io rate limiting
const socketRateLimit = new Map();
const SOCKET_MSG_LIMIT = 20; // max messages per window
const SOCKET_MSG_WINDOW = 10000; // 10 seconds

const checkSocketRateLimit = (userId) => {
  const now = Date.now();
  const userLog = socketRateLimit.get(userId) || [];
  const recent = userLog.filter(t => now - t < SOCKET_MSG_WINDOW);
  if (recent.length >= SOCKET_MSG_LIMIT) return false;
  recent.push(now);
  socketRateLimit.set(userId, recent);
  return true;
};

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, log] of socketRateLimit) {
    const recent = log.filter(t => now - t < SOCKET_MSG_WINDOW);
    if (recent.length === 0) socketRateLimit.delete(userId);
    else socketRateLimit.set(userId, recent);
  }
}, 30000);

// Socket.io for real-time chat
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  io.emit('user_status', { userId, online: true });

  socket.on('send_message', async (data) => {
    try {
      const { to, content } = data;

      // Rate limit
      if (!checkSocketRateLimit(userId)) return;

      // Validate content
      if (!content || typeof content !== 'string' || !content.trim() || content.trim().length > 1000) {
        return;
      }

      // Verify friendship
      const sender = await User.findById(userId).select('friends');
      if (!sender || !sender.friends.some(f => f.toString() === to)) {
        return;
      }

      const trimmed = content.trim();
      const message = new Message({ from: userId, to, content: trimmed });
      await message.save();

      const recipientSocketId = onlineUsers.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', {
          _id: message._id, from: userId, to, content: trimmed, createdAt: message.createdAt
        });
      }

      socket.emit('message_sent', {
        _id: message._id, from: userId, to, content: trimmed, createdAt: message.createdAt
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
