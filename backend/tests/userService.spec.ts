import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from '../src/services/userService.js';
import { UserRepository } from '../src/repositories/userRepository.js';
import { User } from '../src/types/index.js';
import { BadRequestError, NotFoundError } from '../src/errors/AppError.js';

class MockUserRepository extends UserRepository {
  private users = new Map<number, User>();

  seed(users: User[]) {
    users.forEach(u => this.users.set(u.id, u));
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async findById(id: number): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async updateRole(id: number, role: any): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    user.role = role;
    return true;
  }

  async updateStatus(id: number, isActive: boolean): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    user.isActive = isActive;
    return true;
  }

  async delete(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
}

describe('UserService Unit Tests', () => {
  let userService: UserService;
  let mockRepo: MockUserRepository;

  beforeEach(() => {
    mockRepo = new MockUserRepository();
    userService = new UserService(mockRepo);

    mockRepo.seed([
      {
        id: 1,
        email: 'admin@datapure.io',
        fullName: 'Admin User',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 2,
        email: 'member@datapure.io',
        fullName: 'Team Member',
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date()
      }
    ]);
  });

  it('lists all users successfully', async () => {
    const users = await userService.getAllUsers();
    expect(users).toHaveLength(2);
    expect(users[0].email).toBe('admin@datapure.io');
  });

  it('allows admin to change another member role', async () => {
    const updated = await userService.updateUserRole(2, 'ADMIN', 1);
    expect(updated.role).toBe('ADMIN');
  });

  it('prevents an admin from demoting their own admin role', async () => {
    await expect(userService.updateUserRole(1, 'MEMBER', 1)).rejects.toThrow(BadRequestError);
  });

  it('prevents an admin from deactivating their own account', async () => {
    await expect(userService.updateUserStatus(1, false, 1)).rejects.toThrow(BadRequestError);
  });

  it('prevents an admin from deleting their own account', async () => {
    await expect(userService.deleteUser(1, 1)).rejects.toThrow(BadRequestError);
  });

  it('throws NotFoundError when target user does not exist', async () => {
    await expect(userService.getUserById(999)).rejects.toThrow(NotFoundError);
  });
});
