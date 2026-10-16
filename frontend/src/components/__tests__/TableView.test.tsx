import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableView } from '../TableView';
import type { Task, Column } from '../../types';

const mockColumns: Column[] = [
  { id: 1, boardId: 1, name: 'To Do', orderIndex: 0, taskCount: 1 },
  { id: 2, boardId: 1, name: 'In Progress', orderIndex: 1, taskCount: 0 },
  { id: 3, boardId: 1, name: 'Done', orderIndex: 2, taskCount: 0 },
];

const mockTasks: Task[] = [
  {
    id: 1,
    taskKey: 'DP-201',
    boardId: 1,
    columnId: 1,
    title: 'Design Dark Mode Theme System',
    priority: 'MEDIUM',
    category: 'DESIGN',
    status: 'TODO',
    orderIndex: 0,
    version: 1,
    commentCount: 3,
    attachments: [],
    createdAt: '2026-10-16T10:00:00.000Z',
    updatedAt: '2026-10-16T10:00:00.000Z',
  },
];

describe('TableView Component', () => {
  it('renders table headers properly', () => {
    render(
      <TableView
        tasks={mockTasks}
        columns={mockColumns}
        onViewTask={vi.fn()}
        onEditTask={vi.fn()}
      />
    );

    expect(screen.getByText(/Key/i)).toBeInTheDocument();
    expect(screen.getByText(/Title/i)).toBeInTheDocument();
    expect(screen.getByText(/Workflow State/i)).toBeInTheDocument();
    expect(screen.getByText(/Priority/i)).toBeInTheDocument();
  });

  it('renders task row data correctly', () => {
    render(
      <TableView
        tasks={mockTasks}
        columns={mockColumns}
        onViewTask={vi.fn()}
        onEditTask={vi.fn()}
      />
    );

    expect(screen.getByText('DP-201')).toBeInTheDocument();
    expect(screen.getByText('Design Dark Mode Theme System')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('triggers onViewTask when task title or key is clicked', () => {
    const handleView = vi.fn();
    render(
      <TableView
        tasks={mockTasks}
        columns={mockColumns}
        onViewTask={handleView}
        onEditTask={vi.fn()}
      />
    );

    const titleCell = screen.getByText('Design Dark Mode Theme System');
    fireEvent.click(titleCell);

    expect(handleView).toHaveBeenCalledWith(mockTasks[0]);
  });
});
