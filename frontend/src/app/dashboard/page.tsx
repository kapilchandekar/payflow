'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useWalletStore } from '@/store/useWalletStore';
import { MetricCard } from '@/features/dashboard/components/MetricCard';
import { DashboardChart } from '@/features/dashboard/components/DashboardChart';
import { TransactionItem } from '@/features/dashboard/components/TransactionItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { balance, transactions, fetchTransactions, isLoading } = useWalletStore();

  useEffect(() => {
    fetchTransactions(0);
  }, [fetchTransactions]);

  // Calculate some simple metrics from recent transactions
  const deposits = transactions.filter(t => t.type === 'deposit' || t.type === 'received');
  const expenses = transactions.filter(t => t.type === 'withdrawal' || t.type === 'sent');
  
  const totalIncome = deposits.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-8">
      {/* Page header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Overview</h2>
          <p className="text-muted-foreground mt-1">
            Welcome back to your financial dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/wallet/add" 
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Money
          </Link>
          <Link 
            href="/transfer" 
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            Send
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Balance" value={`₹${Number(balance).toFixed(2)}`} change="Live Balance" icon="💰" delay={0} />
        <MetricCard title="Total Income" value={`₹${totalIncome.toFixed(2)}`} change="Recent activity" icon="📈" delay={100} />
        <MetricCard title="Total Expenses" value={`₹${totalExpense.toFixed(2)}`} change="Recent activity" icon="📉" delay={200} />
        <MetricCard title="Transactions" value={`${transactions.length}`} change="Recent count" icon="🔄" delay={300} />
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-3">
        {/* Chart Section */}
        <div className="md:col-span-4 lg:col-span-2">
          <DashboardChart data={[]} />
        </div>

        {/* Recent Transactions Section */}
        <div className="md:col-span-3 lg:col-span-1">
          <Card className="h-full rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up delay-300" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">Recent Transactions</CardTitle>
              <Link href="/wallet" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading && transactions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No recent transactions.</div>
              ) : (
                <div className="space-y-2 mt-4">
                  {transactions.slice(0, 5).map((tx, idx) => (
                    <TransactionItem 
                      key={tx.id} 
                      transaction={tx} 
                      delay={400 + (idx * 50)} 
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
