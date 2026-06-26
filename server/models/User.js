const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  educationLevel: { type: String, required: true, enum: ['High School', 'Undergraduate', 'Graduate', 'PhD', 'Bootcamp', 'Self-Taught', 'Other'] },
  country: { type: String, required: true },
  institutionName: { type: String, required: true },
  year: { type: String, required: true },
  leetcodeUsername: { type: String, required: true, unique: true, trim: true },
  score: { type: Number, default: 0 },
  problems: { type: Number, default: 0 },
  easy: { type: Number, default: 0 },
  medium: { type: Number, default: 0 },
  hard: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  totalActiveDays: { type: Number, default: 0 },
  ranking: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
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

  // Email Verification
  emailVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpiry: { type: Date },

  // Password Reset
  resetCode: { type: String },
  resetCodeExpiry: { type: Date },

  // Email Reminders
  emailReminders: {
    enabled: { type: Boolean, default: false },
    time: { type: String, default: '09:00' },
    timezone: { type: String, default: 'UTC' },
    lastSent: { type: Date, default: null }
  }
});

UserSchema.index({ score: -1 });
UserSchema.index({ country: 1, score: -1 });
UserSchema.index({ institutionName: 1, score: -1 });

module.exports = mongoose.model('User', UserSchema);
