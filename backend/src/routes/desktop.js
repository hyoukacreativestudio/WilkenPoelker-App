const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');
const desktop = require('../controllers/desktopController');

// All desktop-tool routes require a logged-in staff account (never customers).
const STAFF = [
  'admin', 'super_admin', 'bike_manager', 'cleaning_manager', 'motor_manager',
  'service_manager', 'robby_manager', 'sales_manager', 'orders_manager', 'warehouse_worker',
];

// ── Bestellungen ──
router.get('/orders', authenticate, authorize(...STAFF), desktop.listOrders);
router.post('/orders', authenticate, authorize(...STAFF), desktop.createOrder);
router.patch('/orders/:id', authenticate, authorize(...STAFF), desktop.updateOrder);
router.delete('/orders/:id', authenticate, authorize(...STAFF), desktop.deleteOrder);

// ── Lager ──
router.get('/warehouse', authenticate, authorize(...STAFF), desktop.listWarehouse);
router.post('/warehouse', authenticate, authorize('sales_manager', 'admin', 'super_admin'), desktop.createWarehouseItem);
router.patch('/warehouse/:id', authenticate, authorize(...STAFF), desktop.updateWarehouseItem);
router.delete('/warehouse/:id', authenticate, authorize(...STAFF), desktop.deleteWarehouseItem);

module.exports = router;
