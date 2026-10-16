/**
 * Frontend Typed Environment Configuration
 * Provides strongly-typed runtime values for API URL, environment mode, and debugging flags.
 */

const rawAppEnv = import.meta.env.VITE_APP_ENV || (import.meta.env.PROD ? 'production' : 'development');
const rawAppEnvMode = import.meta.env.VITE_APP_ENV_MODE || import.meta.env.MODE || 'development';

export const env = {
  appEnv: rawAppEnv as 'development' | 'production' | 'test',
  appEnvMode: rawAppEnvMode,
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  appName: import.meta.env.VITE_APP_NAME || 'DataPure Task Manager',
  isProduction: Boolean(import.meta.env.PROD || rawAppEnv === 'production'),
  isDevelopment: !Boolean(import.meta.env.PROD || rawAppEnv === 'production'),
  // Debug mode enabled by default in development, or if VITE_ENABLE_DEBUG is explicitly 'true'
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG !== undefined
    ? import.meta.env.VITE_ENABLE_DEBUG === 'true'
    : import.meta.env.DEV,
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
} as const;
