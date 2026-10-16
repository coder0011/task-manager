export type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type SortOrder = 'asc' | 'desc';
export type TaskCategory =
  | 'DESIGN'
  | 'DEVELOPMENT'
  | 'DEVOPS'
  | 'TESTING'
  | 'MARKETING'
  | 'RESEARCH'
  | 'OPERATIONS';
export type UserRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export type Permission =
  | 'task:create'
  | 'task:edit'
  | 'task:delete'
  | 'task:move'
  | 'user:manage'
  | 'user:view'
  | 'audit:view';

export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface Attachment {
  id: number;
  taskId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: number;
  uploaderName?: string;
  url: string;
  createdAt: string;
}

export interface Comment {
  id: number;
  taskId: number;
  userId: number;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorRole?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  taskKey: string;
  boardId: number;
  columnId: number;
  title: string;
  description?: string;
  priority: Priority;
  category: TaskCategory;
  status: TaskStatus;
  orderIndex: number;
  assigneeId?: number;
  assigneeName?: string;
  assigneeAvatar?: string;
  reporterId: number;
  reporterName?: string;
  reporterAvatar?: string;
  dueDate?: string;
  version: number;
  comments?: Comment[];
  commentCount?: number;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: number;
  boardId: number;
  name: string;
  color: string;
  orderIndex: number;
}

export interface Board {
  id: number;
  name: string;
  slug: string;
  description?: string;
  columns: Column[];
}

export type ViewMode = 'KANBAN' | 'TABLE';
export type ActiveTab =
  | 'BOARD'
  | 'USERS'
  | 'RBAC'
  | 'AUDIT'
  | 'PROFILE'
  | 'LOGIN'
  | 'FORGOT_PASSWORD'
  | 'RESET_PASSWORD'
  | 'NOT_FOUND';

export interface CreateUserInput {
  email: string;
  fullName: string;
  role?: string;
  password?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

export interface UpdateProfileInput {
  fullName?: string;
  avatarUrl?: string;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TaskFilterOptions {
  boardId?: number;
  columnId?: number;
  priority?: Priority | 'ALL';
  category?: TaskCategory | 'ALL';
  status?: TaskStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  all?: boolean;
}

export interface ActivityLog {
  id: number;
  userId: number | null;
  userName: string;
  userEmail: string | null;
  userAvatar: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface RoleDefinition {
  id: number;
  key: string;
  name: string;
  description: string | null;
  is_system: number;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface PermissionDefinition {
  id: number;
  key: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
}

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_UNASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_CREATED'
  | 'TASK_DELETED'
  | 'TASK_COMMENT_ADDED'
  | 'TASK_PRIORITY_ESCALATED';


export interface AppNotification {
  id: number;
  userId: number;
  actorId?: number;
  actorName?: string;
  taskId?: number;
  taskKey?: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}
