import { UserRepository } from '../repositories/userRepository.js';
import { User, UserRole, UserFilterOptions, PaginatedResult } from '../types/index.js';
import { NotFoundError, BadRequestError } from '../errors/AppError.js';
import { activityLogService } from './activityLogService.js';
import { mailerService } from './mailerService.js';

export class UserService {
  constructor(private readonly userRepo: UserRepository = new UserRepository()) {}

  // Retrieves all users in the system
  async getAllUsers(): Promise<User[]> {
    return this.userRepo.findAll();
  }

  // Retrieves paginated users based on filter options like search, role, and status
  async getPaginatedUsers(options: UserFilterOptions): Promise<PaginatedResult<User>> {
    return this.userRepo.findPaginated(options);
  }

  // Updates a user's avatar and logs the action in the activity log
  async updateAvatar(id: number, avatarUrl: string, actingUserId: number): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    await this.userRepo.updateAvatar(id, avatarUrl);
    const updated = (await this.userRepo.findById(id))!;

    activityLogService.log({
      userId: actingUserId,
      action: 'USER_AVATAR_UPDATED',
      entityType: 'USER',
      entityId: id,
      details: { email: updated.email, avatarUrl }
    });

    return updated;
  }

  // Retrieves a user by their ID with error handling
  async getUserById(id: number): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    return user;
  }

  // Updates a user's role and logs the change in the activity log
  async updateUserRole(id: number, role: UserRole, currentUserId: number): Promise<User> {
    if (id === currentUserId && role !== 'ADMIN') {
      throw new BadRequestError('Administrators cannot revoke their own admin privileges');
    }

    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    await this.userRepo.updateRole(id, role);
    const updated = (await this.userRepo.findById(id))!;

    activityLogService.log({
      userId: currentUserId,
      action: 'USER_ROLE_CHANGED',
      entityType: 'USER',
      entityId: id,
      details: { targetEmail: user.email, previousRole: user.role, newRole: role }
    });

    return updated;
  }

  // Updates a user's active status with validation to prevent self-deactivation and logs the action
  async updateUserStatus(id: number, isActive: boolean, currentUserId: number): Promise<User> {
    if (id === currentUserId && !isActive) {
      throw new BadRequestError('You cannot deactivate your own account');
    }

    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    await this.userRepo.updateStatus(id, isActive);
    const updated = (await this.userRepo.findById(id))!;

    activityLogService.log({
      userId: currentUserId,
      action: 'USER_STATUS_TOGGLED',
      entityType: 'USER',
      entityId: id,
      details: { targetEmail: user.email, isActive }
    });

    return updated;
  }

  // Deletes a user with validation to prevent self-deletion and logs the action
  async deleteUser(id: number, currentUserId: number): Promise<boolean> {
    if (id === currentUserId) {
      throw new BadRequestError('You cannot delete your own account');
    }

    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    const result = await this.userRepo.delete(id);

    activityLogService.log({
      userId: currentUserId,
      action: 'USER_DELETED',
      entityType: 'USER',
      entityId: id,
      details: { deletedEmail: user.email, fullName: user.fullName }
    });

    return result;
  }

  // Creates a new user, checks for duplicate emails, hashes the password, logs the creation, and sends an invite email
  async createUser(data: {
    email: string;
    fullName: string;
    role?: UserRole;
    password?: string;
  }, actingUserId?: number): Promise<User> {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new BadRequestError(`Email "${data.email}" is already registered`);
    }

    const bcrypt = await import('bcryptjs');
    const rawPass = data.password || 'DataPure123!';
    const passwordHash = await bcrypt.default.hash(rawPass, 10);

    const created = await this.userRepo.create({
      email: data.email,
      fullName: data.fullName,
      role: data.role || 'MEMBER',
      passwordHash
    });

    activityLogService.log({
      userId: actingUserId,
      action: 'USER_INVITED',
      entityType: 'USER',
      entityId: created.id,
      details: { email: created.email, fullName: created.fullName, role: created.role }
    });

    // Dispatch custom dark-themed invite email
    mailerService.sendTeamInviteEmail({
      toEmail: created.email,
      fullName: created.fullName,
      role: created.role,
      inviterName: 'Workspace Administrator',
      tempPassword: rawPass
    }).catch(() => {});

    return created;
  }

  // Updates user details with validation for self-updates and email uniqueness, logs the action
  async updateUser(
    id: number,
    data: { fullName?: string; email?: string; role?: UserRole; isActive?: boolean },
    currentUserId: number
  ): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    if (id === currentUserId && data.role && data.role !== 'ADMIN') {
      throw new BadRequestError('Administrators cannot revoke their own admin privileges');
    }

    if (id === currentUserId && data.isActive === false) {
      throw new BadRequestError('You cannot deactivate your own account');
    }

    if (data.email && data.email !== user.email) {
      const emailExists = await this.userRepo.findByEmail(data.email);
      if (emailExists && emailExists.id !== id) {
        throw new BadRequestError(`Email "${data.email}" is already taken`);
      }
    }

    await this.userRepo.updateUser(id, data);
    const updated = (await this.userRepo.findById(id))!;

    activityLogService.log({
      userId: currentUserId,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      details: { updatedFields: Object.keys(data), targetEmail: updated.email }
    });

    return updated;
  }
}

