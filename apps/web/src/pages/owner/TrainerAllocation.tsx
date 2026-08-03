import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserMinus, Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { getTrainerAssignments, assignTrainer, unassignTrainer } from '@/lib/trainerAssignmentApi';
import { getStaff } from '@/lib/staffApi';
import { getMembers } from '@/lib/api';
import { useAuth } from '@/stores/auth';

export function TrainerAllocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['trainer-assignments'],
    queryFn: () => getTrainerAssignments(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => getStaff(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => getMembers(),
  });

  const trainers = staff.filter((s) => s.staffProfile?.staffType === 'trainer' || s.role === 'trainer');

  const assignMutation = useMutation({
    mutationFn: assignTrainer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-assignments'] });
      setShowAssignModal(false);
      setSelectedTrainer('');
      setSelectedMember('');
      setNotes('');
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const unassignMutation = useMutation({
    mutationFn: unassignTrainer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-assignments'] });
    },
  });

  const handleAssign = () => {
    if (!selectedTrainer || !selectedMember) {
      setError('Select both a trainer and a member');
      return;
    }
    const branchId = user?.branchId || trainers.find((t) => t.id === selectedTrainer)?.userBranches?.[0]?.branch?.id || '';
    assignMutation.mutate({
      branchId,
      trainerId: selectedTrainer,
      memberId: selectedMember,
      notes: notes || undefined,
    });
  };

  const getTrainerName = (trainerId: string) =>
    staff.find((s) => s.id === trainerId)?.fullName ?? 'Unknown Trainer';

  const getMemberName = (memberId: string) => {
    const m = members.find((m: any) => m.id === memberId);
    return m?.fullName ?? 'Unknown Member';
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trainer Allocation"
        subtitle="Assign personal trainers to members"
        action={
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition hover:opacity-90"
          >
            <UserPlus size={16} />
            Assign Trainer
          </button>
        }
      />

      {isLoading && <Card>Loading assignments...</Card>}

      {/* Active Assignments */}
      <div className="space-y-3">
        {assignments.length > 0 ? (
          assignments.map((a) => (
            <Card key={a.id} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text">{getTrainerName(a.trainerId)}</span>
                  <span className="text-xs text-muted">→</span>
                  <span className="font-medium text-text">{a.member?.fullName ?? getMemberName(a.memberId)}</span>
                </div>
                <div className="text-xs text-muted">
                  Assigned {new Date(a.assignedAt).toLocaleDateString('en-IN')}
                  {a.notes && <span> · {a.notes}</span>}
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Unassign this trainer from the member?')) {
                    unassignMutation.mutate(a.id);
                  }
                }}
                className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                title="Unassign"
              >
                <UserMinus size={16} />
              </button>
            </Card>
          ))
        ) : (
          !isLoading && (
            <Card className="py-8 text-center text-sm text-muted">
              No trainer assignments yet. Click "Assign Trainer" to get started.
            </Card>
          )
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-surface p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-text">Assign Trainer to Member</h2>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Trainer</label>
                <select
                  value={selectedTrainer}
                  onChange={(e) => setSelectedTrainer(e.target.value)}
                  className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select a trainer...</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                      {t.staffProfile?.specialization ? ` (${t.staffProfile.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Member</label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select a member...</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.memberCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Member prefers morning sessions"
                  className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAssignModal(false); setError(null); }}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-semibold text-text transition hover:bg-surface-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={assignMutation.isPending}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg transition hover:opacity-90 disabled:opacity-60"
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
