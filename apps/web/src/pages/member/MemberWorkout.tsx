import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Dumbbell, Minus, Plus, Trophy, Star, PartyPopper, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { fetchMyWorkoutPlans, logMyWorkout, type MyWorkoutPlan } from '@/lib/meApi';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';

interface SetEntry { weightKg: number; reps: number; done: boolean; pr: boolean }
interface ExerciseState { exerciseId: string; name: string; muscle: string; prevBestKg: number; sets: SetEntry[] }

// Demo plan used when no backend is configured.
const DEMO: ExerciseState[] = [
  { exerciseId: 'd1', name: 'Bench Press', muscle: 'Chest', prevBestKg: 60, sets: [{ weightKg: 60, reps: 8, done: false, pr: false }, { weightKg: 62, reps: 6, done: false, pr: false }, { weightKg: 64, reps: 5, done: false, pr: false }] },
  { exerciseId: 'd2', name: 'Incline Dumbbell Press', muscle: 'Chest', prevBestKg: 24, sets: [{ weightKg: 24, reps: 10, done: false, pr: false }, { weightKg: 26, reps: 8, done: false, pr: false }] },
];

function planToState(plan: MyWorkoutPlan): ExerciseState[] {
  return plan.exercises.map((pe) => {
    const reps = parseInt(pe.reps, 10) || 10;
    return {
      exerciseId: pe.exerciseId,
      name: pe.exercise?.name ?? 'Exercise',
      muscle: pe.exercise?.muscleGroup ?? '',
      prevBestKg: 0,
      sets: Array.from({ length: pe.sets }, () => ({ weightKg: 20, reps, done: false, pr: false })),
    };
  });
}

export function MemberWorkout() {
  const token = useAuth((s) => s.token);
  const [exercises, setExercises] = useState<ExerciseState[]>(DEMO);
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [planName, setPlanName] = useState('Upper Body · Push');
  const [finished, setFinished] = useState(false);
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['my-workout-plans'],
    queryFn: () => fetchMyWorkoutPlans(token!),
    enabled: HAS_API && !!token,
  });

  // Initialise from the member's assigned plan when it arrives.
  useEffect(() => {
    const plan = plans?.[0];
    if (plan && plan.exercises.length) {
      setExercises(planToState(plan));
      setPlanId(plan.id);
      setPlanName(plan.name);
    }
  }, [plans]);

  const update = (ei: number, si: number, patch: Partial<SetEntry>) =>
    setExercises((prev) => prev.map((ex, i) => (i !== ei ? ex : { ...ex, sets: ex.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })));

  const toggleDone = (ei: number, si: number) =>
    setExercises((prev) => prev.map((ex, i) => {
      if (i !== ei) return ex;
      return { ...ex, sets: ex.sets.map((s, j) => {
        if (j !== si) return s;
        const done = !s.done;
        return { ...s, done, pr: done && s.weightKg > ex.prevBestKg };
      }) };
    }));

  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const prCount = exercises.reduce((n, e) => n + e.sets.filter((s) => s.pr).length, 0);
  const volume = exercises.reduce((v, e) => v + e.sets.filter((s) => s.done).reduce((a, s) => a + s.weightKg * s.reps, 0), 0);

  const finish = async () => {
    setSaving(true);
    try {
      if (HAS_API && token) {
        const sets = exercises.flatMap((ex) =>
          ex.sets.filter((s) => s.done).map((s, idx) => ({ exerciseId: ex.exerciseId, setIndex: idx, weightGrams: s.weightKg * 1000, reps: s.reps })),
        );
        if (sets.length) await logMyWorkout(token, { planId, rating: rating || undefined, sets });
      }
    } finally {
      setSaving(false);
      setFinished(true);
    }
  };

  if (HAS_API && isLoading) return <PageLoader />;

  if (finished) {
    return (
      <div className="space-y-4">
        <PageHeader title="Workout complete" />
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="rounded-2xl bg-success/10 p-4 text-success"><PartyPopper size={28} /></div>
          <h2 className="text-lg font-bold text-text">Nice session! 💪</h2>
          <div className="flex gap-6 text-center">
            <div><div className="text-2xl font-bold text-text tabular">{doneSets}</div><div className="text-xs text-muted">sets</div></div>
            <div><div className="text-2xl font-bold text-text tabular">{volume.toLocaleString()}</div><div className="text-xs text-muted">kg volume</div></div>
            <div><div className="text-2xl font-bold text-accent tabular">{prCount}</div><div className="text-xs text-muted">PRs</div></div>
          </div>
          <button onClick={() => { setFinished(false); setRating(0); setExercises((p) => p.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: false, pr: false })) }))); }}
            className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">Done</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Today's Workout" subtitle={planName} />

      <Card className="flex items-center gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>Progress</span><span>{doneSets}/{totalSets} sets</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
          </div>
        </div>
        {prCount > 0 && <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-xs font-semibold text-accent"><Trophy size={12} /> {prCount} PR</span>}
      </Card>

      {exercises.map((ex, ei) => (
        <Card key={`${ex.exerciseId}-${ei}`} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Dumbbell size={18} /></div>
            <div>
              <div className="font-semibold text-text">{ex.name}</div>
              <div className="text-xs capitalize text-muted">{ex.muscle}{ex.prevBestKg > 0 ? ` · best ${ex.prevBestKg}kg` : ''}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {ex.sets.map((s, si) => (
              <div key={si} className={cn('flex items-center gap-2 rounded-xl border p-2', s.done && 'border-success/40 bg-success/5')}>
                <span className="w-5 text-center text-xs font-medium text-muted">{si + 1}</span>
                <Stepper label="kg" value={s.weightKg} onChange={(v) => update(ei, si, { weightKg: v })} step={2} />
                <Stepper label="reps" value={s.reps} onChange={(v) => update(ei, si, { reps: v })} step={1} />
                {s.pr && <span className="flex items-center gap-0.5 text-[10px] font-bold text-accent"><Trophy size={11} />PR</span>}
                <button onClick={() => toggleDone(ei, si)}
                  className={cn('ml-auto flex h-8 w-8 items-center justify-center rounded-lg', s.done ? 'bg-success text-white' : 'border text-muted')}>
                  <Check size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}>
            <Star size={22} className={cn(n <= rating ? 'fill-accent text-accent' : 'text-muted')} />
          </button>
        ))}
      </div>

      <button onClick={finish} disabled={doneSets === 0 || saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg disabled:opacity-50">
        {saving && <Loader2 size={16} className="animate-spin" />} Finish workout
      </button>
    </div>
  );
}

function Stepper({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(0, value - step))} className="flex h-7 w-7 items-center justify-center rounded-md border text-muted"><Minus size={13} /></button>
      <div className="w-10 text-center">
        <div className="text-sm font-semibold text-text tabular">{value}</div>
        <div className="text-[9px] text-muted">{label}</div>
      </div>
      <button onClick={() => onChange(value + step)} className="flex h-7 w-7 items-center justify-center rounded-md border text-muted"><Plus size={13} /></button>
    </div>
  );
}
