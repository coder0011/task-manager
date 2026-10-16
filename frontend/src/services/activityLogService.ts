import { apiClient } from './apiClient';
import { apiDeduplicator } from './apiDeduplicator';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { ActivityLog, PaginationMetadata } from '../types';

export const activityLogService = {
  /**
   * Retrieve immutable activity audit logs with server-side filtering and pagination.
   */
  async getActivityLogs(
    params?: {
      page?: number;
      limit?: number;
      action?: string;
      entityType?: string;
      entityId?: number;
      userId?: number;
    },
    signal?: AbortSignal
  ): Promise<{ logs: ActivityLog[]; pagination: PaginationMetadata }> {
    const qp = new URLSearchParams();
    if (params?.page) qp.append('page', String(params.page));
    if (params?.limit) qp.append('limit', String(params.limit));
    if (params?.action && params.action !== 'ALL') qp.append('action', params.action);
    if (params?.entityType && params.entityType !== 'ALL') qp.append('entityType', params.entityType);
    if (params?.entityId) qp.append('entityId', String(params.entityId));
    if (params?.userId) qp.append('userId', String(params.userId));

    const qs = qp.toString();
    const endpoint = `${API_ENDPOINTS.ACTIVITY_LOGS.LIST}${qs ? `?${qs}` : ''}`;

    return apiDeduplicator.deduplicate('GET', endpoint, params, async () => {
      const res = await apiClient.get(endpoint, { signal });
      return {
        logs: res.data.data,
        pagination: res.data.pagination,
      };
    });
  },
};
