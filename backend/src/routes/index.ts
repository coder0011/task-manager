import { Router } from 'express';
import authRoutes from './authRoutes.js';
import taskRoutes from './taskRoutes.js';
import boardRoutes from './boardRoutes.js';
import userRoutes from './userRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import rbacRoutes from './rbacRoutes.js';
import activityLogRoutes from './activityLogRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import env from '../config/env.js';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DataPure Task Manager API',
    appEnv: env.appEnv,
    appEnvMode: env.appEnvMode,
    debugMode: env.enableDebug,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint (enabled by default in dev mode)
apiRouter.get('/debug', (_req, res) => {
  if (!env.enableDebug && env.isProduction) {
    res.status(403).json({
      success: false,
      statusCode: 403,
      code: 'DEBUG_DISABLED',
      error: 'Debugging tools are disabled in production mode.'
    });
    return;
  }

  res.json({
    success: true,
    status: 'debug_mode_active',
    appEnv: env.appEnv,
    appEnvMode: env.appEnvMode,
    nodeEnv: process.env.NODE_ENV || 'development',
    debugToolsEnabled: true,
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      memoryUsage: process.memoryUsage()
    },
    database: {
      host: env.db.host,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user
    },
    timestamp: new Date().toISOString()
  });
});

// Mount module routers
apiRouter.use('/auth', authRoutes);
apiRouter.use('/tasks', taskRoutes);
apiRouter.use('/boards', boardRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/rbac', rbacRoutes);
apiRouter.use('/activity-logs', activityLogRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/', uploadRoutes);

export default apiRouter;
