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

// The staff can answer with a plain "reply": it goes straight to the customer.
async function mailInquiry(inquiry) {
  const emailService = require('../services/emailService');
  const topic = inquiry.productTitle || 'Allgemeine Anfrage';
  const rows = [
    ['Name', inquiry.name], ['E-Mail', inquiry.email], ['Telefon', inquiry.phone],
    ['Produkt', inquiry.productTitle], ['Art.-Nr.', inquiry.artNr], ['Nachricht', inquiry.message],
  ].filter(([, v]) => v);
  await emailService.sendEmail({
    to: INQUIRY_MAILBOX(),
    replyTo: inquiry.email,
    subject: `Website-Anfrage: ${topic}`.replace(/[\r\n]+/g, ' ').slice(0, 150),
    text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nDie Anfrage steht auch im PC-Programm unter "Anfragen". Keine Bestellung: wir liefern nur im Umkreis und versenden nichts.`,
    html: `<h2>Neue Anfrage von der Website</h2><table cellpadding="4">${rows.map(([k, v]) => `<tr><td valign="top"><b>${k}</b></td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`).join('')}</table><p>Die Anfrage steht auch im PC-Programm unter &bdquo;Anfragen&ldquo;. Eine Antwort auf diese E-Mail geht direkt an den Kunden.</p>`,
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

// POST /api/shop/inquiries (website form, no login). Validated in routes/shop.js
const createWebInquiry = asyncHandler(async (req, res) => {
  const b = req.body;
  // Filled in only by spam bots (the field is hidden on the page): pretend it worked.
  if (b.website) return res.status(201).json({ success: true, data: { received: true } });

  const product = b.slug ? await catalog.getProduct(String(b.slug)) : null;
  const inquiry = await WebInquiry.create({
    name: clip(b.name, 120),
    email: clip(b.email, 200),
    phone: clip(b.phone, 40),
    message: clip(b.message, 2000),
    productTitle: clip(product?.title || b.productTitle, 250),
    productSlug: product?.slug || null,
    artNr: clip(b.artNr, 80),
  });

  const staff = await User.findAll({
    where: { role: { [Op.in]: ['admin', 'super_admin', 'sales_manager'] }, isActive: true },
    attributes: ['id'],
  });
  try {
    await Notification.bulkCreate(staff.map((u) => ({
      userId: u.id,
      title: 'Neue Produktanfrage von der Website',
      message: `${inquiry.name}: ${inquiry.productTitle || 'Allgemeine Anfrage'}`,
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

const listWebInquiries = asyncHandler(async (req, res) => {
  const where = {};
  if (WEB_STATUS.includes(req.query.status)) where.status = req.query.status;
  const inquiries = await WebInquiry.findAll({ where, order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: { inquiries } });
});

const inquiryCounts = asyncHandler(async (req, res) => {
  const [app, website] = await Promise.all([
    Ticket.count({ where: { productTitle: { [Op.ne]: null }, status: 'open' } }),
    WebInquiry.count({ where: { status: 'new' } }),
  ]);
  res.json({ success: true, data: { app, website } });
});

const updateWebInquiry = asyncHandler(async (req, res) => {
  const inquiry = await WebInquiry.findByPk(req.params.id);
  if (!inquiry) throw new NotFoundError('Anfrage');
  if (!WEB_STATUS.includes(req.body.status)) throw new AppError('Ungültiger Status', 400, 'INVALID_STATUS');
  await inquiry.update({ status: req.body.status, handledBy: req.user.id });
  res.json({ success: true, data: { inquiry } });
});

const deleteWebInquiry = asyncHandler(async (req, res) => {
  const inquiry = await WebInquiry.findByPk(req.params.id);
  if (!inquiry) throw new NotFoundError('Anfrage');
  await inquiry.destroy();
  res.json({ success: true });
});

module.exports = {
  createAppInquiry, createWebInquiry, listAppInquiries, listWebInquiries, inquiryCounts, updateWebInquiry, deleteWebInquiry,
};
