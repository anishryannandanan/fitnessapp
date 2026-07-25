import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CalendarClock, CreditCard, Loader2, Phone, Mail, Dumbbell,
} from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/PageLoader';
import {
  fetchMember, fetchMemberAttendance, collectPayment,
  type MemberProfileData, type MemberAttendance,
} from '@/lib/memberProfileApi';

const UNPAID = ['issued', 'partially_paid', 'overdue'];

const DEMO: MemberProfileData = {
  id: 'demo', fullName: 'Fathima S', memberCode: 'KCH-0001', status: 'active',
  gender: 'female', phone: '+919000000001', email: 'fathima@example.com', homeBranchId: 'b-kochi',
  memberships: [{ id: 'm1', status: 'active', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 18 * 86400000).toISOString(), priceSnapshot: 1200000, sessionsTotal: null, sessionsUsed: 0, package: { name: 'Gym Only - Annual', type: 'non_trainer' } }],
  invoices: [{ id: 'i1', invoiceNumber: 'INV-KCH-000001', total: 1200000, amountPaid: 0, status: 'issued', createdAt: new Date().toISOString() }],
  payments: [],
};
const DEMO_ATT: MemberAttendance[] = [
  { id: 'a1', checkInAt: new Date(Date.now() - 86400000).toISOString(), checkOutAt: new Date(Date.now() - 82800000).toISOString(), durationMinutes: 60 },
];

const METHODS = ['cash', 'upi', 'card', 'bank_transfer'] as const;

export function MemberProfile() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]>('cash');
  const [busy, setBusy] = useState(false);

  const { data: member, isLoading, isError } = useQuery({
    queryKey: ['member', id],
    queryFn: () => (HAS_API && token ? fetchMember(token, id) : Promise.resolve(DEMO)),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['member-attendance', id],
    queryFn: () => (HAS_API && token ? fetchMemberAttendance(token, id) : Promise.resolve(DEMO_ATT)),
  });

  if (isLoading) return <PageLoader />;
  if (isError || !member) return <Card className="text-sm text-danger">Couldn't load this member.</Card>;

  const activeMembership = member.memberships.find((m) => m.status === 'active') ?? member.memberships[0];
  const unpaidInvoices = member.invoices.filter((i) => UNPAID.includes(i.status));
  const totalDues = unpaidInvoices.reduce((s, i) => s + Math.max(0, i.total - i.amountPaid), 0);

  const daysLeft = activeMembership
    ? Math.ceil((new Date(activeMembership.endDate).getTime() - Date.now()) / 86400000)
    : null;

  const pay = async (invoiceId: string, balance: number) => {
    setBusy(true);
    try {
      if (HAS_API && token) {
        await collectPayment(token, { invoiceId, amount: balance, method });
        qc.invalidateQueries({ queryKey: ['member', id] });
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      setPayingInvoice(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <Card className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {member.fullName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-bold text-text">{member.fullName}</h1>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
              member.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
              {member.status}
            </span>
          </div>
          <div className="text-xs text-muted">{member.memberCode}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
            {member.phone && <span className="flex items-center gap-1"><Phone size={12} />{member.phone}</span>}
            {member.email && <span className="flex items-center gap-1"><Mail size={12} />{member.email}</span>}
          </div>
        </div>
      </Card>

      {/* Membership */}
      {activeMembership && (
        <Card>
          <div className="mb-2 flex items-center gap-2 text-muted">
            <Dumbbell size={16} /><span className="text-sm font-medium">Membership</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-text">{activeMembership.package?.name ?? 'Package'}</div>
              <div className="text-xs text-muted">
                {daysLeft !== null && daysLeft >= 0 ? `Expires in ${daysLeft} days` : 'Expired'}
                {activeMembership.sessionsTotal ? ` · ${activeMembership.sessionsTotal - activeMembership.sessionsUsed} PT sessions left` : ''}
              </div>
            </div>
            <span className="tabular text-sm font-semibold text-text">{formatMoney(activeMembership.priceSnapshot)}</span>
          </div>
        </Card>
      )}

      {/* Dues + collect payment */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted"><CreditCard size={16} /><span className="text-sm font-medium">Dues</span></div>
          <span className={cn('tabular text-sm font-bold', totalDues > 0 ? 'text-danger' : 'text-success')}>
            {totalDues > 0 ? formatMoney(totalDues) : 'No dues'}
          </span>
        </div>

        {unpaidInvoices.length === 0 ? (
          <p className="text-sm text-muted">All invoices settled.</p>
        ) : (
          <div className="space-y-2">
            {unpaidInvoices.map((inv) => {
              const balance = inv.total - inv.amountPaid;
              const isPaying = payingInvoice === inv.id;
              return (
                <div key={inv.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text">{inv.invoiceNumber}</div>
                      <div className="text-xs text-muted">Balance {formatMoney(balance)}</div>
                    </div>
                    {!isPaying && (
                      <button onClick={() => setPayingInvoice(inv.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg">
                        Collect
                      </button>
                    )}
                  </div>
                  {isPaying && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-4 gap-1.5">
                        {METHODS.map((m) => (
                          <button key={m} onClick={() => setMethod(m)}
                            className={cn('rounded-lg border py-1.5 text-xs font-medium capitalize',
                              method === m ? 'border-primary bg-primary/10 text-primary' : 'text-muted')}>
                            {m.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => pay(inv.id, balance)} disabled={busy}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-fg disabled:opacity-60">
                          {busy && <Loader2 size={14} className="animate-spin" />} Collect {formatMoney(balance)}
                        </button>
                        <button onClick={() => setPayingInvoice(null)} className="rounded-lg border px-3 py-2 text-xs text-muted">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Payment history */}
      {member.payments.length > 0 && (
        <Card>
          <div className="mb-2 text-sm font-medium text-muted">Payment history</div>
          <div className="divide-y divide-border">
            {member.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="capitalize text-text">{p.method.replace('_', ' ')}</span>
                <span className="text-xs text-muted">{new Date(p.paidAt).toLocaleDateString()}</span>
                <span className="tabular font-medium text-success">{formatMoney(p.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent attendance */}
      <Card>
        <div className="mb-2 flex items-center gap-2 text-muted"><CalendarClock size={16} /><span className="text-sm font-medium">Recent visits</span></div>
        {attendance.length === 0 ? (
          <p className="text-sm text-muted">No visits recorded.</p>
        ) : (
          <div className="divide-y divide-border">
            {attendance.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-text">{new Date(a.checkInAt).toLocaleDateString()}</span>
                <span className="text-xs text-muted">
                  {new Date(a.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {a.checkOutAt ? ` – ${new Date(a.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </span>
                <span className="text-xs font-medium text-muted">{a.durationMinutes != null ? `${a.durationMinutes} min` : 'open'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
