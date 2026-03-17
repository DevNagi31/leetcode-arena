const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  educationLevel: { type: String, required: true, enum: ['High School', 'Undergraduate', 'Graduate', 'PhD', 'Bootcamp', 'Self-Taught', 'Other'] },
  country: { type: String, required: true },
  institutionName: { type: String, required: true },
  year: { type: String, required: true },
  leetcodeUsername: { type: String, required: true },
  leetcodeVerified: { type: Boolean, default: false },
  avatar: { type: String, default: '🎮' },
  score: { type: Number, default: 0 },
  problems: { type: Number, default: 0 },
  easy: { type: Number, default: 0 },
  medium: { type: Number, default: 0 },
  hard: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  rank: { type: Number, default: null },
  totalActiveDays: { type: Number, default: 0 },
  ranking: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  lastSynced: { type: Date, default: null },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },

  // Friends
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Activity Tracking
  activityDates: [{
    date: { type: String, required: true },
    problemsSolved: { type: Number, default: 0 },
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 }
  }],

  // Weekly Goal
  weeklyGoal: {
    target: { type: Number, default: 5 },
    current: { type: Number, default: 0 },
    weekStart: { type: Date, default: Date.now }
  },

  // Email Reminders
  emailReminders: {
    enabled: { type: Boolean, default: false },
    time: { type: String, default: '09:00' },
    timezone: { type: String, default: 'UTC' },
    lastSent: { type: Date, default: null }
  }
});

module.exports = mongoose.model('User', UserSchema);
