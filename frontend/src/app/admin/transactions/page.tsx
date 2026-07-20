'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';

type Tab = 'payments' | 'failed' | 'withdrawals';

interface Payment {
  id: number;
  userId: number;
  amount: string;
  status: string;
  cardBrand?: string;
  last4?: string;
  reconcilationStatus?: string;
  webhookReceived?: boolean;
  errorMessage?: string;
  retryCount?: number;
  createdAt: string;
}

interface Withdrawal {
  id: number;
  fromEmail: string;
  amount: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function AdminTransactionsPage() {
  const [tab, setTab] = useState<Tab>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [failedPayments, setFailedPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (tab === 'payments') {
          const res = await api.get('/admin/payments?limit=30');
          setPayments(res.data.payments || []);
        } else if (tab === 'failed') {
          const res = await api.get('/admin/payments/failed?limit=30');
          setFailedPayments(res.data.failedPayments || []);
        } else if (tab === 'withdrawals') {
          const res = await api.get('/admin/withdrawals?limit=30');
          setWithdrawals(res.data.withdrawals || []);
        }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab]);

  const handleApproveWithdrawal = async (transactionId: number) => {
    setActionLoading(transactionId);
    try {
      await api.post('/admin/withdrawals/approve', { transactionId });
      setWithdrawals(withdrawals.filter(w => w.id !== transactionId));
    } catch (err) {
      console.error('Failed to approve', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectWithdrawal = async (transactionId: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setActionLoading(transactionId);
    try {
      await api.post('/admin/withdrawals/reject', { transactionId, reason });
      setWithdrawals(withdrawals.filter(w => w.id !== transactionId));
    } catch (err) {
      console.error('Failed to reject', err);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'payments', label: 'All Payments' },
    { key: 'failed', label: 'Failed' },
    { key: 'withdrawals', label: 'Pending Withdrawals' },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case 'succeeded': case 'completed': return 'bg-emerald-500/10 text-emerald-500';
      case 'failed': return 'bg-destructive/10 text-destructive';
      case 'pending': case 'processing': return 'bg-yellow-500/10 text-yellow-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Transaction Monitor</h2>
        <p className="text-muted-foreground mt-1">Monitor payments, failures, and pending withdrawals.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 animate-fade-in-up" style={{ animationDelay: '50ms', opacity: 0, animationFillMode: 'forwards' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 h-10 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-border/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms', opacity: 0, animationFillMode: 'forwards' }}>
        {loading ? (
          <div className="py-16 text-center text-muted-foreground animate-pulse">Loading...</div>
        ) : tab === 'payments' ? (
          /* All Payments */
          payments.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No payments found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">Card</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">Reconciliation</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-5 font-mono text-xs text-muted-foreground">#{p.id}</td>
                      <td className="py-3 px-5 text-foreground">User #{p.userId}</td>
                      <td className="py-3 px-5 font-medium text-foreground">₹{Number(p.amount).toFixed(2)}</td>
                      <td className="py-3 px-5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                      </td>
                      <td className="py-3 px-5 text-muted-foreground text-xs">
                        {p.cardBrand ? `${p.cardBrand} ****${p.last4}` : '—'}
                      </td>
                      <td className="py-3 px-5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(p.reconcilationStatus || '')}`}>
                          {p.reconcilationStatus || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-xs text-muted-foreground">{format(new Date(p.createdAt), 'MMM d, h:mm a')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === 'failed' ? (
          /* Failed Payments */
          failedPayments.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-3xl mb-3">🎉</p>
              <p className="font-medium">No failed payments!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">Error</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">Retries</th>
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {failedPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-5 font-mono text-xs text-muted-foreground">#{p.id}</td>
                      <td className="py-3 px-5 text-foreground">User #{p.userId}</td>
                      <td className="py-3 px-5 font-medium text-destructive">₹{Number(p.amount).toFixed(2)}</td>
                      <td className="py-3 px-5 text-xs text-muted-foreground max-w-[200px] truncate">{p.errorMessage || '—'}</td>
                      <td className="py-3 px-5 text-muted-foreground">{p.retryCount}</td>
                      <td className="py-3 px-5 text-xs text-muted-foreground">{format(new Date(p.createdAt), 'MMM d, h:mm a')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Pending Withdrawals */
          withdrawals.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-3xl mb-3">✅</p>
              <p className="font-medium">No pending withdrawals</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600 shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{w.fromEmail}</p>
                    <p className="text-xs text-muted-foreground">{w.description} · {format(new Date(w.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                  <span className="font-semibold text-foreground mr-4">₹{Number(w.amount).toFixed(2)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveWithdrawal(w.id)}
                      disabled={actionLoading === w.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === w.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleRejectWithdrawal(w.id)}
                      disabled={actionLoading === w.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === w.id ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
