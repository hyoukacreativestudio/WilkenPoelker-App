/**
 * Database indexes for optimal query performance at scale (10,000+ users).
 * Run after models are synchronized.
 */
const logger = require('../utils/logger');

async function createPerformanceIndexes(sequelize) {
  const qi = sequelize.getQueryInterface();
  const dialect = sequelize.getDialect();

  if (dialect !== 'postgres') {
    logger.info('Performance indexes skipped (only for PostgreSQL)');
    return;
  }

  const indexes = [
    // Notifications: most queried table - user's unread notifications
    { table: 'notifications', fields: ['user_id', 'read'], name: 'idx_notifications_user_read' },
    { table: 'notifications', fields: ['user_id', 'created_at'], name: 'idx_notifications_user_date' },
    { table: 'notifications', fields: ['category'], name: 'idx_notifications_category' },

    // Repairs: filtered by user and status
    { table: 'repairs', fields: ['user_id', 'status'], name: 'idx_repairs_user_status' },
    { table: 'repairs', fields: ['taifun_repair_id'], name: 'idx_repairs_taifun_id' },
    { table: 'repairs', fields: ['status'], name: 'idx_repairs_status' },

    // Posts: feed pagination by date
    { table: 'posts', fields: ['created_at'], name: 'idx_posts_created_at' },
    { table: 'posts', fields: ['user_id'], name: 'idx_posts_user_id' },

    // Likes: check if user liked a post
    { table: 'likes', fields: ['user_id', 'post_id'], name: 'idx_likes_user_post', unique: true },

    // Comments: by post
    { table: 'comments', fields: ['post_id', 'created_at'], name: 'idx_comments_post_date' },

    // Products: filtered by category
    { table: 'products', fields: ['category'], name: 'idx_products_category' },
    { table: 'products', fields: ['category', 'subcategory'], name: 'idx_products_cat_subcat' },

    // Appointments: user lookup
    { table: 'appointments', fields: ['user_id', 'status'], name: 'idx_appointments_user_status' },
    { table: 'appointments', fields: ['date'], name: 'idx_appointments_date' },

    // Favorites: user's favorites
    { table: 'favorites', fields: ['user_id', 'product_id'], name: 'idx_favorites_user_product', unique: true },

    // FCM Tokens: active tokens per user
    { table: 'fcm_tokens', fields: ['user_id', 'is_active'], name: 'idx_fcm_user_active' },

    // AI Sessions: user lookup
    { table: 'ai_sessions', fields: ['user_id', 'status'], name: 'idx_ai_sessions_user_status' },

    // Tickets: user and status
    { table: 'tickets', fields: ['user_id', 'status'], name: 'idx_tickets_user_status' },

    // Users: login lookups
    { table: 'users', fields: ['email'], name: 'idx_users_email', unique: true },
    { table: 'users', fields: ['customer_number'], name: 'idx_users_customer_number' },
  ];

  let created = 0;
  for (const idx of indexes) {
    try {
      await qi.addIndex(idx.table, idx.fields, {
        name: idx.name,
        unique: idx.unique || false,
      });
      created++;
    } catch (e) {
      // Index may already exist - that's fine
      if (!e.message.includes('already exists')) {
        logger.debug(`Index ${idx.name} skipped: ${e.message}`);
      }
    }
  }

  logger.info(`Performance indexes created/verified: ${created}/${indexes.length}`);
}

module.exports = { createPerformanceIndexes };
