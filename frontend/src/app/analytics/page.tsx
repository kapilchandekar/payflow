'use client';

import { useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, ResponsiveContainer, Legend
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { useWalletStore, Transaction } from '@/store/useWalletStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CATEGORY_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm px-3 py-2 text-xs shadow-lg">
        <p className="font-medium text-foreground">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="mt-0.5">
            {p.name}: ₹{Number(p.value).toFixed(0)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { transactions, fetchTransactions, isLoading, balance } = useWalletStore();

  useEffect(() => {
    if (transactions.length === 0) fetchTransactions(0);
  }, [fetchTransactions, transactions.length]);

  // ── Daily spend for last 14 days ──────────────────────────────────
  const dailyData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = startOfDay(subDays(new Date(), 13 - i));
      return { label: format(d, 'MMM d'), date: d, credit: 0, debit: 0 };
    });
    transactions.forEach((tx) => {
      const txDate = startOfDay(new Date(tx.timestamp || tx.createdAt || new Date()));
      const day = days.find((d) => d.date.getTime() === txDate.getTime());
      if (!day) return;
      const credit = tx.type === 'deposit' || tx.type === 'received' || tx.type === 'stripe_charge';
      if (credit) day.credit += Number(tx.amount);
      else day.debit += Number(tx.amount);
    });
    return days.map((d) => ({ name: d.label, Income: d.credit, Spend: d.debit }));
  }, [transactions]);

  // ── Category breakdown ────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type === 'sent' || tx.type === 'withdrawal') {
        const cat = tx.aiCategory || 'Uncategorised';
        map[cat] = (map[cat] || 0) + Number(tx.amount);
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions]);

  // ── Summary metrics ────────────────────────────────────────────────
  const totalSpend = transactions
    .filter((t) => t.type === 'sent' || t.type === 'withdrawal')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = transactions
    .filter((t) => t.type === 'deposit' || t.type === 'received' || t.type === 'stripe_charge')
    .reduce((s, t) => s + Number(t.amount), 0);
  const avgTxSize =
    transactions.length > 0
      ? transactions.reduce((s, t) => s + Number(t.amount), 0) / transactions.length
      : 0;

  const topCategory = categoryData[0]?.name || '—';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h2>
        <p className="text-muted-foreground mt-1">Understand your financial patterns at a glance.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Income', value: `₹${totalIncome.toFixed(0)}`, icon: '📈', color: 'text-emerald-500' },
          { label: 'Total Spend', value: `₹${totalSpend.toFixed(0)}`, icon: '📉', color: 'text-red-500' },
          { label: 'Avg Transaction', value: `₹${avgTxSize.toFixed(0)}`, icon: '⚡', color: 'text-blue-500' },
          { label: 'Top Category', value: topCategory, icon: '🏷️', color: 'text-purple-500' },
        ].map((m, i) => (
          <Card
            key={m.label}
            className="rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms`, opacity: 0, animationFillMode: 'forwards' }}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
                <span className="text-lg">{m.icon}</span>
              </div>
              <p className={`text-xl font-bold truncate ${m.color}`}>{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Area chart: 14-day income vs spend */}
      <Card className="rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '100ms', opacity: 0, animationFillMode: 'forwards' }}>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Income vs Spend — Last 14 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && transactions.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Loading data...</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2} fill="url(#gIncome)" />
                  <Area type="monotone" dataKey="Spend" stroke="#f43f5e" strokeWidth={2} fill="url(#gSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: bar chart + pie chart */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bar chart: top categories */}
        <Card className="rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '150ms', opacity: 0, animationFillMode: 'forwards' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                No categorised transactions yet
              </div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                    <YAxis type="category" dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Amount" radius={[0, 6, 6, 0]}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie chart: share of wallet */}
        <Card className="rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '200ms', opacity: 0, animationFillMode: 'forwards' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                No data to display yet
              </div>
            ) : (
              <div className="h-52 flex items-center gap-4">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `₹${Number(v).toFixed(0)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  {categoryData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
