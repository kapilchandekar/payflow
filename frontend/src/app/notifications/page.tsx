'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { useNotificationStore } from '@/store/useNotificationStore';

const typeIcon: Record<string, string> = {
  TRANSFER: '💸',
  ALERT: '⚠️',
  SYSTEM: '🔔',
  AI_INSIGHT: '🤖',
};

const typeBadge: Record<string, string> = {
  TRANSFER: 'bg-blue-500/10 text-blue-500',
  ALERT: 'bg-yellow-500/10 text-yellow-600',
  SYSTEM: 'bg-muted text-muted-foreground',
  AI_INSIGHT: 'bg-purple-500/10 text-purple-500',
};

export default function NotificationsPage() {
  const { notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead, unreadCount } =
    useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h2>
          <p className="text-muted-foreground mt-1">
            Stay updated on your account activity.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm font-medium text-primary hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground animate-pulse">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-border/60 text-muted-foreground">
            <p className="text-4xl mb-3">🔔</p>
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm mt-1">You'll see your account activity here.</p>
          </div>
        ) : (
          notifications.map((n, idx) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`flex gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer animate-fade-in-up ${
                n.isRead
                  ? 'border-border/40 bg-card/60'
                  : 'border-primary/20 bg-primary/5 hover:bg-primary/8'
              }`}
              style={{ animationDelay: `${idx * 40}ms`, opacity: 0, animationFillMode: 'forwards' }}
            >
              <span className="text-2xl mt-0.5 shrink-0">{typeIcon[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {n.title}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeBadge[n.type]}`}>
                      {n.type.replace('_', ' ')}
                    </span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                <p className="text-xs text-muted-foreground/60 mt-2">
                  {format(new Date(n.createdAt), 'MMMM d, yyyy · h:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
