import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { storage } from '../../lib/storage';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue({ success: true }),
    register: vi.fn(),
    getMe: vi.fn(),
  },
}));

const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, hasRole, hasPermission, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-state">{isAuthenticated ? 'LOGGED_IN' : 'LOGGED_OUT'}</span>
      <span data-testid="user-role">{user?.role || 'NONE'}</span>
      <span data-testid="is-admin">{hasRole('ADMIN') ? 'YES' : 'NO'}</span>
      <span data-testid="can-edit">{hasPermission('task:edit') ? 'CAN_EDIT' : 'CANNOT_EDIT'}</span>
      <button onClick={() => login('admin@datapure.io', 'pass123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext and Provider', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('initializes as unauthenticated when storage is empty', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state')).toHaveTextContent('LOGGED_OUT');
    expect(screen.getByTestId('user-role')).toHaveTextContent('NONE');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('NO');
  });

  it('evaluates admin role and permissions accurately', async () => {
    storage.setUser({ id: 1, email: 'admin@datapure.io', role: 'ADMIN', fullName: 'Admin' });
    storage.setToken('mock_jwt');
    (api.getMe as any).mockResolvedValue({ id: 1, email: 'admin@datapure.io', role: 'ADMIN', fullName: 'Admin' });

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('LOGGED_IN');
    expect(screen.getByTestId('user-role')).toHaveTextContent('ADMIN');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('YES');
    expect(screen.getByTestId('can-edit')).toHaveTextContent('CAN_EDIT');
  });

  it('restricts viewer from edit permissions', async () => {
    storage.setUser({ id: 3, email: 'viewer@datapure.io', role: 'VIEWER', fullName: 'Viewer' });
    storage.setToken('mock_jwt_viewer');
    (api.getMe as any).mockResolvedValue({ id: 3, email: 'viewer@datapure.io', role: 'VIEWER', fullName: 'Viewer' });

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('LOGGED_IN');
    expect(screen.getByTestId('user-role')).toHaveTextContent('VIEWER');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('NO');
    expect(screen.getByTestId('can-edit')).toHaveTextContent('CANNOT_EDIT');
  });

  it('handles login and state updates', async () => {
    (api.login as any).mockResolvedValue({
      user: { id: 1, email: 'admin@datapure.io', role: 'ADMIN', fullName: 'Admin' },
      token: 'new_token_123',
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('LOGGED_IN');
    expect(storage.getToken()).toBe('new_token_123');
  });

  it('handles logout and clears storage', async () => {
    storage.setUser({ id: 1, email: 'admin@datapure.io', role: 'ADMIN', fullName: 'Admin' });
    storage.setToken('mock_jwt');
    (api.getMe as any).mockResolvedValue({ id: 1, email: 'admin@datapure.io', role: 'ADMIN', fullName: 'Admin' });

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('LOGGED_OUT');
    expect(storage.getToken()).toBeNull();
  });
});
