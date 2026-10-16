import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  X, 
  Terminal, 
  Server, 
  Shield, 
  Activity, 
  Copy, 
  Check, 
  Trash2
} from 'lucide-react';
import { env } from '../config/env';
import { apiClient } from '../services/apiClient';
import { API_ENDPOINTS } from '../constants/endpoints';
import { storage } from '../lib/storage';

interface SystemHealth {
  status?: string;
  appEnv?: string;
  appEnvMode?: string;
  debugMode?: boolean;
  timestamp?: string;
}

interface DebugInfo {
  appEnv?: string;
  appEnvMode?: string;
  debugMode?: boolean;
  nodeVersion?: string;
  platform?: string;
  uptimeSeconds?: number;
  memoryUsage?: {
    rssMb?: number;
    heapUsedMb?: number;
    heapTotalMb?: number;
  };
  database?: {
    host?: string;
    database?: string;
    port?: number;
    connectionLimit?: number;
  };
}

export const DevTools: React.FC = () => {
  // If debug mode is disabled (e.g. production), don't render anything
  if (!env.enableDebug) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'env' | 'auth' | 'system'>('env');
  const [copied, setCopied] = useState(false);
  
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [debugData, setDebugData] = useState<DebugInfo | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentUser = storage.getUser<any>();
  const token = storage.getToken();

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchHealth = async () => {
    setLoadingAction('health');
    setActionError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.HEALTH);
      setHealthData(res.data);
    } catch (err: any) {
      setActionError(err.displayMessage || 'Failed to ping /health endpoint');
    } finally {
      setLoadingAction(null);
    }
  };

  const fetchDebug = async () => {
    setLoadingAction('debug');
    setActionError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.DEBUG);
      setDebugData(res.data?.data || res.data);
    } catch (err: any) {
      setActionError(err.displayMessage || 'Failed to fetch /debug data');
    } finally {
      setLoadingAction(null);
    }
  };

  const clearAuthAndReload = () => {
    storage.clearAuthSession();
    window.location.reload();
  };

  // Auto-fetch health once when panel opens
  useEffect(() => {
    if (isOpen && !healthData) {
      fetchHealth();
    }
  }, [isOpen]);

  return (
    <div className="fixed bottom-4 left-4 z-50 font-sans text-xs">
      {/* Minimized Pill Badge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-sky-500/30 shadow-lg backdrop-blur transition-all duration-150 hover:scale-105 group"
          title="Open Developer Tools"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <Bug className="w-3.5 h-3.5 text-sky-400 group-hover:rotate-12 transition-transform" />
          <span className="font-semibold text-slate-200">DEV MODE</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-950/80 text-sky-300 font-mono border border-sky-800/40">
            {env.appEnv}
          </span>
        </button>
      )}

      {/* Expanded DevTools Drawer */}
      {isOpen && (
        <div className="w-96 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/70 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Bug className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-bold text-slate-100 tracking-wide">Developer Tools</span>
                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-400 font-mono border border-emerald-800/40">
                  ACTIVE
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 px-2 pt-1 gap-1">
            <button
              onClick={() => setActiveTab('env')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-t border-b-2 transition-colors ${
                activeTab === 'env'
                  ? 'border-sky-500 text-sky-300 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3 h-3" /> Environment
            </button>
            <button
              onClick={() => setActiveTab('auth')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-t border-b-2 transition-colors ${
                activeTab === 'auth'
                  ? 'border-sky-500 text-sky-300 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3 h-3" /> Auth State
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-t border-b-2 transition-colors ${
                activeTab === 'system'
                  ? 'border-sky-500 text-sky-300 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3 h-3" /> Backend / Metrics
            </button>
          </div>

          {/* Tab Body */}
          <div className="p-3.5 space-y-3 max-h-80 overflow-y-auto">
            {/* ENVIRONMENT TAB */}
            {activeTab === 'env' && (
              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">APP_ENV:</span>
                  <span className="font-mono text-sky-300 font-semibold">{env.appEnv}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">APP_ENV_MODE:</span>
                  <span className="font-mono text-purple-300">{env.appEnvMode}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">DEBUG_TOOLS:</span>
                  <span className="font-mono text-emerald-400 font-semibold">ENABLED (Default)</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">API_BASE_URL:</span>
                  <span className="font-mono text-slate-200 truncate max-w-[180px]" title={env.apiUrl}>
                    {env.apiUrl}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">VITE_DEV_SERVER:</span>
                  <span className="font-mono text-amber-300">{env.isDevelopment ? 'True' : 'False'}</span>
                </div>
                <div className="p-2 mt-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
                  💡 Console logger is intercepting all Axios HTTP traffic with timing & payload data.
                </div>
              </div>
            )}

            {/* AUTH TAB */}
            {activeTab === 'auth' && (
              <div className="space-y-2.5 text-slate-300">
                {currentUser ? (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">User:</span>
                      <span className="font-medium text-slate-200">{currentUser.name || currentUser.username}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-mono text-slate-300">{currentUser.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Role:</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-mono text-[10px] border border-blue-800">
                        {currentUser.role}
                      </span>
                    </div>
                    <div className="pt-1">
                      <span className="text-slate-400 block mb-1">JWT Bearer Token:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="password"
                          readOnly
                          value={token || ''}
                          className="flex-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400 select-all"
                        />
                        <button
                          onClick={copyToken}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={clearAuthAndReload}
                        className="w-full py-1.5 px-3 rounded bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/50 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Clear Local Session & Reload
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    <Shield className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    <p>No active authenticated session detected.</p>
                  </div>
                )}
              </div>
            )}

            {/* SYSTEM & METRICS TAB */}
            {activeTab === 'system' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={fetchHealth}
                    disabled={loadingAction === 'health'}
                    className="flex-1 py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50"
                  >
                    <Activity className={`w-3 h-3 text-emerald-400 ${loadingAction === 'health' ? 'animate-spin' : ''}`} />
                    Ping Health
                  </button>
                  <button
                    onClick={fetchDebug}
                    disabled={loadingAction === 'debug'}
                    className="flex-1 py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50"
                  >
                    <Server className={`w-3 h-3 text-sky-400 ${loadingAction === 'debug' ? 'animate-spin' : ''}`} />
                    Inspect /debug
                  </button>
                </div>

                {actionError && (
                  <div className="p-2 rounded bg-red-950/50 border border-red-800 text-red-300 text-[11px]">
                    {actionError}
                  </div>
                )}

                {healthData && (
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Backend Status: {healthData.status}
                    </div>
                    <div className="text-slate-400">Environment: {healthData.appEnv} ({healthData.appEnvMode})</div>
                    <div className="text-slate-400">Debug Allowed: {String(healthData.debugMode)}</div>
                  </div>
                )}

                {debugData && (
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[10px]">
                    <div className="text-sky-400 font-bold">Node.js Runtime & Memory:</div>
                    <div className="text-slate-300">Node: {debugData.nodeVersion} ({debugData.platform})</div>
                    <div className="text-slate-300">Uptime: {debugData.uptimeSeconds}s</div>
                    {debugData.memoryUsage && (
                      <div className="text-slate-400">
                        Heap: {debugData.memoryUsage.heapUsedMb}MB / {debugData.memoryUsage.heapTotalMb}MB (RSS: {debugData.memoryUsage.rssMb}MB)
                      </div>
                    )}
                    {debugData.database && (
                      <div className="pt-1 border-t border-slate-800 text-slate-400">
                        DB: {debugData.database.database}@{debugData.database.host}:{debugData.database.port} (Pool: {debugData.database.connectionLimit})
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3.5 py-1.5 bg-slate-950/80 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between items-center">
            <span>DataPure v1.0 Dev Suite</span>
            <span className="font-mono">Port: 5173 ➔ 5000</span>
          </div>
        </div>
      )}
    </div>
  );
};
