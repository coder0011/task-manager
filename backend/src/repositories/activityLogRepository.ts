import { pool } from '../config/db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface ActivityLogItem {
  id: number;
  userId: number | null;
  userName: string | null;
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

export interface ActivityLogQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  entityId?: number;
  userId?: number;
}

// Repository for Activity Log operations
export class ActivityLogRepository {
  // Create a new activity log entry in the database
  async createLog(data: {
    userId?: number;
    action: string;
    entityType: string;
    entityId?: number;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<number> {
    const detailsJson = data.details ? JSON.stringify(data.details) : null;
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId || null,
        data.action,
        data.entityType,
        data.entityId || null,
        detailsJson,
        data.ipAddress || null,
        data.userAgent ? data.userAgent.slice(0, 255) : null
      ]
    );
    return result.insertId;
  }

  // Retrieve logs with optional filtering and pagination
  async getLogs(params: ActivityLogQueryParams): Promise<{ logs: ActivityLogItem[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];

    if (params.action) {
      conditions.push('a.action = ?');
      values.push(params.action);
    }
    if (params.entityType) {
      conditions.push('a.entity_type = ?');
      values.push(params.entityType);
    }
    if (params.entityId) {
      conditions.push('a.entity_id = ?');
      values.push(params.entityId);
    }
    if (params.userId) {
      conditions.push('a.user_id = ?');
      values.push(params.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM activity_logs a ${whereClause}`,
      values
    );
    const total = Number(countRows[0]?.total || 0);

    // Data query with User join
    const dataQuery = `
      SELECT 
        a.id,
        a.user_id,
        u.full_name as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar,
        a.action,
        a.entity_type,
        a.entity_id,
        a.details,
        a.ip_address,
        a.user_agent,
        a.created_at
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(dataQuery, [...values, limit, offset]);

    const logs: ActivityLogItem[] = rows.map(r => {
      let details: any = null;
      try {
        details = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
      } catch {
        details = r.details;
      }
      return {
        id: r.id,
        userId: r.user_id,
        userName: r.user_name || 'System / Anonymous',
        userEmail: r.user_email || null,
        userAvatar: r.user_avatar || null,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        details,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        createdAt: r.created_at
      };
    });

    return { logs, total };
  }
}

export const activityLogRepository = new ActivityLogRepository();
