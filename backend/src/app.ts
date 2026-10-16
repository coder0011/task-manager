import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './errors/AppError.js';
import { httpLogger } from './middlewares/loggingMiddleware.js';

import { env } from './config/env.js';

const app = express();

// Trust reverse proxy (Nginx / Docker ingress) for accurate client IP identification
app.set('trust proxy', 1);

// 0. Structured Request Logging & Correlation ID
app.use(httpLogger);

// 1. Security HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// 2. CORS Handling (Complies with W3C Fetch spec for credentials)
const allowedOrigins = env.corsOrigin === '*'
  ? true
  : [env.clientUrl, env.corsOrigin].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

import logger from './utils/logger.js';

// 3. Rate Limiters (Configurable via ENABLE_RATE_LIMIT: OFF in dev, ON in prod)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // High throughput for enterprise dashboard and concurrent telemetry
  skip: (req) => !env.enableRateLimit || req.path === '/health' || req.originalUrl.includes('/health'),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    code: 'RATE_LIMIT_EXCEEDED',
    error: 'Too many requests from this IP, please try again in 15 minutes.'
  }
});

// Dedicated strict brute-force protection for login and password reset
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // Max 200 attempts per 5 minutes per IP
  skip: () => !env.enableRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    error: 'Too many authentication attempts. Please try again in 5 minutes.'
  }
});

if (env.enableRateLimit) {
  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  logger.info('[Security] Rate limiting is ENABLED (appEnv=%s, max=5000/15m, auth=200/5m)', env.appEnv);
} else {
  logger.info('[Security] Rate limiting is DISABLED via environment (ENABLE_RATE_LIMIT=false, appEnv=%s)', env.appEnv);
}

// 4. Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Static Assets (Uploads directory for attachments)
const uploadsStaticPath = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsStaticPath));

// 6. Mount API Routes
app.use('/api', apiRouter);

// 7. 404 Handler for undefined API routes
app.all('*', (req, _res, next) => {
  next(new NotFoundError(`Cannot find endpoint ${req.method} ${req.originalUrl} on this server`));
});

// 8. Centralized RFC-compliant Error Handling Middleware
app.use(errorHandler);

export default app;
