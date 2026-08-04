import { CalendarClock, Users, ClipboardCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/stores/auth';
import { HAS_API, API_URL } from '@/lib/env';

const DEMO_SESSIONS = [
  { time: '07:00', member: 'Fathima S', type: 'Weight Loss' },
  { time: '09:30', member: 'Joseph M', type: 'Personal Training' },
  { time: '17:00', member: 'Divya P', type: 'Muscle Gain' },
];

async function fetchTrainerDashboard(token: string) {
  const res = await fetch(`${API_URL}/api/v1/members?status=active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { memberCount: 0 };
  const members = await res.json();
  return { memberCount: Array.isArray(members) ? members.length : 0 };
}

export function TrainerToday() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);

  const { data } = useQuery({
    queryKey: ['trainer-dashboard'],
    queryFn: () => (HAS_API && token ? fetchTrainerDashboard(token) : Promise.resolve({ memberCount: 7 })),
  });

  const memberCount = data?.memberCount ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Today" subtitle={`${user?.name ?? 'Trainer'} · ${user?.branchId ? 'Branch' : 'Kochi'}`} />

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Sessions" value="3" />
        <KpiCard label="Members" value={String(memberCount)} />
        <KpiCard label="Reviews" value="3" />
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-text">Today's PT sessions</h3>
        </div>
        <div className="divide-y divide-border">
          {DEMO_SESSIONS.map((s) => (
            <div key={s.time} className="flex items-center gap-3 py-2.5">
              <span className="tabular w-14 text-sm font-semibold text-primary">{s.time}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-text">{s.member}</div>
                <div className="text-xs text-muted">{s.type}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3">
          <Users size={22} className="text-info" />
          <span className="text-sm font-medium text-text">Assigned members</span>
        </Card>
        <Card className="flex items-center gap-3">
          <ClipboardCheck size={22} className="text-accent" />
          <span className="text-sm font-medium text-text">Pending reviews</span>
        </Card>
      </div>
    </div>
  );
}
