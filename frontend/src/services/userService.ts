import { apiClient } from './apiClient';
import { apiDeduplicator } from './apiDeduplicator';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { User, PaginationMetadata } from '../types';

export const userService = {
  /**
   * Retrieve organization team members directory with optional pagination and filters.
   */
  async getUsers(
    params?: {
      all?: boolean;
      page?: number;
      limit?: number;
      role?: string;
      status?: string;
      search?: string;
    },
    signal?: AbortSignal
  ): Promise<User[] | { users: User[]; pagination: PaginationMetadata }> {
    const qp = new URLSearchParams();
    if (params?.all) qp.append('all', 'true');
    if (params?.page) qp.append('page', String(params.page));
    if (params?.limit) qp.append('limit', String(params.limit));
    if (params?.role && params.role !== 'ALL') qp.append('role', params.role);
    if (params?.status && params.status !== 'ALL') qp.append('status', params.status);
    if (params?.search) qp.append('search', params.search);

    const qs = qp.toString();
    const endpoint = `${API_ENDPOINTS.USERS.LIST}${qs ? `?${qs}` : ''}`;

    return apiDeduplicator.deduplicate('GET', endpoint, params, async () => {
      const res = await apiClient.get(endpoint, { signal });
      if (params?.all) {
        return res.data.data as User[];
      }
      return {
        users: res.data.data as User[],
        pagination: res.data.pagination as PaginationMetadata,
      };
    });
  },

  /**
   * Retrieve single user details by ID.
   */
  async getUserById(userId: number | string, signal?: AbortSignal): Promise<User> {
    const endpoint = API_ENDPOINTS.USERS.BY_ID(userId);
    return apiDeduplicator.deduplicate('GET', endpoint, undefined, async () => {
      const res = await apiClient.get(endpoint, { signal });
      return res.data.data;
    });
  },

  /**
   * Provision a new team member account (Admin only).
   */
  async createUser(data: {
    email: string;
    password?: string;
    fullName: string;
    role: string;
    isActive?: boolean;
  }): Promise<User> {
    const res = await apiClient.post(API_ENDPOINTS.USERS.CREATE, data);
    return res.data.data;
  },

  /**
   * Update team member metadata (Admin only).
   */
  async updateUser(userId: number | string, data: { fullName?: string; email?: string; role?: string; isActive?: boolean }): Promise<User> {
    const res = await apiClient.patch(API_ENDPOINTS.USERS.UPDATE(userId), data);
    return res.data.data;
  },

  /**
   * Modify team member role (Admin only).
   */
  async updateUserRole(userId: number | string, role: string): Promise<User> {
    const res = await apiClient.patch(API_ENDPOINTS.USERS.ROLE(userId), { role });
    return res.data.data;
  },

  /**
   * Toggle member account status between active and suspended (Admin only).
   */
  async updateUserStatus(userId: number | string, isActive: boolean): Promise<User> {
    const res = await apiClient.patch(API_ENDPOINTS.USERS.STATUS(userId), { isActive });
    return res.data.data;
  },

  /**
   * Upload avatar image for a team member (Admin only).
   */
  async uploadUserAvatar(userId: number | string, file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await apiClient.post(API_ENDPOINTS.USERS.AVATAR(userId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  /**
   * Remove a user from the organization (Admin only).
   */
  async deleteUser(userId: number | string): Promise<boolean> {
    await apiClient.delete(API_ENDPOINTS.USERS.DELETE(userId));
    return true;
  },
};
