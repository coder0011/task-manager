/**
 * DataPure Enterprise Task Manager - Application Constants
 * Reusable constants for roles, priorities, categories, storage keys, routes, and pagination.
 */

import type { Priority, TaskCategory, TaskStatus, UserRole, Permission } from '../types';

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'task:create',
    'task:edit',
    'task:delete',
    'task:move',
    'user:manage',
    'user:view',
    'audit:view'
  ],
  MEMBER: [
    'task:create',
    'task:edit',
    'task:delete',
    'task:move',
    'user:view',
    'audit:view'
  ],
  VIEWER: [
    'user:view'
  ]
};

export const STORAGE_KEYS = {
  TOKEN: 'datapure_token',
  USER: 'datapure_user',
  REDIRECT_AFTER_LOGIN: 'datapure_redirect_after_login',
  VIEW_MODE_PREFERENCE: 'datapure_view_mode',
} as const;

export const CUSTOM_EVENTS = {
  UNAUTHORIZED: 'datapure:unauthorized',
} as const;

export const APP_ROUTES = {
  ROOT: '/',
  BOARD: '/kanban',
  TABLE: '/table',
  TEAM: '/team',
  RBAC: '/rbac',
  AUDIT: '/audit',
  PROFILE: '/profile',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  NOT_FOUND: '/404',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

export const TASK_PRIORITIES: { value: Priority; label: string; dotColor: string }[] = [
  { value: 'LOW', label: 'Low', dotColor: 'bg-zinc-400' },
  { value: 'MEDIUM', label: 'Medium', dotColor: 'bg-blue-400' },
  { value: 'HIGH', label: 'High', dotColor: 'bg-amber-400' },
  { value: 'URGENT', label: 'Urgent', dotColor: 'bg-red-400' },
];

export const TASK_CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'DEVOPS', label: 'DevOps' },
  { value: 'TESTING', label: 'Testing' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'RESEARCH', label: 'Research' },
  { value: 'OPERATIONS', label: 'Operations' },
];

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

export const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Full administrative access to manage tasks, team members, roles, and audit trail',
  },
  {
    value: 'MEMBER',
    label: 'Member',
    description: 'Core team contributor with rights to create, edit, move tasks, and post comments',
  },
  {
    value: 'VIEWER',
    label: 'Viewer',
    description: 'Read-only stakeholder with view privileges across boards and user directory',
  },
];

export const FILE_UPLOAD_LIMITS = {
  AVATAR_MAX_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
  AVATAR_ACCEPTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ATTACHMENT_MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ATTACHMENT_MAX_FILES_COUNT: 5,
} as const;
