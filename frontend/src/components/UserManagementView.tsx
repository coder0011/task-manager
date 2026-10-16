import React, { useState, useEffect } from 'react';
import type { User, UserRole, PaginationMetadata } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, UserPlus, UserCheck, UserX, Trash2, Crown, Briefcase, Eye, EyeOff, 
  Edit3, X, Shield, Search, Filter, RotateCcw, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, UploadCloud
} from 'lucide-react';

import { toast } from 'sonner';
import { confirmDelete } from '../utils/confirmModal';
import { UserAvatar } from './UserAvatar';
import { Loader } from './Loader';
import { formatDate } from '../lib/formatters';
import { PAGINATION } from '../constants/appConstants';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../lib/queryClient';
import { useDebounce } from '../utils/asyncUtils';
import { CreateUserSchema, EditUserSchema, validateForm } from '../lib/validation';
import './UserManagementView.css';

export const UserManagementView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Server-side filtering & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(PAGINATION.DEFAULT_LIMIT);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUploadingEditAvatar, setIsUploadingEditAvatar] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Form States
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<string>('MEMBER');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);


  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<string>('MEMBER');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedRole, selectedStatus]);

  const queryParams = {
    page,
    limit,
    search: debouncedSearch.trim() || undefined,
    role: selectedRole !== 'ALL' ? selectedRole : undefined,
    status: selectedStatus !== 'ALL' ? selectedStatus : undefined
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: QUERY_KEYS.users(queryParams),
    queryFn: ({ signal }) => api.getUsers(queryParams, signal),
  });

  const users: User[] = data && 'users' in data ? (data.users || []) : (Array.isArray(data) ? data : []);
  const pagination: PaginationMetadata = data && 'pagination' in data && data.pagination ? data.pagination : {
    page: 1,
    limit: PAGINATION.DEFAULT_LIMIT,
    total: users.length,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingUser) return;

    const validation = validateForm(CreateUserSchema, {
      fullName: newFullName,
      email: newEmail,
      role: newRole,
      password: newPassword || 'DataPure123!',
      status: 'ACTIVE',
    });

    if (!validation.success) {
      toast.error(validation.errors.fullName || validation.errors.email || validation.errors.password || 'Please check form fields');
      return;
    }

    setIsCreatingUser(true);
    try {
      const created = await api.createUser({
        email: validation.data.email,
        fullName: validation.data.fullName,
        role: validation.data.role,
        password: validation.data.password
      });
      toast.success(`Team member "${created.fullName}" invited successfully`);
      setIsCreateModalOpen(false);
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err: any) {
      toast.error(err.displayMessage || err.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingUser || !selectedUser) return;

    const validation = validateForm(EditUserSchema, {
      fullName: editFullName,
      email: editEmail,
      role: editRole,
      status: editIsActive ? 'ACTIVE' : 'INACTIVE',
    });

    if (!validation.success) {
      toast.error(validation.errors.fullName || validation.errors.email || 'Please check form fields');
      return;
    }

    setIsUpdatingUser(true);
    try {
      const updated = await api.updateUser(selectedUser.id, {
        fullName: validation.data.fullName,
        email: validation.data.email,
        role: validation.data.role,
        isActive: editIsActive
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User "${updated.fullName}" updated successfully`);
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.displayMessage || err.message || 'Failed to update user');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleEditAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedUser) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingEditAvatar(true);
    try {
      const updated = await api.uploadUserAvatar(selectedUser.id, file);
      setSelectedUser(updated);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User avatar updated');
    } catch (err: any) {
      toast.error(err.displayMessage || err.message || 'Failed to upload user avatar');
    } finally {
      setIsUploadingEditAvatar(false);
    }
  };

  const handleStatusToggle = async (userId: number, currentStatus: boolean, name: string) => {
    try {
      const nextStatus = !currentStatus;
      await api.updateUserStatus(userId, nextStatus);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Account status updated for ${name}`);
    } catch (err: any) {
      toast.error(err.displayMessage || err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: number, name: string) => {
    const confirmed = await confirmDelete({
      title: 'Remove Team Member?',
      text: `Are you sure you want to permanently remove "${name}" from the organization?`
    });
    if (!confirmed) return;

    try {
      await api.deleteUser(userId);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Team member removed successfully');
    } catch (err: any) {
      toast.error(err.displayMessage || err.message || 'Failed to remove user');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRole('ALL');
    setSelectedStatus('ALL');
    setPage(1);
  };

  const isFiltered = searchQuery.trim() !== '' || selectedRole !== 'ALL' || selectedStatus !== 'ALL';

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Crown className="w-3 h-3 text-amber-400" />
            ADMIN
          </span>
        );
      case 'MEMBER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Briefcase className="w-3 h-3 text-blue-400" />
            MEMBER
          </span>
        );
      case 'VIEWER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Eye className="w-3 h-3 text-purple-400" />
            VIEWER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
            <Shield className="w-3 h-3 text-emerald-400" />
            {role}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Team & Identity Directory</h2>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1">
            Manage organization members, assign access roles, and monitor account status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-lg bg-[#18181c] border border-[#27272a] text-xs text-[#a1a1aa]">
            Total Users: <strong className="text-white">{pagination.total}</strong>
          </span>

          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition shadow"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Server-Side Filter Bar */}
      <div className="p-3 rounded-xl bg-[#121215] border border-[#27272a] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search members by name or email..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#18181c] border border-[#27272a] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white p-0.5 rounded transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-[#18181c] px-3 py-1.5 rounded-lg border border-[#27272a]">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#18181c] text-white">All Roles</option>
              <option value="ADMIN" className="bg-[#18181c] text-white">Administrators</option>
              <option value="MEMBER" className="bg-[#18181c] text-white">Members</option>
              <option value="VIEWER" className="bg-[#18181c] text-white">Viewers</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#18181c] px-3 py-1.5 rounded-lg border border-[#27272a]">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#18181c] text-white">All Statuses</option>
              <option value="ACTIVE" className="bg-[#18181c] text-white">Active Only</option>
              <option value="INACTIVE" className="bg-[#18181c] text-white">Inactive Only</option>
            </select>
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        <div className="text-xs text-[#94a3b8]">
          Showing <strong className="text-white">{users.length}</strong> of {pagination.total} members
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-[#121215] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl relative">
        {isFetching && users.length > 0 && (
          <Loader variant="overlay" size="md" label="Updating team directory..." />
        )}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#18181c]/60 text-[#a1a1aa] text-[11px] font-semibold uppercase tracking-wider select-none">
              <th className="py-3.5 px-5">Member</th>
              <th className="py-3.5 px-5">Role Privileges</th>
              <th className="py-3.5 px-5">Account Status</th>
              <th className="py-3.5 px-5">Joined Date</th>
              {isAdmin && <th className="py-3.5 px-5 text-right">Actions</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#27272a] text-xs">
            {isLoading && users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#94a3b8]">
                  <Loader variant="spinner" size="md" label="Loading team members..." />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#94a3b8]">
                  No users found matching the filter criteria.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUser?.id;

                return (
                  <tr key={u.id} className="hover:bg-[#18181c]/40 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={u.fullName}
                          avatarUrl={u.avatarUrl}
                          size="lg"
                          color="blue"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-white">{u.fullName}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#71717a]">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5">
                      {getRoleBadge(u.role)}
                    </td>

                    <td className="py-3.5 px-5">
                      {isAdmin ? (
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => handleStatusToggle(u.id, u.isActive, u.fullName)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                            u.isActive
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                          } ${isSelf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {u.isActive ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Suspended</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.isActive
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-[#a1a1aa]">
                      {formatDate(u.createdAt, 'medium')}
                    </td>

                    {isAdmin && (
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#27272a] transition"
                            title="Edit User Profile"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleDeleteUser(u.id, u.fullName)}
                            className={`p-1.5 rounded-lg transition ${
                              isSelf
                                ? 'text-zinc-600 cursor-not-allowed'
                                : 'text-[#94a3b8] hover:text-red-400 hover:bg-[#27272a]'
                            }`}
                            title={isSelf ? 'Cannot delete your own account' : 'Delete Member'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Server-Side Pagination Bar */}
        <div className="p-4 border-t border-[#27272a] bg-[#141417] flex flex-wrap items-center justify-between gap-4 text-xs select-none">
          <div className="flex items-center gap-4">
            <span className="text-[#a1a1aa]">
              Showing page <strong className="text-white">{pagination.page}</strong> of{' '}
              <strong className="text-white">{pagination.totalPages}</strong> ({pagination.total} total members)
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[#71717a]">Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-[#18181c] border border-[#27272a] text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
                aria-label="Items per page"
              >
                {PAGINATION.PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!pagination.hasPrevPage || isLoading}
              onClick={() => setPage(1)}
              className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="First Page"
              aria-label="Go to first page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!pagination.hasPrevPage || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Previous Page"
              aria-label="Go to previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-mono text-zinc-300 bg-[#18181c] border border-[#27272a] rounded-lg">
              {pagination.page}
            </span>
            <button
              type="button"
              disabled={!pagination.hasNextPage || isLoading}
              onClick={() => setPage((prev) => prev + 1)}
              className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Next Page"
              aria-label="Go to next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!pagination.hasNextPage || isLoading}
              onClick={() => setPage(pagination.totalPages)}
              className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Last Page"
              aria-label="Go to last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Invite New Team Member</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 rounded-lg text-[#71717a] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1">
                  Full Name <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required)</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Jordan Hayes"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1">
                  Email Address <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required)</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jordan@datapure.io"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1">
                  Role <span className="text-red-400 font-bold">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="MEMBER">Member (Create & Edit Tasks)</option>
                  <option value="VIEWER">Viewer (Read-Only Access)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1">
                  Initial Password <span className="text-[#71717a] font-normal text-[11px]">(Optional - Defaults to DataPure123!)</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Optional temporary password..."
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(prev => !prev)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#d4d4d8] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded p-0.5"
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>


              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditModalOpen && selectedUser && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Edit Member: {selectedUser.fullName}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 rounded-lg text-[#71717a] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar Upload for Selected User */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#18181c] border border-[#27272a]">
              <UserAvatar
                name={selectedUser.fullName}
                avatarUrl={selectedUser.avatarUrl}
                size="xl"
                color="blue"
              />
              <div className="flex-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-white cursor-pointer transition">
                  <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isUploadingEditAvatar ? 'Uploading...' : 'Upload Avatar Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditAvatarUpload}
                    disabled={isUploadingEditAvatar}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-[#71717a] mt-1">Directly update user's profile image</p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1">
                  Display Name <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required)</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1">
                  Email Address <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required)</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1">
                  Role <span className="text-red-400 font-bold">*</span>
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 border-[#27272a] cursor-pointer"
                />
                <label htmlFor="editIsActive" className="text-xs text-[#a1a1aa] select-none cursor-pointer">
                  Account is Active
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
