const { Op } = require('sequelize');
const { asyncHandler, AppError, NotFoundError } = require('../middlewares/errorHandler');
const models = require('../models');
const serviceService = require('../services/serviceService');
const catalog = require('../services/shop/shopCatalog');
const logger = require('../utils/logger');

const { WebInquiry, Ticket, User, Notification } = models;

// Product inquiries. Not a shop: an inquiry orders nothing, Verkauf gets back to
// the customer. They land in the PC program under "Anfragen", split by origin:
//  - app: a ticket with chat, so the customer gets the answer right in the app
//  - website: no account, the customer gave e-mail + phone and is contacted there
const WEB_STATUS = ['new', 'in_progress', 'done'];
const clip = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);
// Mailbox that gets a copy of every website inquiry
const INQUIRY_MAILBOX = () => process.env.INQUIRY_EMAIL || 'info@wilkenpoelker.de';
const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Website forms since 2026-11-16: every inquiry has a topic, and the topic (or the
// product's category) decides which department answers it. Verkauf and admins
// see all of them in the PC program, a department only its own.
const TOPICS = {
  produkt: 'Produktanfrage',
  allgemein: 'Allgemeine Frage',
  werkstatt: 'Werkstatt / Reparatur',
  ersatzteile: 'Ersatzteile',
  fahrrad: 'Fahrrad / E-Bike / Leasing',
  kaercher: 'Kärcher / Reinigungstechnik',
  maehroboter: 'Mähroboter',
  rueckruf: 'Rückruf',
};
const TOPIC_DEPARTMENT = {
  allgemein: 'verkauf', rueckruf: 'verkauf', werkstatt: 'service', ersatzteile: 'service',
  fahrrad: 'fahrrad', kaercher: 'kaercher', maehroboter: 'robby',
};
const DEPARTMENT_LABEL = {
  verkauf: 'Verkauf', service: 'Service / Werkstatt', fahrrad: 'Fahrrad', motor: 'Motorgeräte', kaercher: 'Kärcher', robby: 'Mähroboter',
};
// Department staff who get a notification and see the inquiry (besides Verkauf + Admin)
const DEPARTMENT_ROLES = {
  service: ['service_manager'],
  fahrrad: ['bike_manager'],
  motor: ['motor_manager', 'motor_equipment_manager'],
  kaercher: ['cleaning_manager'],
  robby: ['robby_manager'],
  verkauf: [],
};
const SEES_ALL = ['admin', 'super_admin', 'sales_manager'];
// Which departments a role may see (null = all)
function departmentsForRole(role) {
  if (SEES_ALL.includes(role)) return null;
  return Object.entries(DEPARTMENT_ROLES).filter(([, roles]) => roles.includes(role)).map(([d]) => d);
}
// Product inquiries go to the department of the product's category
function productDepartment(product) {
  if (!product) return 'verkauf';
  if (product.main === 'Fahrräder') return 'fahrrad';
  if (product.main === 'Reinigen' || product.brand === 'Kärcher') return 'kaercher';
  if (/mähroboter/i.test(`${product.device || ''} ${product.category || ''}`)) return 'robby';
  return 'motor';
}
// Sent from the English pages of the website (/en/...)
const isEnglish = (inquiry) => /^\/en\//.test(inquiry.pageUrl || '');
const topicLabel = (inquiry) => (inquiry.topic === 'produkt' || !inquiry.topic
  ? (inquiry.productTitle || 'Allgemeine Anfrage')
  : `${TOPICS[inquiry.topic] || 'Anfrage'}${inquiry.productTitle ? `: ${inquiry.productTitle}` : ''}`);

// The staff can answer with a plain "reply": it goes straight to the customer.
async function mailInquiry(inquiry) {
  const emailService = require('../services/emailService');
  const rows = [
    ['Thema', TOPICS[inquiry.topic] || 'Produktanfrage'], ['Abteilung', DEPARTMENT_LABEL[inquiry.department]],
    ['Name', inquiry.name], ['E-Mail', inquiry.email], ['Telefon', inquiry.phone],
    ['Produkt', inquiry.productTitle], ['Art.-Nr.', inquiry.artNr], ['Nachricht', inquiry.message],
    ['Gesendet von', inquiry.pageUrl],
    ['Sprache', isEnglish(inquiry) ? 'Englisch (von der englischen Website, bitte auf Englisch antworten)' : null],
  ].filter(([, v]) => v);
  const callback = inquiry.topic === 'rueckruf';
  await emailService.sendEmail({
    to: INQUIRY_MAILBOX(),
    ...(inquiry.email ? { replyTo: inquiry.email } : {}),
    subject: `Website-${callback ? 'Rückrufbitte' : 'Anfrage'}${isEnglish(inquiry) ? ' (Englisch)' : ''}: ${topicLabel(inquiry)}`.replace(/[\r\n]+/g, ' ').slice(0, 150),
    text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nDie Anfrage steht auch im PC-Programm unter "Anfragen". Keine Bestellung: wir liefern nur im Umkreis und versenden nichts.`,
    html: `<h2>${callback ? 'Rückrufbitte' : 'Neue Anfrage'} von der Website</h2><table cellpadding="4">${rows.map(([k, v]) => `<tr><td valign="top"><b>${k}</b></td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`).join('')}</table><p>Die Anfrage steht auch im PC-Programm unter &bdquo;Anfragen&ldquo;.${inquiry.email ? ' Eine Antwort auf diese E-Mail geht direkt an den Kunden.' : ' Der Kunde bittet um einen Anruf.'}</p>`,
  });
}

// POST /api/shop/inquiries/app (logged-in customer)
const createAppInquiry = asyncHandler(async (req, res) => {
  const product = await catalog.getProduct(String(req.body.slug || ''));
  if (!product) throw new NotFoundError('Produkt');
  const variant = product.variants.find((v) => v.artNr === req.body.artNr) || product.variants[0];
  const artNr = variant?.artNr || null;
  const text = clip(req.body.message, 2000)
    || `Ich interessiere mich für ${product.title}${artNr ? ` (Art.-Nr. ${artNr})` : ''}.`;

  const ticket = await serviceService.createTicket({
    title: clip(`Produktanfrage: ${product.title}`, 250),
    type: 'consultation',
    department: 'verkauf',
    description: text,
    product: { title: clip(product.title, 250), slug: product.slug, artNr },
  }, req.user.id, models);

  res.status(201).json({ success: true, data: { ticket } });
});

// Ceilings for ALL website inquiries together (the per-IP limit is in
// routes/shop.js). Above QUIET_AFTER per hour new inquiries are still saved
// and shown in the PC program, but nobody gets a push or an e-mail for them,
// so a bot with many addresses cannot flood the staff phones and info@.
// Above REJECT_AFTER the form answers "try again later".
const QUIET_AFTER = 40;
const REJECT_AFTER = 300;

// POST /api/shop/inquiries (website form, no login). Validated in routes/shop.js
const createWebInquiry = asyncHandler(async (req, res) => {
  const b = req.body;
  // Filled in only by spam bots (the field is hidden on the page): pretend it worked.
  if (b.website) return res.status(201).json({ success: true, data: { received: true } });

  const lastHour = await WebInquiry.count({ where: { createdAt: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (lastHour >= REJECT_AFTER) {
    logger.warn('Web inquiries: hourly ceiling reached, form closed for now', { lastHour });
    const message = /^\/en\//.test(String(b.pageUrl || ''))
      ? 'Too many inquiries right now. Please try again later or call us: +49 4952 5304.'
      : 'Zu viele Anfragen. Bitte versuchen Sie es später erneut oder rufen Sie uns an: 04952 5304.';
    return res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message } });
  }
  const quiet = lastHour >= QUIET_AFTER;

  const product = b.slug ? await catalog.getProduct(String(b.slug)) : null;
  // Older pages send no topic: a product inquiry
  const topic = TOPICS[b.topic] ? b.topic : 'produkt';
  const department = topic === 'produkt' ? productDepartment(product) : TOPIC_DEPARTMENT[topic];
  // Only the path of our own page, never a full URL with query parameters
  const pageUrl = clip(String(b.pageUrl || '').split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/i, ''), 200);
  const inquiry = await WebInquiry.create({
    topic,
    department,
    name: clip(b.name, 120),
    email: clip(b.email, 200),
    phone: clip(b.phone, 40),
    message: clip(b.message, 2000),
    productTitle: clip(product?.title || b.productTitle, 250),
    productSlug: product?.slug || null,
    artNr: clip(b.artNr, 80),
    pageUrl: pageUrl && pageUrl.startsWith('/') ? pageUrl : null,
  });

  if (quiet) {
    logger.warn('Web inquiries: unusually many this hour, saved without push and e-mail', { lastHour });
    return res.status(201).json({ success: true, data: { received: true } });
  }

  const staff = await User.findAll({
    where: { role: { [Op.in]: [...SEES_ALL, ...(DEPARTMENT_ROLES[department] || [])] }, isActive: true },
    attributes: ['id'],
  });
  try {
    await Notification.bulkCreate(staff.map((u) => ({
      userId: u.id,
      // "Anfrage von der Website" opens the Anfragen page in the PC program (Shell.jsx)
      title: topic === 'rueckruf' ? 'Rückrufbitte von der Website' : 'Neue Anfrage von der Website',
      message: `${inquiry.name}: ${topicLabel(inquiry)}${isEnglish(inquiry) ? ' (auf Englisch)' : ''}`,
      type: 'system',
      category: 'system',
      relatedId: inquiry.id,
      relatedType: 'web_inquiry',
    })));
  } catch (e) {
    logger.warn('Web inquiry notification failed', { error: e.message });
  }
  // The inquiry is saved: a mail problem must not make the form fail
  mailInquiry(inquiry).catch((e) => logger.warn('Web inquiry e-mail failed', { error: e.message }));
  // No customer data in the response or the log
  res.status(201).json({ success: true, data: { received: true } });
});

// ── PC program ──

const statusWhere = (status, map) => (status && status !== 'all' ? map[status] : undefined);

const listAppInquiries = asyncHandler(async (req, res) => {
  const where = { productTitle: { [Op.ne]: null } };
  const open = ['open', 'in_progress', 'confirmed'];
  const done = ['completed', 'cancelled', 'closed'];
  const s = statusWhere(req.query.status, { new: ['open'], in_progress: open.filter((x) => x !== 'open'), done });
  if (s) where.status = { [Op.in]: s };
  const tickets = await Ticket.findAll({
    where,
    include: [{ model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'customerNumber', 'phone', 'email'] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: { tickets } });
});

// Department staff only see their own department's inquiries. Older rows have
// no department: they were product inquiries for Verkauf.
function departmentWhere(role) {
  const deps = departmentsForRole(role);
  return deps ? { department: { [Op.in]: deps } } : {};
}

const listWebInquiries = asyncHandler(async (req, res) => {
  const where = { ...departmentWhere(req.user.role) };
  if (WEB_STATUS.includes(req.query.status)) where.status = req.query.status;
  if (TOPICS[req.query.topic]) where.topic = req.query.topic;
  const inquiries = await WebInquiry.findAll({ where, order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: { inquiries, topics: TOPICS, departments: DEPARTMENT_LABEL } });
});

const inquiryCounts = asyncHandler(async (req, res) => {
  const seesApp = SEES_ALL.includes(req.user.role);
  const [app, website] = await Promise.all([
    seesApp ? Ticket.count({ where: { productTitle: { [Op.ne]: null }, status: 'open' } }) : 0,
    WebInquiry.count({ where: { status: 'new', ...departmentWhere(req.user.role) } }),
  ]);
  res.json({ success: true, data: { app, website, seesApp } });
});

async function findOwnInquiry(req) {
  const inquiry = await WebInquiry.findOne({ where: { id: req.params.id, ...departmentWhere(req.user.role) } });
  if (!inquiry) throw new NotFoundError('Anfrage');
  return inquiry;
}

const updateWebInquiry = asyncHandler(async (req, res) => {
  const inquiry = await findOwnInquiry(req);
  if (!WEB_STATUS.includes(req.body.status)) throw new AppError('Ungültiger Status', 400, 'INVALID_STATUS');
  await inquiry.update({ status: req.body.status, handledBy: req.user.id });
  res.json({ success: true, data: { inquiry } });
});

const deleteWebInquiry = asyncHandler(async (req, res) => {
  const inquiry = await findOwnInquiry(req);
  await inquiry.destroy();
  res.json({ success: true });
});

module.exports = {
  createAppInquiry, createWebInquiry, listAppInquiries, listWebInquiries, inquiryCounts, updateWebInquiry, deleteWebInquiry,
  TOPICS, DEPARTMENT_ROLES, SEES_ALL,
};
