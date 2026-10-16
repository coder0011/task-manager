/**
 * DataPure Enterprise Task Manager - Centralized API Endpoints
 * Strongly typed endpoint routes and URL builders for all frontend services.
 */

export const API_ENDPOINTS = {
  // --- Diagnostics & Health ---
  HEALTH: '/health',
  DEBUG: '/debug',

  // --- Authentication & Session Management ---
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    PROFILE: '/auth/profile',
    PROFILE_AVATAR: '/auth/profile/avatar',
    CHANGE_PASSWORD: '/auth/change-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // --- Boards & Sprint Columns ---
  BOARDS: {
    ROOT: '/boards',
    BY_SLUG: (slug: string = 'engineering-sprint') => `/boards/${slug}`,
  },

  // --- Tasks Lifecycle & Optimistic Concurrency Control (OCC) ---
  TASKS: {
    LIST: '/tasks',
    CREATE: '/tasks',
    BY_ID: (taskId: number | string) => `/tasks/${taskId}`,
    UPDATE: (taskId: number | string) => `/tasks/${taskId}`,
    DELETE: (taskId: number | string) => `/tasks/${taskId}`,
    MOVE: (taskId: number | string) => `/tasks/${taskId}/move`,
    ATTACHMENTS: (taskId: number | string) => `/tasks/${taskId}/attachments`,
  },

  // --- Task Comments Endpoints ---
  COMMENTS: {
    BY_TASK: (taskId: number | string) => `/tasks/${taskId}/comments`,
    DELETE: (commentId: number | string) => `/tasks/comments/${commentId}`,
  },

  // --- File Uploads & Binary Streams ---
  ATTACHMENTS: {
    BY_ID: (attachmentId: number | string) => `/attachments/${attachmentId}`,
    VIEW: (attachmentId: number | string) => `/api/attachments/${attachmentId}/view`,
    DOWNLOAD: (attachmentId: number | string) => `/api/attachments/${attachmentId}/download`,
  },

  // --- User Directory & Administration ---
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    BY_ID: (userId: number | string) => `/users/${userId}`,
    UPDATE: (userId: number | string) => `/users/${userId}`,
    AVATAR: (userId: number | string) => `/users/${userId}/avatar`,
    ROLE: (userId: number | string) => `/users/${userId}/role`,
    STATUS: (userId: number | string) => `/users/${userId}/status`,
    DELETE: (userId: number | string) => `/users/${userId}`,
  },

  // --- Dynamic RBAC Matrix & Permissions ---
  RBAC: {
    ROLES: '/rbac/roles',
    PERMISSIONS: '/rbac/permissions',
    ROLE_PERMISSIONS: (roleId: number | string) => `/rbac/roles/${roleId}/permissions`,
    ROLE_BY_ID: (roleId: number | string) => `/rbac/roles/${roleId}`,
  },

  // --- Immutable Activity Audit Logs ---
  ACTIVITY_LOGS: {
    LIST: '/activity-logs',
  },

  // --- Real-time Notifications ---
  NOTIFICATIONS: {
    ROOT: '/notifications',
    MARK_READ: (id: number | string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/mark-all-read',
    DELETE: (id: number | string) => `/notifications/${id}`,
    CLEAR_ALL: '/notifications',
  },
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
