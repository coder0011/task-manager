import { pool } from '../config/db.js';
import { Task, Comment, Attachment, PaginatedResult } from '../types/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface TaskFilterOptions {
  boardId?: number;
  columnId?: number;
  priority?: string;
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'order_index' | 'created_at' | 'updated_at' | 'priority' | 'due_date' | 'title' | 'task_key' | 'column_id' | 'category';
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export class TaskRepository {
  private mapRowToTask(r: any): Task {
    return {
      id: r.id,
      taskKey: r.task_key,
      boardId: r.board_id,
      columnId: r.column_id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      category: r.category || 'DEVELOPMENT',
      status: r.status,
      orderIndex: Number(r.order_index),
      assigneeId: r.assignee_id,
      assigneeName: r.assigneeName,
      assigneeAvatar: r.assigneeAvatar,
      reporterId: r.reporter_id,
      reporterName: r.reporterName,
      reporterAvatar: r.reporterAvatar,
      dueDate: r.due_date,
      version: r.version,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private async populateRelations(tasks: Task[]): Promise<void> {
    if (tasks.length === 0) return;
    const taskIds = tasks.map(t => t.id);

    // Attach comments
    const [commentRows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.full_name as authorName, u.email as authorEmail, u.avatar_url as authorAvatar, u.role as authorRole
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.task_id IN (${taskIds.map(() => '?').join(',')})
       ORDER BY c.created_at ASC`,
      taskIds
    );

    const commentMap = new Map<number, Comment[]>();
    for (const row of commentRows as any[]) {
      const com: Comment = {
        id: row.id,
        taskId: row.task_id,
        userId: row.user_id,
        authorName: row.authorName,
        authorEmail: row.authorEmail,
        authorAvatar: row.authorAvatar,
        authorRole: row.authorRole,
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      if (!commentMap.has(com.taskId)) commentMap.set(com.taskId, []);
      commentMap.get(com.taskId)!.push(com);
    }

    // Attach attachments
    const [attRows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.full_name as uploaderName
       FROM attachments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       WHERE a.task_id IN (${taskIds.map(() => '?').join(',')})
       ORDER BY a.created_at ASC`,
      taskIds
    );

    const attachmentMap = new Map<number, Attachment[]>();
    for (const row of attRows as any[]) {
      const att: Attachment = {
        id: row.id,
        taskId: row.task_id,
        filename: row.filename,
        originalName: row.original_name,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        uploadedBy: row.uploaded_by,
        uploaderName: row.uploaderName,
        url: `/uploads/attachments/${row.filename}`,
        createdAt: row.created_at
      };
      if (!attachmentMap.has(att.taskId)) attachmentMap.set(att.taskId, []);
      attachmentMap.get(att.taskId)!.push(att);
    }

    tasks.forEach(t => {
      const taskComments = commentMap.get(t.id) || [];
      t.comments = taskComments;
      t.commentCount = taskComments.length;
      t.attachments = attachmentMap.get(t.id) || [];
    });
  }

  async findByBoardId(boardId: number, filters?: { search?: string; priority?: string; category?: string }): Promise<Task[]> {
    const whereClauses: string[] = ['t.board_id = ?'];
    const queryParams: any[] = [boardId];

    if (filters?.priority) {
      whereClauses.push('t.priority = ?');
      queryParams.push(filters.priority);
    }

    if (filters?.category) {
      whereClauses.push('t.category = ?');
      queryParams.push(filters.category);
    }

    if (filters?.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      whereClauses.push('(t.title LIKE ? OR t.description LIKE ? OR t.task_key LIKE ?)');
      queryParams.push(term, term, term);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, 
              u.full_name as assigneeName, u.avatar_url as assigneeAvatar,
              r_u.full_name as reporterName, r_u.avatar_url as reporterAvatar
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users r_u ON t.reporter_id = r_u.id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY t.column_id, t.order_index ASC`,
      queryParams
    );

    const tasks = (rows as any[]).map(r => this.mapRowToTask(r));
    await this.populateRelations(tasks);
    return tasks;
  }

  async findPaginated(options: TaskFilterOptions): Promise<PaginatedResult<Task>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (options.boardId) {
      whereClauses.push('t.board_id = ?');
      queryParams.push(options.boardId);
    }

    if (options.columnId) {
      whereClauses.push('t.column_id = ?');
      queryParams.push(options.columnId);
    }

    if (options.priority) {
      whereClauses.push('t.priority = ?');
      queryParams.push(options.priority);
    }

    if (options.category) {
      whereClauses.push('t.category = ?');
      queryParams.push(options.category);
    }

    if (options.status) {
      whereClauses.push('t.status = ?');
      queryParams.push(options.status);
    }

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      whereClauses.push('(t.title LIKE ? OR t.description LIKE ? OR t.task_key LIKE ?)');
      queryParams.push(term, term, term);
    }

    const whereSql = whereClauses.join(' AND ');

    // 1. Total count query
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM tasks t WHERE ${whereSql}`,
      queryParams
    );
    const total = Number(countRows[0]?.total || 0);

    // 2. Sorting whitelist
    const allowedSortFields: Record<string, string> = {
      order_index: 't.order_index',
      created_at: 't.created_at',
      updated_at: 't.updated_at',
      priority: 'FIELD(t.priority, "URGENT", "HIGH", "MEDIUM", "LOW")',
      due_date: 't.due_date',
      title: 't.title',
      task_key: 't.task_key',
      column_id: 't.column_id',
      category: 't.category'
    };
    const sortFieldKey = (options.sortBy && allowedSortFields[options.sortBy]) ? options.sortBy : 'created_at';
    const sortField = allowedSortFields[sortFieldKey];
    const sortOrder = options.sortOrder ? (options.sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') : (sortFieldKey === 'order_index' ? 'ASC' : 'DESC');

    let orderClause = `${sortField} ${sortOrder}`;
    if (sortFieldKey === 'created_at') {
      orderClause = `t.created_at ${sortOrder}, t.updated_at ${sortOrder}, t.id ${sortOrder}`;
    } else if (sortFieldKey === 'updated_at') {
      orderClause = `t.updated_at ${sortOrder}, t.created_at ${sortOrder}, t.id ${sortOrder}`;
    } else if (sortFieldKey === 'order_index') {
      orderClause = `t.column_id ASC, t.order_index ${sortOrder}, t.created_at DESC`;
    } else {
      orderClause = `${sortField} ${sortOrder}, t.created_at DESC, t.id DESC`;
    }

    // 3. Data query
    const dataSql = `
      SELECT t.*, 
             u.full_name as assigneeName, u.avatar_url as assigneeAvatar,
             r_u.full_name as reporterName, r_u.avatar_url as reporterAvatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users r_u ON t.reporter_id = r_u.id
      WHERE ${whereSql}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `;


    const [rows] = await pool.query<RowDataPacket[]>(dataSql, [...queryParams, limit, offset]);
    const tasks = (rows as any[]).map(r => this.mapRowToTask(r));

    await this.populateRelations(tasks);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: tasks,
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

  async findById(id: number): Promise<Task | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, 
              u.full_name as assigneeName, u.avatar_url as assigneeAvatar,
              r_u.full_name as reporterName, r_u.avatar_url as reporterAvatar
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users r_u ON t.reporter_id = r_u.id
       WHERE t.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    const [comRows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.full_name as authorName, u.email as authorEmail, u.avatar_url as authorAvatar, u.role as authorRole
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.task_id = ? 
       ORDER BY c.created_at ASC`,
      [id]
    );

    const [attRows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.full_name as uploaderName
       FROM attachments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       WHERE a.task_id = ?
       ORDER BY a.created_at ASC`,
      [id]
    );

    return {
      id: r.id,
      taskKey: r.task_key,
      boardId: r.board_id,
      columnId: r.column_id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      category: r.category || 'DEVELOPMENT',
      status: r.status,
      orderIndex: Number(r.order_index),
      assigneeId: r.assignee_id,
      assigneeName: r.assigneeName,
      assigneeAvatar: r.assigneeAvatar,
      reporterId: r.reporter_id,
      reporterName: r.reporterName,
      reporterAvatar: r.reporterAvatar,
      dueDate: r.due_date,
      version: r.version,
      comments: (comRows as any[]).map(c => ({
        id: c.id,
        taskId: c.task_id,
        userId: c.user_id,
        authorName: c.authorName,
        authorEmail: c.authorEmail,
        authorAvatar: c.authorAvatar,
        authorRole: c.authorRole,
        content: c.content,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      })),
      commentCount: comRows.length,
      attachments: (attRows as any[]).map(a => ({
        id: a.id,
        taskId: a.task_id,
        filename: a.filename,
        originalName: a.original_name,
        mimeType: a.mime_type,
        sizeBytes: Number(a.size_bytes),
        uploadedBy: a.uploaded_by,
        uploaderName: a.uploaderName,
        url: `/uploads/attachments/${a.filename}`,
        createdAt: a.created_at
      })),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'attachments'>): Promise<Task> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO tasks (task_key, board_id, column_id, title, description, priority, category, status, order_index, assignee_id, reporter_id, due_date, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        task.taskKey,
        task.boardId,
        task.columnId,
        task.title,
        task.description ?? null,
        task.priority,
        task.category || 'DEVELOPMENT',
        task.status,
        task.orderIndex,
        task.assigneeId ?? null,
        task.reporterId,
        task.dueDate ? new Date(task.dueDate) : null
      ]
    );

    return (await this.findById(result.insertId))!;
  }

  /**
   * Performs an atomic Optimistic Concurrency Control (OCC) column move and reorder.
   * Atomically checks `WHERE id = ? AND version = ?` and increments `version = version + 1`.
   * @returns true if the update succeeded; false if a concurrent edit was detected (0 affected rows).
   */
  async updateWithVersion(
    id: number,
    columnId: number,
    orderIndex: number,
    expectedVersion: number
  ): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE tasks
       SET column_id = ?, order_index = ?, version = version + 1, updated_at = NOW()
       WHERE id = ? AND version = ?`,
      [columnId, orderIndex, id, expectedVersion]
    );

    return result.affectedRows > 0;
  }

  async updateDetails(id: number, fields: Partial<Task>, expectedVersion?: number): Promise<boolean> {
    const whereSql = expectedVersion !== undefined ? 'WHERE id = ? AND version = ?' : 'WHERE id = ?';
    const params: any[] = [
      fields.title ?? null,
      fields.description ?? null,
      fields.priority ?? null,
      fields.category ?? null,
      fields.columnId ?? null,
      fields.assigneeId ?? null,
      fields.dueDate !== undefined ? (fields.dueDate ? new Date(fields.dueDate) : null) : null,
      id
    ];
    if (expectedVersion !== undefined) {
      params.push(expectedVersion);
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE tasks
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           priority = COALESCE(?, priority),
           category = COALESCE(?, category),
           column_id = COALESCE(?, column_id),
           assignee_id = COALESCE(?, assignee_id),
           due_date = COALESCE(?, due_date),
           version = version + 1,
           updated_at = NOW()
       ${whereSql}`,
      params
    );

    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(`DELETE FROM tasks WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }

  async createComment(taskId: number, userId: number, content: string): Promise<Comment> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)`,
      [taskId, userId, content]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.full_name as authorName, u.email as authorEmail, u.avatar_url as authorAvatar, u.role as authorRole
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );
    const r = rows[0];

    return {
      id: r.id,
      taskId: r.task_id,
      userId: r.user_id,
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      authorAvatar: r.authorAvatar,
      authorRole: r.authorRole,
      content: r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  async findCommentById(commentId: number): Promise<Comment | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.full_name as authorName, u.email as authorEmail, u.avatar_url as authorAvatar, u.role as authorRole
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      taskId: r.task_id,
      userId: r.user_id,
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      authorAvatar: r.authorAvatar,
      authorRole: r.authorRole,
      content: r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  async findCommentsByTaskId(taskId: number): Promise<Comment[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.full_name as authorName, u.email as authorEmail, u.avatar_url as authorAvatar, u.role as authorRole
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [taskId]
    );
    return (rows as any[]).map(r => ({
      id: r.id,
      taskId: r.task_id,
      userId: r.user_id,
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      authorAvatar: r.authorAvatar,
      authorRole: r.authorRole,
      content: r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  async deleteComment(commentId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM comments WHERE id = ?`,
      [commentId]
    );
    return result.affectedRows > 0;
  }

  async addAttachment(data: {
    taskId: number;
    filename: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: number;
  }): Promise<Attachment> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO attachments (task_id, filename, original_name, mime_type, size_bytes, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.taskId, data.filename, data.originalName, data.mimeType, data.sizeBytes, data.uploadedBy]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.full_name as uploaderName
       FROM attachments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       WHERE a.id = ?`,
      [result.insertId]
    );

    const r = rows[0];
    return {
      id: r.id,
      taskId: r.task_id,
      filename: r.filename,
      originalName: r.original_name,
      mimeType: r.mime_type,
      sizeBytes: Number(r.size_bytes),
      uploadedBy: r.uploaded_by,
      uploaderName: r.uploaderName,
      url: `/uploads/attachments/${r.filename}`,
      createdAt: r.created_at
    };
  }

  async findAttachmentById(id: number): Promise<Attachment | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.full_name as uploaderName
       FROM attachments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       WHERE a.id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      taskId: r.task_id,
      filename: r.filename,
      originalName: r.original_name,
      mimeType: r.mime_type,
      sizeBytes: Number(r.size_bytes),
      uploadedBy: r.uploaded_by,
      uploaderName: r.uploaderName,
      url: `/uploads/attachments/${r.filename}`,
      createdAt: r.created_at
    };
  }

  async deleteAttachment(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM attachments WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}
