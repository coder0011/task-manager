import { apiClient } from './apiClient';
import { apiDeduplicator } from './apiDeduplicator';
import { API_ENDPOINTS } from '../constants/endpoints';
import type { RoleDefinition, PermissionDefinition } from '../types';

export const rbacService = {
  /**
   * Fetch all roles with their assigned permissions.
   */
  async getRoles(signal?: AbortSignal): Promise<RoleDefinition[]> {
    return apiDeduplicator.deduplicate('GET', API_ENDPOINTS.RBAC.ROLES, undefined, async () => {
      const res = await apiClient.get(API_ENDPOINTS.RBAC.ROLES, { signal });
      return res.data.data;
    });
  },

  /**
   * Fetch all system permission definitions.
   */
  async getPermissions(signal?: AbortSignal): Promise<PermissionDefinition[]> {
    return apiDeduplicator.deduplicate('GET', API_ENDPOINTS.RBAC.PERMISSIONS, undefined, async () => {
      const res = await apiClient.get(API_ENDPOINTS.RBAC.PERMISSIONS, { signal });
      return res.data.data;
    });
  },

  /**
   * Fetch full RBAC matrix (roles and permissions).
   */
  async getMatrix(signal?: AbortSignal): Promise<{ roles: RoleDefinition[]; permissions: PermissionDefinition[] }> {
    const [roles, permissions] = await Promise.all([
      this.getRoles(signal),
      this.getPermissions(signal),
    ]);
    return { roles, permissions };
  },

  /**
   * Create a new custom role (Admin only).
   */
  async createRole(data: { key: string; name: string; description?: string; permissions?: string[] }): Promise<RoleDefinition> {
    const res = await apiClient.post(API_ENDPOINTS.RBAC.ROLES, data);
    return res.data.data;
  },

  /**
   * Update permissions bound to a role (Admin only).
   */
  async updateRolePermissions(roleId: number | string, permissionKeys: string[]): Promise<boolean> {
    await apiClient.put(API_ENDPOINTS.RBAC.ROLE_PERMISSIONS(roleId), { permissions: permissionKeys });
    return true;
  },

  /**
   * Delete a custom role (Admin only).
   */
  async deleteRole(roleId: number | string): Promise<boolean> {
    await apiClient.delete(API_ENDPOINTS.RBAC.ROLE_BY_ID(roleId));
    return true;
  },
};
