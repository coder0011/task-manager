import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { rbacRepository, DbRole, DbPermission } from '../repositories/rbacRepository.js';
import { BadRequestError, NotFoundError } from '../errors/AppError.js';
import { activityLogService } from './activityLogService.js';

export type AppAbility = MongoAbility<[string, string]>;

export class RbacService {
  // In-memory cache for fast permission checks with 60s TTL
  private cache: Map<string, { permissions: string[]; expiresAt: number }> = new Map();

  // Retrieves all roles from the database
  async getRoles(): Promise<DbRole[]> {
    return rbacRepository.getAllRoles();
  }

  // Retrieves all permissions from the database
  async getPermissions(): Promise<DbPermission[]> {
    return rbacRepository.getAllPermissions();
  }

  // Retrieves permissions for a specific role, using cache for performance
  async getPermissionsForRole(roleKey: string): Promise<string[]> {
    const cached = this.cache.get(roleKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const role = await rbacRepository.getRoleByKey(roleKey);
    const permissions = role ? role.permissions : [];
    this.cache.set(roleKey, { permissions, expiresAt: Date.now() + 60000 });
    return permissions;
  }

  // Clears the in-memory permission cache
  clearCache(): void {
    this.cache.clear();
  }

  // Defines CASL ability rules based on role permissions
  async defineAbilityFor(roleKey: string): Promise<AppAbility> {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
    const permissions = await this.getPermissionsForRole(roleKey);

    if (roleKey.toUpperCase() === 'ADMIN' || permissions.includes('all')) {
      can('manage', 'all');
      return build();
    }

    for (const perm of permissions) {
      const [subject, action] = perm.split(':');
      if (subject && action) {
        can(action, subject);
      } else {
        can(perm, 'all');
      }
    }

    return build();
  }

  // Manages role creation with validation and logging
  async createRole(
    data: { key: string; name: string; description?: string; permissions?: string[] },
    actingUserId?: number
  ): Promise<DbRole> {
    const cleanKey = data.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!cleanKey) {
      throw new BadRequestError('Role key must contain alphanumeric characters');
    }

    const existing = await rbacRepository.getRoleByKey(cleanKey);
    if (existing) {
      throw new BadRequestError(`Role with key '${cleanKey}' already exists`);
    }

    const roleId = await rbacRepository.createRole(cleanKey, data.name.trim(), data.description);

    if (data.permissions && data.permissions.length > 0) {
      await rbacRepository.updateRolePermissions(roleId, data.permissions);
    }

    this.clearCache();
    const created = await rbacRepository.getRoleByKey(cleanKey);
    if (!created) {
      throw new NotFoundError('Failed to retrieve newly created role');
    }

    activityLogService.log({
      userId: actingUserId,
      action: 'ROLE_CREATED',
      entityType: 'ROLE',
      entityId: roleId,
      details: { roleKey: cleanKey, name: created.name, permissionsCount: data.permissions?.length || 0 }
    });

    return created;
  }

  // Updates permissions for a specific role with validation and logging
  async updateRolePermissions(roleId: number, permissions: string[], actingUserId?: number): Promise<void> {
    const roles = await rbacRepository.getAllRoles();
    const targetRole = roles.find(r => r.id === roleId);
    if (!targetRole) {
      throw new NotFoundError('Role not found');
    }

    await rbacRepository.updateRolePermissions(roleId, permissions);
    this.clearCache();

    activityLogService.log({
      userId: actingUserId,
      action: 'ROLE_PERMISSIONS_UPDATED',
      entityType: 'ROLE',
      entityId: roleId,
      details: { roleKey: targetRole.key, newPermissions: permissions }
    });
  }

  // Deletes a role with validation to prevent deletion of system roles and logs the action
  async deleteRole(roleId: number, actingUserId?: number): Promise<void> {
    const roles = await rbacRepository.getAllRoles();
    const targetRole = roles.find(r => r.id === roleId);
    if (!targetRole) {
      throw new NotFoundError('Role not found');
    }
    if (targetRole.is_system) {
      throw new BadRequestError('System roles (ADMIN, MEMBER, VIEWER) cannot be deleted');
    }

    const deleted = await rbacRepository.deleteRole(roleId);
    if (!deleted) {
      throw new BadRequestError('Unable to delete role. It may be currently assigned to active users.');
    }
    this.clearCache();

    activityLogService.log({
      userId: actingUserId,
      action: 'ROLE_DELETED',
      entityType: 'ROLE',
      entityId: roleId,
      details: { roleKey: targetRole.key, name: targetRole.name }
    });
  }
}

export const rbacService = new RbacService();
