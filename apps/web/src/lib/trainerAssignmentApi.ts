import { API_URL, HAS_API } from './env';
import { useAuth } from '@/stores/auth';

export interface TrainerAssignment {
  id: string;
  branchId: string;
  trainerId: string;
  memberId: string;
  assignedAt: string;
  unassignedAt: string | null;
  isActive: boolean;
  assignedById: string;
  notes: string | null;
  member?: {
    id: string;
    fullName: string;
    memberCode: string;
    phone: string | null;
    email: string | null;
  } | null;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getToken(): string {
  return useAuth.getState().token ?? '';
}

export async function getTrainerAssignments(opts?: { branchId?: string; trainerId?: string }): Promise<TrainerAssignment[]> {
  if (!HAS_API) {
    await delay(200);
    return [];
  }

  const params = new URLSearchParams();
  if (opts?.branchId) params.set('branchId', opts.branchId);
  if (opts?.trainerId) params.set('trainerId', opts.trainerId);
  const qs = params.toString() ? `?${params}` : '';

  const res = await fetch(`${API_URL}/api/v1/trainer-assignments${qs}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch trainer assignments');
  return res.json();
}

export async function assignTrainer(data: {
  branchId: string;
  trainerId: string;
  memberId: string;
  notes?: string;
}): Promise<TrainerAssignment> {
  if (!HAS_API) {
    await delay(300);
    return {
      id: `ta-${Date.now()}`,
      ...data,
      assignedAt: new Date().toISOString(),
      unassignedAt: null,
      isActive: true,
      assignedById: 'demo',
      notes: data.notes ?? null,
    };
  }

  const res = await fetch(`${API_URL}/api/v1/trainer-assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || 'Failed to assign trainer');
  }
  return res.json();
}

export async function unassignTrainer(assignmentId: string): Promise<void> {
  if (!HAS_API) {
    await delay(300);
    return;
  }

  const res = await fetch(`${API_URL}/api/v1/trainer-assignments/${assignmentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to unassign trainer');
}
