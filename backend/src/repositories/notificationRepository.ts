import { pool } from '../config/db.js';
import { AppNotification, NotificationType } from '../types/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CreateNotificationDTO {
  userId: number;
  actorId?: number;
  taskId?: number;
  type: NotificationType;
  title: string;
  message: string;
}

// Repository for Notification operations
export class NotificationRepository {
   // Map a database row to an AppNotification object
  private mapRowToNotification(r: any): AppNotification {
    return {
      id: r.id,
      userId: r.user_id,
      actorId: r.actor_id,
      actorName: r.actorName || undefined,
      taskId: r.task_id,
      taskKey: r.taskKey || undefined,
      type: r.type as NotificationType,
      title: r.title,
      message: r.message,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }
 // Retrieve notifications for a specific user, ordered by creation date
  async findByUserId(userId: number, limit = 50): Promise<AppNotification[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT n.*, u.full_name AS actorName, t.task_key AS taskKey
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       LEFT JOIN tasks t ON n.task_id = t.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows.map(r => this.mapRowToNotification(r));
  }

  // Count unread notifications for a specific user
  async countUnreadByUserId(userId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return rows[0]?.unreadCount || 0;
  }

  async create(data: CreateNotificationDTO): Promise<AppNotification> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO notifications (user_id, actor_id, task_id, type, title, message, is_read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [data.userId, data.actorId || null, data.taskId || null, data.type, data.title, data.message]
    );
    const newId = result.insertId;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT n.*, u.full_name AS actorName, t.task_key AS taskKey
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       LEFT JOIN tasks t ON n.task_id = t.id
       WHERE n.id = ?`,
      [newId]
    );
    return this.mapRowToNotification(rows[0]);
  }

  // Create multiple notifications in a single batch operation
  async createBatch(records: CreateNotificationDTO[]): Promise<void> {
    if (records.length === 0) return;
    const values = records.map(r => [
      r.userId,
      r.actorId || null,
      r.taskId || null,
      r.type,
      r.title,
      r.message,
      0
    ]);
    await pool.query(
      `INSERT INTO notifications (user_id, actor_id, task_id, type, title, message, is_read)
       VALUES ?`,
      [values]
    );
  }

  // Mark a specific notification as read for a user
  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const [res] = await pool.query<ResultSetHeader>(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return res.affectedRows > 0;
  }

  // Mark all unread notifications as read for a user
  async markAllAsRead(userId: number): Promise<number> {
    const [res] = await pool.query<ResultSetHeader>(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return res.affectedRows;
  }

   // Delete a specific notification for a user
  async delete(notificationId: number, userId: number): Promise<boolean> {
    const [res] = await pool.query<ResultSetHeader>(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return res.affectedRows > 0;
  }
  
 // Delete all notifications for a specific user
  async deleteAll(userId: number): Promise<number> {
    const [res] = await pool.query<ResultSetHeader>(
      'DELETE FROM notifications WHERE user_id = ?',
      [userId]
    );
    return res.affectedRows;
  }
}

export const notificationRepository = new NotificationRepository();
