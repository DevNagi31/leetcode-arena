const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { fetchLeetCodeStats } = require('../services/leetcode');
const { authLimiter, leetcodeLimiter } = require('../middleware/security');
const { 
  validate, 
  registerValidation, 
  loginValidation, 
  leetcodeValidation 
} = require('../middleware/validation');

// Verify LeetCode username
router.post('/verify-leetcode', leetcodeLimiter, leetcodeValidation, validate, async (req, res) => {
  try {
    const { leetcodeUsername } = req.body;
    console.log('Verifying LeetCode username:', leetcodeUsername);

    // Check if LeetCode username is already linked to an account
    const existingUser = await User.findOne({ leetcodeUsername: leetcodeUsername.trim() });
    if (existingUser) {
      return res.status(409).json({ 
        message: 'This LeetCode account is already linked to another user. Please login instead.',
        alreadyExists: true 
      });
    }

    const leetcodeData = await fetchLeetCodeStats(leetcodeUsername);
    
    res.json(leetcodeData);
  } catch (error) {
    console.error('LeetCode verification error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Register
router.post('/register', authLimiter, registerValidation, validate, async (req, res) => {
  try {
    const { username, email, password, country, leetcodeUsername, educationLevel, institutionName, year } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email
          ? 'Email already registered. Please login instead.'
          : 'Username already taken. Please choose another.'
      });
    }

    // Double-check LeetCode username (security)
    const existingLeetCode = await User.findOne({ leetcodeUsername });
    if (existingLeetCode) {
      return res.status(400).json({
        message: 'This LeetCode account is already linked to another user. Please login instead.'
      });
    }

    // Re-fetch LeetCode stats server-side (don't trust client data)
    const verifiedStats = await fetchLeetCodeStats(leetcodeUsername);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Calculate score from verified stats
    const score = (verifiedStats.easy * 10) + (verifiedStats.medium * 15) + (verifiedStats.hard * 20);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      country,
      leetcodeUsername,
      problems: verifiedStats.problems,
      easy: verifiedStats.easy,
      medium: verifiedStats.medium,
      hard: verifiedStats.hard,
      score,
      totalActiveDays: verifiedStats.totalActiveDays,
      ranking: verifiedStats.ranking,
      educationLevel,
      institutionName,
      year,
      lastUpdated: new Date()
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        leetcodeUsername: user.leetcodeUsername,
        problems: user.problems,
        score: user.score,
        educationLevel: user.educationLevel,
        institutionName: user.institutionName,
        country: user.country,
        year: user.year
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
router.post('/login', authLimiter, loginValidation, validate, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        leetcodeUsername: user.leetcodeUsername,
        problems: user.problems,
        score: user.score,
        educationLevel: user.educationLevel,
        institutionName: user.institutionName,
        country: user.country,
        year: user.year
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;
