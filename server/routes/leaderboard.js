const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   GET /api/leaderboard
// @desc    Get all users sorted by score
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -email')
      .sort({ score: -1, problems: -1 })
      .limit(100);

    // Add rank to each user
    const usersWithRank = users.map((user, index) => ({
      ...user.toObject(),
      rank: index + 1
    }));

    res.json(usersWithRank);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
