import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Check, CreditCard, Loader2, PartyPopper, User,
} from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  fetchPackages, onboardMember, recordPayment,
  type ApiPackage, type OnboardResult, type PaymentMethod,
} from '@/lib/onboardingApi';

type Step = 0 | 1 | 2 | 3;
const STEP_LABELS = ['Personal', 'Package', 'Review', 'Payment'];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank' },
];

// Demo packages when running without a backend.
const DEMO_PACKAGES: ApiPackage[] = [
  { id: 'd1', name: 'Gym Only - Monthly', type: 'non_trainer', durationDays: 30, price: 150000, taxPercent: 0, ptSessions: null, includesTrainer: false, branchId: null, isActive: true },
  { id: 'd2', name: 'Personal Training - Monthly', type: 'trainer', durationDays: 30, price: 500000, taxPercent: 0, ptSessions: 12, includesTrainer: true, branchId: null, isActive: true },
];

export function OnboardWizard() {
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);

  const [step, setStep] = useState<Step>(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [packageId, setPackageId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [paid, setPaid] = useState(false);

  const { data: packages = [] } = useQuery({
    queryKey: ['packages', HAS_API],
    queryFn: () => (HAS_API && token ? fetchPackages(token) : Promise.resolve(DEMO_PACKAGES)),
  });

  const selectedPackage = packages.find((p) => p.id === packageId) ?? null;
  const invoiceTotal = selectedPackage
    ? selectedPackage.price + Math.round((selectedPackage.price * selectedPackage.taxPercent) / 100)
    : 0;

  const canNext =
    (step === 0 && fullName.trim().length >= 2 && phone.trim().length >= 6) ||
    (step === 1 && !!packageId) ||
    step === 2;

  const createMember = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (HAS_API && token) {
        const res = await onboardMember(token, {
          personal: { fullName: fullName.trim(), phone: phone.trim(), email: email.trim() || undefined },
          packageId: packageId!,
          password: password.trim() || undefined,
        });
        setResult(res);
      } else {
        // Demo mode: synthesize a result so the flow is fully clickable.
        await new Promise((r) => setTimeout(r, 500));
        setResult({
          member: { id: 'demo', memberCode: 'KCH-0001', fullName: fullName.trim() },
          membership: { id: 'demo', status: 'active', endDate: new Date().toISOString(), priceSnapshot: selectedPackage!.price, taxSnapshot: 0 },
          invoice: { id: 'demo', invoiceNumber: 'INV-KCH-000001', total: invoiceTotal, amountPaid: 0 },
        });
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create member');
    } finally {
      setSubmitting(false);
    }
  };

  const collectPayment = async () => {
    if (!result) return;
    setError(null);
    setSubmitting(true);
    try {
      if (HAS_API && token) {
        await recordPayment(token, { invoiceId: result.invoice.id, amount: result.invoice.total, method });
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      setPaid(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success screen ----
  if (result && (paid || step === 3)) {
    return (
      <div className="space-y-4">
        <PageHeader title="New Member" subtitle={HAS_API ? 'Live' : 'Demo'} />
        {paid ? (
          <Card className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="rounded-2xl bg-success/10 p-4 text-success"><PartyPopper size={28} /></div>
            <h2 className="text-lg font-bold text-text">{result.member.fullName} is all set!</h2>
            <p className="text-sm text-muted">
              Member {result.member.memberCode} · Invoice {result.invoice.invoiceNumber} paid
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => navigate('/reception/members')} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg">
                View members
              </button>
              <button onClick={() => window.location.reload()} className="rounded-xl border px-4 py-2 text-sm font-semibold text-text">
                Add another
              </button>
            </div>
          </Card>
        ) : (
          <>
            <Card className="flex items-center gap-3">
              <div className="rounded-2xl bg-success/10 p-3 text-success"><Check size={22} /></div>
              <div className="flex-1">
                <div className="font-semibold text-text">Member created · {result.member.memberCode}</div>
                <div className="text-xs text-muted">Invoice {result.invoice.invoiceNumber}</div>
              </div>
            </Card>
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Amount due</span>
                <span className="tabular text-lg font-bold text-text">{formatMoney(result.invoice.total)}</span>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-muted">Payment method</div>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMethod(m.value)}
                      className={cn(
                        'rounded-xl border py-2 text-sm font-medium transition',
                        method === m.value ? 'border-primary bg-primary/10 text-primary' : 'text-muted hover:bg-surface-2',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
              <button
                onClick={collectPayment}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                {submitting ? 'Processing…' : `Collect ${formatMoney(result.invoice.total)}`}
              </button>
              <button onClick={() => navigate('/reception/members')} className="w-full py-1 text-xs text-muted">
                Skip for now
              </button>
            </Card>
          </>
        )}
      </div>
    );
  }

  // ---- Wizard steps ----
  return (
    <div className="space-y-4">
      <PageHeader title="New Member" subtitle={`Step ${step + 1} of 4 · ${STEP_LABELS[step]}`} />

      {/* progress */}
      <div className="flex gap-1.5">
        {STEP_LABELS.map((_, i) => (
          <div key={i} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-surface-2')} />
        ))}
      </div>

      {step === 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-muted"><User size={18} /><span className="text-sm font-medium">Personal details</span></div>
          <Field label="Full name" value={fullName} onChange={setFullName} placeholder="e.g. Fathima S" />
          <Field label="Mobile" value={phone} onChange={setPhone} placeholder="+91…" />
          <Field label="Email (optional)" value={email} onChange={setEmail} placeholder="name@example.com" />
          <Field label="Password (optional, for member login)" value={password} onChange={setPassword} placeholder="Min 6 characters" />
        </Card>
      )}

      {step === 1 && (
        <div className="space-y-2">
          {packages.map((p) => (
            <button key={p.id} onClick={() => setPackageId(p.id)} className="w-full text-left">
              <Card className={cn('flex items-center gap-3 transition', packageId === p.id ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/40')}>
                <div className="flex-1">
                  <div className="font-semibold text-text">{p.name}</div>
                  <div className="text-xs text-muted">
                    {p.durationDays} days{p.ptSessions ? ` · ${p.ptSessions} PT sessions` : ''}
                  </div>
                </div>
                <div className="tabular font-bold text-text">{formatMoney(p.price)}</div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {step === 2 && selectedPackage && (
        <Card className="space-y-2">
          <Row label="Name" value={fullName} />
          <Row label="Mobile" value={phone} />
          {email && <Row label="Email" value={email} />}
          <Row label="Package" value={selectedPackage.name} />
          <div className="my-1 border-t" />
          <Row label="Total" value={formatMoney(invoiceTotal)} bold />
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        </Card>
      )}

      {/* footer nav */}
      <div className="flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep((s) => (s - 1) as Step)} className="flex items-center gap-1 rounded-xl border px-4 py-2.5 text-sm font-semibold text-text">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        {step < 2 && (
          <button
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={!canNext}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg disabled:opacity-50"
          >
            Next <ArrowRight size={16} />
          </button>
        )}
        {step === 2 && (
          <button
            onClick={createMember}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {submitting ? 'Creating…' : 'Create member'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted">{label}</span>
      <span className={cn('text-sm', bold ? 'font-bold text-text tabular' : 'text-text')}>{value}</span>
    </div>
  );
}
