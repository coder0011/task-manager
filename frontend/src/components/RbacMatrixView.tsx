import React, { useState, useRef } from 'react';
import { Shield, Check, X, Crown, Briefcase, Eye, Plus, Trash2 } from 'lucide-react';
import type { RoleDefinition, PermissionDefinition } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { toast } from 'sonner';
import { confirmDelete } from '../utils/confirmModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../lib/queryClient';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/appConstants';
import { Loader } from './Loader';
import { RoleFormSchema, validateForm } from '../lib/validation';
import './RbacMatrixView.css';

export const RbacMatrixView: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const activeToggles = useRef<Set<string>>(new Set());
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string[]>>({});

  const { data: fetchedRoles, isLoading: isRolesLoading } = useQuery({
    queryKey: QUERY_KEYS.roles,
    queryFn: ({ signal }) => api.getRoles(signal),
  });

  const { data: fetchedPerms, isLoading: isPermsLoading } = useQuery({
    queryKey: QUERY_KEYS.permissions,
    queryFn: ({ signal }) => api.getPermissions(signal),
  });

  const isLoading = isRolesLoading || isPermsLoading;

  const defaultRoles: RoleDefinition[] = [
    { id: 1, key: 'ADMIN', name: 'Administrator', description: null, is_system: 1, permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN, created_at: '', updated_at: '' },
    { id: 2, key: 'MEMBER', name: 'Team Member', description: null, is_system: 1, permissions: DEFAULT_ROLE_PERMISSIONS.MEMBER, created_at: '', updated_at: '' },
    { id: 3, key: 'VIEWER', name: 'Viewer', description: null, is_system: 1, permissions: DEFAULT_ROLE_PERMISSIONS.VIEWER, created_at: '', updated_at: '' }
  ];

  const roles = (fetchedRoles && fetchedRoles.length > 0) ? fetchedRoles : defaultRoles;
  const permissions: PermissionDefinition[] = fetchedPerms || [];

  const rolePermissions: Record<string, string[]> = React.useMemo(() => {
    const map: Record<string, string[]> = { ...DEFAULT_ROLE_PERMISSIONS };
    roles.forEach(r => {
      map[r.key] = r.permissions;
    });
    return { ...map, ...roleOverrides };
  }, [roles, roleOverrides]);

  const togglePermission = async (roleKey: string, permKey: string) => {
    if (!isAdmin) return;
    const lockKey = `${roleKey}:${permKey}`;
    if (activeToggles.current.has(lockKey)) return;

    if (roleKey === 'ADMIN' && permKey === 'user:manage') {
      toast.error('Administrators must retain the user:manage permission to ensure governance.');
      return;
    }

    activeToggles.current.add(lockKey);
    const targetRole = roles.find(r => r.key === roleKey);
    const current = rolePermissions[roleKey] || [];
    const nextPermissions = current.includes(permKey)
      ? current.filter(p => p !== permKey)
      : [...current, permKey];

    // Optimistic UI update
    setRoleOverrides(prev => ({ ...prev, [roleKey]: nextPermissions }));

    try {
      if (targetRole) {
        await api.updateRolePermissions(targetRole.id, nextPermissions);
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      toast.success(`Updated '${permKey}' for role ${roleKey}`);
    } catch (err: any) {
      // Revert on failure
      setRoleOverrides(prev => {
        const next = { ...prev };
        delete next[roleKey];
        return next;
      });
      toast.error(err.displayMessage || 'Failed to update role permissions in database');
    } finally {
      activeToggles.current.delete(lockKey);
    }
  };

  const handleAddCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRole) return;

    const cleanKey = (newRoleKey || newRoleName).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const validation = validateForm(RoleFormSchema, {
      key: cleanKey,
      name: newRoleName,
      description: newRoleDesc,
    });

    if (!validation.success) {
      toast.error(validation.errors.key || validation.errors.name || validation.errors.description || 'Invalid role parameters');
      return;
    }

    setIsSubmittingRole(true);
    try {
      const defaultPerms = ['user:view', 'task:create'];
      const created = await api.createRole({
        key: validation.data.key,
        name: validation.data.name,
        description: validation.data.description || undefined,
        permissions: defaultPerms
      });

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      setIsAddRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleKey('');
      setNewRoleDesc('');
      toast.success(`Custom role "${created.name}" created and saved to database`);
    } catch (err: any) {
      toast.error(err.displayMessage || 'Failed to create role in database');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleDeleteRole = async (role: RoleDefinition) => {
    if (role.is_system) return;
    const confirmed = await confirmDelete({
      title: 'Delete Custom Role?',
      text: `Are you sure you want to permanently delete custom role "${role.name}"?`
    });
    if (!confirmed) return;

    try {
      await api.deleteRole(role.id);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      toast.success(`Role "${role.name}" removed successfully`);
    } catch (err: any) {
      toast.error(err.displayMessage || 'Failed to delete role');
    }
  };

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Dynamic Role-Based Access Governance (RBAC)</h2>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1">
            Define roles, configure granular permissions, and enforce access control policies.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddRoleModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Role</span>
            </button>
          </div>
        )}
      </div>

      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Admin Card */}
        <div className="p-5 rounded-xl bg-[#121215] border border-amber-500/25 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Crown className="w-4 h-4 text-amber-400" />
              ADMINISTRATOR
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-mono border border-amber-500/20">
              {rolePermissions['ADMIN']?.length || 0} Scopes
            </span>
          </div>
          <p className="text-xs text-[#94a3b8]">
            Full enterprise governance. Can manage workspace settings, assign member privileges, and inspect activity logs.
          </p>
        </div>

        {/* Member Card */}
        <div className="p-5 rounded-xl bg-[#121215] border border-blue-500/25 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
              <Briefcase className="w-4 h-4 text-blue-400" />
              TEAM MEMBER
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-mono border border-blue-500/20">
              {rolePermissions['MEMBER']?.length || 0} Scopes
            </span>
          </div>
          <p className="text-xs text-[#94a3b8]">
            Active product collaborator. Can create, edit, move issues, attach files, and manage checklists.
          </p>
        </div>

        {/* Viewer Card */}
        <div className="p-5 rounded-xl bg-[#121215] border border-purple-500/25 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
              <Eye className="w-4 h-4 text-purple-400" />
              VIEWER / AUDITOR
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 font-mono border border-purple-500/20">
              {rolePermissions['VIEWER']?.length || 0} Scope
            </span>
          </div>
          <p className="text-xs text-[#94a3b8]">
            Read-only stakeholder. Can inspect the sprint board, view task specifications, and browse directory.
          </p>
        </div>
      </div>

      {/* Interactive Permission Matrix Table */}
      <div className="bg-[#121215] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl relative">
        {isLoading && (
          <Loader variant="overlay" size="md" label="Updating access permissions..." />
        )}
        <div className="px-6 py-4 border-b border-[#27272a] bg-[#18181c]/60 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Live Permission Matrix</span>
          </h3>
          {isAdmin && (
            <span className="text-[11px] text-[#94a3b8]">
              Interactive: Click to toggle database-persisted permissions
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#18181c]/40 text-[#a1a1aa] text-[11px] font-semibold uppercase tracking-wider select-none">
                <th className="py-3.5 px-6">Capability & Scope</th>
                <th className="py-3.5 px-4">Category</th>
                {roles.map(r => (
                  <th key={r.key} className="py-3.5 px-6 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{r.name}</span>
                      {!r.is_system && isAdmin && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="text-[#71717a] hover:text-rose-400 p-0.5 transition"
                          title="Delete custom role"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#27272a] text-xs">
              {(permissions.length > 0 ? permissions : [
                { id: 1, key: 'task:create', name: 'Create Tasks', category: 'TASKS', description: 'Create and publish workflow tasks', created_at: '' },
                { id: 2, key: 'task:edit', name: 'Edit Tasks', category: 'TASKS', description: 'Update task details, columns, and checklists', created_at: '' },
                { id: 3, key: 'task:move', name: 'Move Tasks', category: 'TASKS', description: 'Drag-and-drop tasks between columns', created_at: '' },
                { id: 4, key: 'task:delete', name: 'Delete Tasks', category: 'TASKS', description: 'Permanently remove tasks from boards', created_at: '' },
                { id: 5, key: 'user:view', name: 'View Users', category: 'USERS', description: 'Browse team directory and member profiles', created_at: '' },
                { id: 6, key: 'user:manage', name: 'Manage Users', category: 'USERS', description: 'Invite, modify, and delete workspace members', created_at: '' },
                { id: 7, key: 'audit:view', name: 'View Audit Logs', category: 'AUDIT', description: 'Access enterprise activity and compliance logs', created_at: '' }
              ]).map((perm) => (
                <tr key={perm.key} className="hover:bg-[#18181c]/40 transition">
                  <td className="py-3.5 px-6">
                    <div>
                      <span className="font-semibold text-white">{perm.name}</span>
                      <p className="text-[11px] text-[#71717a] font-mono">{perm.key}</p>
                      <p className="text-[11px] text-[#94a3b8] mt-0.5">{perm.description}</p>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#18181c] text-[#a1a1aa] border border-[#27272a]">
                      {perm.category}
                    </span>
                  </td>

                  {roles.map(role => {
                    const isEnabled = (rolePermissions[role.key] || []).includes(perm.key);

                    return (
                      <td key={role.key} className="py-3.5 px-6 text-center">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => togglePermission(role.key, perm.key)}
                            className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition border ${
                              isEnabled
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-[#18181c] border-[#27272a] text-[#71717a] hover:text-white'
                            }`}
                            title={`Toggle ${perm.name} for ${role.name}`}
                          >
                            {isEnabled ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-3.5 h-3.5 opacity-40" />}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center">
                            {isEnabled ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[#18181c] text-[#71717a] flex items-center justify-center">
                                <X className="w-3.5 h-3.5 opacity-30" />
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CUSTOM ROLE MODAL */}
      {isAddRoleModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Create Custom Role in Database</h3>
              </div>
              <button onClick={() => setIsAddRoleModalOpen(false)} className="p-1.5 rounded-lg text-[#71717a] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomRole} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => {
                    setNewRoleName(e.target.value);
                    if (!newRoleKey) {
                      setNewRoleKey(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                    }
                  }}
                  placeholder="e.g. Lead QA or Product Manager"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1">Role Key (Identifier)</label>
                <input
                  type="text"
                  required
                  value={newRoleKey}
                  onChange={(e) => setNewRoleKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                  placeholder="e.g. LEAD_QA or PRODUCT_MANAGER"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Describe role responsibilities..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoleModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRole}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow disabled:opacity-50"
                >
                  {isSubmittingRole ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
