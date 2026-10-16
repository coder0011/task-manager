import { useState, useEffect, useCallback, useTransition, lazy, Suspense } from 'react';
import { Toaster, toast } from 'sonner';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './lib/queryClient';
import { api } from './services/api';
import type { Board, Task, Priority, TaskCategory, ViewMode, ActiveTab, PaginationMetadata, User, SortOrder } from './types';
import { useDebounce } from './utils/asyncUtils';
import { confirmDelete } from './utils/confirmModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { LoginPage } from './pages/LoginPage';
import { Loader } from './components/Loader';
import { AppErrorBoundary, ModuleErrorBoundary } from './components/ErrorBoundary';
import { storage } from './lib/storage';
import { STORAGE_KEYS, APP_ROUTES, PAGINATION } from './constants/appConstants';

// Code-split heavy workspace views with dynamic imports for minimal initial bundle
const KanbanBoard = lazy(() => import('./components/KanbanBoard').then(m => ({ default: m.KanbanBoard })));
const TableView = lazy(() => import('./components/TableView').then(m => ({ default: m.TableView })));
const UserManagementView = lazy(() => import('./components/UserManagementView').then(m => ({ default: m.UserManagementView })));
const RbacMatrixView = lazy(() => import('./components/RbacMatrixView').then(m => ({ default: m.RbacMatrixView })));
const ActivityLogView = lazy(() => import('./components/ActivityLogView').then(m => ({ default: m.ActivityLogView })));
const ProfileView = lazy(() => import('./pages/ProfileView').then(m => ({ default: m.ProfileView })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Lazy-loaded dialogs & debugging instrumentation
const TaskModal = lazy(() => import('./components/TaskModal').then(m => ({ default: m.TaskModal })));
const TaskDetailModal = lazy(() => import('./components/TaskDetailModal').then(m => ({ default: m.TaskDetailModal })));
const UserDetailModal = lazy(() => import('./components/UserDetailModal').then(m => ({ default: m.UserDetailModal })));
const DevTools = lazy(() => import('./components/DevTools').then(m => ({ default: m.DevTools })));

function getInitialTab(): ActiveTab {
  if (typeof window === 'undefined') return 'BOARD';
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab')?.toLowerCase();
  const path = window.location.pathname.toLowerCase();

  if (path === '/' || path === '') return 'BOARD';
  if (path.startsWith('/login') || tabParam === 'login') return 'LOGIN';
  if (path.startsWith('/register') || tabParam === 'register') return 'LOGIN'; // Registration is strictly handled by admin user CRUD
  if (path.startsWith('/forgot-password') || tabParam === 'forgot-password') return 'FORGOT_PASSWORD';
  if (path.startsWith('/reset-password') || tabParam === 'reset-password') return 'RESET_PASSWORD';
  if (path.startsWith('/profile') || tabParam === 'profile') return 'PROFILE';
  if (path.startsWith('/team') || tabParam === 'team') return 'USERS';
  if (path.startsWith('/rbac') || tabParam === 'rbac') return 'RBAC';
  if (path.startsWith('/audit') || tabParam === 'audit') return 'AUDIT';
  return 'NOT_FOUND';
}

function getInitialViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'KANBAN';
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view')?.toUpperCase();
  if (viewParam === 'TABLE' || viewParam === 'KANBAN') {
    return viewParam as ViewMode;
  }
  const saved = storage.get<string>(STORAGE_KEYS.VIEW_MODE_PREFERENCE, 'KANBAN');
  return saved === 'TABLE' ? 'TABLE' : 'KANBAN';
}

const GUEST_TABS: ActiveTab[] = ['LOGIN', 'FORGOT_PASSWORD', 'RESET_PASSWORD'];
const AUTH_TABS: ActiveTab[] = ['BOARD', 'USERS', 'RBAC', 'AUDIT', 'PROFILE'];

function TaskManagerContent() {
  const { isAuthenticated, isLoading: authLoading, hasPermission } = useAuth();

  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const initial = getInitialTab();
    // Default to LOGIN if not authenticated initially unless on a guest route
    const savedToken = storage.getToken();
    if (!savedToken && AUTH_TABS.includes(initial)) {
      return 'LOGIN';
    }
    return initial;
  });
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [resetToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('token') || '';
    }
    return '';
  });

  const queryClient = useQueryClient();

  // Server-side Filtering, Sorting & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [tablePage, setTablePage] = useState<number>(1);
  const [tableLimit, setTableLimit] = useState<number>(PAGINATION.DEFAULT_LIMIT);

  // React 19 useTransition for non-blocking UI background mutations
  const [, startTransition] = useTransition();

  // Workspace Users Query
  const { data: workspaceUsersData } = useQuery({
    queryKey: QUERY_KEYS.allUsers,
    queryFn: ({ signal }) =>
      api.getUsers({ all: true }, signal).then(res => (Array.isArray(res) ? res : res?.users || [])),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const workspaceUsers: User[] = workspaceUsersData || [];

  // Board Base Metadata Query
  const { data: baseBoardData, isLoading: isBaseBoardLoading } = useQuery({
    queryKey: ['board-meta', 'engineering-sprint'],
    queryFn: ({ signal }) => api.getBoard('engineering-sprint', undefined, signal),
    enabled: isAuthenticated && activeTab === 'BOARD',
    staleTime: 60_000,
  });

  // Kanban Board Data Query
  const {
    data: kanbanData,
    isLoading: isKanbanLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.board('engineering-sprint', {
      search: debouncedSearch.trim() || undefined,
      priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
    }),
    queryFn: ({ signal }) =>
      api.getBoard(
        'engineering-sprint',
        {
          search: debouncedSearch.trim() || undefined,
          priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        },
        signal
      ),
    enabled: isAuthenticated && activeTab === 'BOARD' && viewMode === 'KANBAN',
  });

  // Table Tasks Data Query
  const {
    data: tableData,
    isLoading: isTableLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.tasks({
      page: tablePage,
      limit: tableLimit,
      search: debouncedSearch.trim() || undefined,
      priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      sortBy: sortField as any,
      sortOrder: sortOrder,
      boardId: baseBoardData?.board?.id || 1,
    }),
    queryFn: ({ signal }) =>
      api.getTasks(
        {
          page: tablePage,
          limit: tableLimit,
          search: debouncedSearch.trim() || undefined,
          priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          sortBy: sortField as any,
          sortOrder: sortOrder,
          boardId: baseBoardData?.board?.id || 1,
        },
        signal
      ),
    enabled: isAuthenticated && activeTab === 'BOARD' && viewMode === 'TABLE',
  });

  const board: Board | null = kanbanData?.board || baseBoardData?.board || null;
  const tasks: Task[] = viewMode === 'KANBAN'
    ? (kanbanData?.tasks || [])
    : (tableData?.tasks || []);
  const pagination: PaginationMetadata | null = viewMode === 'TABLE' ? (tableData?.pagination || null) : null;
  const totalCount: number = viewMode === 'TABLE'
    ? (tableData?.pagination?.total ?? 0)
    : (kanbanData?.tasks?.length ?? 0);
  const isLoading = viewMode === 'KANBAN'
    ? (isKanbanLoading || isBaseBoardLoading)
    : (isTableLoading || isBaseBoardLoading);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(null);
  const [targetColumnId, setTargetColumnId] = useState<number>(1);

  // Synchronize browser history and URL with clean segments
  const updateUrl = useCallback((tab: ActiveTab, mode: ViewMode) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (tab === 'USERS') {
      url.pathname = APP_ROUTES.TEAM;
      url.search = '';
    } else if (tab === 'RBAC') {
      url.pathname = APP_ROUTES.RBAC;
      url.search = '';
    } else if (tab === 'AUDIT') {
      url.pathname = APP_ROUTES.AUDIT;
      url.search = '';
    } else if (tab === 'PROFILE') {
      url.pathname = APP_ROUTES.PROFILE;
      url.search = '';
    } else if (tab === 'LOGIN') {
      url.pathname = APP_ROUTES.LOGIN;
      const redirect = storage.getRedirectAfterLogin();
      url.search = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
    } else if (tab === 'FORGOT_PASSWORD') {
      url.pathname = APP_ROUTES.FORGOT_PASSWORD;
      url.search = '';
    } else if (tab === 'RESET_PASSWORD') {
      url.pathname = APP_ROUTES.RESET_PASSWORD;
      const token = url.searchParams.get('token');
      url.search = token ? `?token=${encodeURIComponent(token)}` : '';
    } else if (tab === 'NOT_FOUND') {
      // Retain current browser URL
      return;
    } else {
      url.pathname = APP_ROUTES.ROOT;
      url.search = mode === 'TABLE' ? '?view=table' : '';
    }
    window.history.pushState({ tab, mode }, '', url.pathname + url.search);
  }, []);

  // Route restrictions:
  // 1. Unauthenticated users restricted from authenticated pages -> saved redirect & redirected to LOGIN
  // 2. Authenticated users restricted from guest pages -> redirected to BOARD
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated && AUTH_TABS.includes(activeTab)) {
      const currentFull = window.location.pathname + window.location.search;
      if (currentFull && currentFull !== '/' && !currentFull.startsWith('/login')) {
        sessionStorage.setItem('datapure_redirect_after_login', currentFull);
      }
      setActiveTab('LOGIN');
      updateUrl('LOGIN', viewMode);
    } else if (isAuthenticated && GUEST_TABS.includes(activeTab)) {
      setActiveTab('BOARD');
      updateUrl('BOARD', viewMode);
    }
  }, [isAuthenticated, authLoading, activeTab, viewMode, updateUrl]);

  // Listen for 401 unauthorized trigger to auto-logout and redirect
  useEffect(() => {
    const handleUnauthorized = () => {
      const currentFull = window.location.pathname + window.location.search;
      if (currentFull && currentFull !== '/' && !currentFull.startsWith('/login')) {
        sessionStorage.setItem('datapure_redirect_after_login', currentFull);
      }
      setActiveTab('LOGIN');
      updateUrl('LOGIN', viewMode);
    };

    window.addEventListener('datapure:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('datapure:unauthorized', handleUnauthorized);
  }, [updateUrl, viewMode]);

  const handleTabChange = useCallback((newTab: ActiveTab, options?: { toast?: string }) => {
    let targetTab = newTab;

    if (!isAuthenticated && AUTH_TABS.includes(newTab)) {
      const currentFull = window.location.pathname + window.location.search;
      if (currentFull && currentFull !== '/' && !currentFull.startsWith('/login')) {
        sessionStorage.setItem('datapure_redirect_after_login', currentFull);
      }
      targetTab = 'LOGIN';
    } else if (isAuthenticated && GUEST_TABS.includes(newTab)) {
      targetTab = 'BOARD';
    }

    setActiveTab(targetTab);
    updateUrl(targetTab, viewMode);
    if (options?.toast) {
      toast.success(options.toast);
    }
  }, [isAuthenticated, viewMode, updateUrl]);

  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);
    storage.set(STORAGE_KEYS.VIEW_MODE_PREFERENCE, newMode);
    updateUrl(activeTab, newMode);
  }, [activeTab, updateUrl]);

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const tab = getInitialTab();
      if (!isAuthenticated && AUTH_TABS.includes(tab)) {
        setActiveTab('LOGIN');
      } else if (isAuthenticated && GUEST_TABS.includes(tab)) {
        setActiveTab('BOARD');
      } else {
        setActiveTab(tab);
      }
      setViewMode(getInitialViewMode());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

  // Filter change handlers that reset pagination page
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // When debounced search term settles, reset to page 1
  useEffect(() => {
    setTablePage(1);
  }, [debouncedSearch]);

  const handlePriorityChange = useCallback((priority: Priority | 'ALL') => {
    setSelectedPriority(priority);
    setTablePage(1);
  }, []);

  const handleCategoryChange = useCallback((category: TaskCategory | 'ALL') => {
    setSelectedCategory(category);
    setTablePage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedPriority('ALL');
    setSelectedCategory('ALL');
    setSortField('order_index');
    setSortOrder('asc');
    setTablePage(1);
  }, []);

  // Keyboard shortcut listener ('Ctrl + N' or 'Cmd + N' to create new task)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setSelectedTask(null);
        setTargetColumnId(1);
        setIsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Moves a task to a different workflow column or reorders it within the same column.
   * Leverages Optimistic Concurrency Control (OCC) with TanStack Query:
   * 1. Applies optimistic client-side card repositioning immediately in the query cache.
   * 2. Wraps asynchronous backend write within React 19 `startTransition`.
   * 3. On HTTP 409 Conflict (concurrency collision), rolls back to fresh authoritative server state.
   */
  const handleMoveTask = async (
    taskId: number,
    newColumnId: number,
    newOrderIndex: number,
    currentVersion: number
  ) => {
    // Optimistic UI card repositioning in active board query cache
    queryClient.setQueriesData({ queryKey: ['board'] }, (old: any) => {
      if (!old || !old.tasks) return old;
      return {
        ...old,
        tasks: old.tasks.map((t: Task) =>
          t.id === taskId
            ? { ...t, columnId: newColumnId, orderIndex: newOrderIndex, version: t.version + 1 }
            : t
        ),
      };
    });

    startTransition(async () => {
      try {
        await api.moveTask(taskId, newColumnId, newOrderIndex, currentVersion);
        queryClient.invalidateQueries({ queryKey: ['board'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.success('Task position updated');
      } catch (err: any) {
        console.warn('Move task conflict or network failure:', err);
        queryClient.invalidateQueries({ queryKey: ['board'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.error(
          err.isConcurrencyConflict || err.response?.status === 409
            ? 'Concurrency Warning: Task was updated by another team member. Reverted with fresh state.'
            : 'Failed to update task position. Network error.'
        );
      }
    });
  };

  const handleCreateOrUpdateTask = async (
    taskData: any,
    stagedFiles?: File[]
  ) => {
    try {
      if (selectedTask) {
        await api.updateTask(selectedTask.id, taskData);
        toast.success(`Task ${selectedTask.taskKey} updated successfully`);
      } else {
        const created = await api.createTask(taskData);
        // Process any staged file attachments uploaded together
        if (stagedFiles && stagedFiles.length > 0) {
          try {
            await api.uploadAttachments(created.id, stagedFiles);
          } catch (err) {
            console.error('Failed to upload staged attachments:', err);
          }
        }
        toast.success(`Task ${created.taskKey} created successfully`);
      }
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: any) {
      toast.error(err.displayMessage || err.message || 'Failed to save task');
    }
  };

  const handleViewTask = (task: Task) => {
    setSelectedDetailTask(task);
    setIsDetailModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    const confirmed = await confirmDelete({
      title: 'Delete Task?',
      text: task ? `Permanently delete task ${task.taskKey}: "${task.title}"? This action cannot be undone.` : 'Permanently delete this task?'
    });
    if (!confirmed) return;

    try {
      await api.deleteTask(taskId);
      if (selectedDetailTask?.id === taskId) {
        setIsDetailModalOpen(false);
        setSelectedDetailTask(null);
      }
      toast.success('Task deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err: any) {
      toast.error(err.displayMessage || 'Failed to delete task');
    }
  };

  const handleAddComment = async (taskId: number, content: string) => {
    try {
      const comment = await api.addComment(taskId, content);
      if (selectedDetailTask && selectedDetailTask.id === taskId) {
        setSelectedDetailTask(prev =>
          prev
            ? {
                ...prev,
                comments: [...(prev.comments || []), comment],
                commentCount: (prev.commentCount || 0) + 1
              }
            : null
        );
      }
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Comment posted');
    } catch (err: any) {
      toast.error(err.displayMessage || 'Failed to post comment');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.deleteComment(commentId);
      if (selectedDetailTask) {
        setSelectedDetailTask(prev =>
          prev
            ? {
                ...prev,
                comments: prev.comments?.filter(c => c.id !== commentId),
                commentCount: Math.max(0, (prev.commentCount || 1) - 1)
              }
            : null
        );
      }
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Comment deleted');
    } catch (err: any) {
      toast.error(err.displayMessage || 'Failed to delete comment');
    }
  };

  const handleOpenUserModal = useCallback((userInfo: { id?: number; fullName?: string; avatarUrl?: string; role?: string; email?: string; isActive?: boolean }) => {
    const fullUser = workspaceUsers.find(u => (userInfo.id && u.id === userInfo.id) || (userInfo.fullName && u.fullName === userInfo.fullName));
    if (fullUser) {
      setSelectedUserProfile(fullUser);
    } else {
      setSelectedUserProfile({
        id: userInfo.id || 0,
        fullName: userInfo.fullName || 'Workspace Member',
        email: userInfo.email || `${(userInfo.fullName || 'user').toLowerCase().replace(/\s+/g, '.')}@datapure.io`,
        role: userInfo.role || 'MEMBER',
        avatarUrl: userInfo.avatarUrl,
        isActive: userInfo.isActive ?? true,
        createdAt: new Date().toISOString()
      });
    }
    setIsUserModalOpen(true);
  }, [workspaceUsers]);

  const handleUploadAttachments = async (taskId: number, files: File[]) => {
    try {
      const newAttachments = await api.uploadAttachments(taskId, files);
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev =>
          prev
            ? { ...prev, attachments: [...(prev.attachments || []), ...newAttachments] }
            : null
        );
      }
      if (selectedDetailTask && selectedDetailTask.id === taskId) {
        setSelectedDetailTask(prev =>
          prev
            ? { ...prev, attachments: [...(prev.attachments || []), ...newAttachments] }
            : null
        );
      }
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Uploaded ${newAttachments.length} file(s) successfully`);
    } catch (err: any) {
      toast.error(err.displayMessage || 'Attachment upload failed');
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    const confirmed = await confirmDelete({
      title: 'Remove Attachment?',
      text: 'Are you sure you want to remove this file attachment?'
    });
    if (!confirmed) return;

    try {
      await api.deleteAttachment(attachmentId);
      if (selectedTask) {
        setSelectedTask(prev =>
          prev
            ? {
                ...prev,
                attachments: prev.attachments?.filter(a => a.id !== attachmentId)
              }
            : null
        );
      }
      if (selectedDetailTask) {
        setSelectedDetailTask(prev =>
          prev
            ? {
                ...prev,
                attachments: prev.attachments?.filter(a => a.id !== attachmentId)
              }
            : null
        );
      }
      queryClient.invalidateQueries({ queryKey: ['board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Attachment removed');
    } catch (err: any) {
      toast.error(err.displayMessage || 'Failed to delete attachment');
    }
  };

  // Session verifying state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#a1a1aa]" role="status">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  // Dedicated 404 Not Found Route
  if (activeTab === 'NOT_FOUND') {
    return (
      <Suspense fallback={<Loader variant="overlay" label="Loading..." />}>
        <NotFoundPage onNavigate={handleTabChange} />
      </Suspense>
    );
  }

  // Unauthenticated users are strictly confined to guest auth routes
  if (!isAuthenticated) {
    if (activeTab === 'FORGOT_PASSWORD') {
      return (
        <Suspense fallback={<Loader variant="overlay" label="Loading..." />}>
          <ForgotPasswordPage
            onNavigate={(tab: any) => {
              handleTabChange(tab);
            }}
          />
        </Suspense>
      );
    }
    if (activeTab === 'RESET_PASSWORD') {
      return (
        <Suspense fallback={<Loader variant="overlay" label="Loading..." />}>
          <ResetPasswordPage
            initialToken={resetToken}
            onNavigate={handleTabChange}
          />
        </Suspense>
      );
    }
    return <LoginPage onNavigate={handleTabChange} />;
  }

  // Authenticated users are strictly restricted from guest auth routes
  if (GUEST_TABS.includes(activeTab)) {
    return null;
  }

  if (isLoading && !board && activeTab === 'BOARD') {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#a1a1aa]" role="status">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading DataPure Task Manager...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* React 19 Native Document Metadata */}
      <title>
        {activeTab === 'BOARD'
          ? `DataPure - ${board?.name || 'Sprint Board'} (${viewMode === 'KANBAN' ? 'Kanban' : 'Table'})`
          : activeTab === 'USERS'
          ? 'DataPure - Team Management'
          : activeTab === 'RBAC'
          ? 'DataPure - Permissions & Roles'
          : activeTab === 'AUDIT'
          ? 'DataPure - Enterprise Audit Logs'
          : activeTab === 'PROFILE'
          ? 'DataPure - My Profile'
          : 'DataPure Task Manager'}
      </title>
      <meta name="description" content="DataPure Enterprise Fullstack Task Management Platform" />

      {/* Main Header */}
      <Header
        boardName={board?.name || 'Task Board'}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onNewTask={() => {
          setSelectedTask(null);
          setTargetColumnId(1);
          setIsModalOpen(true);
        }}
        onOpenAuth={() => handleTabChange('LOGIN')}
        onTaskClick={async (taskId) => {
          const found = tasks.find(t => t.id === taskId);
          if (found) {
            handleViewTask(found);
          } else {
            try {
              const res = await api.getTaskById(taskId);
              if (res) handleViewTask(res);
            } catch {
              toast.error('Task could not be loaded');
            }
          }
        }}
      />

      {/* View Switcher with Suspense Code Splitting */}
      <Suspense fallback={<Loader variant="overlay" label="Loading view..." />}>
        {activeTab === 'BOARD' && (
          <ModuleErrorBoundary>
            {/* Server-side Filter Bar */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              selectedPriority={selectedPriority}
              onPriorityChange={handlePriorityChange}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              taskCount={pagination ? pagination.total : tasks.length}
              totalCount={totalCount}
              onResetFilters={handleResetFilters}
            />

            {/* Kanban Mode or Table Mode */}
            {board && viewMode === 'KANBAN' ? (
              <KanbanBoard
                columns={board.columns}
                tasks={tasks}
                isLoading={isLoading}
                onMoveTask={handleMoveTask}
                onTaskClick={handleViewTask}
                onEditTask={handleEditTask}
                onDeleteTask={hasPermission('task:delete') ? handleDeleteTask : undefined}
                onQuickAdd={(columnId) => {
                  setSelectedTask(null);
                  setTargetColumnId(columnId);
                  setIsModalOpen(true);
                }}
                onUserClick={handleOpenUserModal}
              />
            ) : board && viewMode === 'TABLE' ? (
              <TableView
                columns={board.columns}
                tasks={tasks}
                pagination={pagination || undefined}
                onPageChange={(p) => setTablePage(p)}
                onLimitChange={(l) => {
                  setTableLimit(l);
                  setTablePage(1);
                }}
                currentLimit={tableLimit}
                isLoading={isLoading}
                onViewTask={handleViewTask}
                onEditTask={handleEditTask}
                onDeleteTask={hasPermission('task:delete') ? handleDeleteTask : undefined}
                sortField={sortField}
                sortOrder={sortOrder}
                onSortChange={(field, order) => {
                  setSortField(field);
                  setSortOrder(order);
                  setTablePage(1);
                }}
                onUserClick={handleOpenUserModal}
              />
            ) : null}
          </ModuleErrorBoundary>
        )}

        {activeTab === 'USERS' && (
          <ModuleErrorBoundary>
            <UserManagementView />
          </ModuleErrorBoundary>
        )}

        {activeTab === 'RBAC' && (
          <ModuleErrorBoundary>
            <RbacMatrixView />
          </ModuleErrorBoundary>
        )}

        {activeTab === 'AUDIT' && (
          <ModuleErrorBoundary>
            <ActivityLogView />
          </ModuleErrorBoundary>
        )}

        {activeTab === 'PROFILE' && (
          <ModuleErrorBoundary>
            <ProfileView />
          </ModuleErrorBoundary>
        )}

        {/* Task Detail Modal (Conditionally mounted and dynamically imported) */}
        {isDetailModalOpen && (
          <TaskDetailModal
            task={selectedDetailTask}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedDetailTask(null);
            }}
            onEdit={(task) => {
              setIsDetailModalOpen(false);
              setSelectedTask(task);
              setIsModalOpen(true);
            }}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            columnName={board?.columns.find(c => c.id === selectedDetailTask?.columnId)?.name}
            users={workspaceUsers}
            onUserClick={handleOpenUserModal}
          />
        )}

        {/* Task Modal (Create / Edit - conditionally mounted and dynamically imported) */}
        {isModalOpen && (
          <TaskModal
            task={selectedTask}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedTask(null);
            }}
            onSave={handleCreateOrUpdateTask}
            onDelete={handleDeleteTask}
            onUploadAttachments={handleUploadAttachments}
            onDeleteAttachment={handleDeleteAttachment}
            defaultColumnId={targetColumnId}
            columns={board?.columns || []}
            boardId={board?.id || 1}
            users={workspaceUsers}
          />
        )}

        {/* User Profile Detail Modal (conditionally mounted and dynamically imported) */}
        {isUserModalOpen && (
          <UserDetailModal
            user={selectedUserProfile}
            isOpen={isUserModalOpen}
            onClose={() => {
              setIsUserModalOpen(false);
              setSelectedUserProfile(null);
            }}
          />
        )}

        {/* Embedded Developer Debugging Tools (dev mode only) */}
        <DevTools />
      </Suspense>

      {/* Global Lightweight Toast Notifications */}
      <Toaster
        position="top-right"
        theme="dark"
        closeButton
        toastOptions={{
          style: {
            background: '#121215',
            borderColor: '#27272a',
            color: '#f4f4f5',
          },
          className: 'font-sans text-xs',
        }}
        icons={{
          success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
          loading: <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />,
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <TaskManagerContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
