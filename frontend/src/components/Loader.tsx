import React from 'react';
import './Loader.css';

interface LoaderProps {
  variant?: 'spinner' | 'overlay' | 'bar' | 'skeleton-table' | 'skeleton-board';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  variant = 'spinner',
  size = 'md',
  label,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-9 h-9 border-[3px]'
  };

  if (variant === 'bar') {
    return (
      <div className={`w-full h-0.5 bg-[#27272a] overflow-hidden relative ${className}`}>
        <div className="absolute top-0 bottom-0 left-0 bg-blue-500 animate-[loader-progress_1.5s_ease-in-out_infinite]" />
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#09090b]/60 backdrop-blur-[2px] transition-all duration-200 ${className}`}>
        <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-[#141417]/90 border border-[#27272a] shadow-xl">
          <div className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`} />
          {label && (
            <span className="text-xs font-medium text-[#d4d4d8] animate-pulse">
              {label}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'skeleton-table') {
    return (
      <div className={`w-full divide-y divide-[#27272a]/50 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-3.5 px-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="w-16 h-4 bg-[#27272a] rounded" />
            <div className="w-64 h-4 bg-[#27272a] rounded flex-1" />
            <div className="w-20 h-4 bg-[#27272a] rounded" />
            <div className="w-24 h-4 bg-[#27272a] rounded" />
            <div className="w-16 h-4 bg-[#27272a] rounded" />
            <div className="w-12 h-4 bg-[#27272a] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'skeleton-board') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 p-6 ${className}`}>
        {Array.from({ length: 3 }).map((_, colIdx) => (
          <div key={colIdx} className="space-y-3">
            <div className="h-6 w-32 bg-[#27272a] rounded animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, cardIdx) => (
                <div key={cardIdx} className="p-4 rounded-xl bg-[#18181c] border border-[#27272a] space-y-2.5 animate-pulse">
                  <div className="flex justify-between">
                    <div className="w-16 h-3.5 bg-[#27272a] rounded" />
                    <div className="w-12 h-3.5 bg-[#27272a] rounded" />
                  </div>
                  <div className="w-4/5 h-4 bg-[#27272a] rounded" />
                  <div className="w-full h-3 bg-[#27272a]/60 rounded" />
                  <div className="pt-2 flex justify-between">
                    <div className="w-16 h-3 bg-[#27272a] rounded" />
                    <div className="w-5 h-5 bg-[#27272a] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default 'spinner'
  return (
    <div className={`inline-flex items-center gap-2 text-zinc-400 ${className}`}>
      <div className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`} />
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
};
