import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart as LineIcon, Search, User, Ruler } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { apiFetch } from '@/lib/authApi';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

interface Measurement {
  id: string;
  recordedAt: string;
  weightG: number | null;
  bodyFatPct: number | null;
  musclePct: number | null;
  waistCm: number | null;
  chestCm: number | null;
  armsCm: number | null;
  hipsCm: number | null;
  thighsCm: number | null;
}

interface MemberSummary {
  id: string;
  fullName: string;
  memberCode: string;
}

const DEMO_MEMBERS: MemberSummary[] = [
  { id: 'm1', fullName: 'Rahul Sharma', memberCode: 'MEM-001' },
  { id: 'm2', fullName: 'Priya Nair', memberCode: 'MEM-002' },
  { id: 'm3', fullName: 'Arun Kumar', memberCode: 'MEM-003' },
];

const DEMO_DATA: Measurement[] = [
  { id: '1', recordedAt: new Date(Date.now() - 42 * 86400000).toISOString(), weightG: 75000, bodyFatPct: 22, musclePct: 36, waistCm: 82, chestCm: 100, armsCm: 35, hipsCm: 95, thighsCm: 55 },
  { id: '2', recordedAt: new Date(Date.now() - 28 * 86400000).toISOString(), weightG: 74000, bodyFatPct: 21, musclePct: 37, waistCm: 81, chestCm: 101, armsCm: 35.5, hipsCm: 94, thighsCm: 55.5 },
  { id: '3', recordedAt: new Date(Date.now() - 14 * 86400000).toISOString(), weightG: 73500, bodyFatPct: 20, musclePct: 37.5, waistCm: 80, chestCm: 101, armsCm: 36, hipsCm: 93, thighsCm: 56 },
  { id: '4', recordedAt: new Date().toISOString(), weightG: 73000, bodyFatPct: 19.5, musclePct: 38, waistCm: 79, chestCm: 102, armsCm: 36.5, hipsCm: 92, thighsCm: 56 },
];

export function TrainerProgress() {
  const token = useAuth((s) => s.token);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['trainer-members'],
    queryFn: () =>
      HAS_API && token
        ? apiFetch<MemberSummary[]>('/api/v1/members?limit=50', token)
        : Promise.resolve(DEMO_MEMBERS),
  });

  const { data: measurements = [] } = useQuery({
    queryKey: ['member-progress', selectedMember],
    enabled: !!selectedMember,
    queryFn: () =>
      HAS_API && token && selectedMember
        ? apiFetch<Measurement[]>(`/api/v1/progress/${selectedMember}/measurements`, token)
        : Promise.resolve(DEMO_DATA),
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  const filteredMembers = members.filter(
    (m) => m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || m.memberCode.includes(searchQuery),
  );

  const weightChart = measurements
    .filter((m) => m.weightG != null)
    .map((m) => ({ date: formatDate(m.recordedAt), kg: Math.round((m.weightG! / 1000) * 10) / 10 }));

  const bodyCompChart = measurements
    .filter((m) => m.bodyFatPct != null || m.musclePct != null)
    .map((m) => ({
      date: formatDate(m.recordedAt),
      'Body Fat %': m.bodyFatPct,
      'Muscle %': m.musclePct,
    }));

  const measurementChart = measurements.map((m) => ({
    date: formatDate(m.recordedAt),
    Waist: m.waistCm,
    Chest: m.chestCm,
    Arms: m.armsCm,
    Hips: m.hipsCm,
    Thighs: m.thighsCm,
  }));

  const selected = members.find((m) => m.id === selectedMember);

  return (
    <div className="space-y-4">
      <PageHeader title="Progress Tracking" subtitle="View & track client measurements" />

      {/* Member selector */}
      <Card>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member..."
            className="w-full rounded-lg border bg-surface-2 py-2 pl-9 pr-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filteredMembers.slice(0, 8).map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMember(m.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                selectedMember === m.id
                  ? 'bg-primary text-primary-fg'
                  : 'bg-surface-2 text-text hover:bg-surface-3'
              }`}
            >
              <User size={14} />
              {m.fullName}
            </button>
          ))}
        </div>
      </Card>

      {!selectedMember ? (
        <Card className="py-12 text-center text-muted">
          Select a member above to view their progress charts
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted">
            Showing progress for <span className="font-semibold text-text">{selected?.fullName}</span>
          </div>

          {/* Weight Chart */}
          <Card>
            <div className="mb-3 flex items-center gap-2 text-muted">
              <LineIcon size={16} /><span className="text-sm font-medium">Weight trend</span>
            </div>
            {weightChart.length < 2 ? (
              <p className="py-6 text-center text-sm text-muted">Not enough data points.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightChart} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={12} />
                  <YAxis stroke="rgb(var(--text-muted))" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip formatter={(v: number) => `${v} kg`} />
                  <Line type="monotone" dataKey="kg" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Body Composition */}
          <Card>
            <div className="mb-3 flex items-center gap-2 text-muted">
              <LineIcon size={16} /><span className="text-sm font-medium">Body composition</span>
            </div>
            {bodyCompChart.length < 2 ? (
              <p className="py-6 text-center text-sm text-muted">Not enough data points.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
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
          </Card>

          {/* Body Measurements */}
          <Card>
            <div className="mb-3 flex items-center gap-2 text-muted">
              <Ruler size={16} /><span className="text-sm font-medium">Body measurements (cm)</span>
            </div>
            {measurementChart.length < 2 ? (
              <p className="py-6 text-center text-sm text-muted">Not enough data points.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
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
          </Card>
        </>
      )}
    </div>
  );
}
