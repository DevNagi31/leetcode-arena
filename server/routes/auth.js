const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const auth = require('../middleware/auth');
const { fetchLeetCodeStats } = require('../services/leetcode');
const { sendPasswordResetCode, sendVerificationCode } = require('../services/email');
const { authLimiter } = require('../middleware/security');
const {
  validate,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  verifyResetCodeValidation,
  resetPasswordValidation,
  verifyEmailValidation
} = require('../middleware/validation');

// Generate a 6-digit numeric code as a string.
const generateCode = () => crypto.randomInt(100000, 999999).toString();

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

    // Re-fetch LeetCode stats server-side (don't trust client data).
    // Surface a clear 400 if the LeetCode username is invalid/unreachable.
    let verifiedStats;
    try {
      verifiedStats = await fetchLeetCodeStats(leetcodeUsername);
    } catch (lcErr) {
      return res.status(400).json({ message: lcErr.message || 'Could not verify LeetCode username' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Calculate score from verified stats
    const score = (verifiedStats.easy * 10) + (verifiedStats.medium * 15) + (verifiedStats.hard * 20);

    // Email verification code (15 min expiry)
    const verificationCode = generateCode();

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
      emailVerified: false,
      verificationCode,
      verificationCodeExpiry: new Date(Date.now() + 15 * 60 * 1000),
      lastUpdated: new Date()
    });

    await user.save();

    // Send the verification code out-of-band (errors don't block signup;
    // the user can request a resend).
    try {
      await sendVerificationCode(email, verificationCode);
    } catch (mailErr) {
      console.error('Failed to send verification email:', mailErr.message);
    }

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
        year: user.year,
        emailVerified: user.emailVerified
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
        year: user.year,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    await new TokenBlacklist({ token }).save();
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Forgot Password - generate reset code
router.post('/forgot-password', authLimiter, forgotPasswordValidation, validate, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always return the same generic response to avoid user enumeration.
    const genericResponse = { message: 'If an account exists for that email, a reset code has been sent.' };

    if (!user) {
      return res.json(genericResponse);
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    user.resetCode = code;
    user.resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // Deliver the code out-of-band (never in the HTTP response). We swallow
    // delivery errors so the response stays generic and enumeration-safe.
    try {
      await sendPasswordResetCode(email, code);
    } catch (mailErr) {
      console.error('Failed to send password reset email:', mailErr.message);
    }

    res.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to generate reset code' });
  }
});

// Verify Reset Code
router.post('/verify-reset-code', authLimiter, verifyResetCodeValidation, validate, async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.resetCode || !user.resetCodeExpiry) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    if (user.resetCode !== code) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    if (new Date() > user.resetCodeExpiry) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Generate temporary reset token (15 min)
    const resetToken = jwt.sign(
      { userId: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Clear the code so it can't be reused
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();

    res.json({ message: 'Code verified', resetToken });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'Failed to verify reset code' });
  }
});

// Reset Password
router.post('/reset-password', authLimiter, resetPasswordValidation, validate, async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    // Verify the temporary token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Hash and update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Verify Email - confirm the 6-digit code sent at signup
router.post('/verify-email', auth, verifyEmailValidation, validate, async (req, res) => {
  try {
    const { code } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified', emailVerified: true });
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    }

    if (new Date() > user.verificationCodeExpiry) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.emailVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully', emailVerified: true });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Failed to verify email' });
  }
});

// Resend Verification - issue a fresh code to the user's email
router.post('/resend-verification', auth, authLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified', emailVerified: true });
    }

    const verificationCode = generateCode();
    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationCode(user.email, verificationCode);
    } catch (mailErr) {
      console.error('Failed to resend verification email:', mailErr.message);
    }

    res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend verification code' });
  }
});

module.exports = router;
