const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { fetchLeetCodeStats } = require('../services/leetcode');

// @route   GET /api/users/me
// @desc    Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/sync-leetcode
// @desc    Sync LeetCode stats
router.post('/sync-leetcode', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user.leetcodeUsername) {
      return res.status(400).json({ message: 'No LeetCode username linked' });
    }

    console.log('Syncing stats for:', user.leetcodeUsername);

    // Fetch latest stats from LeetCode
    const leetcodeStats = await fetchLeetCodeStats(user.leetcodeUsername);
    
    // Update user stats
    user.problems = leetcodeStats.problems;
    user.streak = leetcodeStats.streak;
    user.level = Math.floor((leetcodeStats.problems * 10) / 100) + 1;
    user.score = (user.problems * 10) + (user.streak * 5) + (user.level * 20);
    user.lastSynced = new Date();
    user.leetcodeVerified = true;
    
    await user.save();
    
    res.json({
      message: 'Stats synced successfully!',
      user: user
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Failed to sync with LeetCode' });
  }
});

module.exports = router;

// Refresh user stats from LeetCode
router.post('/refresh-stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch fresh LeetCode data
    const { fetchLeetCodeStats } = require('../services/leetcode');
    const leetcodeData = await fetchLeetCodeStats(user.leetcodeUsername);

    // Update user stats
    user.problems = leetcodeData.problems;
    user.easy = leetcodeData.easy;
    user.medium = leetcodeData.medium;
    user.hard = leetcodeData.hard;
    user.streak = leetcodeData.streak;
    user.totalActiveDays = leetcodeData.totalActiveDays;
    user.ranking = leetcodeData.ranking;
    
    // Recalculate score and level
    user.score = (leetcodeData.easy * 10) + (leetcodeData.medium * 15) + (leetcodeData.hard * 20);
    user.level = Math.floor(leetcodeData.problems / 10) + 1;
    user.lastUpdated = new Date();

    await user.save();

    res.json({
      message: 'Stats refreshed successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        leetcodeUsername: user.leetcodeUsername,
        problems: user.problems,
        easy: user.easy,
        medium: user.medium,
        hard: user.hard,
        score: user.score,
        level: user.level,
        streak: user.streak,
        totalActiveDays: user.totalActiveDays,
        ranking: user.ranking,
        educationLevel: user.educationLevel,
        institutionName: user.institutionName,
        year: user.year,
        lastUpdated: user.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error refreshing stats:', error);
    res.status(500).json({ message: 'Failed to refresh stats' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { institutionName, year, educationLevel } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (institutionName) user.institutionName = institutionName;
    if (year) user.year = year;
    if (educationLevel) user.educationLevel = educationLevel;

    await user.save();

    // Calculate rank
    const usersAbove = await User.countDocuments({ score: { $gt: user.score } });
    const rank = usersAbove + 1;

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        leetcodeUsername: user.leetcodeUsername,
        problems: user.problems,
        easy: user.easy,
        medium: user.medium,
        hard: user.hard,
        score: user.score,
        level: user.level,
        streak: user.streak,
        totalActiveDays: user.totalActiveDays,
        ranking: user.ranking,
        rank: rank,
        educationLevel: user.educationLevel,
        institutionName: user.institutionName,
        year: user.year,
        lastUpdated: user.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});
