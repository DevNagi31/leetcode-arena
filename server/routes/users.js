const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { fetchLeetCodeStats } = require('../services/leetcode');

// Helper: Calculate streaks
const calculateStreaks = (activityDates) => {
  if (!activityDates || activityDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort dates ascending
  const sortedDates = activityDates
    .map(a => a.date)
    .sort((a, b) => new Date(a) - new Date(b));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Calculate longest streak
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

    if (Math.round(diffDays) === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak (from today backwards)
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  if (lastDate === today || lastDate === yesterday) {
    currentStreak = 1;
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const curr = new Date(sortedDates[i + 1]);
      const prev = new Date(sortedDates[i]);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
};

// Helper: Update activity for today
const updateActivityDate = (activityDates, newProblems, prevProblems, easy, medium, hard) => {
  const today = new Date().toISOString().split('T')[0];
  const existing = activityDates.find(a => a.date === today);
  const diff = Math.max(0, newProblems - prevProblems);

  if (existing) {
    existing.problemsSolved += diff;
    existing.easy = easy;
    existing.medium = medium;
    existing.hard = hard;
  } else if (diff > 0 || newProblems > 0) {
    activityDates.push({
      date: today,
      problemsSolved: diff > 0 ? diff : 1,
      easy,
      medium,
      hard
    });
  }

  return activityDates;
};

// Helper: Calculate weekly progress
const calculateWeeklyProgress = (activityDates) => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklyProblems = activityDates
    .filter(a => new Date(a.date) >= startOfWeek)
    .reduce((sum, a) => sum + a.problemsSolved, 0);

  return weeklyProblems;
};

// @route   GET /api/users/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    // Calculate rank
    const usersAbove = await User.countDocuments({ score: { $gt: user.score } });
    const rank = usersAbove + 1;

    res.json({ ...user.toObject(), rank });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/refresh-stats
router.post('/refresh-stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch fresh LeetCode data
    const leetcodeData = await fetchLeetCodeStats(user.leetcodeUsername);

    // Store previous problems count
    const prevProblems = user.problems || 0;

    // Update basic stats
    user.problems = leetcodeData.problems;
    user.easy = leetcodeData.easy;
    user.medium = leetcodeData.medium;
    user.hard = leetcodeData.hard;
    user.totalActiveDays = leetcodeData.totalActiveDays;
    user.ranking = leetcodeData.ranking;

    // Update activity dates
    user.activityDates = updateActivityDate(
      user.activityDates || [],
      leetcodeData.problems,
      prevProblems,
      leetcodeData.easy,
      leetcodeData.medium,
      leetcodeData.hard
    );

    // Calculate streaks
    const { currentStreak, longestStreak } = calculateStreaks(user.activityDates);
    user.currentStreak = currentStreak;
    user.longestStreak = longestStreak;

    // Calculate weekly progress
    const weeklyProgress = calculateWeeklyProgress(user.activityDates);
    user.weeklyGoal = {
      target: user.weeklyGoal?.target || 5,
      current: weeklyProgress,
      weekStart: new Date()
    };

    // Recalculate score
    user.score = (leetcodeData.easy * 10) + (leetcodeData.medium * 15) + (leetcodeData.hard * 20);
    user.lastUpdated = new Date();
    user.lastActive = new Date();

    await user.save();

    // Calculate rank
    const usersAbove = await User.countDocuments({ score: { $gt: user.score } });
    const rank = usersAbove + 1;

    res.json({
      message: 'Stats refreshed successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        country: user.country,
        leetcodeUsername: user.leetcodeUsername,
        problems: user.problems,
        easy: user.easy,
        medium: user.medium,
        hard: user.hard,
        score: user.score,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalActiveDays: user.totalActiveDays,
        ranking: user.ranking,
        rank: rank,
        educationLevel: user.educationLevel,
        institutionName: user.institutionName,
        year: user.year,
        lastUpdated: user.lastUpdated,
        activityDates: user.activityDates,
        weeklyGoal: user.weeklyGoal,
        emailReminders: user.emailReminders
      }
    });
  } catch (error) {
    console.error('Error refreshing stats:', error);
    res.status(500).json({ message: 'Failed to refresh stats' });
  }
});

// @route   PUT /api/users/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { institutionName, year, educationLevel } = req.body;
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (institutionName) user.institutionName = institutionName;
    if (year) user.year = year;
    if (educationLevel) user.educationLevel = educationLevel;

    await user.save();

    const usersAbove = await User.countDocuments({ score: { $gt: user.score } });
    const rank = usersAbove + 1;

    const userObj = user.toObject();
    delete userObj.password;
    res.json({ message: 'Profile updated successfully', user: { ...userObj, rank } });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// @route   PUT /api/users/change-password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// @route   PUT /api/users/weekly-goal
router.put('/weekly-goal', auth, async (req, res) => {
  try {
    const { target } = req.body;

    if (!target || typeof target !== 'number' || target < 1 || target > 50) {
      return res.status(400).json({ message: 'Weekly goal must be between 1 and 50' });
    }

    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.weeklyGoal.target = target;
    await user.save();

    res.json({ message: 'Weekly goal updated', weeklyGoal: user.weeklyGoal });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update weekly goal' });
  }
});

// @route   PUT /api/users/email-reminders
router.put('/email-reminders', auth, async (req, res) => {
  try {
    const { enabled, time, timezone } = req.body;
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.emailReminders = { enabled, time, timezone };
    await user.save();

    res.json({ message: 'Email reminders updated', emailReminders: user.emailReminders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update email reminders' });
  }
});

module.exports = router;
