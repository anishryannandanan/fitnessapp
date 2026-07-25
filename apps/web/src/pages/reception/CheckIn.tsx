import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, LogOut, QrCode, Search } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API } from '@/lib/env';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { checkInMember, checkOutMember, type CheckInResult } from '@/lib/attendanceApi';

export function CheckIn() {
  const token = useAuth((s) => s.token);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [checkedOut, setCheckedOut] = useState<number | null>(null);

  const reset = () => {
    setResult(null);
    setError(null);
    setCheckedOut(null);
    setQuery('');
  };

  const doCheckIn = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCheckedOut(null);
    try {
      if (HAS_API && token) {
        // Digits => phone lookup, otherwise treat as member code.
        const isPhone = /^\+?\d[\d\s-]{5,}$/.test(q);
        const res = await checkInMember(token, isPhone ? { phone: q, method: 'mobile' } : { code: q, method: 'member_id' });
        setResult(res);
      } else {
        await new Promise((r) => setTimeout(r, 400));
        setResult({
          alreadyCheckedIn: false,
          warning: null,
          attendance: { id: 'demo', checkInAt: new Date().toISOString() },
          member: { id: 'demo', name: 'Fathima S', code: q.toUpperCase() },
          membership: { status: 'active', endDate: new Date(Date.now() + 18 * 86400000).toISOString(), daysLeft: 18 },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const doCheckOut = async () => {
    if (!result) return;
    setLoading(true);
    try {
      if (HAS_API && token) {
        const res = await checkOutMember(token, result.member.id);
        setCheckedOut(res.durationMinutes);
      } else {
        await new Promise((r) => setTimeout(r, 300));
        setCheckedOut(64);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Check-in" subtitle={HAS_API ? 'Live' : 'Demo'} />

      {/* QR placeholder + lookup */}
      <Card className="flex flex-col items-center gap-3 py-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-surface-2 text-muted">
          <QrCode size={44} />
        </div>
        <p className="text-xs text-muted">Scan a QR, or look up by member code / mobile</p>
        <div className="flex w-full items-center gap-2 rounded-xl border bg-surface px-3 py-2">
          <Search size={18} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doCheckIn()}
            placeholder="KCH-0001 or +91…"
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
          />
        </div>
        <button
          onClick={doCheckIn}
          disabled={loading || !query.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Check in
        </button>
        {error && <p className="w-full rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
      </Card>

      {/* Result */}
      {result && (
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-muted">
              {result.member.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-text">{result.member.name}</div>
              <div className="text-xs text-muted">{result.member.code}</div>
            </div>
            {result.membership && (
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                  result.warning === 'expired' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success',
                )}
              >
                {result.warning === 'expired' ? 'Expired' : `${result.membership.daysLeft}d left`}
              </span>
            )}
          </div>

          {result.warning === 'already_checked_in' && (
            <Banner tone="info" text="Member is already checked in." />
          )}
          {result.warning === 'expired' && (
            <Banner tone="warn" text="Membership expired — checked in, but please renew." />
          )}
          {!result.warning && checkedOut === null && (
            <Banner tone="ok" text="Checked in successfully." />
          )}

          {checkedOut !== null ? (
            <Banner tone="ok" text={`Checked out · visit ${checkedOut} min`} />
          ) : (
            <button
              onClick={doCheckOut}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold text-text disabled:opacity-50"
            >
              <LogOut size={16} /> Check out
            </button>
          )}

          <button onClick={reset} className="w-full py-1 text-xs text-muted">Next member</button>
        </Card>
      )}
    </div>
  );
}

function Banner({ tone, text }: { tone: 'ok' | 'warn' | 'info'; text: string }) {
  const styles = {
    ok: 'bg-success/10 text-success',
    warn: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  }[tone];
  const Icon = tone === 'ok' ? CheckCircle2 : AlertTriangle;
  return (
    <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium', styles)}>
      <Icon size={16} /> {text}
    </div>
  );
}
