const { body, param, validationResult } = require('express-validator');

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

// Reusable: a Mongo ObjectId in the route params
const objectIdParam = [
  param('id')
    .isMongoId()
    .withMessage('Invalid id'),
];

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const all = errors.array();
    // Surface the first specific message so clients can show a useful reason
    // instead of a generic "Validation error".
    return res.status(400).json({
      message: all[0]?.msg || 'Validation error',
      errors: all
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

// Password reset validation rules
const forgotPasswordValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email'),
];

const verifyResetCodeValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email'),
  body('code')
    .isString()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Code must be a 6-digit number'),
];

const resetPasswordValidation = [
  body('resetToken')
    .isString()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

// Email verification code (6 digits)
const verifyEmailValidation = [
  body('code')
    .isString()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Code must be a 6-digit number'),
];

// Snippet validation. `optional` (true for updates) relaxes required-field checks
// while still enforcing type/length on any field that is present.
const snippetValidation = ({ optional = false } = {}) => {
  const maybe = (chain) => (optional ? chain.optional() : chain);
  return [
    maybe(body('problemName').isString()).bail().trim().isLength({ min: 1, max: 200 })
      .withMessage('problemName must be 1-200 characters'),
    maybe(body('difficulty').isIn(DIFFICULTIES))
      .withMessage('difficulty must be Easy, Medium, or Hard'),
    maybe(body('language').isString()).bail().trim().isLength({ min: 1, max: 50 })
      .withMessage('language must be 1-50 characters'),
    maybe(body('code').isString()).bail().isLength({ min: 1, max: 50000 })
      .withMessage('code must be 1-50000 characters'),
    body('runtime').optional().isString().isLength({ max: 100 }),
    body('memory').optional().isString().isLength({ max: 100 }),
    body('link').optional({ values: 'falsy' }).isString().isLength({ max: 500 }),
    body('topics').optional().isArray({ max: 50 }).withMessage('topics must be an array'),
    body('topics.*').optional().isString().isLength({ max: 50 }),
  ];
};

// Note validation.
const noteValidation = ({ optional = false } = {}) => {
  const maybe = (chain) => (optional ? chain.optional() : chain);
  return [
    maybe(body('problemName').isString()).bail().trim().isLength({ min: 1, max: 200 })
      .withMessage('problemName must be 1-200 characters'),
    maybe(body('difficulty').isIn(DIFFICULTIES))
      .withMessage('difficulty must be Easy, Medium, or Hard'),
    maybe(body('content').isString()).bail().isLength({ min: 1, max: 50000 })
      .withMessage('content must be 1-50000 characters'),
    body('personalRating').optional({ values: 'null' }).isInt({ min: 1, max: 5 })
      .withMessage('personalRating must be between 1 and 5'),
    body('resources').optional().isArray({ max: 50 }).withMessage('resources must be an array'),
    body('resources.*').optional().isString().isLength({ max: 500 }),
    body('topics').optional().isArray({ max: 50 }).withMessage('topics must be an array'),
    body('topics.*').optional().isString().isLength({ max: 50 }),
  ];
};

module.exports = {
  validate,
  objectIdParam,
  registerValidation,
  loginValidation,
  leetcodeValidation,
  forgotPasswordValidation,
  verifyResetCodeValidation,
  resetPasswordValidation,
  verifyEmailValidation,
  snippetValidation,
  noteValidation
};
