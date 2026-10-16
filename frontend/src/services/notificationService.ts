import { apiClient } from './apiClient';
import { apiDeduplicator } from './apiDeduplicator';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { AppNotification } from '../types';

export const notificationService = {
  /**
   * Retrieve active user notifications and unread badge count.
   */
  async getNotifications(
    limit: number = 50,
    signal?: AbortSignal
  ): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const endpoint = `${API_ENDPOINTS.NOTIFICATIONS.ROOT}?limit=${limit}`;
    return apiDeduplicator.deduplicate('GET', endpoint, { limit }, async () => {
      const res = await apiClient.get(endpoint, { signal });
      return res.data.data;
    });
  },

  /**
   * Mark an individual notification as read.
   */
  async markNotificationRead(id: number | string): Promise<boolean> {
    await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    return true;
  },

  /**
   * Mark all unread notifications as read.
   */
  async markAllNotificationsRead(): Promise<boolean> {
    await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    return true;
  },

  /**
   * Delete an individual notification.
   */
  async deleteNotification(id: number | string): Promise<boolean> {
    await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
    return true;
  },

  /**
   * Clear all notifications for current user.
   */
  async clearAllNotifications(): Promise<boolean> {
    await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.CLEAR_ALL);
    return true;
  },
};
