import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Permission } from '../types';
import { api } from '../services/api';
import { storage } from '../lib/storage';
import { apiDeduplicator } from '../services/apiDeduplicator';
import { queryClient } from '../lib/queryClient';
import { CUSTOM_EVENTS, DEFAULT_ROLE_PERMISSIONS } from '../constants/appConstants';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => storage.getUser<User>());
  const [token, setToken] = useState<string | null>(() => storage.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await api.logout().catch(() => {});
      }
    } finally {
      // Clear in-flight request cache and TanStack Query cache
      apiDeduplicator.clear();
      queryClient.clear();
      // Purge all localStorage, sessionStorage, and document cookies
      storage.clearAllSessionData();
      // Reset React auth state
      setUser(null);
      setToken(null);
    }
  }, [token]);

  // Sync session on mount
  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const freshUser = await api.getMe();
          setUser(freshUser);
          storage.setUser(freshUser);
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    verifySession();

    // Listen for 401 unauthorized trigger from Axios interceptor
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener(CUSTOM_EVENTS.UNAUTHORIZED, handleUnauthorized);
    return () => {
      window.removeEventListener(CUSTOM_EVENTS.UNAUTHORIZED, handleUnauthorized);
    };
  }, [token, logout]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setUser(res.user);
    setToken(res.token);
    storage.setToken(res.token);
    storage.setUser(res.user);
  };

  const register = async (email: string, password: string, fullName: string) => {
    const res = await api.register(email, password, fullName);
    setUser(res.user);
    setToken(res.token);
    storage.setToken(res.token);
    storage.setUser(res.user);
  };

  /**
   * Checks if the authenticated user possesses one of the target roles.
   * Case-insensitive comparison matching against user.role.
   */
  const hasRole = useCallback(
    (roles: string | string[]): boolean => {
      if (!user) return false;
      const targetRoles = Array.isArray(roles) ? roles : [roles];
      return targetRoles.map(r => r.toUpperCase()).includes((user.role || '').toUpperCase());
    },
    [user]
  );

  /**
   * Evaluates if the authenticated user has a specific granular permission.
   * Administrators automatically bypass and evaluate to true for all permissions.
   */
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      const roleUpper = (user.role || '').toUpperCase();
      if (roleUpper === 'ADMIN') return true;
      const allowed = (DEFAULT_ROLE_PERMISSIONS as Record<string, Permission[]>)[roleUpper] || [];
      return allowed.includes(permission);
    },
    [user]
  );

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
      storage.setUser(freshUser);
      return freshUser;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        register,
        logout,
        hasRole,
        hasPermission,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
