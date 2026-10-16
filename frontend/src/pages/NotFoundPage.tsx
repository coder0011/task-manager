import React from 'react';
import { Compass, Home, LogIn, ArrowLeft, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ActiveTab } from '../types';

interface NotFoundPageProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const { isAuthenticated } = useAuth();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-lg bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl p-8 sm:p-10 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & 404 Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10 mb-6">
          <Compass className="w-8 h-8 animate-pulse" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-[#18181c] border border-[#27272a] text-blue-400 font-mono text-xs font-semibold uppercase tracking-wider mb-3">
          Error 404
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
          Page Not Found
        </h1>

        <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed max-w-md mx-auto mb-6">
          The requested path <code className="px-1.5 py-0.5 rounded bg-[#18181c] text-sky-300 font-mono text-xs border border-[#27272a]">{currentPath || '/unknown'}</code> could not be located on this server. It may have been moved, renamed, or deleted.
        </p>

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {isAuthenticated ? (
            <button
              onClick={() => onNavigate('BOARD')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Return to Sprint Board</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('LOGIN')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Go to Sign In</span>
            </button>
          )}

          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                window.history.back();
              } else {
                onNavigate(isAuthenticated ? 'BOARD' : 'LOGIN');
              }
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-[#27272a]/60 text-[11px] text-[#71717a] flex items-center justify-center gap-2">
          <Layers className="w-3.5 h-3.5 text-blue-500/60" />
          <span>DataPure Task Manager Enterprise • Route Not Found</span>
        </div>
      </div>
    </div>
  );
};
