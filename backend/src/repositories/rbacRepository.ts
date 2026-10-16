import { pool } from '../config/db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface DbRole {
  id: number;
  key: string;
  name: string;
  description: string | null;
  is_system: number;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface DbPermission {
  id: number;
  key: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
}

// Repository for Role-Based Access Control (RBAC) operations
export class RbacRepository {
  // Retrieve all roles along with their associated permissions
  async getAllRoles(): Promise<DbRole[]> {
    const query = `
      SELECT 
        r.id,
        r.key,
        r.name,
        r.description,
        r.is_system,
        r.created_at,
        r.updated_at,
        COALESCE(
          JSON_ARRAYAGG(p.key),
          JSON_ARRAY()
        ) as permissions_json
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
      ORDER BY r.is_system DESC, r.name ASC
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query);
    return rows.map(row => {
      let permissions: string[] = [];
      try {
        const parsed = typeof row.permissions_json === 'string' 
          ? JSON.parse(row.permissions_json) 
          : row.permissions_json;
        permissions = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        permissions = [];
      }
      return {
        id: row.id,
        key: row.key,
        name: row.name,
        description: row.description,
        is_system: row.is_system,
        permissions,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
  }

  // Retrieve all permissions available in the system
  async getAllPermissions(): Promise<DbPermission[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, \`key\`, name, description, category, created_at FROM permissions ORDER BY category ASC, id ASC`
    );
    return rows as DbPermission[];
  }

  // Retrieve a specific role by its key, including its associated permissions
  async getRoleByKey(key: string): Promise<DbRole | null> {
    const query = `
      SELECT 
        r.id,
        r.key,
        r.name,
        r.description,
        r.is_system,
        r.created_at,
        r.updated_at,
        COALESCE(
          JSON_ARRAYAGG(p.key),
          JSON_ARRAY()
        ) as permissions_json
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.key = ?
      GROUP BY r.id
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query, [key]);
    if (!rows[0]) return null;
    const row = rows[0];
    let permissions: string[] = [];
    try {
      const parsed = typeof row.permissions_json === 'string' 
        ? JSON.parse(row.permissions_json) 
        : row.permissions_json;
      permissions = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      permissions = [];
    }
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      is_system: row.is_system,
      permissions,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  // Create a new role with the specified key, name, and optional description
  async createRole(key: string, name: string, description?: string): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO roles (\`key\`, name, description, is_system) VALUES (?, ?, ?, 0)`,
      [key.toUpperCase(), name, description || null]
    );
    return result.insertId;
  }

  // Update the permissions associated with a specific role, replacing any existing permissions
  async updateRolePermissions(roleId: number, permissionKeys: string[]): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Clear existing permissions for role
      await connection.query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);

      if (permissionKeys.length > 0) {
        // Resolve permission IDs from keys
        const [permRows] = await connection.query<RowDataPacket[]>(
          `SELECT id, \`key\` FROM permissions WHERE \`key\` IN (?)`,
          [permissionKeys]
        );

        for (const p of permRows) {
          await connection.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
            [roleId, p.id]
          );
        }
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // Delete a role by its ID, ensuring it's not a system role
  async deleteRole(roleId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM roles WHERE id = ? AND is_system = 0`,
      [roleId]
    );
    return result.affectedRows > 0;
  }
}

export const rbacRepository = new RbacRepository();
