import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskCard } from '../TaskCard';
import type { Task } from '../../types';

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

const mockTask: Task = {
  id: 42,
  taskKey: 'DP-42',
  boardId: 1,
  columnId: 1,
  title: 'Implement OAuth Authentication',
  description: 'Add Google and GitHub OAuth providers',
  priority: 'HIGH',
  category: 'DEVELOPMENT',
  status: 'TODO',
  orderIndex: 1,
  version: 1,
  comments: [
    {
      id: 1,
      taskId: 42,
      userId: 2,
      authorName: 'Alex River',
      content: 'We need scopes for email and profile',
      createdAt: '2026-10-16T12:00:00.000Z',
      updatedAt: '2026-10-16T12:00:00.000Z',
    },
  ],
  commentCount: 1,
  attachments: [],
  createdAt: '2026-10-16T10:00:00.000Z',
  updatedAt: '2026-10-16T10:00:00.000Z',
};

describe('TaskCard Component', () => {
  it('renders task title and taskKey correctly', () => {
    const handleClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={handleClick} />);

    expect(screen.getByText('DP-42')).toBeInTheDocument();
    expect(screen.getByText('Implement OAuth Authentication')).toBeInTheDocument();
  });

  it('displays comments counter with correct number', () => {
    const handleClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={handleClick} />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={handleClick} />);

    const card = screen.getByRole('button', { name: /Task DP-42: Implement OAuth Authentication/i });
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockTask);
  });

  it('triggers onClick handler on Enter keypress for accessibility', () => {
    const handleClick = vi.fn();
    render(<TaskCard task={mockTask} onClick={handleClick} />);

    const card = screen.getByRole('button', { name: /Task DP-42: Implement OAuth Authentication/i });
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
