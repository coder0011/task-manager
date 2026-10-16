import { pool } from '../config/db.js';
import { User, UserRole, UserFilterOptions, PaginatedResult } from '../types/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class UserRepository {
  async findAll(): Promise<User[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, email, full_name, avatar_url, role, is_active, created_at FROM users ORDER BY created_at DESC, updated_at DESC, id DESC`
    );
    return rows.map(r => ({
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      avatarUrl: r.avatar_url,
      role: r.role as UserRole,
      isActive: Boolean(r.is_active ?? 1),
      createdAt: r.created_at
    }));
  }

  async findPaginated(options: UserFilterOptions): Promise<PaginatedResult<User>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (options.role) {
      whereClauses.push('role = ?');
      queryParams.push(options.role);
    }

    if (options.status) {
      const active = options.status === 'ACTIVE' || options.status === 'true' ? 1 : 0;
      whereClauses.push('is_active = ?');
      queryParams.push(active);
    }

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      whereClauses.push('(full_name LIKE ? OR email LIKE ?)');
      queryParams.push(term, term);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM users WHERE ${whereSql}`,
      queryParams
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, email, full_name, avatar_url, role, is_active, created_at
       FROM users
       WHERE ${whereSql}
       ORDER BY created_at DESC, updated_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );


    const users: User[] = rows.map(r => ({
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      avatarUrl: r.avatar_url,
      role: r.role as UserRole,
      isActive: Boolean(r.is_active ?? 1),
      createdAt: r.created_at
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  async updateAvatar(id: number, avatarUrl: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET avatar_url = ? WHERE id = ?`,
      [avatarUrl, id]
    );
    return result.affectedRows > 0;
  }

  async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      avatarUrl: r.avatar_url,
      role: r.role as UserRole,
      isActive: Boolean(r.is_active ?? 1),
      passwordHash: r.password_hash,
      createdAt: r.created_at
    };
  }

  async findById(id: number): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, email, full_name, avatar_url, role, is_active, created_at FROM users WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      avatarUrl: r.avatar_url,
      role: r.role as UserRole,
      isActive: Boolean(r.is_active ?? 1),
      createdAt: r.created_at
    };
  }

  async create(user: { email: string; passwordHash: string; fullName: string; role?: UserRole }): Promise<User> {
    const role = user.role || 'MEMBER';
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, 1)`,
      [user.email, user.passwordHash, user.fullName, role]
    );
    return {
      id: result.insertId,
      email: user.email,
      fullName: user.fullName,
      role,
      isActive: true,
      createdAt: new Date()
    };
  }

  async updateRole(id: number, role: UserRole): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET role = ? WHERE id = ?`,
      [role, id]
    );
    return result.affectedRows > 0;
  }

  async updateStatus(id: number, isActive: boolean): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET is_active = ? WHERE id = ?`,
      [isActive ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM users WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  async updateProfile(id: number, data: { fullName?: string; avatarUrl?: string }): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           avatar_url = COALESCE(?, avatar_url)
       WHERE id = ?`,
      [data.fullName ?? null, data.avatarUrl ?? null, id]
    );
    return result.affectedRows > 0;
  }

  async updatePassword(id: number, passwordHash: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [passwordHash, id]
    );
    return result.affectedRows > 0;
  }

  async updatePasswordByEmail(email: string, passwordHash: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET password_hash = ? WHERE email = ?`,
      [passwordHash, email]
    );
    return result.affectedRows > 0;
  }

  async updateUser(
    id: number,
    data: { fullName?: string; email?: string; role?: UserRole; isActive?: boolean }
  ): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           role = COALESCE(?, role),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        data.fullName ?? null,
        data.email ?? null,
        data.role ?? null,
        data.isActive !== undefined ? (data.isActive ? 1 : 0) : null,
        id
      ]
    );
    return result.affectedRows > 0;
  }
}

export const userRepository = new UserRepository();
