const { validationResult, body, query, param } = require('express-validator');
const { ValidationError } = require('./errorHandler');

function validate(validations) {
  return async (req, res, next) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    // Field + message only: the submitted values (names, e-mails, addresses) are
    // neither echoed back nor written to the server log (data minimisation).
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    console.log('[VALIDATE FAIL]', req.method, req.originalUrl.split('?')[0],
      'fields=', JSON.stringify(Object.keys(req.body || {})), 'errors=', JSON.stringify(formattedErrors));

    next(new ValidationError(formattedErrors));
  };
}

// The password policy, defined once (API validators + reset web page). Any
// character that is not a letter or digit counts as special ("Sommer-2026x").
const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, en: 'Password must be at least 8 characters', de: 'Das Passwort muss mindestens 8 Zeichen lang sein.' },
  { test: (p) => /[a-z]/.test(p), en: 'Password must contain a lowercase letter', de: 'Das Passwort braucht mindestens einen Kleinbuchstaben.' },
  { test: (p) => /[A-Z]/.test(p), en: 'Password must contain an uppercase letter', de: 'Das Passwort braucht mindestens einen Großbuchstaben.' },
  { test: (p) => /\d/.test(p), en: 'Password must contain a number', de: 'Das Passwort braucht mindestens eine Zahl.' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), en: 'Password must contain a special character', de: 'Das Passwort braucht mindestens ein Sonderzeichen (z. B. ! ? - _ #).' },
];

// Reusable validation chains
const validators = {
  email: body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  password: body('password').custom((value) => {
    const broken = PASSWORD_RULES.find((rule) => !rule.test(String(value || '')));
    if (broken) throw new Error(broken.en);
    return true;
  }),

  passwordConfirm: body('passwordConfirm')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  username: body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),

  customerNumber: body('customerNumber')
    .matches(/^\d{4,}$/)
    .withMessage('Customer number must contain at least 4 digits'),

  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('cursor').optional().isUUID().withMessage('Invalid cursor'),
  ],

  // Staff-only lists the app loads in one go (calendar: limit 500, admin user
  // list: limit 1000). With the 100 cap these returned 400 and the screens
  // silently showed nothing.
  paginationLarge: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be 1-1000'),
    query('cursor').optional().isUUID().withMessage('Invalid cursor'),
  ],

  uuid: (paramName = 'id') =>
    param(paramName).isUUID().withMessage(`Invalid ${paramName} format`),
};

module.exports = { validate, validators, PASSWORD_RULES, body, query, param };
