import { pool } from '../config/db.js';
import { Board, Column } from '../types/index.js';
import { RowDataPacket } from 'mysql2';

// Repository for Board-related database operations
export class BoardRepository {
  // Find a board by its slug, including its columns
  async findBySlug(slug: string): Promise<(Board & { columns: Column[] }) | null> {
    const [boardRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM boards WHERE slug = ?`,
      [slug]
    );
    if (boardRows.length === 0) return null;
    const b = boardRows[0];

    const [colRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM columns WHERE board_id = ? ORDER BY order_index ASC`,
      [b.id]
    );

    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      createdBy: b.created_by,
      columns: (colRows as any[]).map(c => ({
        id: c.id,
        boardId: c.board_id,
        name: c.name,
        color: c.color,
        orderIndex: Number(c.order_index)
      }))
    };
  }
}
