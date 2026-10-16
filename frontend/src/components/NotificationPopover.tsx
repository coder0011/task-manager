import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  UserCheck, 
  UserMinus, 
  ArrowRight, 
  Plus, 
  Trash, 
  BellOff, 
  Loader2,
  ChevronRight,
  MessageSquare,
  AlertTriangle 
} from 'lucide-react';
import { api } from '../services/api';
import type { AppNotification } from '../types';
import { formatRelativeTime } from '../lib/formatters';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../lib/queryClient';
import './NotificationPopover.css';

interface NotificationPopoverProps {
  onTaskClick?: (taskId: number) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onTaskClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();


  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.notifications,
    queryFn: ({ signal }) => api.getNotifications(50, signal),
    refetchInterval: 30000,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Click outside listener to dismiss popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      refetch();
    }
    setIsOpen(prev => !prev);
  };

  const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      queryClient.setQueryData(QUERY_KEYS.notifications, (prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: (prev.notifications || []).map((n: AppNotification) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, (prev.unreadCount || 1) - 1),
        };
      });
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      queryClient.setQueryData(QUERY_KEYS.notifications, (prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: (prev.notifications || []).map((n: AppNotification) => ({ ...n, isRead: true })),
          unreadCount: 0,
        };
      });
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0 || isClearingAll) return;
    setIsClearingAll(true);

    try {
      await api.clearAllNotifications();
      queryClient.setQueryData(QUERY_KEYS.notifications, {
        notifications: [],
        unreadCount: 0,
      });
      toast.success('All notifications cleared');
    } catch {
      toast.error('Failed to clear notifications');
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleItemClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.taskId && onTaskClick) {
      onTaskClick(notification.taskId);
      setIsOpen(false);
    }
  };

  const displayedNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead) 
    : notifications;

  const renderIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <UserCheck className="w-3.5 h-3.5 text-blue-400" />;
      case 'TASK_UNASSIGNED':
        return <UserMinus className="w-3.5 h-3.5 text-amber-400" />;
      case 'TASK_STATUS_CHANGED':
        return <ArrowRight className="w-3.5 h-3.5 text-purple-400" />;
      case 'TASK_CREATED':
        return <Plus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'TASK_DELETED':
        return <Trash className="w-3.5 h-3.5 text-red-400" />;
      case 'TASK_COMMENT_ADDED':
        return <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />;
      case 'TASK_PRIORITY_ESCALATED':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        className={`relative p-2 rounded-lg transition flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
          isOpen
            ? 'bg-[#27272a] text-white'
            : 'text-[#94a3b8] hover:text-white hover:bg-[#18181c]'
        }`}
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 border-2 border-[#0c0c0e] text-[10px] font-bold text-white flex items-center justify-center shadow-lg animate-in zoom-in-75 duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Popover Container */}
      {isOpen && (
        <div
          role="region"
          aria-label="Notifications Panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#121215] border border-[#27272a] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-[#27272a] bg-[#18181c]/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={unreadCount === 0 || isMarkingAll}
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] text-[#94a3b8] hover:text-white disabled:opacity-40 disabled:pointer-events-none transition"
                title="Mark all notifications as read"
              >
                {isMarkingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="hidden sm:inline">Mark all read</span>
              </button>

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-[11px] text-[#71717a] hover:text-red-400 transition"
                  title="Clear all notifications"
                >
                  <Trash className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear all</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-header Filter Tabs */}
          {notifications.length > 0 && (
            <div className="px-3.5 py-1.5 border-b border-[#27272a] bg-[#141418] flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                  filter === 'all'
                    ? 'bg-[#27272a] text-white shadow-sm'
                    : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#18181c]'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
                  filter === 'unread'
                    ? 'bg-blue-600/25 text-blue-400 border border-blue-500/30'
                    : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#18181c]'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500 text-white font-mono">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#27272a]/50">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#94a3b8]">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span>Loading notifications...</span>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#18181c] border border-[#27272a] flex items-center justify-center text-[#71717a]">
                  <BellOff className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-white">
                  {filter === 'unread' && notifications.length > 0
                    ? 'All caught up'
                    : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-[#71717a] max-w-[220px]">
                  {filter === 'unread' && notifications.length > 0
                    ? 'You have read all of your active notifications.'
                    : 'You will receive updates here when tasks are assigned to you, commented on, or updated.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3 transition flex items-start gap-3 cursor-pointer group hover:bg-[#18181c] ${
                    !n.isRead ? 'bg-[#18181c]/40' : 'bg-transparent'
                  }`}
                >
                  {/* Category icon */}
                  <div className="w-7 h-7 rounded-lg bg-[#18181c] border border-[#27272a] flex items-center justify-center shrink-0 mt-0.5 shadow-sm group-hover:border-zinc-700">
                    {renderIcon(n.type)}
                  </div>


                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className={`text-xs truncate ${!n.isRead ? 'font-semibold text-white' : 'font-medium text-zinc-300'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-[#71717a] whitespace-nowrap">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#a1a1aa] line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  {/* Actions / Read & Navigate buttons */}
                  <div className="flex items-center gap-1 shrink-0 self-center">
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(n.id, e);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-blue-500/10 text-[#71717a] hover:text-blue-400 transition"
                        title="Mark as read"
                        aria-label="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(n);
                      }}
                      className="p-1.5 rounded-md hover:bg-[#27272a] text-[#71717a] hover:text-white transition flex items-center justify-center"
                      title={n.taskId ? "View task details" : "View notification"}
                      aria-label="View details"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 ml-0.5 group-hover:hidden" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
