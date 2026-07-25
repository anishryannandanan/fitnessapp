import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Salad, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { fetchDietPlans, createDietPlan, type DietPlan, type DietMealInput } from '@/lib/trainingApi';

const DEMO: DietPlan[] = [
  { id: 'd1', name: 'Cutting 1800', dailyCalories: 1800, meals: [{ id: 'm1', mealType: 'breakfast', title: 'Oats + Whey', calories: 420 }] },
];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export function TrainerDiet() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const [mode, setMode] = useState<'list' | 'build'>('list');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [meals, setMeals] = useState<DietMealInput[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ['diet-plans'],
    queryFn: () => (HAS_API && token ? fetchDietPlans(token) : Promise.resolve(DEMO)),
  });

  const addMeal = () => setMeals((prev) => [...prev, { mealType: 'breakfast', title: '', calories: undefined }]);
  const updateMeal = (i: number, patch: Partial<DietMealInput>) =>
    setMeals((prev) => prev.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const removeMeal = (i: number) => setMeals((prev) => prev.filter((_, j) => j !== i));

  const save = async () => {
    if (!name.trim() || meals.length === 0 || meals.some((m) => !m.title.trim())) return;
    setSaving(true);
    try {
      if (HAS_API && token) {
        await createDietPlan(token, { name: name.trim(), dailyCalories: calories ? +calories : undefined, meals });
        qc.invalidateQueries({ queryKey: ['diet-plans'] });
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      setName(''); setCalories(''); setMeals([]); setMode('list');
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'build') {
    return (
      <div className="space-y-4">
        <PageHeader title="New diet plan" />
        <Card className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Plan name (e.g. Cutting 1800)"
            className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40" />
          <input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" placeholder="Daily calories (optional)"
            className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40" />
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Meals ({meals.length})</span>
            <button onClick={addMeal} className="flex items-center gap-1 text-xs font-medium text-primary"><Plus size={14} /> Add meal</button>
          </div>
          {meals.map((m, i) => (
            <div key={i} className="rounded-xl border p-2.5">
              <div className="mb-2 flex gap-2">
                <select value={m.mealType} onChange={(e) => updateMeal(i, { mealType: e.target.value })}
                  className="rounded-lg border bg-surface-2 px-2 py-1 text-xs capitalize text-text">
                  {MEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={m.title} onChange={(e) => updateMeal(i, { title: e.target.value })} placeholder="Meal title"
                  className="flex-1 rounded-lg border bg-surface-2 px-2 py-1 text-sm text-text" />
                <button onClick={() => removeMeal(i)} className="text-muted hover:text-danger"><Trash2 size={15} /></button>
              </div>
              <input type="number" value={m.calories ?? ''} onChange={(e) => updateMeal(i, { calories: e.target.value ? +e.target.value : undefined })}
                placeholder="kcal" className="w-24 rounded-lg border bg-surface-2 px-2 py-1 text-xs text-text" />
            </div>
          ))}
          {meals.length === 0 && <p className="text-xs text-muted">Add at least one meal.</p>}
        </Card>

        <div className="flex gap-2">
          <button onClick={() => setMode('list')} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-text">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim() || meals.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Diet" subtitle={HAS_API ? 'Meal plans' : 'Demo'}
        action={<button onClick={() => setMode('build')} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg"><Plus size={16} /> New</button>} />
      {plans.length === 0 && <Card className="text-sm text-muted">No diet plans yet.</Card>}
      <div className="space-y-2">
        {plans.map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><Salad size={20} /></div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-text">{p.name}</div>
              <div className="text-xs text-muted">{p.meals.length} meals{p.dailyCalories ? ` · ${p.dailyCalories} kcal/day` : ''}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
