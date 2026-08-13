const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const { config, connectDatabase, initializeFirebase } = require('./config');
const { initializeSentry } = require('./config/sentry');
const { sanitizeBody } = require('./utils/sanitizer');
const { errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimit');
const logger = require('./utils/logger');

const app = express();

// Trust first proxy (Render) - required for express-rate-limit behind reverse proxy
app.set('trust proxy', 1);

const server = http.createServer(app);

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: config.urls.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available in routes
app.set('io', io);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: config.urls.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Response compression for high traffic
try {
  const compression = require('compression');
  app.use(compression({ threshold: 1024 })); // compress responses > 1KB
} catch (e) {
  logger.warn('compression module not installed, skipping response compression');
}

// Body parsing
// TEMPORARY DEBUG: log every incoming request BEFORE body-parsing so we can see
// what actually reaches Express. Remove once mobile POST issue is diagnosed.
app.use((req, res, next) => {
  logger.info(`[REQ] ${req.method} ${req.url} UA=${(req.headers['user-agent'] || '').slice(0, 30)} CT=${req.headers['content-type'] || '-'} CL=${req.headers['content-length'] || '-'}`);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeBody);

// Rate limiting
app.use('/api/', apiLimiter);

// Static files with caching headers for performance
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), {
  maxAge: config.isProd ? '7d' : '1h',
  etag: true,
  lastModified: true,
}));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const feedRoutes = require('./routes/feed');
const productRoutes = require('./routes/products');
const serviceRoutes = require('./routes/service');
const repairRoutes = require('./routes/repairs');
const appointmentRoutes = require('./routes/appointments');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const ratingRoutes = require('./routes/ratings');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');
const faqRoutes = require('./routes/faq');
const aboutRoutes = require('./routes/about');
const customerNumberRoutes = require('./routes/customerNumber');
const syncRoutes = require('./routes/sync');
const desktopRoutes = require('./routes/desktop');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/products', productRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/customer-number', customerNumberRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/desktop', desktopRoutes);

// Serve the desktop tool (built web app) so every company PC just opens
// <server>/pc in a browser — no install, no Node, no CORS (same origin as /api).
app.use('/pc', express.static(path.resolve(__dirname, '../../desktop/dist')));

// Health check (enhanced for production monitoring)
app.get('/api/health', async (req, res) => {
  const { sequelize } = require('./config/database');
  let dbStatus = 'ok';
  try {
    await sequelize.authenticate();
  } catch {
    dbStatus = 'error';
  }
  res.json({
    success: dbStatus === 'ok',
    message: 'WilkenPoelker API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
  });
});

// Serve .well-known files with correct content types (for Universal Links / App Links)
const publicPath = path.resolve(__dirname, '../public');
const fs = require('fs');
app.get('/.well-known/apple-app-site-association', (req, res) => {
  const filePath = path.join(publicPath, '.well-known', 'apple-app-site-association');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(filePath);
  } else {
    res.status(404).end();
  }
});

// Serve frontend build (Expo Web) from /public if it exists
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath, {
    maxAge: config.isProd ? '7d' : '1h',
    index: false, // We handle index.html via catch-all below
  }));
}

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
});

// Catch-all: serve frontend index.html for all non-API routes (SPA)
app.get('*', (req, res) => {
  const indexPath = path.resolve(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Frontend build not found. Run: npx expo export --platform web' },
    });
  }
});

// Sentry error handler (must be before custom error handler)
initializeSentry(app);

// Global error handler
app.use(errorHandler);

// Socket.io JWT authentication middleware
const jwt = require('jsonwebtoken');
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    return next();
  } catch (err) {
    logger.warn('Socket auth failed', { error: err.message });
    return next(new Error('Authentication failed'));
  }
});

// Verify a user is allowed to join a ticket's chat room.
async function canAccessTicket(userId, userRole, ticketId) {
  const { Ticket } = require('./models');
  const ticket = await Ticket.findByPk(ticketId, { attributes: ['id', 'userId', 'assignedTo'] });
  if (!ticket) return false;

  const isOwner = ticket.userId === userId;
  const isAssigned = ticket.assignedTo === userId;
  const isUnassigned = !ticket.assignedTo;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isStaff = userRole && userRole !== 'customer';

  return isOwner || isAssigned || isAdmin || (isStaff && isUnassigned);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} user=${socket.userId}`);

  socket.on('joinChat', async (ticketId) => {
    try {
      const allowed = await canAccessTicket(socket.userId, socket.userRole, ticketId);
      if (!allowed) {
        logger.warn('joinChat denied', { userId: socket.userId, ticketId });
        socket.emit('chatAccessDenied', { ticketId });
        return;
      }
      socket.join(`ticket:${ticketId}`);
      logger.debug(`Socket ${socket.id} (user ${socket.userId}) joined ticket:${ticketId}`);
    } catch (err) {
      logger.error('joinChat error', { error: err.message });
    }
  });

  socket.on('leaveChat', (ticketId) => {
    socket.leave(`ticket:${ticketId}`);
  });

  socket.on('typing', (data) => {
    const { ticketId } = data || {};
    if (!ticketId) return;
    // Only forward if the socket has actually joined this room (auth gate)
    if (!socket.rooms.has(`ticket:${ticketId}`)) return;
    socket.to(`ticket:${ticketId}`).emit('typing', {
      userId: socket.userId,
      username: data.username,
    });
  });

  socket.on('stopTyping', (data) => {
    const { ticketId } = data || {};
    if (!ticketId) return;
    if (!socket.rooms.has(`ticket:${ticketId}`)) return;
    socket.to(`ticket:${ticketId}`).emit('stopTyping');
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// Cron jobs
// Send appointment reminders (runs every 30 minutes)
cron.schedule('*/30 * * * *', async () => {
  logger.debug('Cron: Checking appointment reminders...');
  const { sendAppointmentReminders } = require('./services/appointmentReminderService');
  await sendAppointmentReminders();
});

// Auto-delete chat and ticket attachments older than 30 days (runs daily at 03:15)
cron.schedule('15 3 * * *', async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { Op } = require('sequelize');
    const ChatMessage = require('./models/ChatMessage');
    const Ticket = require('./models/Ticket');
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const uploadsDir = path.join(__dirname, '..', 'uploads');

    const removeLocalFile = (url) => {
      if (!url || typeof url !== 'string') return;
      if (!url.startsWith('/uploads/')) return; // skip Cloudinary/remote
      const safe = path.normalize(url.replace(/^\/uploads\//, ''));
      if (safe.includes('..')) return;
      const full = path.join(uploadsDir, safe);
      fs.promises.unlink(full).catch(() => {});
    };

    // Chat messages older than 30d: strip attachments
    const oldMessages = await ChatMessage.findAll({
      where: { createdAt: { [Op.lt]: cutoff }, attachments: { [Op.ne]: null } },
      attributes: ['id', 'attachments'],
    });
    let stripped = 0;
    for (const msg of oldMessages) {
      const list = Array.isArray(msg.attachments) ? msg.attachments : [];
      if (list.length === 0) continue;
      for (const att of list) removeLocalFile(typeof att === 'string' ? att : att?.url);
      await msg.update({ attachments: [] });
      stripped++;
    }

    // Tickets older than 30d: strip attachments (chat and history remain)
    const oldTickets = await Ticket.findAll({
      where: { createdAt: { [Op.lt]: cutoff } },
      attributes: ['id', 'attachments'],
    });
    let ticketStripped = 0;
    for (const ticket of oldTickets) {
      const list = Array.isArray(ticket.attachments) ? ticket.attachments : [];
      if (list.length === 0) continue;
      for (const att of list) removeLocalFile(typeof att === 'string' ? att : att?.url);
      await ticket.update({ attachments: [] });
      ticketStripped++;
    }

    if (stripped + ticketStripped > 0) {
      logger.info(`Cron: stripped ${stripped} old chat message attachments + ${ticketStripped} old ticket attachments`);
    }
  } catch (err) {
    logger.error('Cron: attachment cleanup error', { error: err.message });
  }
});

// Taifun SFTP inbox: import any XML files Bruno dropped, every 5 minutes.
// Successful imports move to processed/, failures to failed/ with an error log.
cron.schedule('*/5 * * * *', async () => {
  try {
    const { scanAndImport } = require('./services/taifunFolderWatcher');
    const result = await scanAndImport();
    if (result.scanned > 0) {
      logger.info('Cron: Taifun inbox scan', result);
    }
  } catch (err) {
    logger.error('Cron: Taifun inbox scan failed', { error: err.message });
  }
});

// Hard-delete acknowledged repairs 2 days after the customer confirmed pickup
// (after that window the Taifun order + our repair record go).
cron.schedule('30 3 * * *', async () => {
  try {
    const { Op } = require('sequelize');
    const Repair = require('./models/Repair');
    const { TaifunOrder } = require('./models');
    const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const doomed = await Repair.findAll({
      where: { acknowledgedAt: { [Op.ne]: null, [Op.lt]: cutoff } },
      attributes: ['id', 'taifunRepairId'],
    });
    const taifunNrs = doomed.map((r) => r.taifunRepairId).filter(Boolean);

    const deletedRepairs = await Repair.destroy({
      where: { id: { [Op.in]: doomed.map((r) => r.id) } },
    });
    const deletedOrders = taifunNrs.length
      ? await TaifunOrder.destroy({ where: { nr: { [Op.in]: taifunNrs } } })
      : 0;

    if (deletedRepairs > 0) {
      logger.info('Cron: purged acknowledged repairs after 7d', {
        repairs: deletedRepairs,
        taifunOrders: deletedOrders,
      });
    }
  } catch (err) {
    logger.error('Cron: 7-day repair purge failed', { error: err.message });
  }
});

// Delete outreach orders 1 day after they were reached OR finished (erledigt),
// so the staff contact list stays clean. Removes the Taifun order + linked Repair.
cron.schedule('7 * * * *', async () => {
  try {
    const { Op } = require('sequelize');
    const Repair = require('./models/Repair');
    const { TaifunOrder } = require('./models');
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const doomed = await TaifunOrder.findAll({
      where: {
        [Op.or]: [
          { reachedAt: { [Op.ne]: null, [Op.lt]: cutoff } },
          { erledigt: true, updatedAt: { [Op.lt]: cutoff } },
        ],
      },
      attributes: ['nr'],
    });
    if (doomed.length === 0) return;
    const nrs = doomed.map((o) => o.nr);

    const deletedRepairs = await Repair.destroy({ where: { taifunRepairId: { [Op.in]: nrs } } });
    const deletedOrders = await TaifunOrder.destroy({ where: { nr: { [Op.in]: nrs } } });

    logger.info('Cron: purged reached/finished Taifun orders after 1d', {
      taifunOrders: deletedOrders,
      repairs: deletedRepairs,
    });
  } catch (err) {
    logger.error('Cron: 1-day outreach purge failed', { error: err.message });
  }
});

// Archive acknowledged repairs every Sunday at 23:59
cron.schedule('59 23 * * 0', async () => {
  try {
    const { Op } = require('sequelize');
    const Repair = require('./models/Repair');
    const [count] = await Repair.update(
      { archivedAt: new Date() },
      { where: { status: 'ready', acknowledgedAt: { [Op.ne]: null }, archivedAt: null } }
    );
    if (count > 0) {
      logger.info(`Cron: Archived ${count} acknowledged repairs`);
    }
  } catch (err) {
    logger.error('Cron: Archive repairs error', { error: err.message });
  }
});

// Start server
async function startServer() {
  // Load models and create associations BEFORE connecting
  // so that connectDatabase() can auto-add missing columns
  require('./models');

  await connectDatabase();
  initializeFirebase();

  // Create performance indexes for PostgreSQL (optimized for 10k+ users)
  const { sequelize } = require('./config/database');
  const { createPerformanceIndexes } = require('./config/indexes');
  await createPerformanceIndexes(sequelize);

  // Auto-seed: load demo data if database is empty (first deployment)
  try {
    const User = require('./models/User');
    const userCount = await User.count();
    if (userCount === 0) {
      logger.info('Empty database detected — running seed data...');
      const seedAll = require('./seeds');
      await seedAll();
      logger.info('Seed data loaded successfully');
    }
  } catch (seedErr) {
    logger.warn('Auto-seed skipped or failed:', seedErr.message);
  }

  server.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
}

// Graceful shutdown
function gracefulShutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');

    const { sequelize } = require('./config/database');
    sequelize.close().then(() => {
      logger.info('Database connections closed');
      process.exit(0);
    }).catch((err) => {
      logger.error('Error closing database:', err.message);
      process.exit(1);
    });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = { app, server, io };
