const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { calculateTier } = require('../utils/tier');

// @route   GET /api/leaderboard
// @desc    Get leaderboard with optional filtering
router.get('/', async (req, res) => {
  try {
    const { country, institution } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (country && country !== 'all') {
      filter.country = country;
    }
    if (institution && institution !== 'all') {
      filter.institutionName = institution;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('username leetcodeUsername problems easy medium hard score country institutionName currentStreak longestStreak')
        .sort({ score: -1, problems: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    // Add rank and tier to each user (rank accounts for page offset)
    const usersWithRank = users.map((user, index) => ({
      ...user.toObject(),
      rank: skip + index + 1,
      tier: calculateTier(user.score)
    }));

    const totalPages = Math.ceil(total / limit);
    res.json({ users: usersWithRank, page, totalPages, total });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

// Get unique countries
router.get('/countries', async (req, res) => {
  try {
    const countries = await User.distinct('country');
    res.json(countries.sort());
  } catch (error) {
    console.error('Countries error:', error);
    res.status(500).json({ message: 'Failed to fetch countries' });
  }
});

// Get unique institutions by country
router.get('/institutions', async (req, res) => {
  try {
    const { country } = req.query;
    const filter = country && country !== 'all' ? { country } : {};
    
    const institutions = await User.distinct('institutionName', filter);
    res.json(institutions.sort());
  } catch (error) {
    console.error('Institutions error:', error);
    res.status(500).json({ message: 'Failed to fetch institutions' });
  }
});

module.exports = router;
