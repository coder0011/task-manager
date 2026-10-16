import React, { useState, useEffect, useMemo } from 'react';
import type { Task, Column, PaginationMetadata } from '../types';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Paperclip, MessageSquare, Calendar, 
  Trash2, Edit3, Eye, Copy, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  MoreVertical
} from 'lucide-react';
import { Loader } from './Loader';
import { getPriorityBadge, getCategoryBadge } from '../utils/themeStyles';
import { UserAvatar } from './UserAvatar';
import { formatDate } from '../lib/formatters';
import { PAGINATION } from '../constants/appConstants';
import { throttle } from '../utils/asyncUtils';
import './TableView.css';

export type SortOrder = 'asc' | 'desc';

interface TableViewProps {
  tasks: Task[];
  columns: Column[];
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (taskId: number) => void;
  pagination?: PaginationMetadata;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  currentLimit?: number;
  isLoading?: boolean;
  sortField?: string;
  sortOrder?: SortOrder;
  onSortChange?: (field: string, order: SortOrder) => void;
  onUserClick?: (user: { id?: number; fullName?: string; avatarUrl?: string }) => void;
}

export const TableView: React.FC<TableViewProps> = ({
  tasks,
  columns,
  onViewTask,
  onEditTask,
  onDeleteTask,
  pagination,
  onPageChange,
  onLimitChange,
  currentLimit = 20,
  isLoading = false,
  sortField = 'created_at',
  sortOrder = 'desc',
  onSortChange,
  onUserClick
}) => {

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    const handleClose = () => {
      setOpenMenuTaskId(null);
      setMenuPosition(null);
    };
    const throttledClose = throttle(handleClose, 100);

    if (openMenuTaskId !== null) {
      document.addEventListener('click', handleClose);
      window.addEventListener('resize', throttledClose);
      window.addEventListener('scroll', throttledClose, true);
    }
    return () => {
      document.removeEventListener('click', handleClose);
      window.removeEventListener('resize', throttledClose);
      window.removeEventListener('scroll', throttledClose, true);
    };
  }, [openMenuTaskId]);

  /**
   * Toggles the contextual Three-Dot action menu using fixed viewport positioning.
   * Calculates dynamic bounding rectangle coordinates so the popover renders outside
   * the table's scrolling overflow container, eliminating clipping on Row 1.
   */
  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, taskId: number) => {
    e.stopPropagation();
    if (openMenuTaskId === taskId) {
      setOpenMenuTaskId(null);
      setMenuPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 125;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Flip upwards if insufficient space below button
    let top = rect.bottom + 6;
    if (spaceBelow < menuHeight && rect.top > menuHeight) {
      top = rect.top - menuHeight - 6;
    }

    const right = Math.max(12, window.innerWidth - rect.right);
    setMenuPosition({ top, right });
    setOpenMenuTaskId(taskId);
  };

  const columnMap = useMemo(() => {
    return new Map<number, Column>(columns.map(c => [c.id, c]));
  }, [columns]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const handleHeaderSort = (field: string) => {
    if (!onSortChange) return;
    const nextOrder = (sortField === field && sortOrder === 'asc') ? 'desc' : 'asc';
    onSortChange(field, nextOrder);
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-[#71717a]" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
    );
  };

  return (
    <div className="flex-1 p-6 overflow-x-auto">
      <div className="min-w-[1020px] bg-[#121215] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl relative">
        {isLoading && <Loader variant="overlay" size="md" label="Updating tasks..." />}

        <table className="w-full text-left border-collapse" aria-label="Tasks Table View">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#18181c]/60 text-[#a1a1aa] text-[11px] font-semibold tracking-wide uppercase select-none">
              <th
                onClick={() => handleHeaderSort('task_key')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <div className="flex items-center gap-1.5">
                  <span>Issue Key</span>
                  {renderSortIcon('task_key')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderSort('title')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <div className="flex items-center gap-1.5">
                  <span>Summary & Title</span>
                  {renderSortIcon('title')}
                </div>
              </th>
              <th 
                onClick={() => handleHeaderSort('category')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center gap-1.5">
                  <span>Category</span>
                  {renderSortIcon('category')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderSort('column_id')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <div className="flex items-center gap-1.5">
                  <span>Workflow State</span>
                  {renderSortIcon('column_id')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderSort('priority')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <div className="flex items-center gap-1.5">
                  <span>Priority</span>
                  {renderSortIcon('priority')}
                </div>
              </th>
              <th className="py-3.5 px-4">Assignee</th>
              <th className="py-3.5 px-4">Comments</th>
              <th className="py-3.5 px-4">Attachments</th>
              <th
                onClick={() => handleHeaderSort('due_date')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <div className="flex items-center gap-1.5">
                  <span>Due Date</span>
                  {renderSortIcon('due_date')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderSort('created_at')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <div className="flex items-center gap-1.5">
                  <span>Created</span>
                  {renderSortIcon('created_at')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderSort('updated_at')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <div className="flex items-center gap-1.5">
                  <span>Updated</span>
                  {renderSortIcon('updated_at')}
                </div>
              </th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a] text-xs">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-[#94a3b8]">
                  No tasks match the active filters or sort criteria.
                </td>
              </tr>
            ) : (

              tasks.map((t) => {
                const col = columnMap.get(t.columnId);
                const commentsCount = t.commentCount ?? (t.comments?.length || 0);
                const attachmentsCount = t.attachments?.length || 0;

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-[#18181c] transition group select-none"
                  >
                    {/* 1. Issue Key Column with Copy Icon & View Mode click */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewTask(t)}
                          className="font-mono font-medium text-blue-400 hover:text-blue-300 hover:underline transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
                          title={`View task details for ${t.taskKey}`}
                        >
                          {t.taskKey}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(t.taskKey, `key-${t.id}`);
                          }}
                          className="p-1 rounded text-[#71717a] hover:text-white hover:bg-[#27272a] transition focus-visible:outline-none"
                          title="Copy Issue Key"
                          aria-label={`Copy Issue Key ${t.taskKey}`}
                        >
                          {copiedId === `key-${t.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* 2. Summary & Title Column with Ellipsis, Full Hover Preview & Copy */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 max-w-[320px]">
                        <button
                          type="button"
                          onClick={() => onViewTask(t)}
                          className="font-medium text-white hover:text-blue-400 transition text-left truncate flex-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
                          title={t.title}
                        >
                          {t.title}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(t.title, `title-${t.id}`);
                          }}
                          className="p-1 rounded text-[#71717a] hover:text-white hover:bg-[#27272a] transition shrink-0 focus-visible:outline-none"
                          title="Copy Summary Title"
                          aria-label={`Copy Title ${t.title}`}
                        >
                          {copiedId === `title-${t.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* 3. Category */}
                    <td className="py-3.5 px-4">
                      {getCategoryBadge(t.category)}
                    </td>

                    {/* 4. Workflow State */}
                    <td className="py-3.5 px-4">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          backgroundColor: `${col?.color || '#3b82f6'}20`,
                          color: col?.color || '#3b82f6',
                          border: `1px solid ${col?.color || '#3b82f6'}40`
                        }}
                      >
                        {col?.name || 'Unknown'}
                      </span>
                    </td>

                    {/* 5. Priority */}
                    <td className="py-3.5 px-4">
                      {getPriorityBadge(t.priority)}
                    </td>

                    {/* 6. Assignee */}
                    <td className="py-3.5 px-4">
                      {t.assigneeName ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUserClick?.({
                              id: t.assigneeId || undefined,
                              fullName: t.assigneeName,
                              avatarUrl: t.assigneeAvatar
                            });
                          }}
                          className="flex items-center gap-2 group/user hover:opacity-85 transition cursor-pointer text-left focus:outline-none"
                          title={`Click to view ${t.assigneeName}'s profile`}
                        >
                          <UserAvatar
                            name={t.assigneeName}
                            avatarUrl={t.assigneeAvatar}
                            size="sm"
                            color="blue"
                          />
                          <span className="text-[#d4d4d8] group-hover/user:text-blue-300 group-hover/user:underline underline-offset-2 truncate max-w-[100px]">
                            {t.assigneeName}
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-[#71717a]">
                          <UserAvatar size="sm" color="zinc" title="Unassigned" />
                          <span className="italic text-xs">Unassigned</span>
                        </div>
                      )}
                    </td>

                    {/* 7. Comments Count */}
                    <td className="py-3.5 px-4 text-[#a1a1aa]">
                      {commentsCount > 0 ? (
                        <div className="flex items-center gap-1.5 text-sky-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{commentsCount}</span>
                        </div>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </td>

                    {/* 8. Attachments Count */}
                    <td className="py-3.5 px-4 text-[#a1a1aa]">
                      {attachmentsCount > 0 ? (
                        <div className="flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{attachmentsCount}</span>
                        </div>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </td>

                    {/* 9. Due Date */}
                    <td className="py-3.5 px-4 text-[#a1a1aa]">
                      {t.dueDate ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#94a3b8]" />
                          <span>{formatDate(t.dueDate, 'medium')}</span>
                        </div>
                      ) : (
                        <span className="text-[#94a3b8]">None</span>
                      )}
                    </td>

                    {/* 10. Created Date */}
                    <td className="py-3.5 px-4 text-[#a1a1aa] whitespace-nowrap">
                      <span>{t.createdAt ? formatDate(t.createdAt, 'medium') : '—'}</span>
                    </td>

                    {/* 11. Updated Date */}
                    <td className="py-3.5 px-4 text-[#a1a1aa] whitespace-nowrap">
                      <span>{t.updatedAt ? formatDate(t.updatedAt, 'medium') : '—'}</span>
                    </td>

                    {/* 12. Actions Column (Three-Dot Vertical Menu Trigger) */}
                    <td className="py-3.5 px-4 text-right">

                      <button
                        type="button"
                        onClick={(e) => handleToggleMenu(e, t.id)}
                        aria-label={`Actions for task ${t.taskKey}`}
                        aria-haspopup="true"
                        aria-expanded={openMenuTaskId === t.id}
                        className={`p-1.5 min-h-[30px] min-w-[30px] rounded-lg transition inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer ${
                          openMenuTaskId === t.id
                            ? 'text-white bg-[#27272a]'
                            : 'text-[#94a3b8] hover:text-white hover:bg-[#27272a]'
                        }`}
                        title="Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Server-Side Pagination Controls */}
        {pagination && (
          <div className="p-4 border-t border-[#27272a] bg-[#141417] flex flex-wrap items-center justify-between gap-4 text-xs select-none">
            <div className="flex items-center gap-4">
              <span className="text-[#a1a1aa]">
                Showing page <strong className="text-white">{pagination.page}</strong> of{' '}
                <strong className="text-white">{pagination.totalPages}</strong> ({pagination.total} total tasks)
              </span>

              {onLimitChange && (
                <div className="flex items-center gap-2">
                  <span className="text-[#71717a]">Per page:</span>
                  <select
                    value={currentLimit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
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
              )}
            </div>

            {onPageChange && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => onPageChange(1)}
                  className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="First Page"
                  aria-label="Go to first page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => onPageChange(pagination.page - 1)}
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
                  disabled={!pagination.hasNextPage}
                  onClick={() => onPageChange(pagination.page + 1)}
                  className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Next Page"
                  aria-label="Go to next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!pagination.hasNextPage}
                  onClick={() => onPageChange(pagination.totalPages)}
                  className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Last Page"
                  aria-label="Go to last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Menu rendered outside table bounds to eliminate clipping */}
      {openMenuTaskId !== null && menuPosition !== null && (() => {
        const activeTask = tasks.find(t => t.id === openMenuTaskId);
        if (!activeTask) return null;

        return (
          <div
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-36 rounded-xl bg-[#18181c] border border-[#27272a] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
            role="menu"
            aria-orientation="vertical"
          >
            <button
              type="button"
              onClick={() => {
                setOpenMenuTaskId(null);
                setMenuPosition(null);
                onViewTask(activeTask);
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-[#d4d4d8] hover:text-white hover:bg-[#27272a] flex items-center gap-2 transition cursor-pointer"
              role="menuitem"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>View Details</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpenMenuTaskId(null);
                setMenuPosition(null);
                onEditTask(activeTask);
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-[#d4d4d8] hover:text-white hover:bg-[#27272a] flex items-center gap-2 transition cursor-pointer"
              role="menuitem"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit Task</span>
            </button>

            {onDeleteTask && (
              <button
                type="button"
                onClick={() => {
                  setOpenMenuTaskId(null);
                  setMenuPosition(null);
                  onDeleteTask(activeTask.id);
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition border-t border-[#27272a]/60 cursor-pointer"
                role="menuitem"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
};
