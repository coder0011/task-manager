import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10, // 10 seconds fresh data
      gcTime: 1000 * 60 * 15, // 15 minutes garbage collection cache
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const QUERY_KEYS = {
  board: (slug: string = 'engineering-sprint', filters?: Record<string, any>) =>
    ['board', slug, filters || {}] as const,
  tasks: (params?: Record<string, any>) => ['tasks', params || {}] as const,
  taskDetail: (id: number) => ['task', id] as const,
  taskComments: (taskId: number) => ['comments', taskId] as const,
  users: (params?: Record<string, any>) => ['users', params || {}] as const,
  allUsers: ['users', 'all'] as const,
  roles: ['rbac', 'roles'] as const,
  permissions: ['rbac', 'permissions'] as const,
  activityLogs: (params?: Record<string, any>) => ['activityLogs', params || {}] as const,
  notifications: ['notifications'] as const,
  authMe: ['auth', 'me'] as const,
} as const;
