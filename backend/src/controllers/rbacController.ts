import { Request, Response } from 'express';
import { rbacService } from '../services/rbacService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { catchAsync } from '../utils/catchAsync.js';
import { z } from 'zod';

// Validation schemas using Zod
const CreateRoleSchema = z.object({
  key: z.string().trim().min(2, 'Key must be at least 2 characters').max(50, 'Key cannot exceed 50 characters').regex(/^[A-Z0-9_]+$/, 'Key must be uppercase alphanumeric and underscores only'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().trim().max(255, 'Description cannot exceed 255 characters').optional(),
  permissions: z.array(z.string()).optional()
});

const UpdatePermissionsSchema = z.object({
  permissions: z.array(z.string())
});

// RBAC Controller class to handle role and permission management
export class RbacController {
  // Get all roles
  getRoles = catchAsync(async (_req: Request, res: Response) => {
    const roles = await rbacService.getRoles();
    res.status(200).json({
      success: true,
      statusCode: 200,
      data: roles
    });
  });

  // Get all permissions
  getPermissions = catchAsync(async (_req: Request, res: Response) => {
    const permissions = await rbacService.getPermissions();
    res.status(200).json({
      success: true,
      statusCode: 200,
      data: permissions
    });
  });

  // Create a new role
  createRole = catchAsync(async (req: AuthRequest, res: Response) => {
    const validated = CreateRoleSchema.parse(req.body);
    const role = await rbacService.createRole(validated, req.user?.id);
    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `Role ${role.name} created successfully`,
      data: role
    });
  });

  // Update permissions for a specific role
  updateRolePermissions = catchAsync(async (req: AuthRequest, res: Response) => {
    const roleId = Number(req.params.id);
    const validated = UpdatePermissionsSchema.parse(req.body);
    await rbacService.updateRolePermissions(roleId, validated.permissions, req.user?.id);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Role permissions updated successfully'
    });
  });

  // Delete a specific role
  deleteRole = catchAsync(async (req: AuthRequest, res: Response) => {
    const roleId = Number(req.params.id);
    await rbacService.deleteRole(roleId, req.user?.id);
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Custom role removed successfully'
    });
  });
}

export const rbacController = new RbacController();
