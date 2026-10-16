import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

// Determine application environment mode
const rawEnv = (process.env.APP_ENV || process.env.NODE_ENV || process.env.APP_ENV_MODE || 'development').toLowerCase();
const appEnv = rawEnv === 'production' || rawEnv === 'prod' ? 'production' : 'development';

// Priority loading: .env.production / .env.development -> then default .env fallback
const envSpecificFile = path.resolve(process.cwd(), `.env.${appEnv}`);
if (fs.existsSync(envSpecificFile)) {
  dotenv.config({ path: envSpecificFile });
}
// Fallback to generic .env for any unassigned variables
dotenv.config();

export const env = {
  appEnv,
  appEnvMode: process.env.APP_ENV_MODE || process.env.APP_ENV || appEnv,
  isProduction: appEnv === 'production',
  isDevelopment: appEnv !== 'production',
  enableDebug: process.env.ENABLE_DEBUG !== undefined 
    ? process.env.ENABLE_DEBUG === 'true' 
    : appEnv !== 'production',
  enableRateLimit: process.env.ENABLE_RATE_LIMIT !== undefined
    ? process.env.ENABLE_RATE_LIMIT === 'true'
    : process.env.RATE_LIMIT_ENABLED !== undefined
      ? process.env.RATE_LIMIT_ENABLED === 'true'
      : process.env.SKIP_RATE_LIMIT === 'true'
        ? false
        : appEnv === 'production',
  port: Number(process.env.PORT) || 5000,
  logLevel: process.env.LOG_LEVEL || (appEnv === 'production' ? 'info' : 'debug'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'datapure_tasks'
  },
  jwtSecret: process.env.JWT_SECRET || 'datapure_super_secret_jwt_key_123456789',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'DataPure Task Manager <no-reply@datapure.io>'
  }
} as const;

export default env;
