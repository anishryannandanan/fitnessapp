import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Check, X, Clock } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { apiFetch } from '@/lib/authApi';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

interface PTSession {
  id: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
}

const DEMO_SESSIONS: PTSession[] = [
  { id: '1', scheduledDate: new Date(Date.now() + 86400000).toISOString(), startTime: '07:00', endTime: '08:00', status: 'scheduled', notes: 'Upper body focus' },
  { id: '2', scheduledDate: new Date(Date.now() + 3 * 86400000).toISOString(), startTime: '07:00', endTime: '08:00', status: 'scheduled', notes: 'Leg day' },
  { id: '3', scheduledDate: new Date(Date.now() - 86400000).toISOString(), startTime: '07:00', endTime: '08:00', status: 'completed' },
  { id: '4', scheduledDate: new Date(Date.now() - 3 * 86400000).toISOString(), startTime: '18:00', endTime: '19:00', status: 'completed' },
];

export function MemberSchedule() {
  const token = useAuth((s) => s.token);

  const { data: sessions = [] } = useQuery({
    queryKey: ['my-pt-sessions'],
    queryFn: () =>
      HAS_API && token
        ? apiFetch<PTSession[]>('/api/v1/scheduling/sessions?memberId=me', token)
        : Promise.resolve(DEMO_SESSIONS),
  });

  const upcoming = sessions.filter((s) => s.status === 'scheduled');
  const past = sessions.filter((s) => s.status !== 'scheduled');

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check size={14} className="text-success" />;
      case 'cancelled': return <X size={14} className="text-danger" />;
      case 'no_show': return <X size={14} className="text-warning" />;
      default: return <Clock size={14} className="text-primary" />;
    }
  };

  const formatDay = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="PT Schedule" subtitle="Your personal training sessions" />

      {/* Upcoming */}
      <div className="text-sm font-medium text-muted">Upcoming Sessions</div>
      {upcoming.length === 0 ? (
        <Card className="py-6 text-center text-sm text-muted">No upcoming PT sessions scheduled</Card>
      ) : (
        upcoming.map((s) => (
          <Card key={s.id} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-text">{formatDay(s.scheduledDate)}</div>
              <div className="text-xs text-muted">{s.startTime} — {s.endTime}{s.notes ? ` | ${s.notes}` : ''}</div>
            </div>
            {statusIcon(s.status)}
          </Card>
        ))
      )}

      {/* Past sessions */}
      {past.length > 0 && (
        <>
          <div className="text-sm font-medium text-muted">Past Sessions</div>
          {past.map((s) => (
            <Card key={s.id} className="flex items-center gap-3 opacity-70">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                <CalendarClock size={18} className="text-muted" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-text">{formatDay(s.scheduledDate)}</div>
                <div className="text-xs text-muted">{s.startTime} — {s.endTime}</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted">
                {statusIcon(s.status)}
                {s.status}
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
