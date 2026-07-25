import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell, Salad, Droplets, Flame, ChevronRight } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { formatMoney } from '@/lib/format';
import { fetchMyProfile } from '@/lib/meApi';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export function MemberHome() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const waterMl = 1200;
  const waterGoal = 3000;
  const waterPct = Math.round((waterMl / waterGoal) * 100);

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => fetchMyProfile(token!),
    enabled: HAS_API && !!token,
  });

  const activeMembership = profile?.memberships?.find((m) => m.status === 'active') ?? profile?.memberships?.[0];
  const daysLeft = activeMembership
    ? Math.ceil((new Date(activeMembership.endDate).getTime() - Date.now()) / 86400000)
    : 18;
  const dues = (profile?.invoices ?? []).reduce((s, i) => s + Math.max(0, i.total - i.amountPaid), 0);
  const firstName = (profile?.fullName ?? user?.name ?? 'there').split(' ')[0];

  return (
    <div className="space-y-4">
      <PageHeader title={`Hi, ${firstName} 👋`} subtitle="Let's crush today's goals" />

      <Card className="flex items-center gap-3 bg-gradient-to-br from-primary to-info text-white">
        <Flame size={28} />
        <div>
          <div className="text-2xl font-extrabold">12-day streak</div>
          <div className="text-sm opacity-90">Keep it going!</div>
        </div>
      </Card>

      <button onClick={() => navigate('/member/workout')} className="w-full text-left">
        <Card className="flex items-center gap-3 transition hover:border-primary/40">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Dumbbell size={22} /></div>
          <div className="flex-1">
            <div className="font-semibold text-text">Today's Workout</div>
            <div className="text-xs text-muted">Tap to start logging</div>
          </div>
          <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-fg">Start</span>
        </Card>
      </button>

      <button onClick={() => navigate('/member/diet')} className="w-full text-left">
        <Card className="flex items-center gap-3 transition hover:border-primary/40">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent"><Salad size={22} /></div>
          <div className="flex-1">
            <div className="font-semibold text-text">Today's Diet</div>
            <div className="text-xs text-muted">View your meal plan</div>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </Card>
      </button>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Droplets size={18} className="text-info" />
          <span className="font-semibold text-text">Water</span>
          <span className="ml-auto text-sm text-muted">{waterMl} / {waterGoal} ml</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-info transition-all" style={{ width: `${waterPct}%` }} />
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted">Membership</div>
          <div className={cnStatus(daysLeft)}>
            {activeMembership?.package?.name ? `${activeMembership.package.name} · ` : ''}
            {daysLeft >= 0 ? `expires in ${daysLeft} days` : 'expired'}
          </div>
          {dues > 0 && <div className="text-xs font-medium text-danger">Dues: {formatMoney(dues)}</div>}
        </div>
        <button className="rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary">Renew</button>
      </Card>
    </div>
  );
}

function cnStatus(daysLeft: number) {
  return daysLeft >= 0 ? 'font-semibold text-success' : 'font-semibold text-danger';
}
