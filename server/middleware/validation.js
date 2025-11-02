const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation error', 
      errors: errors.array() 
    });
  }
  next();
};

// Registration validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, _ and -'),
  
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('leetcodeUsername')
    .trim()
    .notEmpty()
    .withMessage('LeetCode username is required'),
  
  body('educationLevel')
    .notEmpty()
    .withMessage('Education level is required'),
  
  body('institutionName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Institution name must be 2-100 characters'),
  
  body('year')
    .notEmpty()
    .withMessage('Year/level is required'),
];

// Login validation rules
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// LeetCode username validation
const leetcodeValidation = [
  body('leetcodeUsername')
    .trim()
    .notEmpty()
    .withMessage('LeetCode username is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('LeetCode username must be 1-50 characters'),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  leetcodeValidation
};
