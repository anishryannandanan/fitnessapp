import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAuth } from '@/stores/auth';
import { getRevenueTrend } from '@/lib/api';
import { BRANCHES } from '@/lib/mockData';
import { formatMoney } from '@/lib/format';
import { HAS_API } from '@/lib/env';
import { fetchOwnerDashboard } from '@/lib/dashboardApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/PageLoader';

export function OwnerDashboard() {
  const activeBranchId = useAuth((s) => s.activeBranchId);
  const token = useAuth((s) => s.token);

  // Real dashboard when a backend is configured.
  const { data: live, isLoading } = useQuery({
    queryKey: ['owner-dashboard', activeBranchId],
    queryFn: () => fetchOwnerDashboard(token!, activeBranchId),
    enabled: HAS_API && !!token,
  });

  // Mock trend only (no trend endpoint yet); used for the line chart in demo mode.
  const { data: trend = [] } = useQuery({
    queryKey: ['revenue-trend'],
    queryFn: getRevenueTrend,
    enabled: !HAS_API,
  });

  if (HAS_API && isLoading) return <PageLoader />;

  // ---- KPI values: live when available, else mock ----
  let totalMembers: number, totalRevenue: number, profit: number, outstanding: number, expiring: number;
  let comparison: { name: string; revenue: number }[];

  if (HAS_API && live) {
    totalMembers = live.kpis.totalMembers;
    totalRevenue = live.kpis.revenue;
    profit = live.kpis.monthlyProfit;
    outstanding = live.kpis.outstanding;
    expiring = live.kpis.expiringMemberships;
    comparison = live.comparison.map((c) => ({ name: c.code, revenue: c.revenue / 100 }));
  } else {
    const branches = activeBranchId === 'all' ? BRANCHES : BRANCHES.filter((b) => b.id === activeBranchId);
    totalMembers = branches.reduce((s, b) => s + b.members, 0);
    totalRevenue = branches.reduce((s, b) => s + b.monthlyRevenue, 0);
    const totalExpense = branches.reduce((s, b) => s + b.monthlyExpense, 0);
    profit = totalRevenue - totalExpense;
    outstanding = 4_30_000;
    expiring = 14;
    comparison = BRANCHES.map((b) => ({ name: b.code, revenue: b.monthlyRevenue / 100 }));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle={activeBranchId === 'all' ? 'All branches — consolidated' : BRANCHES.find((b) => b.id === activeBranchId)?.name}
      />

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total Members" value={totalMembers.toLocaleString('en-IN')} />
        <KpiCard label="Revenue (MTD)" value={formatMoney(totalRevenue)} />
        <KpiCard label="Profit (MTD)" value={formatMoney(profit)} />
        <KpiCard label="Outstanding" value={formatMoney(outstanding)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Expiring (7d)" value={String(expiring)} />
        <KpiCard label="Branches" value={String(comparison.length)} />
      </div>

      {!HAS_API && (
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
      )}

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Branch revenue comparison</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={comparison} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
            <XAxis dataKey="name" stroke="rgb(var(--text-muted))" fontSize={12} />
            <YAxis stroke="rgb(var(--text-muted))" fontSize={12} tickFormatter={(v) => `${v / 100000}L`} />
            <Tooltip formatter={(v: number) => formatMoney(v * 100)} />
            <Bar dataKey="revenue" fill="#16A34A" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
