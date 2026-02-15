const express = require('express');
const router = express.Router();
const { getFAQs, getAllFAQs, createFAQ, updateFAQ, deleteFAQ } = require('../controllers/faqController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');
const { authorizeFAQCategory } = require('../middlewares/faqAuth');

// All roles that can manage FAQs
const FAQ_MANAGERS = [
  'admin', 'super_admin', 'service_manager',
  'bike_manager', 'cleaning_manager', 'motor_manager', 'robby_manager',
];

// Public route - get active FAQs
router.get('/', getFAQs);

// Admin routes - getAllFAQs stays admin-only (sees inactive FAQs too)
router.get('/all', authenticate, authorize('admin', 'super_admin', 'service_manager'), getAllFAQs);

// CRUD with category-based authorization
router.post('/', authenticate, authorize(...FAQ_MANAGERS), authorizeFAQCategory, createFAQ);
router.put('/:id', authenticate, authorize(...FAQ_MANAGERS), authorizeFAQCategory, updateFAQ);
router.delete('/:id', authenticate, authorize(...FAQ_MANAGERS), authorizeFAQCategory, deleteFAQ);

module.exports = router;
