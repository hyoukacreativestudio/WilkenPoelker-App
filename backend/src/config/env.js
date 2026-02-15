const Joi = require('joi');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

// If DATABASE_URL is set (Render, Railway, etc.), DB_NAME/DB_USER are not required
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const useSqlite = process.env.USE_SQLITE === 'true';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),

  // Cloud database connection string (Render, Heroku, Railway)
  DATABASE_URL: Joi.string().allow('').default(''),

  // App Database (PostgreSQL) - not required when DATABASE_URL or USE_SQLITE is set
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: (hasDatabaseUrl || useSqlite) ? Joi.string().allow('').default('') : Joi.string().required(),
  DB_USER: (hasDatabaseUrl || useSqlite) ? Joi.string().allow('').default('') : Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),

  // Taifun Database (Placeholder)
  TAIFUN_DB_HOST: Joi.string().default('localhost'),
  TAIFUN_DB_PORT: Joi.number().default(3306),
  TAIFUN_DB_NAME: Joi.string().default('taifun_db'),
  TAIFUN_DB_USER: Joi.string().default('taifun_user'),
  TAIFUN_DB_PASSWORD: Joi.string().allow('').default(''),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Firebase
  FIREBASE_SERVICE_ACCOUNT: Joi.string().allow('').default(''),

  // OpenAI
  OPENAI_API_KEY: Joi.string().allow('').default(''),
  OPENAI_MODEL: Joi.string().default('gpt-3.5-turbo'),

  // Email (SMTP)
  EMAIL_HOST: Joi.string().default('smtp.mailtrap.io'),
  EMAIL_PORT: Joi.number().default(587),
  EMAIL_USER: Joi.string().allow('').default(''),
  EMAIL_PASSWORD: Joi.string().allow('').default(''),
  EMAIL_FROM: Joi.string().default('noreply@wilkenpoelker.de'),

  // Upload
  UPLOAD_MAX_SIZE: Joi.number().default(10485760),
  UPLOAD_PATH: Joi.string().default('./uploads'),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX: Joi.number().default(100),

  // App URLs
  API_URL: Joi.string().default('http://localhost:5000'),
  APP_URL: Joi.string().default('http://localhost:3000'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:19006'),
}).unknown(true);

const { error, value: env } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  const missing = error.details.map(d => d.message).join('\n  ');
  console.error(`Environment validation failed:\n  ${missing}`);
  process.exit(1);
}

module.exports = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',

  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  },

  taifunDb: {
    host: env.TAIFUN_DB_HOST,
    port: env.TAIFUN_DB_PORT,
    name: env.TAIFUN_DB_NAME,
    user: env.TAIFUN_DB_USER,
    password: env.TAIFUN_DB_PASSWORD,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  firebase: {
    serviceAccount: env.FIREBASE_SERVICE_ACCOUNT,
  },

  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
  },

  email: {
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    user: env.EMAIL_USER,
    password: env.EMAIL_PASSWORD,
    from: env.EMAIL_FROM,
  },

  upload: {
    maxSize: env.UPLOAD_MAX_SIZE,
    path: env.UPLOAD_PATH,
  },

  security: {
    bcryptRounds: env.BCRYPT_ROUNDS,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: env.RATE_LIMIT_MAX,
  },

  urls: {
    api: env.API_URL,
    app: env.APP_URL,
    corsOrigins: (() => {
      const origins = env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
      if (env.NODE_ENV === 'production') {
        const filtered = origins.filter(o => !o.includes('localhost') && !o.includes('127.0.0.1') && !o.includes('192.168.'));
        if (filtered.length === 0) {
          console.warn('WARNING: No production CORS origins configured. Set CORS_ORIGINS in .env to your production domain(s).');
          return origins; // fallback to configured origins
        }
        if (filtered.length < origins.length) {
          console.warn('WARNING: Localhost/private-IP CORS origins removed in production mode.');
        }
        return filtered;
      }
      return origins;
    })(),
  },
};
