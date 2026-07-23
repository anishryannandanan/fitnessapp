import { useAuth } from '@/stores/auth';
import { BRANCHES } from '@/lib/mockData';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';

export function ManagerDashboard() {
  const user = useAuth((s) => s.user);
  const branch = BRANCHES.find((b) => b.id === user?.branchId) ?? BRANCHES[0];
  const profit = branch.monthlyRevenue - branch.monthlyExpense;

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" subtitle={`${branch.name} Branch`} />
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Members" value={branch.members.toLocaleString('en-IN')} delta={5} />
        <KpiCard label="Revenue (MTD)" value={formatMoney(branch.monthlyRevenue)} delta={8} />
        <KpiCard label="Profit (MTD)" value={formatMoney(profit)} delta={7} />
        <KpiCard label="Expiring soon" value="14" delta={-2} />
      </div>
    </div>
  );
}
