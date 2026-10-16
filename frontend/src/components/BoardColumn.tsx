import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column, Task } from '../types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface BoardColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: number) => void;
  onQuickAdd: (columnId: number) => void;
  onUserClick?: (user: { id?: number; fullName?: string; avatarUrl?: string }) => void;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  column,
  tasks,
  onTaskClick,
  onEditTask,
  onDeleteTask,
  onQuickAdd,
  onUserClick
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { column }
  });

  return (
    <div className="flex-1 min-w-[300px] max-w-[380px] flex flex-col rounded-2xl bg-[#121215]/80 border border-[#27272a] overflow-hidden">
      {/* Column Header */}
      <div className="p-3.5 border-b border-[#27272a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
            aria-hidden="true"
          />
          <h3 className="text-xs font-semibold text-white tracking-tight">
            {column.name}
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#18181c] border border-[#27272a] text-[#a1a1aa]">
            {tasks.length}
          </span>
        </div>

        <button
          onClick={() => onQuickAdd(column.id)}
          aria-label={`Add task to ${column.name} column`}
          className="p-1.5 min-h-[30px] min-w-[30px] rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#18181c] transition flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          title={`Add task to ${column.name}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Task Drop List */}
      <div
        ref={setNodeRef}
        aria-label={`${column.name} lane`}
        className={`flex-1 p-3 flex flex-col gap-2.5 overflow-y-auto min-h-[500px] transition-colors ${
          isOver ? 'bg-blue-500/[0.04]' : ''
        }`}
      >
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClick={onTaskClick} 
              onEdit={onEditTask} 
              onDelete={onDeleteTask}
              onUserClick={onUserClick}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#27272a] rounded-xl p-6 text-center text-[#94a3b8]">
            <p className="text-xs">No tasks in this lane</p>
            <button
              onClick={() => onQuickAdd(column.id)}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium p-1 focus-visible:ring-1 focus-visible:ring-blue-400"
            >
              + Create first task
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
