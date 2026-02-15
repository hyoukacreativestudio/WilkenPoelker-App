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

// Serve frontend build (Expo Web) from /public if it exists
const publicPath = path.resolve(__dirname, '../public');
const fs = require('fs');
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

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('joinChat', (ticketId) => {
    socket.join(`ticket:${ticketId}`);
    logger.debug(`Socket ${socket.id} joined ticket:${ticketId}`);
  });

  socket.on('leaveChat', (ticketId) => {
    socket.leave(`ticket:${ticketId}`);
  });

  socket.on('typing', (data) => {
    const { ticketId, userId, username } = data;
    socket.to(`ticket:${ticketId}`).emit('typing', { userId, username });
  });

  socket.on('stopTyping', (data) => {
    const { ticketId } = data;
    socket.to(`ticket:${ticketId}`).emit('stopTyping');
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// Cron jobs
// Check Taifun repair statuses every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  logger.debug('Cron: Checking Taifun repair statuses...');
  // PLACEHOLDER: Implement Taifun status polling
});

// Send appointment reminders (runs every 30 minutes)
cron.schedule('*/30 * * * *', async () => {
  logger.debug('Cron: Checking appointment reminders...');
  const { sendAppointmentReminders } = require('./services/appointmentReminderService');
  await sendAppointmentReminders();
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
  await connectDatabase();
  initializeFirebase();

  // Load models and create associations
  require('./models');

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
