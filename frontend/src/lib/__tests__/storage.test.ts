import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';

describe('storage utility', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('stores and retrieves string values', () => {
    storage.set('test_key', 'hello_world');
    expect(storage.get('test_key', '')).toBe('hello_world');
  });

  it('returns fallback value if key does not exist', () => {
    expect(storage.get('non_existent', 'default_val')).toBe('default_val');
  });

  it('stores and retrieves JSON objects', () => {
    const userObj = { id: 1, name: 'Saurabh Sharma', role: 'ADMIN' };
    storage.set('user_profile', userObj);
    expect(storage.get('user_profile', null)).toEqual(userObj);
  });

  it('handles auth token lifecycle', () => {
    expect(storage.getToken()).toBeNull();
    storage.setToken('jwt_sample_token_xyz');
    expect(storage.getToken()).toBe('jwt_sample_token_xyz');
    storage.removeToken();
    expect(storage.getToken()).toBeNull();
  });

  it('clears auth session', () => {
    storage.setToken('jwt_sample_token_xyz');
    storage.setUser({ id: 1, email: 'admin@datapure.io' });

    expect(storage.getToken()).toBe('jwt_sample_token_xyz');
    expect(storage.getUser()).toEqual({ id: 1, email: 'admin@datapure.io' });

    storage.clearAuthSession();

    expect(storage.getToken()).toBeNull();
    expect(storage.getUser()).toBeNull();
  });

  it('clears all storage entries', () => {
    storage.set('key1', 'val1');
    storage.set('key2', 'val2');
    storage.clear();

    expect(storage.get('key1', null)).toBeNull();
    expect(storage.get('key2', null)).toBeNull();
  });

  it('purges all session data including sessionStorage and auth keys via clearAllSessionData', () => {
    storage.setToken('jwt_token_123');
    storage.setUser({ id: 1, email: 'admin@datapure.io' });
    storage.setRedirectAfterLogin('/team');

    expect(storage.getToken()).toBe('jwt_token_123');
    expect(storage.getRedirectAfterLogin()).toBe('/team');

    storage.clearAllSessionData();

    expect(storage.getToken()).toBeNull();
    expect(storage.getUser()).toBeNull();
    expect(storage.getRedirectAfterLogin()).toBeNull();
  });
});
