import React, { useId, useDeferredValue } from 'react';
import { Search, Filter, AlertCircle, X, RotateCcw, Tag } from 'lucide-react';
import type { Priority, TaskCategory } from '../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPriority: Priority | 'ALL';
  onPriorityChange: (p: Priority | 'ALL') => void;
  selectedCategory?: TaskCategory | 'ALL';
  onCategoryChange?: (c: TaskCategory | 'ALL') => void;
  taskCount: number;
  totalCount?: number;
  onResetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPriorityChange,
  selectedCategory = 'ALL',
  onCategoryChange,
  taskCount,
  totalCount,
  onResetFilters
}) => {
  const searchInputId = useId();
  const categorySelectId = useId();
  const deferredSearch = useDeferredValue(searchQuery);
  const isStale = deferredSearch !== searchQuery;
  const isFiltered = searchQuery.trim() !== '' || selectedPriority !== 'ALL' || selectedCategory !== 'ALL';

  const priorities: { label: string; value: Priority | 'ALL'; color: string }[] = [
    { label: 'All', value: 'ALL', color: 'text-zinc-300' },
    { label: 'Urgent', value: 'URGENT', color: 'text-red-400' },
    { label: 'High', value: 'HIGH', color: 'text-amber-400' },
    { label: 'Medium', value: 'MEDIUM', color: 'text-blue-400' },
    { label: 'Low', value: 'LOW', color: 'text-zinc-400' }
  ];

  const categories: { label: string; value: TaskCategory | 'ALL' }[] = [
    { label: 'All Categories', value: 'ALL' },
    { label: 'Development', value: 'DEVELOPMENT' },
    { label: 'Design', value: 'DESIGN' },
    { label: 'DevOps', value: 'DEVOPS' },
    { label: 'Testing', value: 'TESTING' },
    { label: 'Marketing', value: 'MARKETING' },
    { label: 'Research', value: 'RESEARCH' },
    { label: 'Operations', value: 'OPERATIONS' }
  ];

  return (
    <div className="px-6 py-2.5 border-b border-[#27272a] bg-[#0c0c0e]/70 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
        {/* Search Input with inline clear */}
        <div className={`relative flex-1 max-w-sm transition-opacity duration-150 ${isStale ? 'opacity-70' : 'opacity-100'}`}>
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id={searchInputId}
            type="text"
            aria-label="Filter tasks by title, description or key"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks (e.g. DP-101, OCC)..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#18181c] border border-[#27272a] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search input"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white p-0.5 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter Toggle Group */}
        <div className="flex items-center gap-1 bg-[#18181c] p-1 rounded-lg border border-[#27272a]" role="group" aria-label="Filter by priority">
          <Filter className="w-3.5 h-3.5 text-[#94a3b8] ml-1.5 mr-1" />
          {priorities.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={selectedPriority === p.value}
              onClick={() => onPriorityChange(p.value)}
              className={`px-2.5 py-1 min-h-[28px] rounded text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                selectedPriority === p.value
                  ? 'bg-[#27272a] text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <span className={p.color}>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Category Filter Dropdown */}
        {onCategoryChange && (
          <div className="flex items-center gap-1 bg-[#18181c] px-2 py-1 rounded-lg border border-[#27272a]">
            <Tag className="w-3.5 h-3.5 text-blue-400" />
            <select
              id={categorySelectId}
              aria-label="Filter tasks by category"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value as TaskCategory | 'ALL')}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#18181c] text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear / Reset Filter Button (Active Indicator) */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            aria-label="Reset all filters"
            className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[28px] rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Task Count & Filter Status */}
      <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
        <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
        {isFiltered && totalCount !== undefined ? (
          <span>
            Showing <strong className="text-white">{taskCount}</strong> of <span className="text-[#a1a1aa]">{totalCount}</span> tasks (Filtered)
          </span>
        ) : (
          <span>
            Showing <strong className="text-white">{taskCount}</strong> active tasks
          </span>
        )}
      </div>
    </div>
  );
};

