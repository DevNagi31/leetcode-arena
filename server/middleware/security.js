const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 100, // relaxed in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 50 : 5, // relaxed in development
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// LeetCode verification rate limiter
const leetcodeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: 'Too many LeetCode verification requests, please try again later.',
});

module.exports = {
  apiLimiter,
  authLimiter,
  leetcodeLimiter
};
