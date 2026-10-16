import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import { rbacService, AppAbility } from '../services/rbacService.js';

// Fallback baseline for bootstrapping and offline resilience
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'task:create',
    'task:edit',
    'task:delete',
    'task:move',
    'user:manage',
    'user:view',
    'audit:view'
  ],
  MEMBER: [
    'task:create',
    'task:edit',
    'task:move',
    'user:view',
    'audit:view'
  ],
  VIEWER: [
    'user:view'
  ]
};

export interface CaslAuthRequest extends AuthRequest {
  ability?: AppAbility;
}

// Middleware to enforce role-based access control (RBAC) based on user roles and permissions
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = (req.user.role || '').toUpperCase();
    if (!allowedRoles.map(r => r.toUpperCase()).includes(userRole)) {
      return next(
        new ForbiddenError(
          `Access denied. Role '${userRole}' does not possess required role privileges (${allowedRoles.join(', ')}).`
        )
      );
    }

    next();
  };
}

// Middleware to enforce permission-based access control using CASL
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: CaslAuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      const userRole = (req.user.role || 'VIEWER').toUpperCase();

      // Dynamically load permissions and CASL ability for the user's role
      const [permissions, ability] = await Promise.all([
        rbacService.getPermissionsForRole(userRole).catch(() => DEFAULT_ROLE_PERMISSIONS[userRole] || []),
        rbacService.defineAbilityFor(userRole).catch(() => null)
      ]);

      if (ability) {
        req.ability = ability;
      }

      // Check if user's role is ADMIN (inherent superuser)
      if (userRole === 'ADMIN' || permissions.includes('all')) {
        return next();
      }

      const hasAll = requiredPermissions.every(perm => permissions.includes(perm));
      if (!hasAll) {
        return next(
          new ForbiddenError(
            `Access denied. Role '${userRole}' lacks required permissions: [${requiredPermissions.join(', ')}].`
          )
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
