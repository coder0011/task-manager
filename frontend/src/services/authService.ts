import { apiClient } from './apiClient';
import { apiDeduplicator } from './apiDeduplicator';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { User } from '../types';

export const authService = {
  /**
   * Authenticate user with email and password.
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    return res.data.data;
  },

  /**
   * Terminate active user session on the server, invalidate credentials and clear cookies.
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      return res.data;
    } catch {
      return { success: false, message: 'Server logout completed with warnings' };
    }
  },

  /**
   * Provision account (compatible fallback method).
   */
  async register(email: string, password: string, fullName: string): Promise<{ user: User; token: string }> {
    const res = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, { email, password, fullName });
    return res.data.data;
  },

  /**
   * Retrieve current authenticated user profile with in-flight deduplication.
   */
  async getMe(signal?: AbortSignal): Promise<User> {
    return apiDeduplicator.deduplicate('GET', API_ENDPOINTS.AUTH.ME, undefined, async () => {
      const res = await apiClient.get(API_ENDPOINTS.AUTH.ME, { signal });
      return res.data.data;
    });
  },

  /**
   * Dispatch password reset instructions email.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    return res.data.data;
  },

  /**
   * Verify token and reset account password.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, newPassword });
    return res.data;
  },

  /**
   * Update authenticated user profile display name.
   */
  async updateProfile(data: { fullName?: string; avatarUrl?: string }): Promise<User> {
    const res = await apiClient.patch(API_ENDPOINTS.AUTH.PROFILE, data);
    return res.data.data;
  },

  /**
   * Upload user profile picture.
   */
  async uploadMyAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await apiClient.post(API_ENDPOINTS.AUTH.PROFILE_AVATAR, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  /**
   * Change user account password.
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, { oldPassword, newPassword });
    return res.data;
  },
};
