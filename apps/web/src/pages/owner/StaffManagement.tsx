import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, KeyRound, Search, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EditStaffModal } from '@/components/EditStaffModal';
import { ResetPasswordModal } from '@/components/ResetPasswordModal';
import { AddStaffModal } from '@/components/AddStaffModal';
import { getStaff, updateStaff, resetStaffPassword, createStaff } from '@/lib/staffApi';
import type { StaffMember, UpdateStaffInput, CreateStaffInput } from '@/lib/staffApi';
import { getBranches } from '@/lib/api';

export function StaffManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', search],
    queryFn: () => getStaff(search || undefined),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffInput }) => updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setEditingStaff(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateStaffInput) => createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowAddModal(false);
    },
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => resetStaffPassword(id, password),
    onSuccess: () => {
      setResetPasswordStaff(null);
    },
  });

  const handleSave = async (id: string, data: UpdateStaffInput) => {
    await updateMutation.mutateAsync({ id, data });
  };

  const handleCreate = async (data: CreateStaffInput) => {
    await createMutation.mutateAsync(data);
  };

  const handleResetPassword = async (id: string, password: string) => {
    await resetPwMutation.mutateAsync({ id, password });
  };

  const roleColors: Record<string, string> = {
    manager: '#3B82F6',
    receptionist: '#F97316',
    trainer: '#A855F7',
    dietician: '#EC4899',
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff Management"
        subtitle="Manage staff accounts & passwords"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition hover:opacity-90"
          >
            <Plus size={16} />
            Add Staff
          </button>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone..."
          className="w-full rounded-xl border bg-surface-2 py-2.5 pl-9 pr-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {isLoading && <Card>Loading staff...</Card>}

      {/* Staff List */}
      <div className="space-y-3">
        {staff.map((s) => (
          <Card key={s.id} className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: s.avatarColor || roleColors[s.role] || '#64748B' }}
            >
              {s.fullName.charAt(0)}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text">{s.fullName}</span>
                {!s.isActive && (
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">Inactive</span>
                )}
              </div>
              <div className="text-xs text-muted">
                <span className="capitalize">{s.staffProfile?.staffType || s.role}</span>
                {s.userBranches?.[0]?.branch && (
                  <span> · {s.userBranches[0].branch.name}</span>
                )}
              </div>
              <div className="text-xs text-muted">{s.email}</div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditingStaff(s)}
                className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-primary"
                title="Edit staff"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setResetPasswordStaff(s)}
                className="rounded-lg p-2 text-muted transition hover:bg-warning/10 hover:text-warning"
                title="Reset password"
              >
                <KeyRound size={16} />
              </button>
            </div>
          </Card>
        ))}

        {!isLoading && staff.length === 0 && (
          <Card className="py-8 text-center text-sm text-muted">
            No staff found.
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          onSave={handleSave}
          onClose={() => setEditingStaff(null)}
          saving={updateMutation.isPending}
        />
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal
          branches={branches.map((b) => ({ id: b.id, name: b.name, code: b.code }))}
          onSave={handleCreate}
          onClose={() => setShowAddModal(false)}
          saving={createMutation.isPending}
        />
      )}

      {/* Reset Password Modal */}
      {resetPasswordStaff && (
        <ResetPasswordModal
          staffName={resetPasswordStaff.fullName}
          onReset={(password) => handleResetPassword(resetPasswordStaff.id, password)}
          onClose={() => setResetPasswordStaff(null)}
          saving={resetPwMutation.isPending}
          success={resetPwMutation.isSuccess}
        />
      )}
    </div>
  );
}
