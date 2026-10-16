import React, { useState } from 'react';
import { api } from '../services/api';
import type { ActivityLog, PaginationMetadata } from '../types';
import { 
  History, 
  RefreshCw, 
  ArrowRight, 
  Plus, 
  Edit3, 
  Trash2, 
  Shield, 
  Clock, 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Code2,
  Copy,
  Check,
  Terminal,
  Globe,
  Laptop,
  Database,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from './UserAvatar';
import { Loader } from './Loader';
import { formatDateTime } from '../lib/formatters';
import { PAGINATION } from '../constants/appConstants';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../lib/queryClient';
import { useThrottledCallback } from '../utils/asyncUtils';
import './ActivityLogView.css';

export const ActivityLogView: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(PAGINATION.DEFAULT_LIMIT);
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const queryParams = {
    page,
    limit,
    entityType: entityFilter === 'ALL' ? undefined : entityFilter
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.activityLogs(queryParams),
    queryFn: ({ signal }) => api.getActivityLogs(queryParams, signal),
  });

  const logs: ActivityLog[] = data?.logs || [];
  const pagination: PaginationMetadata | null = data?.pagination || null;

  const handleRefresh = useThrottledCallback(() => {
    refetch();
  }, 1000);

  const toggleLogExpand = (logId: number) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const isAllExpanded = logs.length > 0 && logs.every(l => expandedLogIds.has(l.id));

  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedLogIds(new Set());
    } else {
      setExpandedLogIds(new Set(logs.map(l => l.id)));
    }
  };

  const getParsedDetails = (details: any): Record<string, any> | null => {
    if (!details) return null;
    if (typeof details === 'object') return details;
    if (typeof details === 'string') {
      try {
        return JSON.parse(details);
      } catch {
        return { message: details };
      }
    }
    return { value: details };
  };

  const highlightJson = (jsonStr: string): string => {
    return jsonStr
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = 'text-amber-400';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'text-sky-400 font-semibold';
            } else {
              cls = 'text-emerald-400';
            }
          } else if (/true|false/.test(match)) {
            cls = 'text-purple-400 font-medium';
          } else if (/null/.test(match)) {
            cls = 'text-rose-400 italic';
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );
  };

  const handleCopyJson = async (e: React.MouseEvent, logId: number, jsonText: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopiedId(logId);
      toast.success('Audit metadata payload copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Failed to copy metadata');
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CREATED') || action.includes('INVITED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Plus className="w-3 h-3" />
          <span>{action}</span>
        </span>
      );
    }
    if (action.includes('MOVED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <ArrowRight className="w-3 h-3" />
          <span>{action}</span>
        </span>
      );
    }
    if (action.includes('UPDATED') || action.includes('CHANGED') || action.includes('TOGGLED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Edit3 className="w-3 h-3" />
          <span>{action}</span>
        </span>
      );
    }
    if (action.includes('DELETED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Trash2 className="w-3 h-3" />
          <span>{action}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
        <Shield className="w-3 h-3" />
        <span>{action}</span>
      </span>
    );
  };

  return (
    <div className="flex-1 bg-[#09090b] text-[#f4f4f5] p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <History className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Enterprise Activity & Audit Trail</h1>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1 ml-10">
            Immutable system logs tracking mutations across tasks, access controls, and user directories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Entity Filter Pills */}
          <div className="flex items-center bg-[#121215] border border-[#27272a] rounded-lg p-1 text-xs">
            {['ALL', 'TASK', 'USER', 'ROLE', 'BOARD'].map(type => (
              <button
                key={type}
                onClick={() => {
                  setEntityFilter(type);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-md transition font-medium ${
                  entityFilter === type
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-2 min-h-[36px] min-w-[36px] rounded-lg bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white transition flex items-center justify-center disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#121215] border border-[#27272a] rounded-xl overflow-hidden shadow-xl relative">
        {isFetching && logs.length > 0 && (
          <Loader variant="overlay" size="md" label="Refreshing audit records..." />
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Activity and Audit Trail Table">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#18181c]/50 text-[#71717a] uppercase font-semibold tracking-wider text-[10px] select-none">
                {/* Expand / Collapse Toggle Header */}
                <th className="py-3 pl-4 pr-1 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleExpandAll}
                    className="p-1 rounded text-[#71717a] hover:text-white hover:bg-[#27272a] transition focus-visible:outline-none"
                    title={isAllExpanded ? "Collapse All Rows" : "Expand All Rows"}
                    aria-label={isAllExpanded ? "Collapse All Rows" : "Expand All Rows"}
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isAllExpanded ? 'rotate-0 text-blue-400' : '-rotate-90'}`} />
                  </button>
                </th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Network IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/60 font-mono text-[11px]">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#71717a]">
                    <Loader variant="spinner" size="md" label="Loading audit records..." />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#71717a] font-sans">
                    No activity logs recorded matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const isExpanded = expandedLogIds.has(log.id);
                  const parsedDetails = getParsedDetails(log.details);
                  const prettyJson = parsedDetails ? JSON.stringify(parsedDetails, null, 2) : '';

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => toggleLogExpand(log.id)}
                        className={`transition cursor-pointer select-none ${
                          isExpanded ? 'bg-[#18181c]/90 border-l-2 border-l-blue-500' : 'hover:bg-[#18181c]/40'
                        }`}
                      >
                        {/* Expand Chevron Toggle */}
                        <td className="py-3 pl-4 pr-1 text-center font-sans">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLogExpand(log.id);
                            }}
                            className={`p-1 rounded transition focus-visible:outline-none cursor-pointer ${
                              isExpanded 
                                ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' 
                                : 'text-[#71717a] hover:text-white hover:bg-[#27272a]'
                            }`}
                            title={isExpanded ? "Collapse audit details" : "Expand audit details"}
                            aria-label={isExpanded ? `Collapse log #${log.id} details` : `Expand log #${log.id} details`}
                            aria-expanded={isExpanded}
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-blue-400' : ''}`} />
                          </button>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap text-[#a1a1aa] flex items-center gap-1.5 font-sans">
                          <Clock className="w-3 h-3 text-[#71717a]" />
                          <span>{formatDateTime(log.createdAt)}</span>
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              name={log.userName}
                              avatarUrl={log.userAvatar}
                              size="sm"
                              color="blue"
                            />
                            <div>
                              <div className="text-white font-medium text-xs leading-none">{log.userName || 'System'}</div>
                              {log.userEmail && <div className="text-[10px] text-[#71717a] leading-none mt-0.5">{log.userEmail}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>

                        {/* Entity */}
                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          <span className="px-2 py-0.5 rounded bg-[#18181c] border border-[#27272a] text-[#a1a1aa] text-[10px] font-mono">
                            {log.entityType} {log.entityId ? `#${log.entityId}` : ''}
                          </span>
                        </td>

                        {/* Network IP */}
                        <td className="py-3 px-4 whitespace-nowrap text-[#71717a] font-mono text-[10px]">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                      </tr>

                      {/* Expandable Details & Pretty-Printed Metadata Row */}
                      {isExpanded && (
                        <tr className="bg-[#0b0b0e] border-b border-[#27272a]">
                          <td colSpan={6} className="p-0">
                            <div className="p-5 bg-gradient-to-b from-[#111115] to-[#0a0a0d] border-y border-[#27272a]/70 font-sans space-y-4">
                              {/* Expanded Header Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#27272a]/70">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Code2 className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="text-xs font-semibold text-white">Audit Event Details & Metadata Payload</span>
                                  <span className="px-2 py-0.5 rounded-full bg-[#18181c] border border-[#27272a] text-[#a1a1aa] font-mono text-[10px]">
                                    Event #{log.id}
                                  </span>
                                  {getActionBadge(log.action)}
                                </div>

                                {parsedDetails && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyJson(e, log.id, prettyJson)}
                                    className="px-2.5 py-1 rounded-lg bg-[#18181c] hover:bg-[#27272a] border border-[#27272a] text-xs font-medium text-[#d4d4d8] hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                                    title="Copy pretty-printed JSON metadata"
                                  >
                                    {copiedId === log.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5 text-blue-400" />
                                        <span>Copy JSON</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Two-Column Grid: Context Summary & Pretty-Printed JSON */}
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Left Column: Execution Context (4 cols) */}
                                <div className="lg:col-span-4 space-y-3">
                                  <div className="bg-[#121215] border border-[#27272a] rounded-xl p-3.5 space-y-3">
                                    <div className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                                      <Info className="w-3.5 h-3.5 text-blue-400" />
                                      <span>Execution Context</span>
                                    </div>

                                    <div className="space-y-2.5 text-xs">
                                      <div>
                                        <div className="text-[10px] text-[#71717a] uppercase font-medium">Actor / User</div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <UserAvatar name={log.userName} avatarUrl={log.userAvatar} size="xs" color="blue" />
                                          <div>
                                            <span className="text-white font-medium">{log.userName || 'System / Anonymous'}</span>
                                            {log.userEmail && <span className="text-[#71717a] text-[11px] block">{log.userEmail}</span>}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-[#27272a]/50">
                                        <div className="text-[10px] text-[#71717a] uppercase font-medium">Target Entity</div>
                                        <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-blue-400">
                                          <Database className="w-3.5 h-3.5 text-[#71717a]" />
                                          <span>{log.entityType} {log.entityId ? `(ID: ${log.entityId})` : ''}</span>
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-[#27272a]/50">
                                        <div className="text-[10px] text-[#71717a] uppercase font-medium">Origin IP Address</div>
                                        <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-[#d4d4d8]">
                                          <Globe className="w-3.5 h-3.5 text-[#71717a]" />
                                          <span>{log.ipAddress || '127.0.0.1'}</span>
                                        </div>
                                      </div>

                                      {log.userAgent && (
                                        <div className="pt-2 border-t border-[#27272a]/50">
                                          <div className="text-[10px] text-[#71717a] uppercase font-medium">Client User Agent</div>
                                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#a1a1aa] truncate" title={log.userAgent}>
                                            <Laptop className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                                            <span className="truncate">{log.userAgent}</span>
                                          </div>
                                        </div>
                                      )}

                                      <div className="pt-2 border-t border-[#27272a]/50">
                                        <div className="text-[10px] text-[#71717a] uppercase font-medium">Recorded At</div>
                                        <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-[#d4d4d8]">
                                          <Clock className="w-3.5 h-3.5 text-[#71717a]" />
                                          <span>{formatDateTime(log.createdAt)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Column: Pretty-Printed JSON (8 cols) */}
                                <div className="lg:col-span-8">
                                  <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden shadow-inner flex flex-col h-full">
                                    <div className="px-3.5 py-2 bg-[#121215] border-b border-[#27272a] flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-[11px] font-mono text-[#a1a1aa]">payload_metadata.json</span>
                                      </div>
                                      {parsedDetails && (
                                        <span className="text-[10px] font-mono text-zinc-500">
                                          {Object.keys(parsedDetails).length} {Object.keys(parsedDetails).length === 1 ? 'key' : 'keys'}
                                        </span>
                                      )}
                                    </div>

                                    {parsedDetails ? (
                                      <div className="p-3.5 overflow-x-auto max-h-72 overflow-y-auto scrollbar-thin">
                                        <pre 
                                          className="font-mono text-[11px] leading-relaxed select-text"
                                          dangerouslySetInnerHTML={{ __html: highlightJson(prettyJson) }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="p-8 text-center text-[#71717a] text-xs font-sans flex flex-col items-center justify-center gap-1 my-auto">
                                        <Code2 className="w-6 h-6 text-[#3f3f46] mb-1" />
                                        <span>No detailed metadata payload was recorded for this event.</span>
                                        <span className="text-[10px] text-[#52525b]">Basic mutation activity was registered without secondary payload parameters.</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pagination && (
          <div className="p-4 border-t border-[#27272a] bg-[#141417] flex flex-wrap items-center justify-between gap-4 text-xs select-none">
            <div className="flex items-center gap-4">
              <span className="text-[#a1a1aa]">
                Showing page <strong className="text-white">{pagination.page}</strong> of{' '}
                <strong className="text-white">{pagination.totalPages}</strong> ({pagination.total} total audit events)
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[#71717a]">Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-[#18181c] border border-[#27272a] text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
                  aria-label="Items per page"
                >
                  {PAGINATION.PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!pagination.hasPrevPage || isLoading}
                onClick={() => setPage(1)}
                className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="First Page"
                aria-label="Go to first page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!pagination.hasPrevPage || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Previous Page"
                aria-label="Go to previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-mono text-zinc-300 bg-[#18181c] border border-[#27272a] rounded-lg">
                {pagination.page}
              </span>
              <button
                type="button"
                disabled={!pagination.hasNextPage || isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Next Page"
                aria-label="Go to next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!pagination.hasNextPage || isLoading}
                onClick={() => setPage(pagination.totalPages)}
                className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Last Page"
                aria-label="Go to last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
