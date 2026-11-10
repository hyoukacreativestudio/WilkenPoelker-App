const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { isAdmin, authorize } = require('../middlewares/roles');
const { validate, body, param } = require('../middlewares/validate');
const customerNumberController = require('../controllers/customerNumberController');

// Every staff member may handle customer-number requests (app + PC tool)
const canHandleRequests = authorize('admin', 'super_admin', 'bike_manager', 'cleaning_manager', 'motor_manager', 'service_manager', 'robby_manager', 'sales_manager', 'orders_manager', 'warehouse_worker', 'delivery_manager', 'motor_equipment_manager', 'ev_manager');

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

// Re-check Taifun for the current user (on repairs open / request tap)
router.post('/self-check', authenticate, customerNumberController.selfCheck);

// Staff routes (every staff member) — used by the app admin UI and the PC tool
router.get('/requests', authenticate, canHandleRequests, customerNumberController.getAllRequests);

router.put(
  '/requests/:id/approve',
  authenticate,
  canHandleRequests,
  validate([
    param('id').isUUID().withMessage('Invalid request ID'),
    body('customerNumber').notEmpty().withMessage('Customer number is required'),
  ]),
  customerNumberController.approveRequest
);

router.put(
  '/requests/:id/reject',
  authenticate,
  canHandleRequests,
  validate([
    param('id').isUUID().withMessage('Invalid request ID'),
  ]),
  customerNumberController.rejectRequest
);

module.exports = router;
