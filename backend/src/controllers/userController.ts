import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { UserService } from '../services/userService.js';
import { catchAsync } from '../utils/catchAsync.js';
import { z } from 'zod';
import type { UserRole } from '../types/index.js';

const userService = new UserService();

// Validation schemas using Zod
export const CreateUserSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(150, 'Email cannot exceed 150 characters'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters'),
  role: z.string().trim().min(2).max(50).default('MEMBER'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters').optional()
});

export const UpdateUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').optional(),
  email: z.string().trim().email('Please enter a valid email address').max(150, 'Email cannot exceed 150 characters').optional(),
  role: z.string().trim().min(2).max(50).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters').optional(),
  isActive: z.boolean().optional()
});

export const UpdateRoleSchema = z.object({
  role: z.string().trim().min(2).max(50)
});

export const UpdateStatusSchema = z.object({
  isActive: z.boolean()
});

export const UserQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  all: z.coerce.string().optional()
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type UserQueryInput = z.infer<typeof UserQuerySchema>;

// Controller class for handling user-related requests
export class UserController {
  /**
   * Retrieve users from the system with server-side pagination, searching, and filtering.
   * @param req - The authenticated request object containing user info and query parameters for pagination and filtering.
   * @param res - The response object used to send back the list of users and pagination details.
   * @returns A JSON response containing the list of users and pagination information.
   * If the 'all' query parameter is set to true, returns all users without pagination.
   */
  getAllUsers = catchAsync(async (req: AuthRequest, res: Response) => {
    const query = UserQuerySchema.parse(req.query);
    
    // When explicit all=true is specified (e.g., for task assignment dropdowns)
    if (query.all === 'true' || query.all === '1') {
      const users = await userService.getAllUsers();
      res.json({ success: true, data: users });
      return;
    }

    const result = await userService.getPaginatedUsers({
      page: query.page,
      limit: query.limit,
      search: query.search,
      role: query.role,
      status: query.status
    });

    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  });

  /**
   * Upload user profile avatar.
   * @param req - The authenticated request object containing user info and the uploaded avatar file.
   * @param res - The response object used to send back the result of the avatar upload operation.
   * @returns A JSON response containing the updated user details with the new avatar URL.
   */
  uploadAvatar = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'No avatar image file provided' });
      return;
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const user = await userService.updateAvatar(userId, avatarUrl, req.user?.id || userId);
    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: user
    });
  });

  /**
   * Retrieve a specific user by their ID.
   * @param req - The authenticated request object containing user information and the user ID parameter.
   * @param res - The response object used to send back the details of the requested user.
   * @returns A JSON response containing the details of the specified user.
   */
  getUserById = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    const user = await userService.getUserById(userId);
    res.json({ success: true, data: user });
  });

  /**
   * Update the role of a specific user.
   * @param req - The authenticated request object containing user information, the user ID parameter, and the new role data.
   * @param res - The response object used to send back the updated user details.
   * @returns A JSON response containing the details of the user with the updated role.
   */
  updateUserRole = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    const { role } = UpdateRoleSchema.parse(req.body);

    const updated = await userService.updateUserRole(userId, role as UserRole, req.user!.id);
    res.json({
      success: true,
      message: `User role successfully updated to ${role}`,
      data: updated
    });
  });

  /**
   * Update the active status of a specific user.
   * @param req - The authenticated request object containing user information, the user ID parameter, and the new status data.
   * @param res - The response object used to send back the updated user details.
   * @returns A JSON response containing the details of the user with the updated status.
   */
  updateUserStatus = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    const { isActive } = UpdateStatusSchema.parse(req.body);

    const updated = await userService.updateUserStatus(userId, isActive, req.user!.id);
    res.json({
      success: true,
      message: `User status successfully set to ${isActive ? 'Active' : 'Inactive'}`,
      data: updated
    });
  });

  /**
   * Create a new user in the system.
   * @param req - The authenticated request object containing user information and the new user data.
   * @param res - The response object used to send back the details of the newly created user.
   * @returns A JSON response containing the details of the newly created user.
   */
  createUser = catchAsync(async (req: AuthRequest, res: Response) => {
    const input = CreateUserSchema.parse(req.body);
    const user = await userService.createUser(input as any, req.user?.id);
    res.status(201).json({
      success: true,
      message: `User ${user.fullName} created successfully`,
      data: user
    });
  });

  /**
   * Update the details of an existing user.
   * @param req - The authenticated request object containing user information, the user ID parameter, and the updated user data.
   * @param res - The response object used to send back the updated user details.
   * @returns A JSON response containing the details of the updated user.
   */
  updateUser = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    const updates = UpdateUserSchema.parse(req.body);
    const user = await userService.updateUser(userId, updates as any, req.user!.id);
    res.json({
      success: true,
      message: `User ${user.fullName} updated successfully`,
      data: user
    });
  });

  /**
   * Delete a specific user from the system.
   * @param req - The authenticated request object containing user information and the user ID parameter.
   * @param res - The response object used to send back the result of the deletion operation.
   * @returns A JSON response indicating the success of the deletion operation.
   */
  deleteUser = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = Number(req.params.id);
    await userService.deleteUser(userId, req.user!.id);
    res.json({
      success: true,
      message: 'User successfully removed from system'
    });
  });
}

