import { activityLogRepository, ActivityLogItem, ActivityLogQueryParams } from '../repositories/activityLogRepository.js';
import logger from '../utils/logger.js';

export interface LogActionParams {
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class ActivityLogService {
  /**
   * Non-blocking, failsafe activity logging
   */
  log(params: LogActionParams): void {
    // Execute asynchronously without blocking the calling request flow
    activityLogRepository.createLog(params).catch(err => {
      logger.error({ err, params }, '[ActivityLog] Failed to persist audit log entry');
    });
  }

  // Retrieves activity logs with pagination and filtering
  async getLogs(params: ActivityLogQueryParams): Promise<{
    logs: ActivityLogItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const { logs, total } = await activityLogRepository.getLogs({ ...params, page, limit });
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      logs,
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
}

export const activityLogService = new ActivityLogService();
