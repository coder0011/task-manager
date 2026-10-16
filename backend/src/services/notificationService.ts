import { notificationRepository, NotificationRepository, CreateNotificationDTO } from '../repositories/notificationRepository.js';
import { userRepository, UserRepository } from '../repositories/userRepository.js';
import { AppNotification, Task, Comment } from '../types/index.js';
import logger from '../utils/logger.js';


export class NotificationService {
  constructor(
    private notifRepo: NotificationRepository = notificationRepository,
    private userRepo: UserRepository = userRepository
  ) {}

  // Retrieves notifications for a user along with the count of unread notifications
  async getUserNotifications(userId: number, limit = 50): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const [notifications, unreadCount] = await Promise.all([
      this.notifRepo.findByUserId(userId, limit),
      this.notifRepo.countUnreadByUserId(userId)
    ]);
    return { notifications, unreadCount };
  }

  // Marks a specific notification as read for the user
  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    return this.notifRepo.markAsRead(notificationId, userId);
  }

  // Marks all notifications as read for the user
  async markAllAsRead(userId: number): Promise<number> {
    return this.notifRepo.markAllAsRead(userId);
  }

  /**
   * Retrieves active workspace administrator IDs for system-wide alerts.
   */
  private async getAdminUserIds(): Promise<number[]> {
    try {
      const users = await this.userRepo.findAll();
      return users.filter(u => u.role === 'ADMIN' && u.isActive).map(u => u.id);
    } catch (err) {
      logger.warn({ err }, '[NotificationService] Error fetching admin user IDs');
      return [];
    }
  }

  /**
   * Dispatches task assignment notifications:
   * - Assigned member receives assignment notification.
   * - Unassigned member receives unassignment notification.
   * - All workspace administrators receive assignment event updates.
   */
  async notifyTaskAssignment(params: {
    task: Task;
    previousAssigneeId?: number;
    newAssigneeId?: number;
    actorId?: number;
  }): Promise<void> {
    try {
      const { task, previousAssigneeId, newAssigneeId, actorId } = params;
      const records: CreateNotificationDTO[] = [];
      const adminIds = await this.getAdminUserIds();
      const notifiedUserIds = new Set<number>();

      // 1. Notify newly assigned member
      if (newAssigneeId && newAssigneeId !== actorId) {
        records.push({
          userId: newAssigneeId,
          actorId,
          taskId: task.id,
          type: 'TASK_ASSIGNED',
          title: `Assigned: ${task.taskKey}`,
          message: `You have been assigned to task "${task.title}".`
        });
        notifiedUserIds.add(newAssigneeId);
      }

      // 2. Notify unassigned member
      if (previousAssigneeId && previousAssigneeId !== newAssigneeId && previousAssigneeId !== actorId) {
        records.push({
          userId: previousAssigneeId,
          actorId,
          taskId: task.id,
          type: 'TASK_UNASSIGNED',
          title: `Unassigned: ${task.taskKey}`,
          message: `You were unassigned from task "${task.title}".`
        });
        notifiedUserIds.add(previousAssigneeId);
      }

      // 3. Notify Admins
      for (const adminId of adminIds) {
        if (adminId !== actorId && !notifiedUserIds.has(adminId)) {
          const actionText = newAssigneeId ? 'assigned' : 'unassigned';
          records.push({
            userId: adminId,
            actorId,
            taskId: task.id,
            type: newAssigneeId ? 'TASK_ASSIGNED' : 'TASK_UNASSIGNED',
            title: `Task ${task.taskKey} ${actionText}`,
            message: `Task "${task.title}" was ${actionText}.`
          });
        }
      }

      if (records.length > 0) {
        await this.notifRepo.createBatch(records);
      }
    } catch (err) {
      logger.warn({ err }, '[NotificationService] Failed to dispatch task assignment notifications');
    }
  }

  /**
   * Dispatches task status change notifications:
   * - Task assignee (member) receives status change notification.
   * - All workspace administrators receive status change notification.
   */
  async notifyTaskStatusChange(params: {
    task: Task;
    oldStatus?: string;
    newStatus: string;
    actorId?: number;
  }): Promise<void> {
    try {
      const { task, newStatus, actorId } = params;
      const records: CreateNotificationDTO[] = [];
      const adminIds = await this.getAdminUserIds();
      const notifiedUserIds = new Set<number>();

      // 1. Notify Assignee (if not the actor)
      if (task.assigneeId && task.assigneeId !== actorId) {
        records.push({
          userId: task.assigneeId,
          actorId,
          taskId: task.id,
          type: 'TASK_STATUS_CHANGED',
          title: `Status: ${task.taskKey}`,
          message: `Task "${task.title}" status changed to ${newStatus}.`
        });
        notifiedUserIds.add(task.assigneeId);
      }

      // 2. Notify Admins
      for (const adminId of adminIds) {
        if (adminId !== actorId && !notifiedUserIds.has(adminId)) {
          records.push({
            userId: adminId,
            actorId,
            taskId: task.id,
            type: 'TASK_STATUS_CHANGED',
            title: `Task ${task.taskKey} Status Changed`,
            message: `Task "${task.title}" status moved to ${newStatus}.`
          });
        }
      }

      if (records.length > 0) {
        await this.notifRepo.createBatch(records);
      }
    } catch (err) {
      logger.warn({ err }, '[NotificationService] Failed to dispatch status change notifications');
    }
  }

  /**
   * Dispatches task creation notification strictly to workspace Admins.
   */
  async notifyTaskCreated(task: Task, actorId?: number): Promise<void> {
    try {
      const adminIds = await this.getAdminUserIds();
      const records: CreateNotificationDTO[] = [];

      // If assignee is set on creation and not actor, notify assignee as TASK_ASSIGNED
      if (task.assigneeId && task.assigneeId !== actorId) {
        records.push({
          userId: task.assigneeId,
          actorId,
          taskId: task.id,
          type: 'TASK_ASSIGNED',
          title: `Assigned: ${task.taskKey}`,
          message: `You were assigned to new task "${task.title}".`
        });
      }

      // Notify Admins
      for (const adminId of adminIds) {
        if (adminId !== actorId && adminId !== task.assigneeId) {
          records.push({
            userId: adminId,
            actorId,
            taskId: task.id,
            type: 'TASK_CREATED',
            title: `Task Created: ${task.taskKey}`,
            message: `New task "${task.title}" was created.`
          });
        }
      }

      if (records.length > 0) {
        await this.notifRepo.createBatch(records);
      }
    } catch (err) {
      logger.warn({ err }, '[NotificationService] Failed to dispatch task created notifications');
    }
  }

  /**
   * Dispatches task deletion notification strictly to workspace Admins.
   */
  async notifyTaskDeleted(taskKey: string, title: string, actorId?: number): Promise<void> {
    try {
      const adminIds = await this.getAdminUserIds();
      const records: CreateNotificationDTO[] = [];

      for (const adminId of adminIds) {
        if (adminId !== actorId) {
          records.push({
            userId: adminId,
            actorId,
            type: 'TASK_DELETED',
            title: `Task Deleted: ${taskKey}`,
            message: `Task "${title}" (${taskKey}) was deleted.`
          });
        }
      }

      if (records.length > 0) {
        await this.notifRepo.createBatch(records);
      }
    } catch (err) {
      logger.warn({ err }, '[NotificationService] Failed to dispatch task deleted notifications');
    }
  }

  /**
   * Dispatches task comment notifications to:
   * - Task assignee (if not commenter)
   * - Task reporter (if not commenter)
   */
  async notifyCommentAdded(params: {
    task: Task;
    comment: Comment;
    actorId?: number;
  }): Promise<void> {
    try {
      const { task, comment, actorId } = params;
      const records: CreateNotificationDTO[] = [];
      const notifiedUserIds = new Set<number>();
      if (actorId) notifiedUserIds.add(actorId);

      // 1. Notify Assignee
      if (task.assigneeId && !notifiedUserIds.has(task.assigneeId)) {
        records.push({
          userId: task.assigneeId,
          actorId,
          taskId: task.id,
          type: 'TASK_COMMENT_ADDED',
          title: `New Comment: ${task.taskKey}`,
          message: `${comment.authorName || 'Someone'} commented on "${task.title}": "${comment.content.slice(0, 100)}"`
        });
        notifiedUserIds.add(task.assigneeId);
      }

      // 2. Notify Reporter
      if (task.reporterId && !notifiedUserIds.has(task.reporterId)) {
        records.push({
          userId: task.reporterId,
          actorId,
          taskId: task.id,
          type: 'TASK_COMMENT_ADDED',
          title: `New Comment: ${task.taskKey}`,
          message: `${comment.authorName || 'Someone'} commented on "${task.title}": "${comment.content.slice(0, 100)}"`
        });
        notifiedUserIds.add(task.reporterId);
      }

      if (records.length > 0) {
        await this.notifRepo.createBatch(records);
      }
    } catch (err) {
      logger.warn({ err }, '[NotificationService] Failed to dispatch comment notifications');
    }
  }

  /**
   * Dispatches priority escalation notifications:
   * - Assignee
   * - Workspace Admins
   */
  async notifyPriorityEscalated(params: {
    task: Task;
    oldPriority: string;
    newPriority: string;
    actorId?: number;
  }): Promise<void> {
    try {
      const { task, oldPriority, newPriority, actorId } = params;
      const records: CreateNotificationDTO[] = [];
      const adminIds = await this.getAdminUserIds();
      const notifiedUserIds = new Set<number>();
      if (actorId) notifiedUserIds.add(actorId);

      // 1. Notify Assignee
      if (task.assigneeId && !notifiedUserIds.has(task.assigneeId)) {
        records.push({
          userId: task.assigneeId,
          actorId,
          taskId: task.id,
          type: 'TASK_PRIORITY_ESCALATED',
          title: `Priority Escalated: ${task.taskKey}`,
          message: `Task "${task.title}" priority was escalated to ${newPriority}.`
        });
        notifiedUserIds.add(task.assigneeId);
      }

      // 2. Notify Admins
      for (const adminId of adminIds) {
        if (!notifiedUserIds.has(adminId)) {
          records.push({
            userId: adminId,
            actorId,
            taskId: task.id,
            type: 'TASK_PRIORITY_ESCALATED',
            title: `Task ${task.taskKey} Escalated to ${newPriority}`,
            message: `Task "${task.title}" was escalated from ${oldPriority} to ${newPriority}.`
          });
          notifiedUserIds.add(adminId);
        }
      }

      if (records.length > 0) {
        await this.notifRepo.createBatch(records);
      }
    } catch (err) {
      logger.warn({ err }, '[NotificationService] Failed to dispatch priority escalation notifications');
    }
  }


  /**
   * Deletes a specific notification belonging to the user.
   */
  async deleteNotification(notificationId: number, userId: number): Promise<boolean> {
    return this.notifRepo.delete(notificationId, userId);
  }

  /**
   * Clears all notifications for the user.
   */
  async clearAllNotifications(userId: number): Promise<number> {
    return this.notifRepo.deleteAll(userId);
  }
}

export const notificationService = new NotificationService();
