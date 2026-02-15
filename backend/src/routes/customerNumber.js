const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roles');
const { validate, body, param } = require('../middlewares/validate');
const customerNumberController = require('../controllers/customerNumberController');

// Customer routes
router.post(
  '/request',
  authenticate,
  validate([
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('isExistingCustomer').isBoolean().withMessage('isExistingCustomer must be a boolean'),
    body('address.street').notEmpty().withMessage('Street is required'),
    body('address.zip').notEmpty().withMessage('ZIP code is required'),
    body('address.city').notEmpty().withMessage('City is required'),
  ]),
  customerNumberController.createRequest
);

router.get('/request/my', authenticate, customerNumberController.getMyRequest);

// Admin routes
router.get('/requests', authenticate, isAdmin, customerNumberController.getAllRequests);

router.put(
  '/requests/:id/approve',
  authenticate,
  isAdmin,
  validate([
    param('id').isUUID().withMessage('Invalid request ID'),
    body('customerNumber').notEmpty().withMessage('Customer number is required'),
  ]),
  customerNumberController.approveRequest
);

router.put(
  '/requests/:id/reject',
  authenticate,
  isAdmin,
  validate([
    param('id').isUUID().withMessage('Invalid request ID'),
  ]),
  customerNumberController.rejectRequest
);

module.exports = router;
