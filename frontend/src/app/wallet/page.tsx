'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useWalletStore } from '@/store/useWalletStore';
import { TransactionItem } from '@/features/dashboard/components/TransactionItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WalletPage() {
  const { balance, transactions, fetchTransactions, isLoading, hasMore, page } = useWalletStore();

  useEffect(() => {
    // Only fetch if we don't have transactions or want to refresh
    if (transactions.length === 0) {
      fetchTransactions(0);
    }
  }, [fetchTransactions, transactions.length]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Wallet</h2>
          <p className="text-muted-foreground mt-1">
            Manage your balance and view all transactions.
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="rounded-2xl border-none bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/20 animate-fade-in-up delay-100" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <CardContent className="p-8">
          <p className="text-primary-foreground/80 font-medium mb-2">Available Balance</p>
          <div className="text-5xl font-bold tracking-tight mb-8">
            ₹{Number(balance).toFixed(2)}
          </div>
          <div className="flex gap-4">
            <Link 
              href="/wallet/add" 
              className="px-6 py-3 rounded-xl bg-white text-primary font-bold hover:bg-white/90 transition-colors shadow-sm"
            >
              Add Money
            </Link>
            <Link 
              href="/transfer" 
              className="px-6 py-3 rounded-xl bg-primary-foreground/10 text-white font-medium hover:bg-primary-foreground/20 transition-colors backdrop-blur-sm"
            >
              Send Money
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up delay-200" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && transactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Loading history...</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No transactions yet.</div>
          ) : (
            <div className="space-y-2 mt-2">
              {transactions.map((tx, idx) => (
                <TransactionItem 
                  key={tx.id} 
                  transaction={tx} 
                  delay={300 + (idx * 30)} 
                />
              ))}
              
              {hasMore && (
                <div className="pt-6 flex justify-center">
                  <button
                    onClick={() => fetchTransactions(page + 1)}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
