import { describe, it, expect, vi } from 'vitest';
import { ActivityLogService } from '../src/services/activityLogService.js';
import { activityLogRepository } from '../src/repositories/activityLogRepository.js';

describe('ActivityLogService', () => {
  it('should call repository.createLog asynchronously on log()', async () => {
    const createSpy = vi.spyOn(activityLogRepository, 'createLog').mockResolvedValueOnce(1);
    const service = new ActivityLogService();

    service.log({
      userId: 1,
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: 10,
      details: { title: 'Test Task' }
    });

    expect(createSpy).toHaveBeenCalledWith({
      userId: 1,
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: 10,
      details: { title: 'Test Task' }
    });
  });

  it('should return paginated logs and calculate metadata', async () => {
    vi.spyOn(activityLogRepository, 'getLogs').mockResolvedValueOnce({
      logs: [
        {
          id: 1,
          userId: 1,
          userName: 'Alex Mercer',
          userEmail: 'admin@datapure.io',
          userAvatar: null,
          action: 'TASK_CREATED',
          entityType: 'TASK',
          entityId: 101,
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'Test',
          createdAt: '2026-10-16T00:00:00Z'
        }
      ],
      total: 25
    });

    const service = new ActivityLogService();
    const result = await service.getLogs({ page: 2, limit: 10 });

    expect(result.logs.length).toBe(1);
    expect(result.pagination.total).toBe(25);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNextPage).toBe(true);
    expect(result.pagination.hasPrevPage).toBe(true);
  });
});
