import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart as LineIcon, Loader2, Plus, TrendingDown, TrendingUp, Activity, Ruler } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { cn } from '@/lib/cn';
import { fetchMyMeasurements, addMyMeasurement, type MyMeasurement } from '@/lib/meApi';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

const DEMO: MyMeasurement[] = [
  { id: '1', recordedAt: new Date(Date.now() - 56 * 86400000).toISOString(), weightG: 72000, bodyFatPct: 28, waistCm: 86, musclePct: 32, chestCm: 96, armsCm: 32, hipsCm: 100, thighsCm: 56 },
  { id: '2', recordedAt: new Date(Date.now() - 42 * 86400000).toISOString(), weightG: 71000, bodyFatPct: 27.5, waistCm: 85, musclePct: 32.5, chestCm: 96, armsCm: 32.5, hipsCm: 99, thighsCm: 55.5 },
  { id: '3', recordedAt: new Date(Date.now() - 28 * 86400000).toISOString(), weightG: 70000, bodyFatPct: 27, waistCm: 84, musclePct: 33, chestCm: 97, armsCm: 33, hipsCm: 98, thighsCm: 55 },
  { id: '4', recordedAt: new Date(Date.now() - 14 * 86400000).toISOString(), weightG: 69000, bodyFatPct: 26, waistCm: 82, musclePct: 33.5, chestCm: 97.5, armsCm: 33.5, hipsCm: 97, thighsCm: 54 },
  { id: '5', recordedAt: new Date().toISOString(), weightG: 68000, bodyFatPct: 24.5, waistCm: 80, musclePct: 34, chestCm: 98, armsCm: 34, hipsCm: 96, thighsCm: 53 },
];

type MetricKey = 'weight' | 'bodyFat' | 'muscle' | 'measurements';

export function MemberProgress() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<MetricKey>('weight');
  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [arms, setArms] = useState('');
  const [hips, setHips] = useState('');
  const [thighs, setThighs] = useState('');
  const [muscle, setMuscle] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: measurements = [] } = useQuery({
    queryKey: ['my-measurements'],
    queryFn: () => (HAS_API && token ? fetchMyMeasurements(token) : Promise.resolve(DEMO)),
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  // Prepare chart data
  const weightChart = measurements
    .filter((m) => m.weightG != null)
    .map((m) => ({ date: formatDate(m.recordedAt), kg: Math.round((m.weightG! / 1000) * 10) / 10 }));

  const bodyCompChart = measurements
    .filter((m) => m.bodyFatPct != null || (m as any).musclePct != null)
    .map((m) => ({
      date: formatDate(m.recordedAt),
      'Body Fat %': m.bodyFatPct ?? null,
      'Muscle %': (m as any).musclePct ?? null,
    }));

  const measurementChart = measurements.map((m) => ({
    date: formatDate(m.recordedAt),
    Waist: m.waistCm ?? null,
    Chest: (m as any).chestCm ?? null,
    Arms: (m as any).armsCm ?? null,
    Hips: (m as any).hipsCm ?? null,
    Thighs: (m as any).thighsCm ?? null,
  }));

  const first = weightChart[0]?.kg;
  const last = weightChart[weightChart.length - 1]?.kg;
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
      setWeight(''); setFat(''); setWaist(''); setChest(''); setArms(''); setHips(''); setThighs(''); setMuscle('');
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'weight' as MetricKey, label: 'Weight', icon: Activity },
    { key: 'bodyFat' as MetricKey, label: 'Body Comp' },
    { key: 'measurements' as MetricKey, label: 'Measurements', icon: Ruler },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Progress" subtitle={HAS_API ? 'Live' : 'Demo'}
        action={<button onClick={() => setAdding((a) => !a)} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg"><Plus size={16} /> Add</button>} />

      {adding && (
        <Card className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label="Weight (kg)" value={weight} onChange={setWeight} />
            <Field label="Body fat %" value={fat} onChange={setFat} />
            <Field label="Muscle %" value={muscle} onChange={setMuscle} />
            <Field label="Waist (cm)" value={waist} onChange={setWaist} />
            <Field label="Chest (cm)" value={chest} onChange={setChest} />
            <Field label="Arms (cm)" value={arms} onChange={setArms} />
            <Field label="Hips (cm)" value={hips} onChange={setHips} />
            <Field label="Thighs (cm)" value={thighs} onChange={setThighs} />
          </div>
          <button onClick={save} disabled={saving || (!weight && !fat && !waist && !chest && !arms && !hips && !thighs && !muscle)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-fg disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />} Save entry
          </button>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
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
        <Card className="text-center">
          <div className="tabular text-xl font-bold text-text">{(latest as any)?.musclePct ?? '—'}<span className="text-xs font-normal text-muted">%</span></div>
          <div className="text-[11px] text-muted">muscle</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn('flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition',
              activeTab === t.key ? 'bg-primary text-primary-fg' : 'text-muted hover:text-text')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <Card>
        {activeTab === 'weight' && (
          <>
            <div className="mb-3 flex items-center gap-2 text-muted"><LineIcon size={16} /><span className="text-sm font-medium">Weight trend</span></div>
            {weightChart.length < 2 ? (
              <p className="py-6 text-center text-sm text-muted">Add a few entries to see your trend.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weightChart} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={12} />
                  <YAxis stroke="rgb(var(--text-muted))" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip formatter={(v: number) => `${v} kg`} />
                  <Line type="monotone" dataKey="kg" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}

        {activeTab === 'bodyFat' && (
          <>
            <div className="mb-3 flex items-center gap-2 text-muted"><Activity size={16} /><span className="text-sm font-medium">Body composition</span></div>
            {bodyCompChart.length < 2 ? (
              <p className="py-6 text-center text-sm text-muted">Track body fat and muscle % to see trends.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={bodyCompChart} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={12} />
                  <YAxis stroke="rgb(var(--text-muted))" fontSize={12} domain={[0, 'auto']} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Body Fat %" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Muscle %" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}

        {activeTab === 'measurements' && (
          <>
            <div className="mb-3 flex items-center gap-2 text-muted"><Ruler size={16} /><span className="text-sm font-medium">Body measurements (cm)</span></div>
            {measurementChart.length < 2 ? (
              <p className="py-6 text-center text-sm text-muted">Record your measurements to see progress.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={measurementChart} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={12} />
                  <YAxis stroke="rgb(var(--text-muted))" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Waist" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Chest" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Arms" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Hips" stroke="#EC4899" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Thighs" stroke="#14B8A6" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </Card>

      {/* History table */}
      <Card>
        <div className="mb-2 text-sm font-medium text-muted">Measurement History</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted">
                <th className="py-1 text-left font-medium">Date</th>
                <th className="py-1 text-right font-medium">Weight</th>
                <th className="py-1 text-right font-medium">Fat %</th>
                <th className="py-1 text-right font-medium">Muscle %</th>
                <th className="py-1 text-right font-medium">Waist</th>
                <th className="py-1 text-right font-medium">Chest</th>
                <th className="py-1 text-right font-medium">Arms</th>
              </tr>
            </thead>
            <tbody>
              {[...measurements].reverse().map((m) => (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="py-1.5">{formatDate(m.recordedAt)}</td>
                  <td className="py-1.5 text-right">{m.weightG ? `${(m.weightG / 1000).toFixed(1)}` : '—'}</td>
                  <td className="py-1.5 text-right">{m.bodyFatPct ?? '—'}</td>
                  <td className="py-1.5 text-right">{(m as any).musclePct ?? '—'}</td>
                  <td className="py-1.5 text-right">{m.waistCm ?? '—'}</td>
                  <td className="py-1.5 text-right">{(m as any).chestCm ?? '—'}</td>
                  <td className="py-1.5 text-right">{(m as any).armsCm ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
