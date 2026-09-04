process.env.JWT_SECRET = 'test-secret-key';

const mongoose = require('mongoose');

describe('User model schema', () => {
  const User = require('../models/User');

  test('has required fields in schema', () => {
    const schema = User.schema.obj;
    expect(schema.username).toBeDefined();
    expect(schema.email).toBeDefined();
    expect(schema.password).toBeDefined();
    expect(schema.leetcodeUsername).toBeDefined();
    expect(schema.country).toBeDefined();
  });

  test('has LeetCode stats fields', () => {
    const schema = User.schema.obj;
    expect(schema.problems).toBeDefined();
    expect(schema.easy).toBeDefined();
    expect(schema.medium).toBeDefined();
    expect(schema.hard).toBeDefined();
    expect(schema.score).toBeDefined();
  });

  test('has streak fields', () => {
    const schema = User.schema.obj;
    expect(schema.currentStreak).toBeDefined();
    expect(schema.longestStreak).toBeDefined();
  });

  test('no longer embeds the unbounded activity array', () => {
    // Activity moved to its own collection; see models/Activity.js.
    expect(User.schema.obj.activityDates).toBeUndefined();
  });

  test('has password reset fields', () => {
    const schema = User.schema.obj;
    expect(schema.resetCode).toBeDefined();
    expect(schema.resetCodeExpiry).toBeDefined();
  });

  test('has weekly goal field', () => {
    const schema = User.schema.obj;
    expect(schema.weeklyGoal).toBeDefined();
  });
});

describe('Message model schema', () => {
  const Message = require('../models/Message');

  test('has required fields', () => {
    const schema = Message.schema.obj;
    expect(schema.from).toBeDefined();
    expect(schema.to).toBeDefined();
    expect(schema.content).toBeDefined();
  });

  test('has read field', () => {
    const schema = Message.schema.obj;
    expect(schema.read).toBeDefined();
  });
});

describe('TokenBlacklist model schema', () => {
  const TokenBlacklist = require('../models/TokenBlacklist');

  test('has token field', () => {
    const schema = TokenBlacklist.schema.obj;
    expect(schema.token).toBeDefined();
  });

  test('has createdAt with TTL', () => {
    const schema = TokenBlacklist.schema.obj;
    expect(schema.createdAt).toBeDefined();
  });
});

describe('FriendRequest model schema', () => {
  const FriendRequest = require('../models/FriendRequest');

  test('has from and to fields', () => {
    const schema = FriendRequest.schema.obj;
    expect(schema.from).toBeDefined();
    expect(schema.to).toBeDefined();
  });

  test('has status field', () => {
    const schema = FriendRequest.schema.obj;
    expect(schema.status).toBeDefined();
  });
});
