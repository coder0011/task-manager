import type { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { catchAsync } from '../utils/catchAsync.js';
import { env } from '../config/env.js';
import { z } from 'zod';

const authService = new AuthService();

// Validation schemas using Zod synchronized with MySQL Schema bounds
export const RegisterSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(150, 'Email cannot exceed 150 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters')
});

export const LoginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(150, 'Email cannot exceed 150 characters'),
  password: z.string().min(1, 'Password is required').max(100, 'Password cannot exceed 100 characters')
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(150, 'Email cannot exceed 150 characters')
});

export const ResetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters')
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').optional(),
  avatarUrl: z.string().trim().max(255, 'Avatar URL cannot exceed 255 characters').optional(),
  avatar: z.string().trim().max(255, 'Avatar URL cannot exceed 255 characters').optional()
}).transform(data => ({
  fullName: data.fullName,
  avatarUrl: data.avatarUrl || data.avatar
}));

export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required').max(100).optional(),
  currentPassword: z.string().min(1, 'Current password is required').max(100).optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters')
}).refine(data => data.oldPassword !== undefined || data.currentPassword !== undefined, {
  message: 'Current password is required',
  path: ['oldPassword']
}).transform(data => ({
  oldPassword: (data.oldPassword || data.currentPassword)!,
  newPassword: data.newPassword
}));

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

// Controller class for handling authentication-related requests
export class AuthController {
  /**
   * Handle user registration by validating input data and creating a new user account.
   * @param req - The request object containing user registration data.
   * @param res - The response object used to send back the registration result.
   * @returns A JSON response containing the newly created user and authentication token.
   */
  register = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { email, password, fullName } = RegisterSchema.parse(req.body);
    const result = await authService.register(email, password, fullName);
    res.status(201).json({ success: true, data: result });
  });

  /**
   * Handle user login by validating credentials and returning an authentication token.
   * @param req - The request object containing user login credentials.
   * @param res - The response object used to send back the login result.
   * @returns A JSON response containing the authenticated user and authentication token.
   */
  login = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = LoginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  });

  /**
   * Handle user logout: logs audit event and clears all HTTP-only session cookies.
   * @param req - The authenticated request object containing user information.
   * @param res - The response object used to clear cookies and send back confirmation.
   */
  logout = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (userId) {
      await authService.logout(userId, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    const cookieOptions = {
      path: '/',
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: env.isProduction
    };

    res.clearCookie('token', cookieOptions);
    res.clearCookie('jwt', cookieOptions);
    res.clearCookie('session', cookieOptions);
    res.clearCookie('connect.sid', cookieOptions);

    res.json({
      success: true,
      message: 'Logged out successfully. All session credentials invalidated.'
    });
  });

  /**
   * Handle fetching the currently authenticated user's details.
   * @param req - The authenticated request object containing user information.
   * @param res - The response object used to send back the current user's details.
   * @returns A JSON response containing the currently authenticated user's details.
   */
  me = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await authService.getCurrentUser(req.user!.id);
    res.json({ success: true, data: user });
  });

  /**
   * Handle sending a password reset link to the user's email.
   * @param req - The request object containing the user's email.
   * @param res - The response object used to send back the result of the operation.
   * @returns A JSON response indicating the outcome of the password reset request.
   */
  forgotPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { email } = ForgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(email);
    res.json({ success: true, data: result });
  });

  /**
   * Handle resetting the user's password using a reset token.
   * @param req - The request object containing the reset token and new password.
   * @param res - The response object used to send back the result of the operation.
   * @returns A JSON response indicating the outcome of the password reset.
   */
  resetPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(token, newPassword);
    res.json({ success: true, data: result });
  });

  /**
   * Handle updating the authenticated user's profile information.
   * @param req - The authenticated request object containing user information and update data.
   * @param res - The response object used to send back the updated user details.
   * @returns A JSON response containing the updated user details.
   */
  updateProfile = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const input = UpdateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.user!.id, input);
    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  });

  /**
   * Handle changing the user's password.
   * @param req - The authenticated request object containing user information and password change data.
   * @param res - The response object used to send back the result of the password change.
   * @returns A JSON response indicating the outcome of the password change.
   */
  changePassword = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const { oldPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    const result = await authService.changePassword(req.user!.id, oldPassword, newPassword);
    res.json({ success: true, data: result });
  });

  /**
   * Upload user profile avatar for authenticated user.
   */
  uploadAvatar = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'No avatar image file provided' });
      return;
    }
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const user = await authService.updateProfile(req.user!.id, { avatarUrl });
    res.json({ success: true, data: user, message: 'Profile avatar updated successfully' });
  });
}

