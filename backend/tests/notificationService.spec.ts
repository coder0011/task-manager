import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '../src/services/notificationService';
import { NotificationRepository, CreateNotificationDTO } from '../src/repositories/notificationRepository';
import { UserRepository } from '../src/repositories/userRepository';
import { AppNotification, Task, User } from '../src/types';

class MockNotificationRepository extends NotificationRepository {
  public notifications: AppNotification[] = [];

  async findByUserId(userId: number): Promise<AppNotification[]> {
    return this.notifications.filter(n => n.userId === userId);
  }

  async countUnreadByUserId(userId: number): Promise<number> {
    return this.notifications.filter(n => n.userId === userId && !n.isRead).length;
  }

  async create(data: CreateNotificationDTO): Promise<AppNotification> {
    const notif: AppNotification = {
      id: this.notifications.length + 1,
      userId: data.userId,
      actorId: data.actorId,
      taskId: data.taskId,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.notifications.push(notif);
    return notif;
  }

  async createBatch(records: CreateNotificationDTO[]): Promise<void> {
    for (const r of records) {
      await this.create(r);
    }
  }

  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const notif = this.notifications.find(n => n.id === notificationId && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      return true;
    }
    return false;
  }

  async markAllAsRead(userId: number): Promise<number> {
    let count = 0;
    this.notifications.forEach(n => {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        count++;
      }
    });
    return count;
  }

  async delete(notificationId: number, userId: number): Promise<boolean> {
    const idx = this.notifications.findIndex(n => n.id === notificationId && n.userId === userId);
    if (idx !== -1) {
      this.notifications.splice(idx, 1);
      return true;
    }
    return false;
  }

  async deleteAll(userId: number): Promise<number> {
    const initialLen = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.userId !== userId);
    return initialLen - this.notifications.length;
  }
}

class MockUserRepository extends UserRepository {
  private users: User[] = [
    { id: 1, email: 'admin@datapure.io', fullName: 'Admin User', role: 'ADMIN', isActive: true, createdAt: new Date() },
    { id: 2, email: 'member@datapure.io', fullName: 'Member One', role: 'MEMBER', isActive: true, createdAt: new Date() },
    { id: 3, email: 'member2@datapure.io', fullName: 'Member Two', role: 'MEMBER', isActive: true, createdAt: new Date() }
  ];

  async findAll(): Promise<User[]> {
    return this.users;
  }
}

describe('NotificationService', () => {
  let notifRepo: MockNotificationRepository;
  let userRepo: MockUserRepository;
  let service: NotificationService;

  const sampleTask: Task = {
    id: 101,
    taskKey: 'DP-101',
    boardId: 1,
    columnId: 1,
    title: 'Implement notifications',
    priority: 'HIGH',
    category: 'DEVELOPMENT',
    status: 'TODO',
    orderIndex: 1000,
    reporterId: 1,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    notifRepo = new MockNotificationRepository();
    userRepo = new MockUserRepository();
    service = new NotificationService(notifRepo, userRepo);
  });

  it('notifies assigned member and admin on task assignment', async () => {
    await service.notifyTaskAssignment({
      task: sampleTask,
      newAssigneeId: 2,
      actorId: 1 // Admin is actor
    });

    // Member 2 should receive TASK_ASSIGNED
    const memberNotifs = await service.getUserNotifications(2);
    expect(memberNotifs.notifications).toHaveLength(1);
    expect(memberNotifs.notifications[0].type).toBe('TASK_ASSIGNED');
    expect(memberNotifs.notifications[0].title).toContain('DP-101');

    // Member 3 (unrelated member) receives 0 notifications
    const otherMemberNotifs = await service.getUserNotifications(3);
    expect(otherMemberNotifs.notifications).toHaveLength(0);
  });

  it('notifies assigned member and admin on task status change', async () => {
    const assignedTask = { ...sampleTask, assigneeId: 2 };

    await service.notifyTaskStatusChange({
      task: assignedTask,
      newStatus: 'IN_PROGRESS',
      actorId: 3 // Actor is member 3
    });

    // Member 2 (assignee) should receive status change notification
    const memberNotifs = await service.getUserNotifications(2);
    expect(memberNotifs.notifications).toHaveLength(1);
    expect(memberNotifs.notifications[0].type).toBe('TASK_STATUS_CHANGED');

    // Admin 1 should also receive status change notification
    const adminNotifs = await service.getUserNotifications(1);
    expect(adminNotifs.notifications).toHaveLength(1);
    expect(adminNotifs.notifications[0].type).toBe('TASK_STATUS_CHANGED');
  });

  it('notifies admin on task creation, but not unrelated members', async () => {
    await service.notifyTaskCreated(sampleTask, 2); // Created by Member 2 without assignee

    // Admin 1 receives TASK_CREATED
    const adminNotifs = await service.getUserNotifications(1);
    expect(adminNotifs.notifications).toHaveLength(1);
    expect(adminNotifs.notifications[0].type).toBe('TASK_CREATED');

    // Member 3 receives nothing
    const member3Notifs = await service.getUserNotifications(3);
    expect(member3Notifs.notifications).toHaveLength(0);
  });

  it('correctly marks individual and all notifications as read', async () => {
    await service.notifyTaskAssignment({
      task: sampleTask,
      newAssigneeId: 2,
      actorId: 1
    });

    const initial = await service.getUserNotifications(2);
    expect(initial.unreadCount).toBe(1);

    // Mark single as read
    await service.markAsRead(initial.notifications[0].id, 2);
    const afterSingle = await service.getUserNotifications(2);
    expect(afterSingle.unreadCount).toBe(0);

    // Add another notification
    await service.notifyTaskStatusChange({
      task: { ...sampleTask, assigneeId: 2 },
      newStatus: 'DONE',
      actorId: 1
    });
    const beforeBulk = await service.getUserNotifications(2);
    expect(beforeBulk.unreadCount).toBe(1);

    // Mark all as read
    await service.markAllAsRead(2);
    const afterBulk = await service.getUserNotifications(2);
    expect(afterBulk.unreadCount).toBe(0);
  });

  it('correctly deletes individual and clears all notifications', async () => {
    await service.notifyTaskAssignment({
      task: sampleTask,
      newAssigneeId: 2,
      actorId: 1
    });
    await service.notifyTaskStatusChange({
      task: { ...sampleTask, assigneeId: 2 },
      newStatus: 'DONE',
      actorId: 1
    });

    const userNotifs = await service.getUserNotifications(2);
    expect(userNotifs.notifications.length).toBe(2);

    // Delete first notification
    const deleted = await service.deleteNotification(userNotifs.notifications[0].id, 2);
    expect(deleted).toBe(true);

    const afterDelete = await service.getUserNotifications(2);
    expect(afterDelete.notifications.length).toBe(1);

    // Clear all
    const clearedCount = await service.clearAllNotifications(2);
    expect(clearedCount).toBe(1);

    const afterClear = await service.getUserNotifications(2);
    expect(afterClear.notifications.length).toBe(0);
  });
});
