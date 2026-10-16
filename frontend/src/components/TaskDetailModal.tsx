import React, { useState, useEffect } from 'react';
import type { Task, Comment, ActivityLog, User } from '../types';
import { 
  X, Edit3, Calendar, MessageSquare, Paperclip, ExternalLink, Download, 
  History, Clock, FileText, Image as ImageIcon, File, Layers, Send, Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader } from './Loader';
import { getPriorityBadge, getCategoryBadge, getRoleBadge } from '../utils/themeStyles';
import { UserAvatar } from './UserAvatar';
import { formatDate, formatDateTime, formatFileSize } from '../lib/formatters';
import { useAbortController, isAbortError } from '../utils/asyncUtils';
import { CommentSchema, VALIDATION_LIMITS, validateForm } from '../lib/validation';
import './TaskDetailModal.css';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (task: Task) => void;
  onAddComment?: (taskId: number, content: string) => Promise<void>;
  onDeleteComment?: (commentId: number) => Promise<void>;
  columnName?: string;
  users?: User[];
  onUserClick?: (user: { id?: number; fullName?: string; avatarUrl?: string; role?: string; email?: string; isActive?: boolean }) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
  onAddComment,
  onDeleteComment,
  columnName,
  users,
  onUserClick
}) => {
  const { user: currentUser, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details');
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>(task?.comments || []);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  const { getNewSignal: getCommentsSignal } = useAbortController();
  const { getNewSignal: getLogsSignal } = useAbortController();

  useEffect(() => {
    if (isOpen && task) {
      setComments(task.comments || []);
      const signal = getCommentsSignal();
      // Refresh comments from backend
      api.getComments(task.id, signal)
        .then(data => {
          if (data) setComments(data);
        })
        .catch(err => {
          if (!isAbortError(err)) {
            console.error('Failed to load comments:', err);
          }
        });
    }
  }, [isOpen, task?.id, getCommentsSignal]);

  const loadTaskAuditLogs = async (taskId: number) => {
    const signal = getLogsSignal();
    setIsLoadingLogs(true);
    try {
      const res = await api.getActivityLogs({ entityType: 'TASK', entityId: taskId, limit: 50 }, signal);
      setAuditLogs(res.logs || []);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to load task activity logs:', err);
      }
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen && task && activeTab === 'audit') {
      loadTaskAuditLogs(task.id);
    }
  }, [isOpen, task?.id, activeTab]);

  if (!isOpen || !task) return null;

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm(CommentSchema, { content: commentInput });
    if (!validation.success || isSubmittingComment || !task) return;

    setIsSubmittingComment(true);
    try {
      if (onAddComment) {
        await onAddComment(task.id, validation.data.content);
      } else {
        await api.addComment(task.id, validation.data.content);
      }
      setCommentInput('');
      const fresh = await api.getComments(task.id);
      if (fresh) setComments(fresh);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (deletingCommentId !== null || !task) return;
    setDeletingCommentId(commentId);
    try {
      if (onDeleteComment) {
        await onDeleteComment(commentId);
      } else {
        await api.deleteComment(commentId);
      }
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const assigneeUser = users?.find(u => (task.assigneeId && u.id === task.assigneeId) || (task.assigneeName && u.fullName === task.assigneeName));
  const assigneeAvatar = task.assigneeAvatar || assigneeUser?.avatarUrl;
  const assigneeName = task.assigneeName || assigneeUser?.fullName || 'Unassigned';

  const reporterUser = users?.find(u => (task.reporterId && u.id === task.reporterId) || (task.reporterName && u.fullName === task.reporterName));
  const reporterAvatar = task.reporterAvatar || reporterUser?.avatarUrl;
  const reporterName = task.reporterName || reporterUser?.fullName || (task.reporterId ? `User #${task.reporterId}` : 'Author');

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-emerald-400" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-rose-400" />;
    return <File className="w-4 h-4 text-blue-400" />;
  };

  // Filter only task status, comments, attachments, assignment changes, and creation events
  const relevantAuditLogs = auditLogs.filter(log => {
    const act = log.action || '';
    if (act.includes('MOVE') || act.includes('STATUS') || act.includes('CREATE') || act.includes('UPDATE')) return true;
    if (act.startsWith('COMMENT_') || act.startsWith('ATTACHMENT_')) return true;
    if (act.includes('ASSIGN')) return true;
    return true;
  });

  const renderHumanReadableDetails = (details: any, _action?: string) => {
    if (!details) return null;

    let parsed = details;
    if (typeof details === 'string') {
      try {
        parsed = JSON.parse(details);
      } catch {
        return null;
      }
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    // 1. Move task stage / status
    if (parsed.fromColumnId !== undefined || parsed.toColumnId !== undefined) {
      return (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#d4d4d8] pt-1">
          <span className="text-[#a1a1aa]">Workflow stage updated:</span>
          <span className="px-2 py-0.5 rounded bg-[#27272a] text-[#d4d4d8] text-[11px] font-medium">
            Column #{parsed.fromColumnId ?? 'Start'}
          </span>
          <span className="text-zinc-500">→</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[11px] font-medium">
            Column #{parsed.toColumnId}
          </span>
        </div>
      );
    }

    // 2. Comment activities
    if (_action?.startsWith('COMMENT_') || parsed.commentId) {
      return (
        <div className="text-xs text-[#d4d4d8] pt-1 flex flex-wrap items-center gap-2">
          {_action === 'COMMENT_ADDED' && (
            <>
              <span className="text-sky-400 font-medium">Added a comment:</span>
              <span className="text-white italic">"{parsed.contentSnippet || 'Comment content'}"</span>
              {parsed.authorName && (
                <span className="text-[#a1a1aa] text-[11px]">by {parsed.authorName}</span>
              )}
            </>
          )}
          {_action === 'COMMENT_DELETED' && (
            <>
              <span className="text-red-400 font-medium">Deleted comment</span>
              {parsed.authorName && (
                <span className="text-[#a1a1aa] text-[11px]">(authored by {parsed.authorName})</span>
              )}
            </>
          )}
        </div>
      );
    }

    // 3. Attachment activities
    if (_action?.startsWith('ATTACHMENT_') || parsed.attachmentId) {
      return (
        <div className="text-xs text-[#d4d4d8] pt-1 flex flex-wrap items-center gap-2">
          {_action === 'ATTACHMENT_ADDED' && (
            <>
              <span className="text-emerald-400 font-medium">Uploaded attachment:</span>
              <span className="text-white font-medium">{parsed.filename || 'File'}</span>
            </>
          )}
          {_action === 'ATTACHMENT_DELETED' && (
            <>
              <span className="text-red-400 font-medium">Removed attachment:</span>
              <span className="text-white line-through opacity-75">{parsed.filename || 'File'}</span>
            </>
          )}
        </div>
      );
    }

    // 3. Task assignment changes
    if (parsed.assigneeName !== undefined || parsed.assigneeId !== undefined) {
      return (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#d4d4d8] pt-1">
          <span className="text-[#a1a1aa]">Task assignee updated:</span>
          <span className="text-blue-300 font-semibold">{parsed.assigneeName || (parsed.assigneeId ? `User #${parsed.assigneeId}` : 'Unassigned')}</span>
        </div>
      );
    }

    // 4. Task initialized
    if (_action === 'TASK_CREATED') {
      return (
        <div className="text-xs text-[#d4d4d8] pt-1 flex items-center gap-1.5">
          <span className="text-[#a1a1aa]">Task initialized in workflow</span>
        </div>
      );
    }

    return null;
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-[#27272a] bg-[#18181c]/50 flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400 px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                {task.taskKey}
              </span>
              {getCategoryBadge(task.category)}
              {getPriorityBadge(task.priority)}
              {columnName && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]">
                  {columnName}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
              {task.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('task:edit') && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Task</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#27272a] transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-[#27272a] px-6 bg-[#141417]">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Activity & Status History</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'details' && (
            <>
              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider">
                  Description
                </span>
                <div className="p-4 rounded-xl bg-[#18181c] border border-[#27272a] text-[#d4d4d8] leading-relaxed whitespace-pre-wrap min-h-[70px]">
                  {task.description ? task.description : <span className="text-[#71717a] italic">No description provided for this task.</span>}
                </div>
              </div>

              {/* Assignments & Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Assignee Card */}
                <div 
                  onClick={() => {
                    if (task.assigneeId || (assigneeName && assigneeName !== 'Unassigned')) {
                      onUserClick?.(assigneeUser || { 
                        id: task.assigneeId || undefined, 
                        fullName: assigneeName, 
                        avatarUrl: assigneeAvatar 
                      });
                    }
                  }}
                  className={`p-3.5 rounded-xl bg-[#18181c] border border-[#27272a] space-y-1.5 transition ${
                    assigneeName !== 'Unassigned' ? 'hover:border-blue-500/40 hover:bg-[#1c1c22] cursor-pointer' : ''
                  }`}
                  title={assigneeName !== 'Unassigned' ? 'Click to view user profile' : undefined}
                >
                  <span className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider">
                    Assignee
                  </span>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      name={assigneeName !== 'Unassigned' ? assigneeName : undefined}
                      avatarUrl={assigneeAvatar}
                      size="md"
                      color="blue"
                    />
                    <div className="overflow-hidden">
                      <p className="font-semibold text-white truncate text-xs">
                        {assigneeName}
                      </p>
                      <p className="text-[10px] text-[#71717a]">Responsible</p>
                    </div>
                  </div>
                </div>

                {/* Reporter Card */}
                <div 
                  onClick={() => {
                    if (task.reporterId || reporterName) {
                      onUserClick?.(reporterUser || { 
                        id: task.reporterId || undefined, 
                        fullName: reporterName, 
                        avatarUrl: reporterAvatar 
                      });
                    }
                  }}
                  className="p-3.5 rounded-xl bg-[#18181c] border border-[#27272a] space-y-1.5 hover:border-purple-500/40 hover:bg-[#1c1c22] cursor-pointer transition"
                  title="Click to view reporter profile"
                >
                  <span className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider">
                    Reporter
                  </span>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      name={reporterName}
                      avatarUrl={reporterAvatar}
                      size="md"
                      color="purple"
                    />
                    <div className="overflow-hidden">
                      <p className="font-semibold text-white truncate text-xs">
                        {reporterName}
                      </p>
                      <p className="text-[10px] text-[#71717a]">Author</p>
                    </div>
                  </div>
                </div>

                {/* Due Date Card */}
                <div className="p-3.5 rounded-xl bg-[#18181c] border border-[#27272a] space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider">
                    Due Date
                  </span>
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>
                      {task.dueDate ? formatDate(task.dueDate, 'medium') : 'No due date'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comments & Discussion Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-white">Comments & Discussion</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {comments.length}
                    </span>
                  </div>
                </div>

                {/* Add Comment Input Form */}
                <form onSubmit={handlePostComment} className="space-y-2.5">
                  <div className="relative rounded-xl border border-[#27272a] bg-[#18181c] focus-within:border-blue-500 transition shadow-inner">
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      maxLength={VALIDATION_LIMITS.COMMENT_MAX}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment(e);
                        }
                      }}
                      placeholder="Write a comment or update on this task... (Press Enter to post, Shift+Enter for new line)"
                      rows={3}
                      className="w-full bg-transparent p-3 text-xs text-white placeholder-[#71717a] focus:outline-none resize-none"
                    />
                    <div className="flex items-center justify-between px-3 py-2 border-t border-[#27272a]/60 bg-[#141416] rounded-b-xl">
                      <span className="text-[10px] text-[#71717a]">
                        Markdown styling supported
                      </span>
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !commentInput.trim()}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        {isSubmittingComment ? (
                          <>
                            <Loader variant="spinner" size="sm" />
                            <span>Posting...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Post Comment</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Comments Thread List */}
                <div className="space-y-3">
                  {comments.length > 0 ? (
                    comments.map((comment) => {
                      const isAuthor = currentUser?.id === comment.userId;
                      const isAdmin = currentUser?.role === 'ADMIN';
                      const canDelete = isAuthor || isAdmin;
                      const isDeleting = deletingCommentId === comment.id;

                      return (
                        <div
                          key={comment.id}
                          className="p-3.5 rounded-xl bg-[#18181c] border border-[#27272a] hover:border-zinc-700 transition space-y-2 group/comment"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onUserClick?.({
                                    id: comment.userId,
                                    fullName: comment.authorName,
                                    avatarUrl: comment.authorAvatar,
                                    role: comment.authorRole,
                                    email: comment.authorEmail
                                  });
                                }}
                                className="flex items-center gap-2 hover:opacity-85 transition cursor-pointer text-left focus:outline-none"
                              >
                                <UserAvatar
                                  name={comment.authorName}
                                  avatarUrl={comment.authorAvatar}
                                  size="sm"
                                  color="blue"
                                />
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-white hover:text-blue-400 transition">
                                      {comment.authorName}
                                    </span>
                                    {comment.authorRole && getRoleBadge(comment.authorRole)}
                                  </div>
                                </div>
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#71717a] font-mono" title={comment.createdAt}>
                                {formatDateTime(comment.createdAt)}
                              </span>
                              {canDelete && (
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="opacity-0 group-hover/comment:opacity-100 p-1 rounded text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                  title="Delete Comment"
                                  aria-label="Delete Comment"
                                >
                                  {isDeleting ? (
                                    <Loader variant="spinner" size="sm" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-[#d4d4d8] leading-relaxed whitespace-pre-wrap pl-9">
                            {comment.content}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-xs text-[#71717a] bg-[#18181c]/40 rounded-xl border border-[#27272a] flex flex-col items-center justify-center gap-1.5">
                      <MessageSquare className="w-6 h-6 text-[#3f3f46]" />
                      <span className="text-[#a1a1aa] font-medium">No comments yet</span>
                      <span className="text-[11px] text-[#71717a]">Be the first to share an update or leave feedback on this task.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white">Attachments ({task.attachments?.length || 0})</span>
                </div>

                {task.attachments && task.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {task.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#18181c] border border-[#27272a] hover:border-zinc-700 transition"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                          <div className="p-2 rounded-lg bg-[#27272a]/60">
                            {getFileIcon(att.mimeType)}
                          </div>
                          <div className="truncate">
                            <p className="font-medium text-white truncate text-xs" title={att.originalName}>
                              {att.originalName}
                            </p>
                            <span className="text-[10px] text-[#71717a]">
                              {formatFileSize(att.sizeBytes)} • Uploaded by {att.uploaderName || 'Team'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 pl-2">
                          {/* Direct Open in Browser */}
                          <a
                            href={att.url || api.getAttachmentViewUrl(att.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#27272a] transition"
                            title="Open file in new browser tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Direct Download */}
                          <a
                            href={api.getAttachmentDownloadUrl(att.id)}
                            download={att.originalName}
                            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-blue-400 hover:bg-[#27272a] transition"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#71717a] bg-[#18181c]/40 rounded-xl border border-[#27272a]">
                    No files attached to this task.
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Task Status, Comments & Assignment History</span>
                <span className="text-[11px] text-[#71717a]">{relevantAuditLogs.length} updates recorded</span>
              </div>

              {isLoadingLogs ? (
                <div className="py-12 flex justify-center">
                  <Loader variant="spinner" size="md" label="Loading activity history..." />
                </div>
              ) : relevantAuditLogs.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#27272a]">
                  {relevantAuditLogs.map((log) => {
                    const logUser = users?.find(u => (log.userId && u.id === log.userId) || (log.userName && u.fullName === log.userName));
                    const avatar = log.userAvatar || logUser?.avatarUrl;
                    const userName = log.userName || logUser?.fullName || 'System';

                    return (
                      <div key={log.id} className="relative group">
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-[#121215]" />
                        <div className="p-3.5 rounded-xl bg-[#18181c] border border-[#27272a] space-y-2 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onUserClick?.(logUser || { id: log.userId || undefined, fullName: userName, avatarUrl: avatar });
                              }}
                              className="flex items-center gap-2 text-left hover:opacity-85 transition cursor-pointer"
                              title="Click to view user profile"
                            >
                              <UserAvatar
                                name={userName}
                                avatarUrl={avatar}
                                size="sm"
                                color="blue"
                              />
                              <span className="font-semibold text-white text-xs hover:text-blue-400 transition">{userName}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {log.action.replace(/_/g, ' ')}
                              </span>
                            </button>
                            <span className="text-[10px] text-[#71717a] flex items-center gap-1 font-mono shrink-0">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(log.createdAt)}
                            </span>
                          </div>
                          {log.details && renderHumanReadableDetails(log.details, log.action)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#71717a] bg-[#18181c]/40 rounded-xl border border-[#27272a]">
                  No status or assignment events recorded for this task yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
