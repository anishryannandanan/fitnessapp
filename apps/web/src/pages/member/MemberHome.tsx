import { Dumbbell, Salad, Droplets, Flame, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export function MemberHome() {
  const waterMl = 1200;
  const waterGoal = 3000;
  const waterPct = Math.round((waterMl / waterGoal) * 100);

  return (
    <div className="space-y-4">
      <PageHeader title="Hi, Fathima 👋" subtitle="Let's crush today's goals" />

      <Card className="flex items-center gap-3 bg-gradient-to-br from-primary to-info text-white">
        <Flame size={28} />
        <div>
          <div className="text-2xl font-extrabold">12-day streak</div>
          <div className="text-sm opacity-90">Keep it going!</div>
        </div>
      </Card>

      <Card className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Dumbbell size={22} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-text">Today's Workout</div>
          <div className="text-xs text-muted">Upper Body · 6 exercises</div>
        </div>
        <button className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-fg">Start</button>
      </Card>

      <Card className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Salad size={22} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-text">Today's Diet</div>
          <div className="text-xs text-muted">2 of 5 meals completed</div>
        </div>
        <ChevronRight size={18} className="text-muted" />
      </Card>

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
          <div className="font-semibold text-success">Active · expires in 18 days</div>
        </div>
        <button className="rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary">Renew</button>
      </Card>
    </div>
  );
}
