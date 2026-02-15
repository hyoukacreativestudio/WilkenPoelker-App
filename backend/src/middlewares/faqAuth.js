const FAQ = require('../models/FAQ');
const { AuthorizationError } = require('./errorHandler');

// Map roles to FAQ categories they can manage
const ROLE_CATEGORY_MAP = {
  admin: null, // null = all categories
  super_admin: null,
  service_manager: ['general', 'bike', 'cleaning', 'motor', 'service'],
  bike_manager: ['bike'],
  cleaning_manager: ['cleaning'],
  motor_manager: ['motor'],
  robby_manager: ['motor'],
};

/**
 * Middleware that checks if a user can manage FAQs in a given category.
 * For POST: checks req.body.category
 * For PUT/DELETE: loads the FAQ from DB and checks its category
 */
function authorizeFAQCategory(req, res, next) {
  if (!req.user) {
    return next(new AuthorizationError('Authentication required'));
  }

  const allowedCategories = ROLE_CATEGORY_MAP[req.user.role];

  // null means all categories (admin, super_admin)
  if (allowedCategories === null) {
    return next();
  }

  // Role not in map at all (e.g. customer)
  if (allowedCategories === undefined) {
    return next(new AuthorizationError('Insufficient role for FAQ management'));
  }

  // For POST: check the category from the request body
  if (req.method === 'POST') {
    const category = req.body.category || 'general';
    if (!allowedCategories.includes(category)) {
      return next(new AuthorizationError(`You can only manage FAQs in categories: ${allowedCategories.join(', ')}`));
    }
    return next();
  }

  // For PUT/DELETE: load the FAQ and check its category
  const faqId = req.params.id;
  if (!faqId) {
    return next();
  }

  FAQ.findByPk(faqId)
    .then((faq) => {
      if (!faq) {
        return res.status(404).json({ error: 'FAQ not found' });
      }

      // Check if user can manage this FAQ's category
      if (!allowedCategories.includes(faq.category)) {
        return next(new AuthorizationError(`You can only manage FAQs in categories: ${allowedCategories.join(', ')}`));
      }

      // For PUT: also check if they're trying to change the category to one they can't manage
      if (req.method === 'PUT' && req.body.category && !allowedCategories.includes(req.body.category)) {
        return next(new AuthorizationError(`You can only move FAQs to categories: ${allowedCategories.join(', ')}`));
      }

      // Store FAQ on request to avoid double-fetch in controller
      req.faq = faq;
      next();
    })
    .catch((error) => {
      console.error('Error in FAQ auth middleware:', error);
      return res.status(500).json({ error: 'Internal server error' });
    });
}

module.exports = { authorizeFAQCategory, ROLE_CATEGORY_MAP };
