'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import api from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  balance: string;
  createdAt: string;
  isBlocked?: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = async (p = 0) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users?limit=20&offset=${p * 20}`);
      setUsers(p === 0 ? res.data.users : [...users, ...res.data.users]);
      setHasMore(res.data.pagination.hasMore);
      setPage(p);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(0);
  }, []);

  const handleBlock = async (userId: number) => {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/block`);
      setUsers(users.map(u => u.id === userId ? { ...u, isBlocked: true } : u));
    } catch (err) {
      console.error('Failed to block user', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (userId: number) => {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/unblock`);
      setUsers(users.map(u => u.id === userId ? { ...u, isBlocked: false } : u));
    } catch (err) {
      console.error('Failed to unblock user', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">User Management</h2>
        <p className="text-muted-foreground mt-1">View, search, and manage all platform users.</p>
      </div>

      {/* Search */}
      <div className="animate-fade-in-up" style={{ animationDelay: '50ms', opacity: 0, animationFillMode: 'forwards' }}>
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms', opacity: 0, animationFillMode: 'forwards' }}>
        {loading && users.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground animate-pulse">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Role</th>
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Balance</th>
                  <th className="text-left py-3 px-5 font-medium text-muted-foreground">Joined</th>
                  <th className="text-right py-3 px-5 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-5">
                      <Link href={`/admin/users/${user.id}`} className="hover:underline">
                        <p className="font-medium text-foreground">{user.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </Link>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === 'admin' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-5 font-medium text-foreground">₹{Number(user.balance).toFixed(2)}</td>
                    <td className="py-3 px-5 text-muted-foreground">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex gap-2 justify-end">
                        {user.isBlocked ? (
                          <button
                            onClick={() => handleUnblock(user.id)}
                            disabled={actionLoading === user.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.id ? '...' : 'Unblock'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlock(user.id)}
                            disabled={actionLoading === user.id || user.role === 'admin'}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.id ? '...' : 'Block'}
                          </button>
                        )}
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && !search && (
          <div className="px-5 py-4 border-t border-border/40 flex justify-center">
            <button
              onClick={() => fetchUsers(page + 1)}
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
