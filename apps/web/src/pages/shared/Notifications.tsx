import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  fetchNotifications, markAllNotificationsRead, markNotificationRead, type ApiNotification,
} from '@/lib/notificationsApi';

const DEMO: ApiNotification[] = [
  { id: '1', type: 'announcement', title: 'Holiday hours', body: 'We close at 8pm this week', readAt: null, createdAt: new Date().toISOString() },
  { id: '2', type: 'payment_due', title: 'Payment due', body: 'Arun Kumar has an overdue invoice', readAt: null, createdAt: new Date(Date.now() - 3600_000).toISOString() },
  { id: '3', type: 'membership_expiry', title: 'Expiring soon', body: '3 memberships expire this week', readAt: new Date().toISOString(), createdAt: new Date(Date.now() - 86400_000).toISOString() },
];

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function Notifications() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => (HAS_API && token ? fetchNotifications(token) : Promise.resolve(DEMO)),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['unread-count'] });
  };

  const onRead = async (id: string) => {
    if (HAS_API && token) { await markNotificationRead(token, id); refresh(); }
  };
  const onReadAll = async () => {
    if (HAS_API && token) { await markAllNotificationsRead(token); refresh(); }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        subtitle={HAS_API ? 'Live' : 'Demo'}
        action={
          <button onClick={onReadAll} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted hover:text-text">
            <CheckCheck size={14} /> Mark all read
          </button>
        }
      />

      {isLoading && <Card className="text-sm text-muted">Loading…</Card>}
      {!isLoading && items.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted">
          <Bell size={24} /> You're all caught up.
        </Card>
      )}

      <div className="space-y-2">
        {items.map((n) => (
          <button key={n.id} onClick={() => onRead(n.id)} className="w-full text-left">
            <Card className={cn('flex items-start gap-3', !n.readAt && 'border-primary/40 bg-primary/5')}>
              <div className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-primary')} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-muted">{timeAgo(n.createdAt)}</span>
                </div>
                {n.body && <p className="text-sm text-muted">{n.body}</p>}
                <span className="mt-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium capitalize text-muted">
                  {n.type.replace(/_/g, ' ')}
                </span>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
