const express = require('express');
const router = express.Router();
const { searchUniversities, getUniversitiesByCountry } = require('../services/university');
const countries = require('../data/countries.json');

// Get all countries
router.get('/countries', (req, res) => {
  res.json(countries);
});

// Search universities
router.get('/search', async (req, res) => {
  try {
    const { name, country } = req.query;
    
    if (!name || name.length < 2) {
      return res.json([]);
    }

    const universities = await searchUniversities(name, country);
    res.json(universities);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Failed to search universities' });
  }
});

// Get universities by country
router.get('/by-country/:country', async (req, res) => {
  try {
    const { country } = req.params;
    const universities = await getUniversitiesByCountry(country);
    res.json(universities);
  } catch (error) {
    console.error('Get universities error:', error);
    res.status(500).json({ message: 'Failed to get universities' });
  }
});

module.exports = router;
