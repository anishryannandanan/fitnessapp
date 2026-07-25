import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart as LineIcon, Loader2, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { cn } from '@/lib/cn';
import { fetchMyMeasurements, addMyMeasurement, type MyMeasurement } from '@/lib/meApi';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

const DEMO: MyMeasurement[] = [
  { id: '1', recordedAt: new Date(Date.now() - 28 * 86400000).toISOString(), weightG: 70000, bodyFatPct: 27, waistCm: 84 },
  { id: '2', recordedAt: new Date(Date.now() - 14 * 86400000).toISOString(), weightG: 69000, bodyFatPct: 26, waistCm: 82 },
  { id: '3', recordedAt: new Date().toISOString(), weightG: 68000, bodyFatPct: 24.5, waistCm: 80 },
];

export function MemberProgress() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  const [waist, setWaist] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: measurements = [] } = useQuery({
    queryKey: ['my-measurements'],
    queryFn: () => (HAS_API && token ? fetchMyMeasurements(token) : Promise.resolve(DEMO)),
  });

  const chart = measurements
    .filter((m) => m.weightG != null)
    .map((m) => ({ date: new Date(m.recordedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), kg: Math.round((m.weightG! / 1000) * 10) / 10 }));

  const first = chart[0]?.kg;
  const last = chart[chart.length - 1]?.kg;
  const delta = first != null && last != null ? Math.round((last - first) * 10) / 10 : 0;
  const latest = measurements[measurements.length - 1];

  const save = async () => {
    setSaving(true);
    try {
      if (HAS_API && token) {
        await addMyMeasurement(token, {
          weightG: weight ? Math.round(parseFloat(weight) * 1000) : undefined,
          bodyFatPct: fat ? parseFloat(fat) : undefined,
          waistCm: waist ? parseFloat(waist) : undefined,
        });
        qc.invalidateQueries({ queryKey: ['my-measurements'] });
      } else {
        await new Promise((r) => setTimeout(r, 300));
      }
      setWeight(''); setFat(''); setWaist(''); setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Progress" subtitle={HAS_API ? 'Live' : 'Demo'}
        action={<button onClick={() => setAdding((a) => !a)} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg"><Plus size={16} /> Add</button>} />

      {adding && (
        <Card className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Weight (kg)" value={weight} onChange={setWeight} />
            <Field label="Body fat %" value={fat} onChange={setFat} />
            <Field label="Waist (cm)" value={waist} onChange={setWaist} />
          </div>
          <button onClick={save} disabled={saving || (!weight && !fat && !waist)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-fg disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />} Save entry
          </button>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="tabular text-xl font-bold text-text">{last ?? '—'}<span className="text-xs font-normal text-muted"> kg</span></div>
          <div className="text-[11px] text-muted">current</div>
        </Card>
        <Card className="text-center">
          <div className={cn('tabular flex items-center justify-center gap-1 text-xl font-bold', delta <= 0 ? 'text-success' : 'text-danger')}>
            {delta <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}{Math.abs(delta)}
          </div>
          <div className="text-[11px] text-muted">kg change</div>
        </Card>
        <Card className="text-center">
          <div className="tabular text-xl font-bold text-text">{latest?.bodyFatPct ?? '—'}<span className="text-xs font-normal text-muted">%</span></div>
          <div className="text-[11px] text-muted">body fat</div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2 text-muted"><LineIcon size={16} /><span className="text-sm font-medium">Weight trend</span></div>
        {chart.length < 2 ? (
          <p className="py-6 text-center text-sm text-muted">Add a few entries to see your trend.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chart} margin={{ left: -18, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={12} />
              <YAxis stroke="rgb(var(--text-muted))" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip formatter={(v: number) => `${v} kg`} />
              <Line type="monotone" dataKey="kg" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-[11px] text-muted">{label}
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border bg-surface-2 px-2 py-1.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40" />
    </label>
  );
}
