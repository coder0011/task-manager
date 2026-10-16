import React from 'react';
import { Layers, Plus, Sparkles, Kanban, Table, Users, Shield, LogIn, LogOut, Crown, Briefcase, Eye, History } from 'lucide-react';
import type { ActiveTab, ViewMode } from '../types';
import { useAuth } from '../context/AuthContext';
import { confirmLogout } from '../utils/confirmModal';
import { UserAvatar } from './UserAvatar';
import { NotificationPopover } from './NotificationPopover';
import './Header.css';

interface HeaderProps {
  boardName: string;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab, options?: { toast?: string }) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewTask: () => void;
  onOpenAuth: () => void;
  onTaskClick?: (taskId: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  boardName,
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  onNewTask,
  onOpenAuth,
  onTaskClick
}) => {
  const { user, isAuthenticated, logout, hasPermission } = useAuth();

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
    <header className="border-b border-[#27272a] bg-[#0c0c0e]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Navigation Tabs */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white tracking-tight">{boardName}</h1>
            </div>
            <p className="text-[11px] text-[#94a3b8]">DataPure Task Manager</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#18181c] p-1 rounded-xl border border-[#27272a]" aria-label="Main Navigation">
          <button
            onClick={() => onTabChange('BOARD')}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              activeTab === 'BOARD'
                ? 'bg-[#27272a] text-white shadow'
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Sprint Board</span>
          </button>

          <button
            onClick={() => onTabChange('USERS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              activeTab === 'USERS'
                ? 'bg-[#27272a] text-white shadow'
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team & Directory</span>
          </button>

          <button
            onClick={() => onTabChange('RBAC')}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              activeTab === 'RBAC'
                ? 'bg-[#27272a] text-white shadow'
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Access Governance (RBAC)</span>
          </button>

          {(!isAuthenticated || hasPermission('audit:view')) && (
            <button
              onClick={() => onTabChange('AUDIT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                activeTab === 'AUDIT'
                  ? 'bg-[#27272a] text-white shadow'
                  : 'text-[#a1a1aa] hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>Audit Trail</span>
            </button>
          )}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* View Mode Switcher (Kanban vs Table) - only on BOARD tab */}
        {activeTab === 'BOARD' && (
          <div className="flex items-center bg-[#18181c] p-1 rounded-lg border border-[#27272a]" role="group" aria-label="Workflow View Options">
            <button
              onClick={() => onViewModeChange('KANBAN')}
              aria-label="Switch to Kanban board view"
              className={`p-2 min-h-[34px] min-w-[34px] rounded-md transition flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                viewMode === 'KANBAN'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('TABLE')}
              aria-label="Switch to Table grid view"
              className={`p-2 min-h-[34px] min-w-[34px] rounded-md transition flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                viewMode === 'TABLE'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
              title="Table Grid View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#18181c] border border-[#27272a] text-[11px] text-[#a1a1aa]">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#27272a] rounded text-white">Ctrl + N</kbd> to create</span>
        </div>

        {/* New Task Button */}
        {(!isAuthenticated || hasPermission('task:create')) && (
          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-lg shadow-blue-600/25 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        )}

        {/* User Auth Info / Actions */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-[#27272a]">
            {/* Notification Bell Dropdown */}
            <NotificationPopover onTaskClick={onTaskClick} />

            <button
              onClick={() => onTabChange('PROFILE')}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#18181c] transition text-left focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              title="View & Edit Profile"
            >
              <UserAvatar
                name={user.fullName}
                avatarUrl={user.avatarUrl}
                size="md"
                color="blue"
              />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                  <span>{user.fullName}</span>
                  {getRoleIcon(user.role)}
                </div>
                <div className="text-[10px] text-[#94a3b8] font-mono leading-tight">{user.role}</div>
              </div>
            </button>

            <button
              onClick={async () => {
                const confirmed = await confirmLogout();
                if (confirmed) {
                  await logout();
                  onTabChange('LOGIN');
                }
              }}
              aria-label="Sign out"
              className="p-2 min-h-[34px] min-w-[34px] rounded-lg text-[#94a3b8] hover:text-red-400 hover:bg-[#18181c] transition flex items-center justify-center focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-white text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-400" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
