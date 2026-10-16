import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { TaskService } from '../services/taskService.js';
import { BoardService } from '../services/boardService.js';
import { catchAsync } from '../utils/catchAsync.js';
import { z } from 'zod';

const taskService = new TaskService();
const boardService = new BoardService();

// Validation schemas using Zod
export const CreateTaskSchema = z.object({
  boardId: z.number().int().positive(),
  columnId: z.number().int().positive(),
  title: z.string().trim().min(1, 'Title cannot be blank').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(50000, 'Description cannot exceed 50000 characters').optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  category: z.enum(['DESIGN', 'DEVELOPMENT', 'DEVOPS', 'TESTING', 'MARKETING', 'RESEARCH', 'OPERATIONS']).optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  dueDate: z.string().optional()
});

export const MoveTaskSchema = z.object({
  targetColumnId: z.number().int().positive(),
  newOrderIndex: z.number(),
  expectedVersion: z.number().int().nonnegative().optional(),
  version: z.number().int().nonnegative().optional()
}).refine(data => data.expectedVersion !== undefined || data.version !== undefined, {
  message: 'expectedVersion or version is required for optimistic concurrency control',
  path: ['expectedVersion']
}).transform(data => ({
  targetColumnId: data.targetColumnId,
  newOrderIndex: data.newOrderIndex,
  expectedVersion: data.expectedVersion !== undefined ? data.expectedVersion : data.version!
}));

export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be blank').max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().trim().max(50000, 'Description cannot exceed 50000 characters').optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  category: z.enum(['DESIGN', 'DEVELOPMENT', 'DEVOPS', 'TESTING', 'MARKETING', 'RESEARCH', 'OPERATIONS']).optional(),
  columnId: z.number().int().positive().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  version: z.number().int().nonnegative().optional()
});


export const TaskQuerySchema = z.object({
  boardId: z.coerce.number().int().positive().optional(),
  columnId: z.coerce.number().int().positive().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  category: z.enum(['DESIGN', 'DEVELOPMENT', 'DEVOPS', 'TESTING', 'MARKETING', 'RESEARCH', 'OPERATIONS']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['order_index', 'created_at', 'updated_at', 'priority', 'due_date', 'title', 'task_key', 'column_id', 'category']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).default('desc')
});


export const BoardQuerySchema = z.object({
  search: z.string().trim().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  category: z.enum(['DESIGN', 'DEVELOPMENT', 'DEVOPS', 'TESTING', 'MARKETING', 'RESEARCH', 'OPERATIONS']).optional()
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type MoveTaskInput = z.infer<typeof MoveTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskQueryInput = z.infer<typeof TaskQuerySchema>;

// Controller class for handling task-related requests
export class TaskController {
  /**
   * Fetch board details along with its tasks based on the provided slug and query parameters.
   * @param req - The authenticated request object containing user information and query parameters.
   * @param res - The response object used to send back the board details and tasks.
   * @returns A JSON response containing the board details and its associated tasks.
   */
  getBoard = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const slug = req.params.slug || 'engineering-sprint';
    const query = BoardQuerySchema.parse(req.query);
    const boardDetails = await boardService.getBoardWithTasks(slug, query);
    res.json({ success: true, data: boardDetails });
  });

  /**
   * Fetch paginated tasks based on the provided query parameters.
   * @param req - The authenticated request object containing user information and query parameters.
   * @param res - The response object used to send back the paginated tasks.
   * @returns A JSON response containing the paginated tasks and pagination metadata.
   */
  getTasks = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const query = TaskQuerySchema.parse(req.query);
    const result = await taskService.getPaginatedTasks({
      boardId: query.boardId,
      columnId: query.columnId,
      priority: query.priority,
      category: query.category,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as any
    });
    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  });

  /**
   * Fetch a single task by ID with full relations (comments, attachments, users).
   */
  getTaskById = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const taskId = Number(req.params.id);
    const task = await taskService.getTaskById(taskId);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }
    res.json({ success: true, data: task });
  });

  /**
   * Create a new task based on the provided input data.
   * @param req - The authenticated request object containing user information and task input data.
   * @param res - The response object used to send back the created task details.
   * @returns A JSON response containing the details of the newly created task.
   */
  createTask = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = CreateTaskSchema.parse(req.body);
    const reporterId = req.user?.id || 1;

    const task = await taskService.createTask({
      boardId: parsed.boardId,
      columnId: parsed.columnId,
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      category: parsed.category,
      assigneeId: parsed.assigneeId || undefined,
      reporterId,
      dueDate: parsed.dueDate
    });

    res.status(201).json({ success: true, data: task });
  });

  /**
   * Move an existing task to a different column and update its order index.
   * @param req - The authenticated request object containing user information and move task input data.
   * @param res - The response object used to send back the updated task details after moving.
   * @returns A JSON response containing the details of the moved task.
   */
  moveTask = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const taskId = Number(req.params.id);
    const { targetColumnId, newOrderIndex, expectedVersion } = MoveTaskSchema.parse(req.body);

    const task = await taskService.moveTask(taskId, targetColumnId, newOrderIndex, expectedVersion, req.user?.id);
    res.json({ success: true, data: task });
  });

  /**
   * Update the details of an existing task based on the provided input data.
   * @param req - The authenticated request object containing user information and update task input data.
   * @param res - The response object used to send back the updated task details.
   * @returns A JSON response containing the details of the updated task.
   */
  updateTask = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const taskId = Number(req.params.id);
    const updates = UpdateTaskSchema.parse(req.body);
    const task = await taskService.updateTaskDetails(taskId, updates as any, req.user?.id);
    res.json({ success: true, data: task });
  });

  /**
   * Delete a task based on the provided task ID.
   * @param req - The authenticated request object containing user information and task ID.
   * @param res - The response object used to send back the result of the deletion operation.
   * @returns A JSON response indicating the success of the deletion operation.
   */
  deleteTask = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const taskId = Number(req.params.id);
    await taskService.deleteTask(taskId, req.user?.id);
    res.json({ success: true, message: 'Task deleted successfully' });
  });

  /**
   * Add a new comment to an existing task.
   */
  addComment = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const taskId = Number(req.params.id);
    const schema = z.object({
      content: z.string().trim().min(1, 'Comment cannot be blank').max(2000, 'Comment exceeds 2000 characters')
    });
    const { content } = schema.parse(req.body);
    const userId = req.user?.id || 1;

    const comment = await taskService.addComment(taskId, userId, content);
    res.status(201).json({ success: true, data: comment });
  });

  /**
   * Retrieve all comments for a specific task.
   */
  getComments = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const taskId = Number(req.params.id);
    const comments = await taskService.getComments(taskId);
    res.json({ success: true, data: comments });
  });

  /**
   * Delete a comment by ID (must be comment author or ADMIN).
   */
  deleteComment = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const commentId = Number(req.params.commentId);
    await taskService.deleteComment(commentId, req.user?.id, req.user?.role);
    res.json({ success: true, message: 'Comment deleted successfully' });
  });
}
