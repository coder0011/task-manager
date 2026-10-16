import { apiClient } from './apiClient';
import { apiDeduplicator } from './apiDeduplicator';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { Board, Task } from '../types';

export const boardService = {
  /**
   * Fetch sprint board, workflow columns, and tasks with in-flight deduplication.
   */
  async getBoard(
    slug: string = 'engineering-sprint',
    filters?: { search?: string; priority?: string; category?: string },
    signal?: AbortSignal
  ): Promise<{ board: Board; tasks: Task[] }> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.priority && filters.priority !== 'ALL') params.append('priority', filters.priority);
    if (filters?.category && filters.category !== 'ALL') params.append('category', filters.category);

    const qs = params.toString();
    const endpoint = `${API_ENDPOINTS.BOARDS.BY_SLUG(slug)}${qs ? `?${qs}` : ''}`;

    return apiDeduplicator.deduplicate('GET', endpoint, filters, async () => {
      const res = await apiClient.get(endpoint, { signal });
      return res.data.data;
    });
  },
};
