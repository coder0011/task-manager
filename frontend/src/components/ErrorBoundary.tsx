import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RotateCcw, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { env } from '../config/env';
import { storage } from '../lib/storage';

/**
 * Full-screen application crash fallback
 */
export const AppErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const err = (error instanceof Error ? error : new Error(String(error || 'Unknown Error'))) as Error;

  const handleReset = () => {
    resetErrorBoundary();
  };

  const handleHardReload = () => {
    window.location.reload();
  };

  const handleClearSession = () => {
    storage.clear();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="w-full max-w-xl bg-[#121215] border border-red-500/30 rounded-2xl shadow-2xl p-8 sm:p-10 relative overflow-hidden backdrop-blur-xl">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Warning Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10 mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-red-400 font-mono text-xs font-semibold uppercase tracking-wider mb-3">
          Runtime Exception Caught
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
          Something went wrong
        </h1>

        <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed max-w-md mx-auto mb-6">
          An unexpected error interrupted the application interface. Your saved data on the server remains safe.
        </p>

        {/* Developer Diagnostics (Shown in dev mode or debug mode) */}
        {env.enableDebug && (
          <div className="mb-6 text-left p-3.5 rounded-xl bg-[#18181c] border border-red-500/20 max-h-48 overflow-y-auto font-mono text-[11px] text-red-300">
            <div className="font-bold mb-1 text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{err.name || 'Error'}: {err.message}</span>
            </div>
            {err.stack && (
              <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap font-mono mt-1 opacity-80">
                {err.stack}
              </pre>
            )}
          </div>
        )}

        {/* Recovery Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <button
            onClick={handleHardReload}
            className="px-4 py-2.5 rounded-xl bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white text-xs font-medium transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Application</span>
          </button>

          <button
            onClick={handleClearSession}
            className="px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-800/40 text-red-300 text-xs font-medium transition flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Reset Cache & Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Scoped Module / Widget error fallback
 */
export const ModuleErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const err = (error instanceof Error ? error : new Error(String(error || 'Unknown Error'))) as Error;

  return (
    <div className="p-6 rounded-2xl bg-[#141417] border border-red-500/20 text-center my-4">
      <div className="w-10 h-10 mx-auto rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-3 border border-red-500/20">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">Module Failed to Render</h3>
      <p className="text-xs text-[#94a3b8] mb-4 max-w-sm mx-auto">
        {err.message || 'An error occurred while loading this view component.'}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Retry Module</span>
      </button>
    </div>
  );
};

/**
 * Reusable AppErrorBoundary wrapper component
 * Strictly enabled only in production mode. In development, errors are passed through to the browser and Vite overlay.
 */
export const AppErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Error boundary is only active in production mode
  if (!env.isProduction) {
    return <>{children}</>;
  }

  return (
    <ReactErrorBoundary
      FallbackComponent={AppErrorFallback}
      onError={(error, info) => {
        if (env.enableDebug) {
          console.groupCollapsed('%c[AppErrorBoundary] Unhandled Component Error', 'color: #ef4444; font-weight: bold');
          console.error(error);
          console.error(info.componentStack);
          console.groupEnd();
        }
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

/**
 * Reusable ModuleErrorBoundary wrapper component for tabs and sections
 * Strictly enabled only in production mode.
 */
export const ModuleErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Error boundary is only active in production mode
  if (!env.isProduction) {
    return <>{children}</>;
  }

  return (
    <ReactErrorBoundary
      FallbackComponent={ModuleErrorFallback}
      onError={(error) => {
        if (env.enableDebug) {
          console.warn('[ModuleErrorBoundary] Caught scoped error:', error);
        }
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};
