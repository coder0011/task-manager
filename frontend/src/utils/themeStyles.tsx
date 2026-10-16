import React from 'react';
import type { Priority, TaskCategory } from '../types';

/**
 * Returns a standardized, consistent category badge across Table, Kanban, View Modal, and Edit Modal.
 */
export function getCategoryBadge(category?: TaskCategory | string, size: 'sm' | 'md' = 'sm'): React.ReactNode {
  const sizeClasses = size === 'md' 
    ? 'px-2.5 py-1 text-xs font-semibold' 
    : 'px-2 py-0.5 text-[10px] font-semibold';

  switch (category) {
    case 'DESIGN':
      return (
        <span className={`inline-flex items-center rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 ${sizeClasses}`}>
          Design
        </span>
      );
    case 'DEVOPS':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 ${sizeClasses}`}>
          DevOps
        </span>
      );
    case 'TESTING':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${sizeClasses}`}>
          Testing
        </span>
      );
    case 'MARKETING':
      return (
        <span className={`inline-flex items-center rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 ${sizeClasses}`}>
          Marketing
        </span>
      );
    case 'RESEARCH':
      return (
        <span className={`inline-flex items-center rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 ${sizeClasses}`}>
          Research
        </span>
      );
    case 'OPERATIONS':
      return (
        <span className={`inline-flex items-center rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 ${sizeClasses}`}>
          Operations
        </span>
      );
    case 'DEVELOPMENT':
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 ${sizeClasses}`}>
          Development
        </span>
      );
  }
}

/**
 * Returns a standardized, consistent priority badge across Table, Kanban, View Modal, and Edit Modal.
 */
export function getPriorityBadge(priority?: Priority | string, size: 'sm' | 'md' = 'sm'): React.ReactNode {
  const sizeClasses = size === 'md'
    ? 'px-2.5 py-1 text-xs font-semibold'
    : 'px-2 py-0.5 text-[10px] font-semibold';

  const dotSize = size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5';

  switch (priority) {
    case 'URGENT':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30 ${sizeClasses}`}>
          <span className={`${dotSize} rounded-full bg-red-400 animate-pulse`} />
          URGENT
        </span>
      );
    case 'HIGH':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 ${sizeClasses}`}>
          <span className={`${dotSize} rounded-full bg-amber-400`} />
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 ${sizeClasses}`}>
          <span className={`${dotSize} rounded-full bg-blue-400`} />
          MEDIUM
        </span>
      );
    case 'LOW':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 text-zinc-300 border border-zinc-500/30 ${sizeClasses}`}>
          <span className={`${dotSize} rounded-full bg-zinc-400`} />
          LOW
        </span>
      );
  }
}

/**
 * Returns a standardized column workflow badge.
 */
export function getColumnBadge(name: string, color?: string, size: 'sm' | 'md' = 'sm'): React.ReactNode {
  const hexColor = color || '#3b82f6';
  const sizeClasses = size === 'md'
    ? 'px-3 py-1 text-xs font-medium'
    : 'px-2.5 py-0.5 text-[11px] font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses}`}
      style={{
        backgroundColor: `${hexColor}20`,
        color: hexColor,
        border: `1px solid ${hexColor}40`
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hexColor }} />
      {name}
    </span>
  );
}

/**
 * Returns a standardized role badge for users.
 */
export function getRoleBadge(roleKey?: string): React.ReactNode {
  const key = (roleKey || 'MEMBER').toUpperCase();
  switch (key) {
    case 'ADMIN':
    case 'ADMINISTRATOR':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Admin
        </span>
      );
    case 'MANAGER':
    case 'PROJECT_MANAGER':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Manager
        </span>
      );
    case 'VIEWER':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/15 text-zinc-300 border border-zinc-500/30">
          Viewer
        </span>
      );
    case 'MEMBER':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
          Member
        </span>
      );
  }
}
