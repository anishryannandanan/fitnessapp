import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Trash2, Plus } from 'lucide-react';
import { getBranches, updateBranch, deleteBranch, hardDeleteBranch, createBranch } from '@/lib/api';
import type { UpdateBranchInput } from '@/lib/api';
import type { Branch } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EditBranchModal } from '@/components/EditBranchModal';
import { AddBranchModal } from '@/components/AddBranchModal';
import type { CreateBranchInput } from '@/components/AddBranchModal';

export function Branches() {
  const queryClient = useQueryClient();
  const { data: branches = [], isLoading } = useQuery({ queryKey: ['branches'], queryFn: getBranches });

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBranchInput }) => updateBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setEditingBranch(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBranchInput) => createBranch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setShowAddModal(false);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => hardDeleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const handleSave = async (id: string, data: UpdateBranchInput) => {
    await updateMutation.mutateAsync({ id, data });
  };

  const handleCreate = async (data: CreateBranchInput) => {
    await createMutation.mutateAsync(data);
  };

  const handleDeactivate = (branch: Branch) => {
    if (window.confirm(`Are you sure you want to deactivate "${branch.name}"? This branch will be hidden from operations.`)) {
      deactivateMutation.mutate(branch.id);
    }
  };

  const handleHardDelete = (branch: Branch) => {
    if (window.confirm(`⚠️ PERMANENTLY DELETE "${branch.name}"?\n\nThis will remove the branch and all its data forever. This cannot be undone!\n\nNote: Branches with members cannot be deleted.`)) {
      hardDeleteMutation.mutate(branch.id);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Branches"
        subtitle="Fitness World"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition hover:opacity-90"
          >
            <Plus size={16} />
            Add Branch
          </button>
        }
      />
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
                  onClick={() => handleHardDelete(b)}
                  className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                  title="Delete branch permanently"
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

      {/* Add Branch Modal */}
      {showAddModal && (
        <AddBranchModal
          onSave={handleCreate}
          onClose={() => setShowAddModal(false)}
          saving={createMutation.isPending}
        />
      )}
    </div>
  );
}
