import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Droplets, Minus, Plus, Salad } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { fetchMyDietPlans } from '@/lib/meApi';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

interface Meal { title: string; type: string; kcal: number; protein: number; done: boolean }

const INITIAL: Meal[] = [
  { title: 'Oats + Banana + Whey', type: 'Breakfast', kcal: 420, protein: 35, done: true },
  { title: 'Grilled Chicken + Rice + Salad', type: 'Lunch', kcal: 620, protein: 48, done: true },
  { title: 'Greek Yogurt + Nuts', type: 'Snack', kcal: 260, protein: 18, done: false },
  { title: 'Paneer / Fish + Veggies', type: 'Dinner', kcal: 540, protein: 42, done: false },
];

const WATER_GOAL = 3000; // ml
const GLASS = 250;

export function MemberDiet() {
  const token = useAuth((s) => s.token);
  const [meals, setMeals] = useState<Meal[]>(INITIAL);
  const [waterMl, setWaterMl] = useState(1250);

  // Load the member's assigned diet plan when connected to the API.
  const { data: plans } = useQuery({
    queryKey: ['my-diet-plans'],
    queryFn: () => fetchMyDietPlans(token!),
    enabled: HAS_API && !!token,
  });

  useEffect(() => {
    const plan = plans?.[0];
    if (plan && plan.meals.length) {
      setMeals(plan.meals.map((m) => ({
        title: m.title,
        type: m.mealType,
        kcal: m.calories ?? 0,
        protein: m.proteinG ?? 0,
        done: false,
      })));
    }
  }, [plans]);

  const GOAL_KCAL = plans?.[0]?.dailyCalories ?? 1840;

  const toggle = (i: number) => setMeals((prev) => prev.map((m, j) => (j === i ? { ...m, done: !m.done } : m)));

  const consumed = meals.filter((m) => m.done).reduce((a, m) => a + m.kcal, 0);
  const protein = meals.filter((m) => m.done).reduce((a, m) => a + m.protein, 0);
  const doneCount = meals.filter((m) => m.done).length;
  const waterPct = Math.min(100, Math.round((waterMl / WATER_GOAL) * 100));

  return (
    <div className="space-y-4">
      <PageHeader title="Today's Diet" subtitle={`${doneCount}/${meals.length} meals`} />

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="tabular text-xl font-bold text-text">{consumed}</div>
          <div className="text-[11px] text-muted">/ {GOAL_KCAL} kcal</div>
        </Card>
        <Card className="text-center">
          <div className="tabular text-xl font-bold text-text">{protein}g</div>
          <div className="text-[11px] text-muted">protein</div>
        </Card>
        <Card className="text-center">
          <div className="tabular text-xl font-bold text-info">{waterPct}%</div>
          <div className="text-[11px] text-muted">water</div>
        </Card>
      </div>

      {/* Water tracker */}
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Droplets size={18} className="text-info" />
          <span className="font-semibold text-text">Water</span>
          <span className="ml-auto text-sm text-muted">{waterMl} / {WATER_GOAL} ml</span>
        </div>
        <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-info transition-all" style={{ width: `${waterPct}%` }} />
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setWaterMl((w) => Math.max(0, w - GLASS))} className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted"><Minus size={16} /></button>
          <span className="text-sm text-muted">1 glass ({GLASS}ml)</span>
          <button onClick={() => setWaterMl((w) => w + GLASS)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-info"><Plus size={16} /></button>
        </div>
      </Card>

      {/* Meals */}
      <div className="space-y-2">
        {meals.map((m, i) => (
          <Card key={m.title} className={cn('flex items-center gap-3', m.done && 'border-success/40 bg-success/5')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><Salad size={20} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{m.type}</div>
              <div className="truncate font-medium text-text">{m.title}</div>
              <div className="text-xs text-muted">{m.kcal} kcal · {m.protein}g protein</div>
            </div>
            <button onClick={() => toggle(i)}
              className={cn('flex h-9 w-9 items-center justify-center rounded-lg', m.done ? 'bg-success text-white' : 'border text-muted')}>
              <Check size={16} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
