const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   GET /api/leaderboard
// @desc    Get leaderboard with optional filtering
router.get('/', async (req, res) => {
  try {
    const { country, institution } = req.query;
    
    // Build filter
    const filter = {};
    if (country && country !== 'all') {
      filter.country = country;
    }
    if (institution && institution !== 'all') {
      filter.institutionName = institution;
    }

    const users = await User.find(filter)
      .select('-password')
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
