'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useWalletStore, Transaction } from '@/store/useWalletStore';

const typeLabels: Record<string, string> = {
  deposit: 'Wallet Deposit',
  withdrawal: 'Withdrawal',
  sent: 'Money Sent',
  received: 'Money Received',
  stripe_charge: 'Added via Card',
  refund: 'Refund',
  transfer: 'Transfer',
};

const FILTERS = ['All', 'Deposits', 'Transfers', 'Withdrawals'];

export default function TransactionsPage() {
  const { transactions, fetchTransactions, isLoading, hasMore, page } = useWalletStore();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (transactions.length === 0) {
      fetchTransactions(0);
    }
  }, [fetchTransactions, transactions.length]);

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      !search ||
      (tx.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.aiCategory || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.toEmail || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.fromEmail || '').toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'All' ||
      (filter === 'Deposits' && (tx.type === 'deposit' || tx.type === 'received' || tx.type === 'stripe_charge')) ||
      (filter === 'Transfers' && (tx.type === 'sent' || tx.type === 'transfer')) ||
      (filter === 'Withdrawals' && tx.type === 'withdrawal');

    return matchesSearch && matchesFilter;
  });

  const isCredit = (tx: Transaction) =>
    tx.type === 'deposit' || tx.type === 'received' || tx.type === 'stripe_charge' || tx.type === 'refund';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Transactions</h2>
        <p className="text-muted-foreground mt-1">Full history of your account activity.</p>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '50ms', opacity: 0, animationFillMode: 'forwards' }}>
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search by description, category, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 h-10 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-border/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms', opacity: 0, animationFillMode: 'forwards' }}>
        {isLoading && transactions.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground animate-pulse">Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-3xl mb-3">📭</p>
            <p className="font-medium">No transactions found</p>
            {search && <p className="text-sm mt-1">Try a different search term.</p>}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((tx, idx) => {
              const credit = isCredit(tx);
              let title = typeLabels[tx.type] || tx.type;
              if (tx.type === 'sent') title = `Money sent to ${tx.toEmail || 'user'}`;
              if (tx.type === 'received') title = `Received money from ${tx.fromEmail || 'user'}`;

              let iconColor = 'text-emerald-500 bg-emerald-500/10';
              let isUpArrow = !credit; // Credits (received) go DOWN into the wallet, Debits (sent) go UP out of the wallet

              if (!credit && tx.status === 'failed') {
                iconColor = 'text-destructive bg-destructive/10'; // Failed sent transfers are RED UP arrow
              } else if (credit && tx.status === 'failed') {
                iconColor = 'text-destructive bg-destructive/10'; // Just in case a deposit fails
              }

              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${iconColor}`}>
                    {isUpArrow
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                    }
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.timestamp || tx.createdAt || new Date()), 'MMM d, yyyy · h:mm a')}
                      </p>
                      {tx.aiCategory && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-medium">
                          {tx.aiCategory}
                        </span>
                      )}
                      {tx.status && tx.status !== 'completed' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {tx.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <span className={`font-semibold text-sm ${credit ? 'text-emerald-500' : 'text-foreground'}`}>
                    ₹{Number(tx.amount).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && !search && (
          <div className="px-5 py-4 border-t border-border/40 flex justify-center">
            <button
              onClick={() => fetchTransactions(page + 1)}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
