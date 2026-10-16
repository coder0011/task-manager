import React, { useState } from 'react';
import type { User } from '../types';
import { X, Mail, Calendar, Shield, Check, Copy } from 'lucide-react';
import { getRoleBadge } from '../utils/themeStyles';
import { formatDate, formatUserInitials } from '../lib/formatters';

interface UserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, isOpen, onClose }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!isOpen || !user) return null;

  const handleCopyEmail = async () => {
    if (!user.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (err) {
      console.warn('Copy email failed:', err);
    }
  };

  const isActive = user.isActive ?? true;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-title"
      >
        {/* Banner header */}
        <div className="h-20 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/10 border-b border-[#27272a] relative p-4 flex items-start justify-end">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#94a3b8] hover:text-white hover:bg-black/40 transition"
            aria-label="Close user profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Avatar & Identity */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="-mt-10 mb-3 flex items-end justify-between">
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-[#121215] bg-[#18181c] shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 border-4 border-[#121215] flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {formatUserInitials(user.fullName, 1)}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 mb-1">
              {getRoleBadge(user.role)}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {isActive ? 'Active Status' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Name & ID */}
          <div className="space-y-1 mb-5">
            <h3 id="user-profile-title" className="text-base font-bold text-white tracking-tight">
              {user.fullName || 'Workspace Member'}
            </h3>
            <p className="text-xs text-[#71717a] font-mono">
              User ID #{user.id}
            </p>
          </div>

          {/* Contact & Metadata Cards */}
          <div className="space-y-2.5">
            {/* Email Card with Copy */}
            <div className="p-3 rounded-xl bg-[#18181c] border border-[#27272a] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="truncate">
                  <p className="text-[10px] font-medium text-[#71717a]">Email Address</p>
                  <p className="text-xs font-medium text-[#e4e4e7] truncate">{user.email || 'No email available'}</p>
                </div>
              </div>
              {user.email && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="p-1.5 rounded-lg text-[#71717a] hover:text-white hover:bg-[#27272a] transition shrink-0"
                  title="Copy email"
                  aria-label="Copy email address"
                >
                  {copiedEmail ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Role Card */}
            <div className="p-3 rounded-xl bg-[#18181c] border border-[#27272a] flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-[#71717a]">Governance Role</p>
                <p className="text-xs font-semibold text-white capitalize">{user.role || 'Member'}</p>
              </div>
            </div>

            {/* Member Since Card */}
            {user.createdAt && (
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#27272a] flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-medium text-[#71717a]">Joined Workspace</p>
                  <p className="text-xs font-medium text-[#e4e4e7]">
                    {formatDate(user.createdAt, 'full')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[#27272a] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-[#27272a] hover:bg-[#3f3f46] text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
