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
router.get('/orders/sources', authenticate, authorize('admin', 'super_admin', 'orders_manager', 'service_manager'), desktop.listOrderSources);
router.post('/orders/sources/merge', authenticate, authorize('admin', 'super_admin', 'orders_manager', 'service_manager'), desktop.mergeOrderSources);
router.patch('/orders/:id', authenticate, authorize(...STAFF), desktop.updateOrder);
router.patch('/orders/:id/problem', authenticate, authorize(...STAFF), desktop.setOrderProblem);
router.delete('/orders/done', authenticate, authorize('admin', 'super_admin', 'orders_manager', 'service_manager'), desktop.purgeDoneOrders);
router.delete('/orders/:id', authenticate, authorize(...STAFF), desktop.deleteOrder);

// ── Kundenbestellungen ──
// Only Bestellungen + Service (and admins) work the customer-order list; every
// department can still write orders (and gets the number shown).
const CUSTOMER_ORDER_ROLES = ['admin', 'super_admin', 'orders_manager', 'service_manager'];
router.get('/customer-orders', authenticate, authorize(...CUSTOMER_ORDER_ROLES), desktop.listCustomerOrders);
router.patch('/customer-orders/:year/:number', authenticate, authorize(...CUSTOMER_ORDER_ROLES), desktop.setCustomerOrderStatus);
router.post('/customer-orders/:year/:number/message', authenticate, authorize(...CUSTOMER_ORDER_ROLES), desktop.messageCustomerOrder);
router.patch('/customer-orders/:year/:number/contacted', authenticate, authorize(...CUSTOMER_ORDER_ROLES), desktop.setCustomerOrderContacted);
router.get('/customer-lookup', authenticate, authorize(...STAFF), desktop.lookupCustomer);

// ── Produkte (Taifun stock -> app + website product pages) ──
const shopAdmin = require('../controllers/shopAdminController');
const SHOP_ADMIN = ['admin', 'super_admin', 'sales_manager'];
router.get('/shop/products', authenticate, authorize(...SHOP_ADMIN), shopAdmin.listProducts);
router.patch('/shop/products/:id', authenticate, authorize(...SHOP_ADMIN), shopAdmin.updateProduct);
router.post('/shop/products/:id/enrich', authenticate, authorize(...SHOP_ADMIN), shopAdmin.enrichNow);
router.post('/shop/products/:id/images', authenticate, authorize(...SHOP_ADMIN), shopAdmin.addImage);
router.post('/shop/products/:id/images/upload', authenticate, authorize(...SHOP_ADMIN), shopAdmin.uploadImage);
router.post('/shop/products/:id/images/:index/main', authenticate, authorize(...SHOP_ADMIN), shopAdmin.makeMainImage);
router.post('/shop/products/:id/images/:index/look', authenticate, authorize(...SHOP_ADMIN), shopAdmin.setImageLook);
router.delete('/shop/products/:id/images/:index', authenticate, authorize(...SHOP_ADMIN), shopAdmin.removeImage);
router.post('/shop/articles/:id/regroup', authenticate, authorize(...SHOP_ADMIN), shopAdmin.regroupArticle);
router.get('/shop/brands', authenticate, authorize(...SHOP_ADMIN), shopAdmin.listBrands);
router.post('/shop/brands', authenticate, authorize(...SHOP_ADMIN), shopAdmin.saveBrand);
router.put('/shop/brands/:id', authenticate, authorize(...SHOP_ADMIN), shopAdmin.saveBrand);
router.post('/shop/import', authenticate, authorize(...SHOP_ADMIN), shopAdmin.runImport);
router.post('/shop/enrich-all', authenticate, authorize(...SHOP_ADMIN), shopAdmin.enrichAll);
router.post('/shop/recheck', authenticate, authorize(...SHOP_ADMIN), shopAdmin.recheckNow);

// ── Produktanfragen (app + website) ──
const inquiries = require('../controllers/inquiryController');
const INQUIRY_ROLES = ['admin', 'super_admin', 'sales_manager'];
router.get('/inquiries/counts', authenticate, authorize(...INQUIRY_ROLES), inquiries.inquiryCounts);
router.get('/inquiries/app', authenticate, authorize(...INQUIRY_ROLES), inquiries.listAppInquiries);
router.get('/inquiries/website', authenticate, authorize(...INQUIRY_ROLES), inquiries.listWebInquiries);
router.patch('/inquiries/website/:id', authenticate, authorize(...INQUIRY_ROLES), inquiries.updateWebInquiry);
router.delete('/inquiries/website/:id', authenticate, authorize(...INQUIRY_ROLES), inquiries.deleteWebInquiry);

// ── Feedback aus der App (nur Admin) ──
const feedback = require('../controllers/feedbackController');
router.get('/feedback', authenticate, authorize('admin', 'super_admin'), feedback.listFeedback);
router.patch('/feedback/:id', authenticate, authorize('admin', 'super_admin'), feedback.markFeedback);
router.delete('/feedback/:id', authenticate, authorize('admin', 'super_admin'), feedback.deleteFeedback);

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

// ── Geo autofill (PLZ ⇄ Ort) ──
router.get('/geo', authenticate, authorize(...STAFF), desktop.lookupGeo);

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
router.post('/tickets/:id/forward', authenticate, authorize(...STAFF), desktop.forwardTicketDesktop);

// ── Fahrrad repair jobs (worklist: assign + tick off) ──
const repairJobs = require('../controllers/repairJobController');
router.get('/repairjobs', authenticate, authorize(...STAFF), repairJobs.listRepairJobs);
router.post('/repairjobs', authenticate, authorize(...STAFF), repairJobs.createRepairJob);
router.patch('/repairjobs/:id', authenticate, authorize(...STAFF), repairJobs.updateRepairJob);
router.delete('/repairjobs/:id', authenticate, authorize(...STAFF), repairJobs.deleteRepairJob);

// ── Hidden admin tools: time clock (admin only) ──
const hidden = require('../controllers/hiddenToolsController');
const ADMIN = ['admin', 'super_admin'];
router.get('/hidden/timeclock', authenticate, authorize(...ADMIN), hidden.listTimeClock);
router.get('/hidden/timeclock/status', authenticate, authorize(...ADMIN), hidden.clockStatus);
router.get('/hidden/timeclock/running', authenticate, authorize(...ADMIN), hidden.runningNow);
router.post('/hidden/timeclock/punch', authenticate, authorize(...ADMIN), hidden.punch);
router.post('/hidden/timeclock/done', authenticate, authorize(...ADMIN), hidden.markDayDone);
router.delete('/hidden/timeclock/:id', authenticate, authorize(...ADMIN), hidden.deleteTimeClock);

module.exports = router;
