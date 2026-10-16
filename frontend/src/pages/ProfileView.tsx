import React, { useState } from 'react';
import { User, Mail, Calendar, Save, KeyRound, Crown, Briefcase, Eye, EyeOff, Camera, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { api } from '../services/api';
import { toast } from 'sonner';
import { formatUserInitials, formatDate } from '../lib/formatters';
import { Loader } from '../components/Loader';
import { ProfileUpdateSchema, ChangePasswordSchema, validateForm } from '../lib/validation';
import './ProfileView.css';

export const ProfileView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Change Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingProfile) return;

    const validation = validateForm(ProfileUpdateSchema, { fullName });
    if (!validation.success) {
      toast.error(validation.errors.fullName || 'Invalid full name');
      return;
    }

    setIsUpdatingProfile(true);

    try {
      await api.updateProfile({ fullName: validation.data.fullName });
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.displayMessage || err.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploadingAvatar) return;

    setIsUploadingAvatar(true);

    try {
      await api.uploadMyAvatar(file);
      await refreshUser();
      toast.success('Profile avatar uploaded successfully');
    } catch (err: any) {
      toast.error(err.displayMessage || err.message || 'Failed to upload profile image');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangingPassword) return;

    const validation = validateForm(ChangePasswordSchema, {
      currentPassword: oldPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      toast.error(validation.errors.confirmPassword || validation.errors.newPassword || validation.errors.currentPassword || 'Password requirements not met');
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.changePassword(oldPassword, newPassword);
      toast.success('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.displayMessage || err.message || 'Failed to change password. Verify current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="w-3.5 h-3.5 text-amber-400" />;
      case 'MEMBER':
        return <Briefcase className="w-3.5 h-3.5 text-blue-400" />;
      case 'VIEWER':
        return <Eye className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">

      {/* User Hero Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#121215] border border-[#27272a] shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative group">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-zinc-700 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 text-2xl font-bold shadow-md">
              {formatUserInitials(user?.fullName, 1)}
            </div>
          )}

          {/* Quick Avatar Upload Pill */}
          <label className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg transition flex items-center justify-center">
            {isUploadingAvatar ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={isUploadingAvatar}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h2 className="text-lg font-bold text-white">{user?.fullName || 'Workspace Member'}</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#18181c] border border-[#27272a] text-[#a1a1aa]">
              {getRoleIcon(user?.role)}
              <span>{user?.role || 'MEMBER'}</span>
            </span>
          </div>

          <p className="text-xs text-[#a1a1aa] flex items-center justify-center sm:justify-start gap-2">
            <Mail className="w-3.5 h-3.5 text-[#71717a]" />
            <span>{user?.email || 'user@datapure.io'}</span>
          </p>

          <p className="text-[11px] text-[#71717a] flex items-center justify-center sm:justify-start gap-1.5 pt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Joined {user?.createdAt ? formatDate(user.createdAt, 'medium') : 'Active Member'}</span>
          </p>
        </div>
      </div>

      {/* Grid: Edit Profile & Change Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Personal Details */}
        <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272a] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#27272a]">
            <User className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Profile Information</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Full Display Name <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required)</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Profile Avatar Image <span className="text-[#71717a] font-normal text-[11px]">(Optional)</span>
              </label>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#18181c] border border-[#27272a]">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-[#27272a]" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center border border-blue-500/30">
                    {formatUserInitials(user?.fullName, 1)}
                  </div>
                )}
                <div className="flex-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-white cursor-pointer transition">
                    {isUploadingAvatar ? (
                      <Loader variant="spinner" size="sm" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                    )}
                    <span>{isUploadingAvatar ? 'Uploading...' : 'Upload New Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-[#71717a] mt-1">JPG, PNG or WEBP up to 5MB</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Email Address (Managed by Admin)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c]/50 border border-[#27272a] text-[#71717a] cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="w-full py-2 px-4 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isUpdatingProfile ? (
                <Loader variant="spinner" size="sm" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isUpdatingProfile ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </form>
        </div>

        {/* Card 2: Security & Password */}
        <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272a] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#27272a]">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Security & Password</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Current Password <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required)</span>
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-10 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(prev => !prev)}
                  aria-label={showOldPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#d4d4d8] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded p-0.5"
                  title={showOldPassword ? "Hide password" : "Show password"}
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                New Password <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required, Min 6 chars)</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-10 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 transition"
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
              {newPassword && newPassword.length < 6 && (
                <p className="text-[11px] text-red-400 mt-1">Must be at least 6 characters</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Confirm New Password <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required)</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-10 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#d4d4d8] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded p-0.5"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>


            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-2 px-4 rounded-lg text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isChangingPassword ? (
                <Loader variant="spinner" size="sm" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>{isChangingPassword ? 'Updating...' : 'Change Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
