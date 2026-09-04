const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { fetchLeetCodeStats } = require('../services/leetcode');
const { calculateTier } = require('../utils/tier');
const { validate, changePasswordValidation, profileValidation } = require('../middleware/validation');
const activity = require('../utils/activity');

// @route   GET /api/users/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate ranks
    const [globalAbove, countryAbove, uniAbove, activityDates, activeDaysCount] = await Promise.all([
      User.countDocuments({ score: { $gt: user.score } }),
      User.countDocuments({ country: user.country, score: { $gt: user.score } }),
      User.countDocuments({ institutionName: user.institutionName, score: { $gt: user.score } }),
      // A year is what the heatmap draws; older rows stay in the collection.
      activity.getRecentActivity(user._id),
      activity.countActiveDays(user._id)
    ]);

    res.json({
      ...user.toObject(),
      activityDates,
      activeDaysCount,
      rank: globalAbove + 1,
      countryRank: countryAbove + 1,
      universityRank: uniAbove + 1,
      tier: calculateTier(user.score)
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
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

    // Fetch fresh LeetCode data. A LeetCode outage or a renamed profile is a
    // 502, not an internal error — the client shows cached stats either way.
    let leetcodeData;
    try {
      leetcodeData = await fetchLeetCodeStats(user.leetcodeUsername);
    } catch (lcErr) {
      return res.status(502).json({ message: lcErr.message || 'Could not reach LeetCode' });
    }

    // Store previous problems count
    const prevProblems = user.problems || 0;

    // Update basic stats
    user.problems = leetcodeData.problems;
    user.easy = leetcodeData.easy;
    user.medium = leetcodeData.medium;
    user.hard = leetcodeData.hard;
    user.totalActiveDays = leetcodeData.totalActiveDays;
    user.ranking = leetcodeData.ranking;

    // Record anything newly solved against today, then recompute the derived
    // counters from the activity collection.
    await activity.recordSolved(user._id, leetcodeData.problems - prevProblems, {
      easy: leetcodeData.easy,
      medium: leetcodeData.medium,
      hard: leetcodeData.hard
    });

    const [activeDates, weeklyProgress] = await Promise.all([
      activity.getActiveDates(user._id),
      activity.getWeeklyProgress(user._id)
    ]);

    const { currentStreak, longestStreak } = activity.calculateStreaks(activeDates);
    user.currentStreak = currentStreak;
    user.longestStreak = longestStreak;

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

    // Calculate ranks
    const [globalAbove, countryAbove, uniAbove, activityDates] = await Promise.all([
      User.countDocuments({ score: { $gt: user.score } }),
      User.countDocuments({ country: user.country, score: { $gt: user.score } }),
      User.countDocuments({ institutionName: user.institutionName, score: { $gt: user.score } }),
      activity.getRecentActivity(user._id)
    ]);

    res.json({
      message: 'Stats refreshed successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
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
        rank: globalAbove + 1,
        countryRank: countryAbove + 1,
        universityRank: uniAbove + 1,
        educationLevel: user.educationLevel,
        institutionName: user.institutionName,
        year: user.year,
        lastUpdated: user.lastUpdated,
        activityDates,
        activeDaysCount: activeDates.length,
        weeklyGoal: user.weeklyGoal,
        emailReminders: user.emailReminders,
        tier: calculateTier(user.score)
      }
    });
  } catch (error) {
    console.error('Error refreshing stats:', error);
    res.status(500).json({ message: 'Failed to refresh stats' });
  }
});

// @route   PUT /api/users/profile
// Validation lives in profileValidation, which shares one EDUCATION_LEVELS list
// with the User model. The list inlined here previously said 'Self-taught',
// which the model's 'Self-Taught' enum then rejected with a 500 on save.
router.put('/profile', auth, profileValidation, validate, async (req, res) => {
  try {
    const { institutionName, year, educationLevel } = req.body;
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (institutionName !== undefined) user.institutionName = institutionName.trim();
    if (year !== undefined) user.year = year.trim();
    if (educationLevel !== undefined) user.educationLevel = educationLevel;

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
router.put('/change-password', auth, changePasswordValidation, validate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from the current one' });
    }

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

    user.weeklyGoal = {
      target,
      current: user.weeklyGoal?.current || 0,
      weekStart: user.weeklyGoal?.weekStart || new Date(),
    };
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

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'enabled must be a boolean' });
    }

    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.emailReminders = {
      enabled: !!enabled,
      time: typeof time === 'string' ? time.slice(0, 10) : (user.emailReminders?.time || '09:00'),
      timezone: typeof timezone === 'string' ? timezone.slice(0, 50) : (user.emailReminders?.timezone || 'UTC'),
      // Preserve delivery bookkeeping — rebuilding the object wiped it, which
      // would let a reminder go out twice in the same day.
      lastSent: user.emailReminders?.lastSent || null,
    };
    await user.save();

    res.json({ message: 'Email reminders updated', emailReminders: user.emailReminders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update email reminders' });
  }
});

module.exports = router;
