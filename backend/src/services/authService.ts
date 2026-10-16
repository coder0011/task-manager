import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/userRepository.js';
import { User, UserRole } from '../types/index.js';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../errors/AppError.js';
import { activityLogService } from './activityLogService.js';
import { mailerService } from './mailerService.js';

export class AuthService {
  constructor(private readonly userRepo: UserRepository = new UserRepository()) {}

  private readonly jwtSecret = process.env.JWT_SECRET || 'datapure_default_secret_key_123';

  // Register a new user and return the user object along with a JWT token
  async register(
    email: string,
    password: string,
    fullName: string,
    role: UserRole = 'MEMBER'
  ): Promise<{ user: User; token: string }> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email is already registered in the system');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepo.create({ email, passwordHash, fullName, role });
    const token = this.generateToken(user);

    activityLogService.log({
      userId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: user.id,
      details: { email: user.email, fullName: user.fullName, role: user.role }
    });

    return { user, token };
  }

  // Authenticate a user and return the user object along with a JWT token
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated. Please contact an administrator.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { passwordHash, ...cleanUser } = user;
    const token = this.generateToken(cleanUser);

    activityLogService.log({
      userId: cleanUser.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: cleanUser.id,
      details: { email: cleanUser.email }
    });

    return { user: cleanUser, token };
  }

  // Handle user logout and emit security audit trail event
  async logout(userId: number, context?: { ip?: string; userAgent?: string }): Promise<void> {
    activityLogService.log({
      userId,
      action: 'USER_LOGOUT',
      entityType: 'USER',
      entityId: userId,
      details: {
        timestamp: new Date().toISOString(),
        clientIp: context?.ip,
        userAgent: context?.userAgent
      }
    });
  }

  // Retrieve the current authenticated user by their ID
  async getCurrentUser(id: number): Promise<User | null> {
    return this.userRepo.findById(id);
  }

  // Handle forgot password request by sending a reset email with a token
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Prevent user enumeration by returning uniform success message
      return {
        message: 'If an account exists with this email address, password reset instructions have been dispatched.'
      };
    }

    const resetToken = jwt.sign(
      { email: user.email, purpose: 'reset-password' },
      this.jwtSecret,
      { expiresIn: '1h' }
    );

    // Send formatted dark-themed HTML email exclusively
    await mailerService.sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.fullName,
      resetToken
    });

    activityLogService.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      details: { email: user.email }
    });

    return {
      message: 'If an account exists with this email address, password reset instructions have been dispatched.'
    };
  }

  // Reset the user's password using the provided token and new password
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { email: string; purpose: string };
      if (decoded.purpose !== 'reset-password') {
        throw new BadRequestError('Invalid reset token purpose');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      const updated = await this.userRepo.updatePasswordByEmail(decoded.email, passwordHash);
      if (!updated) {
        throw new NotFoundError('User account not found');
      }

      const user = await this.userRepo.findByEmail(decoded.email);
      activityLogService.log({
        userId: user?.id,
        action: 'USER_PASSWORD_RESET',
        entityType: 'USER',
        entityId: user?.id,
        details: { email: decoded.email }
      });

      return { message: 'Password has been successfully updated. You may now login.' };
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new BadRequestError('Password reset link has expired. Please request a new one.');
      }
      throw new BadRequestError(err.message || 'Invalid or malformed reset token');
    }
  }

  // Update the user's profile information and log the action
  async updateProfile(userId: number, data: { fullName?: string; avatarUrl?: string }): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.userRepo.updateProfile(userId, data);
    const updated = (await this.userRepo.findById(userId))!;

    activityLogService.log({
      userId,
      action: 'USER_PROFILE_UPDATED',
      entityType: 'USER',
      entityId: userId,
      details: { email: updated.email, updatedFields: Object.keys(data) }
    });

    return updated;
  }

  // Change the user's password after verifying the old password and log the action
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Need passwordHash to compare
    const fullUser = await this.userRepo.findByEmail(user.email);
    if (!fullUser) {
      throw new NotFoundError('User account not found');
    }

    const isValid = await bcrypt.compare(oldPassword, fullUser.passwordHash);
    if (!isValid) {
      throw new BadRequestError('Current password does not match');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.updatePassword(userId, passwordHash);

    activityLogService.log({
      userId,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
      details: { email: user.email }
    });

    return { message: 'Password changed successfully' };
  }

  // Generate a JWT token for the authenticated user with a 7-day expiration
  private generateToken(user: { id: number; email: string; role: string; fullName?: string }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }
}

