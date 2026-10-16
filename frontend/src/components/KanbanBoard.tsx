import React, { useState, useOptimistic, useTransition } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import type { Column, Task } from '../types';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import { Loader } from './Loader';
import './KanbanBoard.css';

interface KanbanBoardProps {
  columns: Column[];
  tasks: Task[];
  onMoveTask: (taskId: number, targetColumnId: number, newOrderIndex: number, expectedVersion: number) => void | Promise<void>;
  onTaskClick: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: number) => void;
  onQuickAdd: (columnId: number) => void;
  onUserClick?: (user: { id?: number; fullName?: string; avatarUrl?: string }) => void;
  isLoading?: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  tasks,
  onMoveTask,
  onTaskClick,
  onEditTask,
  onDeleteTask,
  onQuickAdd,
  onUserClick,
  isLoading = false
}) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // React 19 useOptimistic: provides immediate visual feedback during drag mutations
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    tasks,
    (currentTasks: Task[], update: { taskId: number; targetColumnId: number; newOrderIndex: number }) => {
      return currentTasks.map(t =>
        t.id === update.taskId
          ? { ...t, columnId: update.targetColumnId, orderIndex: update.newOrderIndex }
          : t
      );
    }
  );

  // React 19 useTransition: non-blocking async mutation lifecycle
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // Avoid starting drag on click
      }
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = optimisticTasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = Number(active.id);
    const task = optimisticTasks.find(t => t.id === activeTaskId);
    if (!task) return;

    let targetColumnId: number | null = null;
    let newOrderIndex = task.orderIndex;

    // Dropped onto a column directly
    if (String(over.id).startsWith('column-')) {
      targetColumnId = Number(String(over.id).replace('column-', ''));
      const colTasks = optimisticTasks.filter(t => t.columnId === targetColumnId);
      newOrderIndex = colTasks.length > 0 ? colTasks[colTasks.length - 1].orderIndex + 1000 : 1000;
    } else {
      // Dropped onto another task
      const overTaskId = Number(over.id);
      const overTask = optimisticTasks.find(t => t.id === overTaskId);
      if (overTask) {
        targetColumnId = overTask.columnId;
        newOrderIndex = overTask.orderIndex + 10;
      }
    }

    if (targetColumnId !== null && (targetColumnId !== task.columnId || newOrderIndex !== task.orderIndex)) {
      const finalColumnId = targetColumnId;
      const finalOrderIndex = newOrderIndex;
      // React 19 startTransition with async mutation & optimistic state
      startTransition(async () => {
        setOptimisticTasks({ taskId: task.id, targetColumnId: finalColumnId, newOrderIndex: finalOrderIndex });
        await onMoveTask(task.id, finalColumnId, finalOrderIndex, task.version);
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 p-6 flex gap-6 overflow-x-auto min-h-[calc(100vh-125px)] relative">
        {isLoading && <Loader variant="overlay" size="md" label="Updating sprint board..." />}
        {columns.map((col) => (
          <BoardColumn
            key={col.id}
            column={col}
            tasks={optimisticTasks
              .filter(t => t.columnId === col.id)
              .toSorted((a: Task, b: Task) => a.orderIndex - b.orderIndex)}
            onTaskClick={onTaskClick}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onQuickAdd={onQuickAdd}
            onUserClick={onUserClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} onClick={() => {}} isOverlay onUserClick={onUserClick} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
