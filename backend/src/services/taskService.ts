import { TaskRepository, type TaskFilterOptions } from '../repositories/taskRepository.js';
import type { Task, Comment, Attachment, PaginatedResult } from '../types/index.js';
import { ConcurrencyConflictError, NotFoundError, ForbiddenError } from '../errors/AppError.js';
import { activityLogService } from './activityLogService.js';
import { notificationService } from './notificationService.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export { ConcurrencyConflictError };

export class TaskService {
  constructor(private readonly taskRepo: TaskRepository = new TaskRepository()) {}

  // Retrieves tasks for a specific board with optional filters for search and priority
  async getBoardTasks(boardId: number, filters?: { search?: string; priority?: string }): Promise<Task[]> {
    return this.taskRepo.findByBoardId(boardId, filters);
  }

  // Retrieves paginated tasks with sorting, filtering, and search capabilities
  async getPaginatedTasks(options: TaskFilterOptions): Promise<PaginatedResult<Task>> {
    return this.taskRepo.findPaginated(options);
  }

  // Retrieves a single task by its ID
  async getTaskById(taskId: number): Promise<Task | null> {
    return this.taskRepo.findById(taskId);
  }

  // Creates a new task with a generated task key and logs the creation
  async createTask(data: {
    boardId: number;
    columnId: number;
    title: string;
    description?: string;
    priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
    category?: 'DESIGN' | 'DEVELOPMENT' | 'DEVOPS' | 'TESTING' | 'MARKETING' | 'RESEARCH' | 'OPERATIONS';
    assigneeId?: number;
    reporterId: number;
    dueDate?: string;
  }): Promise<Task> {
    const taskKey = `DP-${Math.floor(100 + Math.random() * 900)}`;

    const created = await this.taskRepo.create({
      taskKey,
      boardId: data.boardId,
      columnId: data.columnId,
      title: data.title,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      category: data.category || 'DEVELOPMENT',
      status: 'TODO',
      orderIndex: Date.now() % 1000000,
      assigneeId: data.assigneeId,
      reporterId: data.reporterId,
      dueDate: data.dueDate
    });

    activityLogService.log({
      userId: data.reporterId,
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: created.id,
      details: { taskKey: created.taskKey, title: created.title, priority: created.priority, category: created.category, columnId: created.columnId }
    });

    // Dispatch task creation notification
    notificationService.notifyTaskCreated(created, data.reporterId);

    return created;
  }

  // Moves a task to a new column with ordering and handles concurrency conflicts
  async moveTask(
    taskId: number,
    targetColumnId: number,
    newOrderIndex: number,
    expectedVersion: number,
    currentUserId?: number
  ): Promise<Task> {
    const current = await this.taskRepo.findById(taskId);
    if (!current) {
      throw new NotFoundError(`Task #${taskId} not found`);
    }

    const success = await this.taskRepo.updateWithVersion(
      taskId,
      targetColumnId,
      newOrderIndex,
      expectedVersion
    );

    if (!success) {
      throw new ConcurrencyConflictError(
        `Task #${taskId} was modified by another team member. (Your version: ${expectedVersion}, Current version: ${current.version}). Please refresh.`
      );
    }

    const updated = (await this.taskRepo.findById(taskId))!;
    const actorId = currentUserId || updated.assigneeId || updated.reporterId;
    activityLogService.log({
      userId: actorId,
      action: 'TASK_MOVED',
      entityType: 'TASK',
      entityId: taskId,
      details: { taskKey: updated.taskKey, targetColumnId, version: updated.version }
    });

    if (current.columnId !== targetColumnId || current.status !== updated.status) {
      notificationService.notifyTaskStatusChange({
        task: updated,
        oldStatus: current.status,
        newStatus: updated.status,
        actorId
      });
    }

    return updated;
  }

  // Updates task details including status, assignee, priority, etc., with concurrency control
  async updateTaskDetails(taskId: number, fields: Partial<Task>, currentUserId?: number): Promise<Task> {
    const exists = await this.taskRepo.findById(taskId);
    if (!exists) {
      throw new NotFoundError(`Task #${taskId} not found`);
    }

    const success = await this.taskRepo.updateDetails(taskId, fields, fields.version);
    if (!success) {
      throw new ConcurrencyConflictError(`Task #${taskId} has been modified concurrently. Please refresh to view the latest state.`);
    }
    const updated = (await this.taskRepo.findById(taskId))!;
    const actorId = currentUserId || updated.assigneeId || updated.reporterId;

    activityLogService.log({
      userId: actorId,
      action: 'TASK_UPDATED',
      entityType: 'TASK',
      entityId: taskId,
      details: { taskKey: updated.taskKey, updatedFields: Object.keys(fields) }
    });

    // Check if assignee changed
    if (fields.assigneeId !== undefined && fields.assigneeId !== exists.assigneeId) {
      notificationService.notifyTaskAssignment({
        task: updated,
        previousAssigneeId: exists.assigneeId,
        newAssigneeId: fields.assigneeId || undefined,
        actorId
      });
    }

    // Check if status changed
    if (fields.status !== undefined && fields.status !== exists.status) {
      notificationService.notifyTaskStatusChange({
        task: updated,
        oldStatus: exists.status,
        newStatus: fields.status,
        actorId
      });
    }

    // Check if priority escalated to URGENT or HIGH
    if (fields.priority !== undefined && fields.priority !== exists.priority && (fields.priority === 'URGENT' || fields.priority === 'HIGH')) {
      notificationService.notifyPriorityEscalated({
        task: updated,
        oldPriority: exists.priority,
        newPriority: fields.priority,
        actorId
      });
    }

    return updated;
  }

  // Deletes a task by ID and logs the deletion
  async deleteTask(taskId: number, currentUserId?: number): Promise<boolean> {
    const exists = await this.taskRepo.findById(taskId);
    if (!exists) {
      throw new NotFoundError(`Task #${taskId} not found`);
    }
    const result = await this.taskRepo.delete(taskId);

    activityLogService.log({
      userId: currentUserId,
      action: 'TASK_DELETED',
      entityType: 'TASK',
      entityId: taskId,
      details: { taskKey: exists.taskKey, title: exists.title }
    });

    notificationService.notifyTaskDeleted(exists.taskKey, exists.title);

    return result;
  }

  // Manages comments and attachments for a task
  async addComment(taskId: number, userId: number, content: string): Promise<Comment> {
    const exists = await this.taskRepo.findById(taskId);
    if (!exists) {
      throw new NotFoundError(`Task #${taskId} not found`);
    }

    const comment = await this.taskRepo.createComment(taskId, userId, content);

    activityLogService.log({
      userId,
      action: 'COMMENT_ADDED',
      entityType: 'TASK',
      entityId: taskId,
      details: {
        taskKey: exists.taskKey,
        commentId: comment.id,
        contentSnippet: content.slice(0, 100),
        authorName: comment.authorName
      }
    });

    notificationService.notifyCommentAdded({
      task: exists,
      comment,
      actorId: userId
    });

    return comment;
  }

   // Retrieves all comments for a specific task
  async getComments(taskId: number): Promise<Comment[]> {
    const exists = await this.taskRepo.findById(taskId);
    if (!exists) {
      throw new NotFoundError(`Task #${taskId} not found`);
    }
    return this.taskRepo.findCommentsByTaskId(taskId);
  }

  // Deletes a comment if the user is authorized (either admin or comment owner)
  async deleteComment(commentId: number, currentUserId?: number, currentUserRole?: string): Promise<boolean> {
    const comment = await this.taskRepo.findCommentById(commentId);
    if (!comment) {
      throw new NotFoundError(`Comment #${commentId} not found`);
    }

    if (currentUserId && currentUserRole !== 'ADMIN' && comment.userId !== currentUserId) {
      throw new ForbiddenError('You are not authorized to delete this comment');
    }

    const parentTask = await this.taskRepo.findById(comment.taskId);
    const success = await this.taskRepo.deleteComment(commentId);

    if (success) {
      activityLogService.log({
        userId: currentUserId || comment.userId,
        action: 'COMMENT_DELETED',
        entityType: 'TASK',
        entityId: comment.taskId,
        details: {
          taskKey: parentTask?.taskKey,
          commentId,
          authorName: comment.authorName
        }
      });
    }

    return success;
  }

  // Adds an attachment to a task, logs the action, and handles file storage
  async addAttachment(data: {
    taskId: number;
    filename: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: number;
  }): Promise<Attachment> {
    const task = await this.taskRepo.findById(data.taskId);
    if (!task) {
      throw new NotFoundError(`Task #${data.taskId} not found`);
    }

    const attachment = await this.taskRepo.addAttachment(data);

    activityLogService.log({
      userId: data.uploadedBy,
      action: 'ATTACHMENT_ADDED',
      entityType: 'TASK',
      entityId: data.taskId,
      details: {
        taskKey: task.taskKey,
        attachmentId: attachment.id,
        filename: attachment.originalName,
        sizeBytes: attachment.sizeBytes
      }
    });

    return attachment;
  }

  // Retrieves a specific attachment by its ID
  async getAttachmentById(attachmentId: number): Promise<Attachment | null> {
    return this.taskRepo.findAttachmentById(attachmentId);
  }

  async deleteAttachment(attachmentId: number, currentUserId?: number): Promise<boolean> {
    const attachment = await this.taskRepo.findAttachmentById(attachmentId);
    if (!attachment) {
      throw new NotFoundError(`Attachment #${attachmentId} not found`);
    }

    const task = await this.taskRepo.findById(attachment.taskId);

    // Non-blocking async file unlink
    const filePath = path.resolve(process.cwd(), 'uploads', 'attachments', attachment.filename);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.warn(`[Attachment] Failed to unlink local file ${filePath}:`, err.message);
      }
    }

    const success = await this.taskRepo.deleteAttachment(attachmentId);

    if (success) {
      activityLogService.log({
        userId: currentUserId || attachment.uploadedBy,
        action: 'ATTACHMENT_DELETED',
        entityType: 'TASK',
        entityId: attachment.taskId,
        details: {
          taskKey: task?.taskKey,
          attachmentId,
          filename: attachment.originalName
        }
      });
    }

    return success;
  }
}
