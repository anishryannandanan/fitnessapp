import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronRight } from 'lucide-react';
import { getBranches } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

export function Branches() {
  const { data: branches = [], isLoading } = useQuery({ queryKey: ['branches'], queryFn: getBranches });

  return (
    <div className="space-y-4">
      <PageHeader title="Branches" subtitle="Fitness World" />
      {isLoading && <Card>Loading…</Card>}
      <div className="space-y-3">
        {branches.map((b) => {
          const profit = b.monthlyRevenue - b.monthlyExpense;
          return (
            <Card key={b.id} className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text">{b.name}</span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">{b.code}</span>
                </div>
                <div className="text-xs text-muted">
                  {b.members.toLocaleString('en-IN')} members · Profit {formatMoney(profit)}
                </div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
