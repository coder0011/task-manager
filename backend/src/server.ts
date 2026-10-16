import http from 'http';
import app from './app.js';
import env from './config/env.js';
import { testConnection, pool } from './config/db.js';
import logger from './utils/logger.js';

const port = env.port;
const server = http.createServer(app);

// Start the server and handle graceful shutdown
async function startServer() {
  server.listen(port, async () => {
    logger.info(`[API Server] Running in [${env.appEnv.toUpperCase()}] mode at http://localhost:${port}`);
    logger.info(`[API Server] Debug mode: ${env.enableDebug ? 'ENABLED (Verbose Logging & Tools)' : 'DISABLED'}`);
    logger.info(`[API Server] Healthcheck available at http://localhost:${port}/api/health`);
    await testConnection();
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`[API Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      logger.info('[API Server] Closed HTTP server connections.');
      try {
        await pool.end();
        logger.info('[API Server] MySQL connection pool drained successfully.');
      } catch (err) {
        logger.error({ err }, '[API Server] Error closing MySQL pool');
      }
      process.exit(0);
    });

    // Force exit after 10s timeout
    setTimeout(() => {
      logger.error('[API Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the server
startServer();

export { server, app };
