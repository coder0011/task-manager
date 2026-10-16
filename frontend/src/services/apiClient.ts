import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { toast } from 'sonner';

import { STORAGE_KEYS, CUSTOM_EVENTS } from '../constants/appConstants';
import { storage } from '../lib/storage';

export const TOKEN_STORAGE_KEY = STORAGE_KEYS.TOKEN;
export const USER_STORAGE_KEY = STORAGE_KEYS.USER;

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _startTime?: number;
  }
}

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Injects Bearer token automatically and logs when in debug mode
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config._startTime = Date.now();
    const token = storage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (env.enableDebug) {
      const method = config.method?.toUpperCase() || 'GET';
      const url = config.url || '';
      console.groupCollapsed(
        `%c[HTTP ${method}] ${url}`,
        'color: #38bdf8; font-weight: bold; background: #0f172a; padding: 2px 6px; border-radius: 4px;'
      );
      console.log('Target URL:', `${config.baseURL || ''}${url}`);
      if (config.params) console.log('Params:', config.params);
      if (config.data) console.log('Payload:', config.data);
      console.log('Headers:', config.headers);
      console.groupEnd();
    }

    return config;
  },
  (error) => {
    if (env.enableDebug) {
      console.error('[HTTP Request Configuration Error]:', error);
    }
    return Promise.reject(error);
  }
);

// Response Interceptor: Catches 401 Unauthorized, 409 Conflict, and normalizes errors
apiClient.interceptors.response.use(
  (response) => {
    if (env.enableDebug) {
      const duration = response.config._startTime ? `${Date.now() - response.config._startTime}ms` : '';
      const method = response.config.method?.toUpperCase() || 'GET';
      const url = response.config.url || '';
      console.groupCollapsed(
        `%c[HTTP ${response.status} OK] ${method} ${url} ${duration ? `(${duration})` : ''}`,
        'color: #4ade80; font-weight: bold; background: #0f172a; padding: 2px 6px; border-radius: 4px;'
      );
      console.log('Response Body:', response.data);
      console.groupEnd();
    }
    return response;
  },
  (error: AxiosError<{ message?: string; error?: string; code?: string }>) => {
    const duration = error.config?._startTime ? `${Date.now() - error.config._startTime}ms` : '';
    const method = error.config?.method?.toUpperCase() || 'GET';
    const url = error.config?.url || '';

    if (env.enableDebug && !axios.isCancel(error)) {
      console.groupCollapsed(
        `%c[HTTP ${error.response?.status || 'FAIL'}] ${method} ${url} ${duration ? `(${duration})` : ''}`,
        'color: #f87171; font-weight: bold; background: #1e1014; padding: 2px 6px; border-radius: 4px;'
      );
      console.error('Error Details:', error.response?.data || error.message);
      console.groupEnd();
    }

    // If request was canceled via AbortController, do not treat as error toast
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      (error as any).isCanceled = true;
      return Promise.reject(error);
    }

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Handle 401 Token Expiry / Unauthorized
      if (status === 401) {
        (error as any).isUnauthorized = true;
        const serverMessage = data?.error || data?.message || 'Authentication session has expired.';
        const isExpired = serverMessage.toLowerCase().includes('expired');
        (error as any).isTokenExpired = isExpired;

        // Auto logout & clear storage
        storage.clearAuthSession();

        // Capture intended path for redirect back if currently on protected page
        if (typeof window !== 'undefined') {
          const pathname = window.location.pathname;
          const search = window.location.search;
          const currentFull = pathname + search;
          // Authenticated routes redirect to login, guest routes do not record redirect
          const isGuestPath = pathname.startsWith('/login') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password');
          if (!isGuestPath && pathname !== '') {
            sessionStorage.setItem(STORAGE_KEYS.REDIRECT_AFTER_LOGIN, currentFull);
          }
        }

        // Single deduplicated toast using fixed ID in Sonner
        toast.error(isExpired ? 'API token expired. Please sign in again.' : 'Session expired. Please sign in.', {
          id: 'auth-session-expired',
          duration: 4000
        });

        window.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.UNAUTHORIZED, {
          detail: {
            message: serverMessage,
            isExpired
          }
        }));
      }

      // Flag Concurrency Conflict (409)
      if (status === 409) {
        (error as any).isConcurrencyConflict = true;
      }

      // Attach cleaned-up error message
      const serverMessage = data?.error || data?.message || error.message;
      (error as any).displayMessage = serverMessage;
    } else if (error.request) {
      (error as any).displayMessage = 'Network connection failed. Backend server unreachable.';
    } else {
      (error as any).displayMessage = error.message;
    }

    return Promise.reject(error);
  }
);
