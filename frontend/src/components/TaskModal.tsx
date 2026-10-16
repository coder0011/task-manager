import React, { useState, useEffect, useId, useTransition } from 'react';
import type { Task, Priority, TaskCategory, Column, User } from '../types';
import { X, Trash2, Tag, Paperclip, Layers, UploadCloud, FileText } from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { Loader } from './Loader';
import { TASK_PRIORITIES, TASK_CATEGORIES } from '../constants/appConstants';
import { TaskFormSchema, VALIDATION_LIMITS, validateForm } from '../lib/validation';
import './TaskModal.css';

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: any, stagedFiles?: File[]) => Promise<void>;
  onDelete?: (taskId: number) => Promise<void>;
  onUploadAttachments?: (taskId: number, files: File[]) => Promise<void>;
  onDeleteAttachment?: (attachmentId: number) => Promise<void>;
  defaultColumnId?: number;
  columns?: Column[];
  boardId: number;
  users?: User[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onUploadAttachments,
  onDeleteAttachment,
  defaultColumnId = 1,
  columns = [],
  boardId,
  users = []
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(task);

  // React 18/19 useId for accessible form labeling
  const titleInputId = useId();
  const descInputId = useId();
  const columnSelectId = useId();
  const prioritySelectId = useId();
  const categorySelectId = useId();
  const assigneeSelectId = useId();
  const dueDateInputId = useId();

  // Symmetrical form state for both Create and Update
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [category, setCategory] = useState<TaskCategory>('DEVELOPMENT');
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [columnId, setColumnId] = useState<number>(defaultColumnId);
  const [dueDate, setDueDate] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);

  // Staged files for Create mode
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  // React 19 useTransition: non-blocking async form mutation
  const [isSubmitting, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'details' | 'attachments'>('details');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'MEDIUM');
      setCategory(task.category || 'DEVELOPMENT');
      setAssigneeId(task.assigneeId || null);
      setColumnId(task.columnId || defaultColumnId);
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setStagedFiles([]);
    } else {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setCategory('DEVELOPMENT');
      setAssigneeId(null);
      setColumnId(defaultColumnId);
      setDueDate('');
      setStagedFiles([]);
    }
  }, [task, defaultColumnId, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validation = validateForm(TaskFormSchema, {
      title,
      description,
      priority,
      category,
      columnId,
      assigneeId,
      dueDate,
    });

    if (!validation.success) {
      if (validation.errors.title) {
        setTitleError(validation.errors.title);
        setTitleTouched(true);
      }
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing && task) {
          await onSave({
            title: validation.data.title,
            description: validation.data.description,
            priority: validation.data.priority,
            category: validation.data.category,
            assigneeId: assigneeId || null,
            columnId,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null
          });
        } else {
          await onSave(
            {
              boardId,
              columnId,
              title: validation.data.title,
              description: validation.data.description,
              priority: validation.data.priority,
              category: validation.data.category,
              assigneeId: assigneeId || undefined,
              dueDate: dueDate ? new Date(dueDate).toISOString() : undefined
            },
            stagedFiles
          );
        }
        onClose();
      } catch (err) {
        console.error('Error saving task:', err);
      }
    });
  };

  const handleStageFiles = (files: File[]) => {
    setStagedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveStagedFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#27272a] bg-[#18181c]/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-blue-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 id="task-modal-title" className="text-sm font-semibold text-white">
                  {isEditing && task ? `Edit ${task.taskKey}` : 'Create New Task'}
                </h3>
                {isEditing && task && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    OCC v{task.version}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#94a3b8]">
                {isEditing ? 'Update task details, assignments, category & files' : 'Define task details, assign team members, and attach files'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close task modal"
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#27272a] transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="px-6 pt-2 pb-0 border-b border-[#27272a] flex items-center gap-2 bg-[#18181c]/30">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#a1a1aa] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'attachments'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#a1a1aa] hover:text-white'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attachments ({isEditing ? task?.attachments?.length || 0 : stagedFiles.length})</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={titleInputId} className="block text-xs font-medium text-[#a1a1aa]">
                    Title <span className="text-red-400 font-bold">*</span> <span className="text-[#71717a] font-normal text-[11px]">(Required)</span>
                  </label>
                  <span className="text-[10px] text-[#71717a] font-mono">{title.length}/200</span>
                </div>
                <input
                  id={titleInputId}
                  type="text"
                  required
                  autoFocus
                  maxLength={200}
                  value={title}
                  onBlur={() => setTitleTouched(true)}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError && e.target.value.trim()) {
                      setTitleError(null);
                    }
                  }}
                  placeholder="e.g. Design token synchronization pipeline..."
                  className={`w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border text-white placeholder-[#71717a] focus:outline-none focus:ring-1 transition ${
                    (titleTouched && !title.trim()) || titleError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-[#27272a] focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                />
                {((titleTouched && !title.trim()) || titleError) && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <span>Task title cannot be empty.</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor={descInputId} className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                  Description <span className="text-[#71717a] font-normal text-[11px]">(Optional)</span>
                </label>
                <textarea
                  id={descInputId}
                  rows={4}
                  maxLength={VALIDATION_LIMITS.TASK_DESC_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a detailed description or specification..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white placeholder-[#71717a] focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Workflow Lane Column */}
                <div>
                  <label htmlFor={columnSelectId} className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                    Workflow Column <span className="text-red-400 font-bold">*</span>
                  </label>
                  <select
                    id={columnSelectId}
                    value={columnId}
                    onChange={(e) => setColumnId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {columns.length > 0 ? (
                      columns.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={1}>To Do</option>
                        <option value={2}>In Progress</option>
                        <option value={3}>Done</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Priority Selector */}
                <div>
                  <label htmlFor={prioritySelectId} className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                    Priority <span className="text-red-400 font-bold">*</span>
                  </label>
                  <select
                    id={prioritySelectId}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {TASK_PRIORITIES.map(p => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Selector */}
                <div>
                  <label htmlFor={categorySelectId} className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                    Task Category <span className="text-red-400 font-bold">*</span>
                  </label>
                  <select
                    id={categorySelectId}
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {TASK_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee Selector */}
                <div>
                  <label htmlFor={assigneeSelectId} className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                    Assignee <span className="text-[#71717a] font-normal text-[11px]">(Optional)</span>
                  </label>
                  <select
                    id={assigneeSelectId}
                    value={assigneeId || ''}
                    onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div className="sm:col-span-2">
                  <label htmlFor={dueDateInputId} className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                    Due Date <span className="text-[#71717a] font-normal text-[11px]">(Optional)</span>
                  </label>
                  <input
                    id={dueDateInputId}
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#18181c] border border-[#27272a] text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              {isEditing ? (
                <FileDropzone
                  existingAttachments={task?.attachments || []}
                  onUpload={async (files) => {
                    if (onUploadAttachments && task) {
                      await onUploadAttachments(task.id, files);
                    }
                  }}
                  onDeleteAttachment={onDeleteAttachment}
                />
              ) : (
                <div className="space-y-3">
                  <div className="p-6 border-2 border-dashed border-[#27272a] hover:border-blue-500/50 rounded-xl bg-[#18181c]/40 text-center transition flex flex-col items-center justify-center gap-2">
                    <UploadCloud className="w-8 h-8 text-blue-400" />
                    <div>
                      <p className="text-xs font-medium text-white">Stage attachments for new task</p>
                      <p className="text-[11px] text-[#94a3b8]">PNG, JPG, PDF up to 10MB each</p>
                    </div>
                    <label className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-white cursor-pointer transition">
                      Browse Files
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleStageFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                    </label>
                  </div>

                  {stagedFiles.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-[#a1a1aa]">Staged Files ({stagedFiles.length})</span>
                      {stagedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#18181c] border border-[#27272a] text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="truncate text-white">{file.name}</span>
                            <span className="text-[10px] text-[#94a3b8] shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStagedFile(idx)}
                            className="p-1 text-[#94a3b8] hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="pt-4 border-t border-[#27272a] flex items-center justify-between gap-3">
            <div>
              {isEditing && task && onDelete && (
                <button
                  type="button"
                  onClick={async () => {
                    await onDelete(task.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/30 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow transition flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader variant="spinner" size="sm" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Save Changes' : 'Create Task'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
