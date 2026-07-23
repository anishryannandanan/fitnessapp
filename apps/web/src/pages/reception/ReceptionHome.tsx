import { UserPlus, QrCode, CreditCard, ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatMoney } from '@/lib/format';

const actions = [
  { label: 'New Member', icon: UserPlus, color: 'text-primary bg-primary/10' },
  { label: 'Check-in', icon: QrCode, color: 'text-info bg-info/10' },
  { label: 'New Payment', icon: CreditCard, color: 'text-accent bg-accent/10' },
  { label: 'New Enquiry', icon: ClipboardList, color: 'text-warning bg-warning/10' },
];

export function ReceptionHome() {
  return (
    <div className="space-y-4">
      <PageHeader title="Front Desk" subtitle="Kochi Branch · Today" />

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Check-ins" value="42" />
        <KpiCard label="Renewals" value="5" />
        <KpiCard label="Payments" value={formatMoney(18_40_000)} />
        <KpiCard label="Enquiries" value="7" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <button key={a.label}>
            <Card className="flex h-full flex-col items-center gap-2 py-5 transition hover:border-primary/40">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${a.color}`}>
                <a.icon size={24} />
              </span>
              <span className="text-sm font-semibold text-text">{a.label}</span>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
