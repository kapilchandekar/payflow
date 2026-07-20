'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import api from '@/lib/api';
import { toast } from 'sonner';

interface UserDetail {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  wallet: { id: number; balance: string };
  transactions: { sent: number; received: number };
  payments: { total: number; succeeded: number; failed: number };
  createdAt: string;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezeLoading, setFreezeLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/admin/users/${params.id}`);
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  const handleFreezeWallet = async (freeze: boolean) => {
    if (!user?.wallet?.id) return;
    setFreezeLoading(true);
    try {
      await api.patch(`/admin/wallets/${user.wallet.id}/freeze`, { freeze });
      toast.success(`Wallet ${freeze ? 'frozen' : 'unfrozen'} successfully`);
    } catch (err) {
      console.error('Freeze/unfreeze failed', err);
      toast.error('Failed to update wallet freeze status');
    } finally {
      setFreezeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading user details...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-3xl mb-3">😕</p>
        <p className="text-muted-foreground font-medium">User not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button + header */}
      <div className="flex items-center gap-4 animate-fade-in-up">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{user.firstName} {user.lastName}</h2>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
        <span className={`ml-auto text-xs font-medium px-3 py-1 rounded-full ${
          user.role === 'admin' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
        }`}>
          {user.role}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Wallet Balance', value: `₹${Number(user.wallet?.balance || 0).toFixed(2)}`, icon: '💰' },
          { label: 'Sent Transfers', value: user.transactions.sent, icon: '📤' },
          { label: 'Received Transfers', value: user.transactions.received, icon: '📥' },
          { label: 'Stripe Payments', value: `${user.payments.succeeded}/${user.payments.total}`, icon: '💳' },
        ].map((m, i) => (
          <div
            key={m.label}
            className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms`, opacity: 0, animationFillMode: 'forwards' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
              <span className="text-lg">{m.icon}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Details card */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 animate-fade-in-up" style={{ animationDelay: '200ms', opacity: 0, animationFillMode: 'forwards' }}>
        <h3 className="text-base font-semibold text-foreground mb-4">Profile Details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: 'Email', value: user.email },
            { label: 'Phone', value: user.phone || 'Not provided' },
            { label: 'Account Created', value: format(new Date(user.createdAt), 'MMM d, yyyy h:mm a') },
            { label: 'Wallet ID', value: user.wallet?.id || 'N/A' },
            { label: 'Failed Payments', value: user.payments.failed },
            { label: 'User ID', value: user.id },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-2 border-b border-border/30 last:border-0">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 animate-fade-in-up" style={{ animationDelay: '250ms', opacity: 0, animationFillMode: 'forwards' }}>
        <h3 className="text-base font-semibold text-foreground mb-4">Administrative Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleFreezeWallet(true)}
            disabled={freezeLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
          >
            {freezeLoading ? 'Processing...' : '🔒 Freeze Wallet'}
          </button>
          <button
            onClick={() => handleFreezeWallet(false)}
            disabled={freezeLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            {freezeLoading ? 'Processing...' : '🔓 Unfreeze Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}
