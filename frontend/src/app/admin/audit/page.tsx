'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';

interface AuditLog {
  id: number;
  actorId: number;
  action: string;
  targetType: string;
  targetId: number;
  beforeState: any;
  afterState: any;
  ipAddress: string;
  createdAt: string;
  actor?: { email: string; firstName: string };
}

const actionColors: Record<string, string> = {
  BLOCK_USER: 'bg-destructive/10 text-destructive',
  UNBLOCK_USER: 'bg-emerald-500/10 text-emerald-500',
  FREEZE_WALLET: 'bg-yellow-500/10 text-yellow-600',
  UNFREEZE_WALLET: 'bg-blue-500/10 text-blue-500',
  TRIGGER_REFUND: 'bg-purple-500/10 text-purple-500',
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = async (p = 0) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/audit?limit=20&offset=${p * 20}`);
      const data = res.data.data || [];
      setLogs(p === 0 ? data : [...logs, ...data]);
      setHasMore((p * 20 + 20) < (res.data.meta?.total || 0));
      setPage(p);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Audit Logs</h2>
        <p className="text-muted-foreground mt-1">Complete trail of all administrative actions on the platform.</p>
      </div>

      {/* Logs */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms', opacity: 0, animationFillMode: 'forwards' }}>
        {loading && logs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground animate-pulse">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-medium">No audit logs recorded yet</p>
            <p className="text-sm mt-1">Admin actions like blocking users and freezing wallets will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        actionColors[log.action] || 'bg-muted text-muted-foreground'
                      }`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">on</span>
                      <span className="text-xs font-medium text-foreground">{log.targetType} #{log.targetId}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      By <span className="text-foreground font-medium">{log.actor?.email || `Admin #${log.actorId}`}</span>
                      {log.ipAddress && <span> · IP: {log.ipAddress}</span>}
                    </p>

                    {/* State changes */}
                    {(log.beforeState || log.afterState) && (
                      <div className="mt-2 flex gap-4 text-xs">
                        {log.beforeState && (
                          <div className="px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/10">
                            <span className="text-destructive font-medium">Before: </span>
                            <span className="text-muted-foreground">{JSON.stringify(log.beforeState)}</span>
                          </div>
                        )}
                        {log.afterState && (
                          <div className="px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                            <span className="text-emerald-500 font-medium">After: </span>
                            <span className="text-muted-foreground">{JSON.stringify(log.afterState)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="px-5 py-4 border-t border-border/40 flex justify-center">
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
