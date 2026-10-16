/**
 * DataPure Enterprise Task Manager - Unified API Gateway
 * Composes domain-specific services with in-flight deduplication and type safety.
 */

import { authService } from './authService';
import { boardService } from './boardService';
import { taskService } from './taskService';
import { userService } from './userService';
import { rbacService } from './rbacService';
import { activityLogService } from './activityLogService';
import { notificationService } from './notificationService';

export const api = {
  // Auth Services
  login: authService.login,
  logout: authService.logout,
  register: authService.register,
  getMe: authService.getMe,
  forgotPassword: authService.forgotPassword,
  resetPassword: authService.resetPassword,
  updateProfile: authService.updateProfile,
  uploadMyAvatar: authService.uploadMyAvatar,
  changePassword: authService.changePassword,

  // Board Services
  getBoard: boardService.getBoard,

  // Task Services
  getTasks: taskService.getTasks,
  getTaskById: taskService.getTaskById,
  createTask: taskService.createTask,
  updateTask: taskService.updateTask,
  moveTask: taskService.moveTask,
  deleteTask: taskService.deleteTask,
  getComments: taskService.getComments,
  addComment: taskService.addComment,
  deleteComment: taskService.deleteComment,
  uploadAttachments: taskService.uploadAttachments,
  deleteAttachment: taskService.deleteAttachment,
  getAttachmentViewUrl: taskService.getAttachmentViewUrl,
  getAttachmentDownloadUrl: taskService.getAttachmentDownloadUrl,

  // User Services
  getUsers: userService.getUsers,
  getUserById: userService.getUserById,
  createUser: userService.createUser,
  updateUser: userService.updateUser,
  updateUserRole: userService.updateUserRole,
  updateUserStatus: userService.updateUserStatus,
  uploadUserAvatar: userService.uploadUserAvatar,
  deleteUser: userService.deleteUser,

  // RBAC Services
  getRoles: rbacService.getRoles,
  getPermissions: rbacService.getPermissions,
  getMatrix: rbacService.getMatrix,
  createRole: rbacService.createRole,
  updateRolePermissions: rbacService.updateRolePermissions,
  deleteRole: rbacService.deleteRole,

  // Activity Log Services
  getActivityLogs: activityLogService.getActivityLogs,

  // Notification Services
  getNotifications: notificationService.getNotifications,
  markNotificationRead: notificationService.markNotificationRead,
  markAllNotificationsRead: notificationService.markAllNotificationsRead,
  deleteNotification: notificationService.deleteNotification,
  clearAllNotifications: notificationService.clearAllNotifications,
};

export {
  authService,
  boardService,
  taskService,
  userService,
  rbacService,
  activityLogService,
  notificationService,
};

export default api;
