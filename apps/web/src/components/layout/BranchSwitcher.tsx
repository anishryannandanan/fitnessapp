import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { BRANCHES } from '@/lib/mockData';

// Owner-only branch context switcher (All Branches = consolidated)
export function BranchSwitcher() {
  const user = useAuth((s) => s.user);
  const activeBranchId = useAuth((s) => s.activeBranchId);
  const setActiveBranch = useAuth((s) => s.setActiveBranch);

  if (!user) return null;

  if (user.role !== 'owner') {
    const branch = BRANCHES.find((b) => b.id === user.branchId);
    return <span className="text-sm font-medium text-muted">{branch ? branch.name : 'Branch'}</span>;
  }

  return (
    <div className="relative">
      <select
        value={activeBranchId}
        onChange={(e) => setActiveBranch(e.target.value)}
        aria-label="Select branch"
        className="appearance-none rounded-full border bg-surface-2 py-1.5 pl-3 pr-8 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <option value="all">All Branches</option>
        {BRANCHES.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}
