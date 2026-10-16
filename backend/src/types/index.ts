export type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
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
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
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
  createdAt: Date;
}

export interface Board {
  id: number;
  name: string;
  slug: string;
  description?: string;
  createdBy: number;
  columns?: Column[];
}

export interface Column {
  id: number;
  boardId: number;
  name: string;
  color: string;
  orderIndex: number;
  tasks?: Task[];
}

export interface Comment {
  id: number;
  taskId: number;
  userId: number;
  authorName?: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorRole?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMetadata;
}

export interface UserFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
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
  createdAt: Date;
  updatedAt: Date;
}
