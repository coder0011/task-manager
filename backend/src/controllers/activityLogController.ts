import { Request, Response } from 'express';
import { activityLogService } from '../services/activityLogService.js';
import { catchAsync } from '../utils/catchAsync.js';

// Controller for handling activity log related requests
export class ActivityLogController {
  /**
   * Retrieve activity logs based on the provided filters.
   * @param req - The request object containing filter parameters.
   * @param res - The response object used to send back the retrieved logs.
   * @returns A JSON response containing the activity logs and pagination information.
   */
  getActivityLogs = catchAsync(async (req: Request, res: Response) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const action = req.query.action as string | undefined;
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId ? parseInt(req.query.entityId as string, 10) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;

    // Fetch activity logs from the service layer based on the provided filters
    const result = await activityLogService.getLogs({
      page,
      limit,
      action,
      entityType,
      entityId,
      userId
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: result.logs,
      pagination: result.pagination
    });
  });
}

export const activityLogController = new ActivityLogController();
