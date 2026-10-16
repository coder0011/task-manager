import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { notificationService } from '../services/notificationService.js';
import { catchAsync } from '../utils/catchAsync.js';
import { BadRequestError } from '../errors/AppError.js';

export class NotificationController {
  /**
   * Retrieves notifications for the currently authenticated user.
   */
  getMyNotifications = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const result = await notificationService.getUserNotifications(userId, limit);
    res.json({
      success: true,
      data: result
    });
  });

  /**
   * Marks a specific notification as read.
   */
  markAsRead = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const notificationId = Number(req.params.id);

    if (isNaN(notificationId)) {
      throw new BadRequestError('Invalid notification ID');
    }

    const success = await notificationService.markAsRead(notificationId, userId);
    res.json({
      success,
      message: success ? 'Notification marked as read' : 'Notification already read or not found'
    });
  });

  /**
   * Marks all unread notifications for the user as read.
   */
  markAllAsRead = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const affectedCount = await notificationService.markAllAsRead(userId);
    res.json({
      success: true,
      data: { markedCount: affectedCount },
      message: `Marked ${affectedCount} notification(s) as read`
    });
  });

  /**
   * Deletes a specific notification.
   */
  deleteNotification = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const notificationId = Number(req.params.id);

    if (isNaN(notificationId)) {
      throw new BadRequestError('Invalid notification ID');
    }

    const success = await notificationService.deleteNotification(notificationId, userId);
    res.json({
      success,
      message: success ? 'Notification deleted successfully' : 'Notification not found'
    });
  });

  /**
   * Clears all notifications for the current user.
   */
  clearAll = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const affectedCount = await notificationService.clearAllNotifications(userId);
    res.json({
      success: true,
      data: { deletedCount: affectedCount },
      message: `Cleared ${affectedCount} notification(s)`
    });
  });
}

export const notificationController = new NotificationController();
