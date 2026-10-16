import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import { MessageSquare, Calendar, Paperclip, Edit3, Trash2 } from 'lucide-react';
import { getPriorityBadge, getCategoryBadge } from '../utils/themeStyles';
import { UserAvatar } from './UserAvatar';
import { formatDate } from '../lib/formatters';
import './TaskCard.css';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: number) => void;
  isOverlay?: boolean;
  onUserClick?: (user: { id?: number; fullName?: string; avatarUrl?: string }) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onEdit, onDelete, isOverlay = false, onUserClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    data: { task }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const commentsCount = task.commentCount ?? (task.comments?.length || 0);
  const attachmentsCount = task.attachments?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      tabIndex={0}
      role="button"
      aria-label={`Task ${task.taskKey}: ${task.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(task);
        }
      }}
      onClick={() => onClick(task)}
      className={`group relative p-3.5 rounded-xl bg-[#18181c] border border-[#27272a] hover:border-zinc-600 transition cursor-grab active:cursor-grabbing select-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
        isDragging ? 'opacity-30' : ''
      } ${isOverlay ? 'shadow-2xl ring-1 ring-blue-500/50 rotate-1' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-medium text-[#94a3b8] group-hover:text-zinc-300 transition">
            {task.taskKey}
          </span>
          {getCategoryBadge(task.category)}
        </div>
        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="p-1 rounded text-[#71717a] hover:text-amber-400 hover:bg-[#27272a] transition focus-visible:outline-none cursor-pointer"
              title="Edit Task"
              aria-label={`Edit task ${task.taskKey}`}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="p-1 rounded text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition focus-visible:outline-none cursor-pointer"
              title="Delete Task"
              aria-label={`Delete task ${task.taskKey}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {getPriorityBadge(task.priority)}
        </div>
      </div>

      <h4 className="text-xs font-medium text-white line-clamp-2 leading-relaxed mb-2">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-[11px] text-[#94a3b8] line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      <div className="pt-2 border-t border-[#27272a]/60 flex items-center justify-between text-[11px] text-[#94a3b8]">
        <div className="flex items-center gap-3">
          {commentsCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-sky-400" title="Comments">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{commentsCount}</span>
            </div>
          )}

          {attachmentsCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400" title="Attachments">
              <Paperclip className="w-3.5 h-3.5" />
              <span>{attachmentsCount}</span>
            </div>
          )}

          {task.dueDate && (
            <div className="flex items-center gap-1 text-[10px] text-[#cbd5e1]">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(task.dueDate, 'short')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#94a3b8]" title="Optimistic Concurrency Version">
            v{task.version}
          </span>
          <UserAvatar
            name={task.assigneeName}
            avatarUrl={task.assigneeAvatar}
            size="sm"
            color="blue"
            onClick={
              task.assigneeName
                ? (e) => {
                    e.stopPropagation();
                    onUserClick?.({
                      id: task.assigneeId || undefined,
                      fullName: task.assigneeName,
                      avatarUrl: task.assigneeAvatar,
                    });
                  }
                : undefined
            }
            title={task.assigneeName ? `View ${task.assigneeName}'s profile` : 'Unassigned'}
          />
        </div>
      </div>
    </div>
  );
};
