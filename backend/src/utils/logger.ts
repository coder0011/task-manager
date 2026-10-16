import pino from 'pino';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStream } from 'rotating-file-stream';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, '../../logs');

// Rotating file stream for combined operational logs (Rotates every 10MB or 1 day; retains 5 files)
const combinedLogStream = createStream('combined.log', {
  size: '10M',
  interval: '1d',
  maxFiles: 5,
  path: logDir
});

// Rotating file stream for error logs (Rotates every 10MB or 1 day; retains 5 files)
const errorLogStream = createStream('error.log', {
  size: '10M',
  interval: '1d',
  maxFiles: 5,
  path: logDir
});

// Multi-stream configuration: stdout for terminal + auto-rotating file streams
const streams: pino.StreamEntry[] = [
  { level: (env.logLevel || 'info') as pino.Level, stream: process.stdout },
  { level: 'info', stream: combinedLogStream },
  { level: 'error', stream: errorLogStream }
];

export const logger = pino(
  {
    level: env.logLevel || 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        'password_hash',
        'token',
        'refreshToken'
      ],
      censor: '[REDACTED]'
    }
  },
  pino.multistream(streams)
);

export default logger;
