'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Stats {
  users: { total: number; admins: number; regularUsers: number };
  wallets: { totalWallets: number; totalBalance: string; averageBalance: string };
  transactions: { total: number; totalAmount: string };
  payments: { successful: number; totalAmount: string; failed: number; pendingReconciliation: number };
}

interface Health {
  status: string;
  database: { status: string; users: number };
  lastPayments: { failedInLast24h: number };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, healthRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/health'),
        ]);
        setStats(statsRes.data.stats);
        setHealth(healthRes.data);
      } catch (err) {
        console.error('Failed to load admin stats', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const metricCards = stats
    ? [
        { label: 'Total Users', value: stats.users.total, sub: `${stats.users.admins} admins`, icon: '👥', color: 'from-blue-500 to-blue-600' },
        { label: 'Total Balance Pool', value: `₹${Number(stats.wallets.totalBalance).toFixed(0)}`, sub: `${stats.wallets.totalWallets} wallets`, icon: '🏦', color: 'from-emerald-500 to-emerald-600' },
        { label: 'Transactions', value: stats.transactions.total, sub: `₹${Number(stats.transactions.totalAmount).toFixed(0)} volume`, icon: '📊', color: 'from-purple-500 to-purple-600' },
        { label: 'Stripe Payments', value: stats.payments.successful, sub: `₹${Number(stats.payments.totalAmount).toFixed(0)} collected`, icon: '💳', color: 'from-orange-500 to-orange-600' },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h2>
        <p className="text-muted-foreground mt-1">Platform overview and system health.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m, i) => (
          <div
            key={m.label}
            className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms`, opacity: 0, animationFillMode: 'forwards' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
              <span className="text-lg">{m.icon}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Second row: Health + Payment alerts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* System health */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 animate-fade-in-up" style={{ animationDelay: '200ms', opacity: 0, animationFillMode: 'forwards' }}>
          <h3 className="text-base font-semibold text-foreground mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Database</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                health?.database.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
              }`}>
                {health?.database.status === 'connected' ? '● Connected' : '● Disconnected'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Status</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                health?.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-600'
              }`}>
                {health?.status === 'healthy' ? '● Healthy' : '● Degraded'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Registered Users</span>
              <span className="text-sm font-medium text-foreground">{health?.database.users}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Failed Payments (24h)</span>
              <span className={`text-sm font-medium ${
                (health?.lastPayments.failedInLast24h || 0) > 0 ? 'text-destructive' : 'text-emerald-500'
              }`}>
                {health?.lastPayments.failedInLast24h || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Payment alerts */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 animate-fade-in-up" style={{ animationDelay: '250ms', opacity: 0, animationFillMode: 'forwards' }}>
          <h3 className="text-base font-semibold text-foreground mb-4">Payment Alerts</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Failed Payments</p>
                  <p className="text-xs text-muted-foreground">Requires investigation</p>
                </div>
              </div>
              <span className="text-xl font-bold text-destructive">{stats?.payments.failed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Pending Reconciliation</p>
                  <p className="text-xs text-muted-foreground">Awaiting webhook</p>
                </div>
              </div>
              <span className="text-xl font-bold text-yellow-600">{stats?.payments.pendingReconciliation || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Successful Payments</p>
                  <p className="text-xs text-muted-foreground">All clear</p>
                </div>
              </div>
              <span className="text-xl font-bold text-emerald-500">{stats?.payments.successful || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Balance', value: `₹${Number(stats?.wallets.averageBalance || 0).toFixed(0)}`, color: 'text-blue-500' },
          { label: 'Regular Users', value: stats?.users.regularUsers || 0, color: 'text-purple-500' },
          { label: 'Admin Users', value: stats?.users.admins || 0, color: 'text-orange-500' },
          { label: 'Total Wallets', value: stats?.wallets.totalWallets || 0, color: 'text-emerald-500' },
        ].map((item, i) => (
          <div
            key={item.label}
            className="rounded-xl border border-border/50 bg-card/60 p-4 text-center animate-fade-in-up"
            style={{ animationDelay: `${300 + i * 50}ms`, opacity: 0, animationFillMode: 'forwards' }}
          >
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
