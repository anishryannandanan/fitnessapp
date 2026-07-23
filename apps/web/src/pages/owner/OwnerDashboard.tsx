import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAuth } from '@/stores/auth';
import { getRevenueTrend } from '@/lib/api';
import { BRANCHES } from '@/lib/mockData';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card } from '@/components/ui/Card';

export function OwnerDashboard() {
  const activeBranchId = useAuth((s) => s.activeBranchId);
  const { data: trend = [] } = useQuery({ queryKey: ['revenue-trend'], queryFn: getRevenueTrend });

  const branches = activeBranchId === 'all' ? BRANCHES : BRANCHES.filter((b) => b.id === activeBranchId);
  const totalMembers = branches.reduce((s, b) => s + b.members, 0);
  const totalRevenue = branches.reduce((s, b) => s + b.monthlyRevenue, 0);
  const totalExpense = branches.reduce((s, b) => s + b.monthlyExpense, 0);
  const profit = totalRevenue - totalExpense;

  const comparison = BRANCHES.map((b) => ({
    name: b.code,
    profit: (b.monthlyRevenue - b.monthlyExpense) / 100,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle={activeBranchId === 'all' ? 'All branches — consolidated' : branches[0]?.name}
      />

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total Members" value={totalMembers.toLocaleString('en-IN')} delta={6} />
        <KpiCard label="Revenue (MTD)" value={formatMoney(totalRevenue)} delta={12} />
        <KpiCard label="Monthly Profit" value={formatMoney(profit)} delta={9} />
        <KpiCard label="Outstanding" value={formatMoney(4_30_000)} delta={-3} />
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Revenue trend (7 days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trend} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
            <XAxis dataKey="day" stroke="rgb(var(--text-muted))" fontSize={12} />
            <YAxis stroke="rgb(var(--text-muted))" fontSize={12} tickFormatter={(v) => `${v / 100000}L`} />
            <Tooltip formatter={(v: number) => formatMoney(v)} />
            <Line type="monotone" dataKey="kochi" stroke="#16A34A" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ernakulam" stroke="#3B82F6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Branch profit comparison</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={comparison} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
            <XAxis dataKey="name" stroke="rgb(var(--text-muted))" fontSize={12} />
            <YAxis stroke="rgb(var(--text-muted))" fontSize={12} tickFormatter={(v) => `${v / 100000}L`} />
            <Tooltip formatter={(v: number) => formatMoney(v * 100)} />
            <Bar dataKey="profit" fill="#16A34A" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
