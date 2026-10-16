import { apiClient } from './apiClient';
import { apiDeduplicator } from './apiDeduplicator';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { Task, Comment, Attachment, PaginationMetadata, TaskFilterOptions } from '../types';

export const taskService = {
  /**
   * Retrieve server-side paginated, sorted, and filtered task list.
   */
  async getTasks(
    filters: TaskFilterOptions,
    signal?: AbortSignal
  ): Promise<{ tasks: Task[]; pagination: PaginationMetadata }> {
    const params = new URLSearchParams();
    if (filters.boardId) params.append('boardId', String(filters.boardId));
    if (filters.columnId) params.append('columnId', String(filters.columnId));
    if (filters.priority && filters.priority !== 'ALL') params.append('priority', filters.priority);
    if (filters.category && filters.category !== 'ALL') params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const qs = params.toString();
    const endpoint = `${API_ENDPOINTS.TASKS.LIST}${qs ? `?${qs}` : ''}`;

    return apiDeduplicator.deduplicate('GET', endpoint, filters, async () => {
      const res = await apiClient.get(endpoint, { signal });
      return {
        tasks: res.data.data,
        pagination: res.data.pagination,
      };
    });
  },

  /**
   * Retrieve a single task by ID with comments and attachments.
   */
  async getTaskById(taskId: number | string, signal?: AbortSignal): Promise<Task> {
    const endpoint = API_ENDPOINTS.TASKS.BY_ID(taskId);
    return apiDeduplicator.deduplicate('GET', endpoint, undefined, async () => {
      const res = await apiClient.get(endpoint, { signal });
      return res.data.data;
    });
  },

  /**
   * Create a new task.
   */
  async createTask(taskData: Partial<Task>): Promise<Task> {
    const res = await apiClient.post(API_ENDPOINTS.TASKS.CREATE, taskData);
    return res.data.data;
  },

  /**
   * Update task metadata.
   */
  async updateTask(taskId: number | string, fields: Partial<Task>): Promise<Task> {
    const res = await apiClient.patch(API_ENDPOINTS.TASKS.UPDATE(taskId), fields);
    return res.data.data;
  },

  /**
   * Move task column or reorder under Optimistic Concurrency Control (OCC).
   */
  async moveTask(
    taskId: number | string,
    targetColumnId: number,
    newOrderIndex: number,
    expectedVersion: number
  ): Promise<Task> {
    const res = await apiClient.patch(API_ENDPOINTS.TASKS.MOVE(taskId), {
      targetColumnId,
      newOrderIndex,
      expectedVersion,
      version: expectedVersion,
    });
    return res.data.data;
  },

  /**
   * Delete a task permanently.
   */
  async deleteTask(taskId: number | string): Promise<boolean> {
    await apiClient.delete(API_ENDPOINTS.TASKS.DELETE(taskId));
    return true;
  },

  /**
   * Retrieve threaded comments for a task.
   */
  async getComments(taskId: number | string, signal?: AbortSignal): Promise<Comment[]> {
    const endpoint = API_ENDPOINTS.COMMENTS.BY_TASK(taskId);
    return apiDeduplicator.deduplicate('GET', endpoint, undefined, async () => {
      const res = await apiClient.get(endpoint, { signal });
      return res.data.data;
    });
  },

  /**
   * Add a comment to a task.
   */
  async addComment(taskId: number | string, content: string): Promise<Comment> {
    const res = await apiClient.post(API_ENDPOINTS.COMMENTS.BY_TASK(taskId), { content });
    return res.data.data;
  },

  /**
   * Delete a comment (author or Admin only).
   */
  async deleteComment(commentId: number | string): Promise<boolean> {
    await apiClient.delete(API_ENDPOINTS.COMMENTS.DELETE(commentId));
    return true;
  },

  /**
   * Upload attachments for a task (up to 5 files / 10MB per file).
   */
  async uploadAttachments(taskId: number | string, files: File[]): Promise<Attachment[]> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    const res = await apiClient.post(API_ENDPOINTS.TASKS.ATTACHMENTS(taskId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  /**
   * Delete an attachment.
   */
  async deleteAttachment(attachmentId: number | string): Promise<boolean> {
    await apiClient.delete(API_ENDPOINTS.ATTACHMENTS.BY_ID(attachmentId));
    return true;
  },

  /**
   * Helper URL builder for viewing an attachment inline.
   */
  getAttachmentViewUrl(attachmentId: number | string): string {
    return API_ENDPOINTS.ATTACHMENTS.VIEW(attachmentId);
  },

  /**
   * Helper URL builder for downloading an attachment.
   */
  getAttachmentDownloadUrl(attachmentId: number | string): string {
    return API_ENDPOINTS.ATTACHMENTS.DOWNLOAD(attachmentId);
  },
};
