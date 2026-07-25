import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/stores/auth';
import { BRANCHES } from '@/lib/mockData';
import { formatMoney } from '@/lib/format';
import { HAS_API } from '@/lib/env';
import { fetchBranchDashboard } from '@/lib/dashboardApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageLoader } from '@/components/ui/PageLoader';

export function ManagerDashboard() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const branch = BRANCHES.find((b) => b.id === user?.branchId) ?? BRANCHES[0];

  const { data: live, isLoading } = useQuery({
    queryKey: ['branch-dashboard'],
    queryFn: () => fetchBranchDashboard(token!),
    enabled: HAS_API && !!token,
  });

  if (HAS_API && isLoading) return <PageLoader />;

  const k = HAS_API && live
    ? {
        members: live.kpis.totalMembers,
        revenue: live.kpis.revenue,
        profit: live.kpis.monthlyProfit,
        expiring: live.kpis.expiringMemberships,
        attendance: live.kpis.dailyAttendance,
        outstanding: live.kpis.outstanding,
      }
    : {
        members: branch.members,
        revenue: branch.monthlyRevenue,
        profit: branch.monthlyRevenue - branch.monthlyExpense,
        expiring: 14,
        attendance: 42,
        outstanding: 1_20_000,
      };

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" subtitle={`${branch.name} Branch`} />
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Members" value={k.members.toLocaleString('en-IN')} />
        <KpiCard label="Revenue (MTD)" value={formatMoney(k.revenue)} />
        <KpiCard label="Profit (MTD)" value={formatMoney(k.profit)} />
        <KpiCard label="Outstanding" value={formatMoney(k.outstanding)} />
        <KpiCard label="Check-ins today" value={String(k.attendance)} />
        <KpiCard label="Expiring (7d)" value={String(k.expiring)} />
      </div>
    </div>
  );
}
