import { describe, it, expect, vi } from 'vitest';
import { RbacService } from '../src/services/rbacService.js';
import { rbacRepository } from '../src/repositories/rbacRepository.js';

describe('RbacService', () => {
  it('should define CASL ability correctly for ADMIN role', async () => {
    vi.spyOn(rbacRepository, 'getRoleByKey').mockResolvedValueOnce({
      id: 1,
      key: 'ADMIN',
      name: 'Administrator',
      description: null,
      is_system: 1,
      permissions: ['task:create', 'task:edit', 'task:delete', 'task:move', 'user:view', 'user:manage', 'audit:view'],
      created_at: '',
      updated_at: ''
    });

    const service = new RbacService();
    const ability = await service.defineAbilityFor('ADMIN');

    expect(ability.can('manage', 'all')).toBe(true);
    expect(ability.can('delete', 'Task')).toBe(true);
    expect(ability.can('manage', 'User')).toBe(true);
  });

  it('should define CASL ability correctly for MEMBER role based on permissions', async () => {
    vi.spyOn(rbacRepository, 'getRoleByKey').mockResolvedValueOnce({
      id: 2,
      key: 'MEMBER',
      name: 'Team Member',
      description: null,
      is_system: 1,
      permissions: ['task:create', 'task:edit', 'task:move', 'user:view'],
      created_at: '',
      updated_at: ''
    });

    const service = new RbacService();
    const ability = await service.defineAbilityFor('MEMBER');

    expect(ability.can('create', 'task')).toBe(true);
    expect(ability.can('edit', 'task')).toBe(true);
    expect(ability.can('delete', 'task')).toBe(false);
  });
});
