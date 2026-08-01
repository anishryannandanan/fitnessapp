import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Trash2 } from 'lucide-react';
import { getBranches, updateBranch, deleteBranch } from '@/lib/api';
import type { UpdateBranchInput } from '@/lib/api';
import type { Branch } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EditBranchModal } from '@/components/EditBranchModal';

export function Branches() {
  const queryClient = useQueryClient();
  const { data: branches = [], isLoading } = useQuery({ queryKey: ['branches'], queryFn: getBranches });

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBranchInput }) => updateBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setEditingBranch(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const handleSave = async (id: string, data: UpdateBranchInput) => {
    await updateMutation.mutateAsync({ id, data });
  };

  const handleDeactivate = (branch: Branch) => {
    if (window.confirm(`Are you sure you want to deactivate "${branch.name}"? This branch will be hidden from operations.`)) {
      deactivateMutation.mutate(branch.id);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Branches" subtitle="Fitness World" />
      {isLoading && <Card>Loading...</Card>}
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
                  {!b.isActive && (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">Inactive</span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  {b.members.toLocaleString('en-IN')} members · Profit {formatMoney(profit)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingBranch(b)}
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-primary"
                  title="Edit branch"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDeactivate(b)}
                  disabled={!b.isActive}
                  className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
                  title="Deactivate branch"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingBranch && (
        <EditBranchModal
          branch={editingBranch}
          onSave={handleSave}
          onClose={() => setEditingBranch(null)}
          saving={updateMutation.isPending}
        />
      )}
    </div>
  );
}
