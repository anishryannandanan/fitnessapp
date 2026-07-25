import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Plus, Search, Trash2, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  fetchExercises, fetchWorkoutPlans, createWorkoutPlan,
  type Exercise, type WorkoutPlan, type PlanExerciseInput,
} from '@/lib/trainingApi';

const DEMO_EX: Exercise[] = [
  { id: 'e1', name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell', difficulty: 'intermediate' },
  { id: 'e2', name: 'Squat', muscleGroup: 'legs', equipment: 'barbell', difficulty: 'intermediate' },
  { id: 'e3', name: 'Deadlift', muscleGroup: 'back', equipment: 'barbell', difficulty: 'advanced' },
  { id: 'e4', name: 'Pull-up', muscleGroup: 'back', equipment: 'bodyweight', difficulty: 'intermediate' },
];
const DEMO_PLANS: WorkoutPlan[] = [
  { id: 'p1', name: 'Push Day', goal: 'strength', isTemplate: true, exercises: [{ id: 'x1', sets: 5, reps: '5', exercise: { name: 'Bench Press', muscleGroup: 'chest' } }] },
];

interface Picked extends PlanExerciseInput { name: string }

export function TrainerWorkouts() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const [mode, setMode] = useState<'list' | 'build'>('list');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises', search],
    queryFn: () => (HAS_API && token ? fetchExercises(token, search || undefined) : Promise.resolve(DEMO_EX)),
  });
  const { data: plans = [] } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: () => (HAS_API && token ? fetchWorkoutPlans(token) : Promise.resolve(DEMO_PLANS)),
  });

  const addExercise = (e: Exercise) => {
    if (picked.some((p) => p.exerciseId === e.id)) return;
    setPicked((prev) => [...prev, { exerciseId: e.id, name: e.name, sets: 3, reps: '10', restSec: 60 }]);
  };
  const updatePicked = (id: string, patch: Partial<Picked>) =>
    setPicked((prev) => prev.map((p) => (p.exerciseId === id ? { ...p, ...patch } : p)));
  const removePicked = (id: string) => setPicked((prev) => prev.filter((p) => p.exerciseId !== id));

  const save = async () => {
    if (!name.trim() || picked.length === 0) return;
    setSaving(true);
    try {
      if (HAS_API && token) {
        await createWorkoutPlan(token, {
          name: name.trim(), goal: goal.trim() || undefined,
          exercises: picked.map(({ exerciseId, sets, reps, restSec }) => ({ exerciseId, sets, reps, restSec })),
        });
        qc.invalidateQueries({ queryKey: ['workout-plans'] });
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      setName(''); setGoal(''); setPicked([]); setMode('list');
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'build') {
    return (
      <div className="space-y-4">
        <PageHeader title="New workout plan" subtitle="Build from the exercise library" />
        <Card className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Plan name (e.g. Push Day)"
            className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40" />
          <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal (optional)"
            className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40" />
        </Card>

        {picked.length > 0 && (
          <Card className="space-y-2">
            <div className="text-sm font-medium text-muted">Selected ({picked.length})</div>
            {picked.map((p) => (
              <div key={p.exerciseId} className="rounded-xl border p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-text">{p.name}</span>
                  <button onClick={() => removePicked(p.exerciseId)} className="text-muted hover:text-danger"><Trash2 size={15} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-[11px] text-muted">Sets
                    <input type="number" value={p.sets} min={1} onChange={(e) => updatePicked(p.exerciseId, { sets: +e.target.value })}
                      className="mt-0.5 w-full rounded-lg border bg-surface-2 px-2 py-1 text-sm text-text" />
                  </label>
                  <label className="text-[11px] text-muted">Reps
                    <input value={p.reps} onChange={(e) => updatePicked(p.exerciseId, { reps: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border bg-surface-2 px-2 py-1 text-sm text-text" />
                  </label>
                  <label className="text-[11px] text-muted">Rest (s)
                    <input type="number" value={p.restSec} min={0} onChange={(e) => updatePicked(p.exerciseId, { restSec: +e.target.value })}
                      className="mt-0.5 w-full rounded-lg border bg-surface-2 px-2 py-1 text-sm text-text" />
                  </label>
                </div>
              </div>
            ))}
          </Card>
        )}

        <Card>
          <div className="mb-2 flex items-center gap-2 rounded-xl border bg-surface px-3 py-2">
            <Search size={16} className="text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exercises"
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted" />
          </div>
          <div className="space-y-1.5">
            {exercises.map((e) => (
              <button key={e.id} onClick={() => addExercise(e)}
                className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:border-primary/40">
                <Plus size={14} className="text-primary" />
                <span className="flex-1 text-text">{e.name}</span>
                <span className="text-[11px] capitalize text-muted">{e.muscleGroup}</span>
              </button>
            ))}
          </div>
        </Card>

        <div className="flex gap-2">
          <button onClick={() => setMode('list')} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-text">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim() || picked.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Workouts" subtitle={HAS_API ? 'Plans & templates' : 'Demo'}
        action={<button onClick={() => setMode('build')} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg"><Plus size={16} /> New</button>} />
      {plans.length === 0 && <Card className="text-sm text-muted">No plans yet. Create one to get started.</Card>}
      <div className="space-y-2">
        {plans.map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Dumbbell size={20} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-text">{p.name}</span>
                {p.isTemplate && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">template</span>}
              </div>
              <div className="text-xs text-muted">{p.exercises.length} exercises{p.goal ? ` · ${p.goal}` : ''}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
