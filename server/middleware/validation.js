const { body, param, validationResult } = require('express-validator');

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

// Inline note photographs. The browser downscales before upload; these are the
// backstop so a hand-rolled request can't park arbitrarily large blobs in the
// database (the whole cluster is 512MB).
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGES_PER_NOTE = 4;
const MAX_IMAGE_BASE64 = 1_000_000;   // ~730KB of binary once decoded
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

// Must stay in sync with the `educationLevel` enum on the User model and with
// EDUCATION_LEVELS in src/utils/constants.js.
const EDUCATION_LEVELS = [
  'High School', 'Undergraduate', 'Graduate', 'PhD', 'Bootcamp', 'Self-Taught', 'Other',
];

// One shared definition of "a strong enough password", used by registration,
// password reset and the change-password route so they can't drift apart.
const strongPassword = (field) =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');

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
  
  strongPassword('password'),
  
  body('leetcodeUsername')
    .trim()
    .notEmpty()
    .withMessage('LeetCode username is required')
    .isLength({ max: 40 })
    .withMessage('LeetCode username is too long'),

  body('country')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Country is required'),
  
  body('educationLevel')
    .isIn(EDUCATION_LEVELS)
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
  strongPassword('newPassword'),
];

// Changing a password from inside the app: current password must be supplied
// and the new one must clear the same bar as registration.
const changePasswordValidation = [
  body('currentPassword')
    // bail so a missing field reports "required" rather than express-validator's
    // generic "Invalid value" from the isString check.
    .exists({ checkFalsy: true })
    .withMessage('Current password is required')
    .bail()
    .isString()
    .withMessage('Current password is required'),
  strongPassword('newPassword'),
];

// Profile edit — every field optional, but validated when present.
const profileValidation = [
  body('institutionName').optional().isString().trim().isLength({ min: 2, max: 100 })
    .withMessage('Institution name must be 2-100 characters'),
  body('year').optional().isString().trim().isLength({ min: 1, max: 20 })
    .withMessage('Year must be 1-20 characters'),
  body('educationLevel').optional().isIn(EDUCATION_LEVELS)
    .withMessage('Invalid education level'),
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
    body('images').optional().isArray({ max: MAX_IMAGES_PER_NOTE })
      .withMessage(`You can attach at most ${MAX_IMAGES_PER_NOTE} photos`),
    // An existing photo is re-sent as just its _id, so the client never has to
    // upload unchanged bytes again on an edit.
    body('images.*._id').optional().isMongoId(),
    body('images.*.mimeType').optional().isIn(IMAGE_MIME_TYPES)
      .withMessage('Photos must be JPEG, PNG or WebP'),
    body('images.*.data').optional().isString()
      .bail()
      .isLength({ min: 1, max: MAX_IMAGE_BASE64 })
      .withMessage('That photo is too large — try again, it should have been compressed')
      .bail()
      .custom((v) => BASE64_RE.test(v))
      .withMessage('Photo data must be base64'),
    body('images.*.width').optional().isInt({ min: 1, max: 10000 }),
    body('images.*.height').optional().isInt({ min: 1, max: 10000 }),
    body('images.*.bytes').optional().isInt({ min: 0, max: MAX_IMAGE_BASE64 }),
    body('topics').optional().isArray({ max: 50 }).withMessage('topics must be an array'),
    body('topics.*').optional().isString().isLength({ max: 50 }),
  ];
};

module.exports = {
  EDUCATION_LEVELS,
  IMAGE_MIME_TYPES,
  MAX_IMAGES_PER_NOTE,
  validate,
  objectIdParam,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  verifyResetCodeValidation,
  resetPasswordValidation,
  changePasswordValidation,
  profileValidation,
  verifyEmailValidation,
  snippetValidation,
  noteValidation
};
