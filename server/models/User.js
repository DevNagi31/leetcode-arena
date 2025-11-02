const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  educationLevel: {
    type: String,
    required: true,
    enum: ['High School', 'Undergraduate', 'Graduate', 'PhD', 'Bootcamp', 'Self-Taught', 'Other']
  },
  institutionName: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  leetcodeUsername: {
    type: String,
    required: true,
  },
  leetcodeVerified: {
    type: Boolean,
    default: false,
  },
  avatar: {
    type: String,
    default: '🎮',
  },
  score: {
    type: Number,
    default: 0,
  },
  problems: {
    type: Number,
    default: 0,
  },
  streak: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 1,
  },
  rank: {
    type: Number,
    default: null,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  lastSynced: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);
