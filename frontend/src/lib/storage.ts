/**
 * DataPure Enterprise Task Manager - Safe Storage Wrapper
 * Handles LocalStorage and SessionStorage with JSON parsing error protection and SSR safety.
 */

import { STORAGE_KEYS } from '../constants/appConstants';

export const storage = {
  /**
   * Safely gets an item from localStorage.
   */
  get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    } catch (e) {
      console.warn(`[storage.get] Error reading key "${key}":`, e);
      return fallback;
    }
  },

  /**
   * Safely sets an item in localStorage.
   */
  set<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.warn(`[storage.set] Error writing key "${key}":`, e);
      return false;
    }
  },

  /**
   * Safely removes an item from localStorage.
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[storage.remove] Error removing key "${key}":`, e);
    }
  },

  /**
   * Safely clears all items from both localStorage and sessionStorage.
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('[storage.clear] Error clearing storage:', e);
    }
  },

  /**
   * Safely gets an item from sessionStorage.
   */
  getSession<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = sessionStorage.getItem(key);
      if (item === null) return fallback;
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    } catch (e) {
      console.warn(`[storage.getSession] Error reading key "${key}":`, e);
      return fallback;
    }
  },

  /**
   * Safely sets an item in sessionStorage.
   */
  setSession<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      sessionStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.warn(`[storage.setSession] Error writing key "${key}":`, e);
      return false;
    }
  },

  /**
   * Safely removes an item from sessionStorage.
   */
  removeSession(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn(`[storage.removeSession] Error removing key "${key}":`, e);
    }
  },

  // --- Auth Specific Helpers ---

  getToken(): string | null {
    return this.get<string | null>(STORAGE_KEYS.TOKEN, null);
  },

  setToken(token: string): void {
    this.set(STORAGE_KEYS.TOKEN, token);
  },

  removeToken(): void {
    this.remove(STORAGE_KEYS.TOKEN);
  },

  getUser<T>(): T | null {
    return this.get<T | null>(STORAGE_KEYS.USER, null);
  },

  setUser<T>(user: T): void {
    this.set(STORAGE_KEYS.USER, user);
  },

  removeUser(): void {
    this.remove(STORAGE_KEYS.USER);
  },

  /**
   * Enterprise session purge:
   * 1. Removes all auth keys and clears localStorage.
   * 2. Clears all temporary state from sessionStorage.
   * 3. Expires and drops all accessible client-side browser cookies.
   */
  clearAllSessionData(): void {
    if (typeof window === 'undefined') return;

    try {
      // 1. Clear LocalStorage
      this.removeToken();
      this.removeUser();
      localStorage.clear();

      // 2. Clear SessionStorage
      sessionStorage.clear();

      // 3. Clear readable browser cookies
      if (document && document.cookie) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          if (name) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            if (window.location && window.location.hostname) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[storage.clearAllSessionData] Error clearing session storage:', e);
    }
  },

  clearAuthSession(): void {
    this.clearAllSessionData();
  },

  getRedirectAfterLogin(): string | null {
    return this.getSession<string | null>(STORAGE_KEYS.REDIRECT_AFTER_LOGIN, null);
  },

  setRedirectAfterLogin(path: string): void {
    this.setSession(STORAGE_KEYS.REDIRECT_AFTER_LOGIN, path);
  },

  clearRedirectAfterLogin(): void {
    this.removeSession(STORAGE_KEYS.REDIRECT_AFTER_LOGIN);
  },
};
