const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');
const desktop = require('../controllers/desktopController');

// Passwordless department login (click a department -> token). No auth needed;
// it IS the login. Restricted server-side to staff/department accounts.
router.post('/login', desktop.desktopLogin);

// All other desktop-tool routes require a logged-in staff account (never customers).
const STAFF = [
  'admin', 'super_admin', 'bike_manager', 'cleaning_manager', 'motor_manager',
  'service_manager', 'robby_manager', 'sales_manager', 'orders_manager', 'warehouse_worker',
  'delivery_manager', 'motor_equipment_manager', 'ev_manager',
];

// ── Bestellungen ──
router.get('/orders', authenticate, authorize(...STAFF), desktop.listOrders);
router.post('/orders', authenticate, authorize(...STAFF), desktop.createOrder);
router.patch('/orders/:id', authenticate, authorize(...STAFF), desktop.updateOrder);
router.patch('/orders/:id/problem', authenticate, authorize(...STAFF), desktop.setOrderProblem);
router.delete('/orders/done', authenticate, authorize('admin', 'super_admin', 'orders_manager', 'service_manager'), desktop.purgeDoneOrders);
router.delete('/orders/:id', authenticate, authorize(...STAFF), desktop.deleteOrder);

// ── Lager ──
router.get('/warehouse', authenticate, authorize(...STAFF), desktop.listWarehouse);
router.post('/warehouse', authenticate, authorize('sales_manager', 'admin', 'super_admin'), desktop.createWarehouseItem);
router.patch('/warehouse/:id', authenticate, authorize(...STAFF), desktop.updateWarehouseItem);
router.delete('/warehouse/:id', authenticate, authorize(...STAFF), desktop.deleteWarehouseItem);

// ── Termine ──
router.get('/appointments', authenticate, authorize(...STAFF), desktop.listAppointments);
router.post('/appointments', authenticate, authorize(...STAFF), desktop.createAppointment);
router.patch('/appointments/:id', authenticate, authorize(...STAFF), desktop.updateAppointment);
router.delete('/appointments/:id', authenticate, authorize(...STAFF), desktop.deleteAppointment);
router.post('/appointments/:id/propose', authenticate, authorize(...STAFF), desktop.proposeAppointment);
router.post('/appointments/:id/confirm', authenticate, authorize(...STAFF), desktop.confirmAppointmentDesktop);
router.post('/appointments/:id/question', authenticate, authorize(...STAFF), desktop.askAppointmentQuestion);

// ── Robby customer list ──
const ROBBY = ['admin', 'super_admin', 'robby_manager'];
router.get('/robby-customers', authenticate, authorize(...ROBBY), desktop.listRobbyCustomers);
router.post('/robby-customers', authenticate, authorize(...ROBBY), desktop.createRobbyCustomer);
router.patch('/robby-customers/:id', authenticate, authorize(...ROBBY), desktop.updateRobbyCustomer);
router.delete('/robby-customers/:id', authenticate, authorize(...ROBBY), desktop.deleteRobbyCustomer);

// ── Tickets (per department) ──
router.get('/tickets', authenticate, authorize(...STAFF), desktop.listTickets);
router.get('/tickets/:id', authenticate, authorize(...STAFF), desktop.getTicket);
router.post('/tickets/:id/message', authenticate, authorize(...STAFF), desktop.addTicketMessage);
router.patch('/tickets/:id', authenticate, authorize(...STAFF), desktop.updateTicket);

module.exports = router;
