const { Sequelize } = require('sequelize');
const path = require('path');
const config = require('./env');
const logger = require('../utils/logger');

// Database setup:
// 1. USE_SQLITE=true → SQLite (local dev)
// 2. DATABASE_URL set → PostgreSQL via connection string (Render, Railway, etc.)
// 3. DB_HOST/DB_NAME/DB_USER set → PostgreSQL via individual vars
const forceSqlite = process.env.USE_SQLITE === 'true';
const databaseUrl = process.env.DATABASE_URL;
const isUsingPostgres = !forceSqlite && (databaseUrl || (config.db.host && config.db.name && config.db.user));

const pgDefine = {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
};

const pgPool = {
  max: config.isProd ? 50 : 20,
  min: config.isProd ? 10 : 5,
  acquire: 30000,
  idle: 10000,
  evict: 1000,
};

let sequelize;

if (forceSqlite || !isUsingPostgres) {
  // SQLite for local development
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../data/wilkenpoelker.sqlite'),
    logging: config.isDev ? (msg) => logger.debug(msg) : false,
    define: pgDefine,
  });
} else if (databaseUrl) {
  // DATABASE_URL connection string (Render, Heroku, Railway, etc.)
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: config.isDev ? (msg) => logger.debug(msg) : false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: pgPool,
    define: pgDefine,
  });
} else {
  // Individual DB_* environment variables (local PostgreSQL)
  sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: config.isDev ? (msg) => logger.debug(msg) : false,
    pool: pgPool,
    define: pgDefine,
  });
}

// Taifun Database Connection (Placeholder)
// Uncomment and configure when Taifun DB credentials are available
// const taifunSequelize = new Sequelize(
//   config.taifunDb.name,
//   config.taifunDb.user,
//   config.taifunDb.password,
//   {
//     host: config.taifunDb.host,
//     port: config.taifunDb.port,
//     dialect: 'mysql', // or 'postgres' depending on Taifun DB
//     logging: false,
//     pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
//   }
// );

// Placeholder Taifun query functions
const taifunDb = {
  async validateCustomerNumber(customerNumber) {
    // PLACEHOLDER: Replace with actual Taifun DB query
    // const [rows] = await taifunSequelize.query(
    //   'SELECT customer_id, first_name, last_name FROM customers WHERE customer_number = ?',
    //   { replacements: [customerNumber], type: Sequelize.QueryTypes.SELECT }
    // );
    // return rows.length > 0 ? rows[0] : null;

    // For development: accept any customer number with 4+ digits
    if (/^\d{4,}$/.test(customerNumber)) {
      return {
        customerId: customerNumber,
        firstName: 'Placeholder',
        lastName: 'Kunde',
      };
    }
    return null;
  },

  async getRepairStatus(repairId, customerId) {
    // PLACEHOLDER: Replace with actual Taifun DB query
    return {
      repairId,
      deviceName: 'Placeholder Gerät',
      status: 'in_repair',
      createdAt: new Date(),
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      cost: null,
    };
  },

  async getCustomerRepairs(customerId) {
    // PLACEHOLDER: Replace with actual Taifun DB query
    return [];
  },

  async getProductOffers(category) {
    // PLACEHOLDER: Replace with actual Taifun DB query
    return [];
  },

  async checkAppointmentSlot(date, timeSlot) {
    // PLACEHOLDER: Replace with actual availability check
    return true;
  },
};

async function connectDatabase() {
  try {
    await sequelize.authenticate();
    logger.info(`Database connected (${sequelize.getDialect()})`);

    // SQLite: manually add missing columns before sync (SQLite doesn't support full ALTER)
    if (sequelize.getDialect() === 'sqlite') {
      const qi = sequelize.getQueryInterface();
      const tables = await qi.showAllTables();
      for (const table of tables) {
        const cols = await qi.describeTable(table);
        const model = Object.values(sequelize.models).find(
          (m) => m.getTableName() === table
        );
        if (!model) continue;
        const attrs = model.rawAttributes;
        for (const [attrName, attrDef] of Object.entries(attrs)) {
          const colName = attrDef.field || attrName;
          if (!cols[colName]) {
            try {
              await qi.addColumn(table, colName, {
                type: attrDef.type,
                allowNull: attrDef.allowNull !== false,
                defaultValue: attrDef.defaultValue ?? null,
              });
              logger.info(`Added column ${table}.${colName}`);
            } catch (e) {
              // Column may already exist in some edge cases
            }
          }
        }
      }
    }

    // Sync models: creates tables if they don't exist (safe for production)
    // For schema changes in production, use Sequelize migrations instead of alter:true
    await sequelize.sync();
    logger.info('Database models synchronized');
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = { sequelize, taifunDb, connectDatabase };
