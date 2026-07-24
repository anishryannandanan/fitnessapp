import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { getMembers } from '@/lib/api';
import { fetchMembers } from '@/lib/membersApi';
import { HAS_API } from '@/lib/env';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import type { Member } from '@/lib/types';

const statusStyle: Record<string, string> = {
  active: 'bg-success/10 text-success',
  expired: 'bg-danger/10 text-danger',
  frozen: 'bg-info/10 text-info',
};

export function MembersList() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const branchId = user?.role === 'owner' ? null : user?.branchId;
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading, isError } = useQuery({
    queryKey: ['members', HAS_API ? 'api' : 'mock', branchId, search],
    queryFn: (): Promise<Member[]> => {
      // Real backend when configured + authenticated; otherwise mock data.
      if (HAS_API && token) return fetchMembers(token, search || undefined);
      return getMembers(branchId);
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Members" subtitle={HAS_API ? 'Live' : 'Demo data'} />

      <div className="flex items-center gap-2 rounded-xl border bg-surface px-3 py-2">
        <Search size={18} className="text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone or code"
          className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
        />
      </div>

      {isLoading && <Card className="text-sm text-muted">Loading members…</Card>}
      {isError && <Card className="text-sm text-danger">Couldn't load members. Please try again.</Card>}
      {!isLoading && !isError && members.length === 0 && (
        <Card className="text-sm text-muted">No members found.</Card>
      )}

      <div className="space-y-2">
        {members.map((m) => (
          <Card key={m.id} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-muted">
              {m.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-text">{m.name}</div>
              <div className="text-xs text-muted">{m.code} · {m.packageName}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', statusStyle[m.status])}>
                {m.status}
              </span>
              {m.duesMinor > 0 && (
                <span className="text-[11px] font-medium text-danger">Due {formatMoney(m.duesMinor)}</span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
