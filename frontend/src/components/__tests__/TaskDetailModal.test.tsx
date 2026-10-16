import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskDetailModal } from '../TaskDetailModal';
import type { Task } from '../../types';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@datapure.io', fullName: 'Admin User', role: 'ADMIN' },
    hasPermission: () => true,
  }),
}));

vi.mock('../../services/api', () => ({
  api: {
    getComments: vi.fn().mockResolvedValue([
      {
        id: 101,
        taskId: 1,
        userId: 1,
        authorName: 'Admin User',
        authorRole: 'ADMIN',
        content: 'Initial architecture discussion comment',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
    getActivityLogs: vi.fn().mockResolvedValue({ logs: [] }),
  },
}));

const mockTask: Task = {
  id: 1,
  taskKey: 'DP-101',
  boardId: 1,
  columnId: 1,
  title: 'Set up Production Docker Cluster',
  description: 'Deploy multi-container architecture with MySQL and Nginx',
  priority: 'HIGH',
  category: 'DEVOPS',
  status: 'TODO',
  orderIndex: 0,
  version: 1,
  comments: [
    {
      id: 101,
      taskId: 1,
      userId: 1,
      authorName: 'Admin User',
      authorRole: 'ADMIN',
      content: 'Initial architecture discussion comment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  commentCount: 1,
  attachments: [],
  createdAt: '2026-10-16T10:00:00.000Z',
  updatedAt: '2026-10-16T10:00:00.000Z',
};

describe('TaskDetailModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with task details when isOpen is true', async () => {
    await act(async () => {
      render(
        <TaskDetailModal
          task={mockTask}
          isOpen={true}
          onClose={vi.fn()}
        />
      );
    });

    expect(screen.getByText('DP-101')).toBeInTheDocument();
    expect(screen.getByText('Set up Production Docker Cluster')).toBeInTheDocument();
    expect(screen.getByText('Deploy multi-container architecture with MySQL and Nginx')).toBeInTheDocument();
  });

  it('does not render modal contents when isOpen is false', async () => {
    await act(async () => {
      render(
        <TaskDetailModal
          task={mockTask}
          isOpen={false}
          onClose={vi.fn()}
        />
      );
    });

    expect(screen.queryByText('DP-101')).not.toBeInTheDocument();
  });

  it('renders existing discussion comment with author name and content', async () => {
    await act(async () => {
      render(
        <TaskDetailModal
          task={mockTask}
          isOpen={true}
          onClose={vi.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Initial architecture discussion comment')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });
  });

  it('submits a new comment when typed and submitted', async () => {
    const handleAddComment = vi.fn().mockResolvedValue(undefined);
    await act(async () => {
      render(
        <TaskDetailModal
          task={mockTask}
          isOpen={true}
          onClose={vi.fn()}
          onAddComment={handleAddComment}
        />
      );
    });

    const textarea = screen.getByPlaceholderText(/Write a comment or update on this task/i);
    expect(textarea).toBeInTheDocument();

    await userEvent.type(textarea, 'We should also verify the SSL certificate.');

    const sendButton = screen.getByRole('button', { name: /Post Comment/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(handleAddComment).toHaveBeenCalledWith(1, 'We should also verify the SSL certificate.');
    });
  });

  it('triggers onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    await act(async () => {
      render(
        <TaskDetailModal
          task={mockTask}
          isOpen={true}
          onClose={handleClose}
        />
      );
    });

    // Close button has aria-label="Close modal"
    const closeBtn = screen.getByRole('button', { name: /Close modal/i });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
