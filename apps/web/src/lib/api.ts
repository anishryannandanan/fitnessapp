// Mock API layer. Swap these functions for real fetch() calls to the REST API
// documented in docs/07-api-documentation.md — the component code stays the same.
import { BRANCHES, MEMBERS, REVENUE_TREND } from './mockData';
import type { Branch, Member } from './types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getBranches(): Promise<Branch[]> {
  await delay(200);
  return BRANCHES;
}

export type UpdateBranchInput = Partial<Pick<Branch, 'name' | 'address' | 'phone' | 'email' | 'timezone' | 'isActive'>>;

export async function updateBranch(id: string, data: UpdateBranchInput): Promise<Branch> {
  await delay(300);
  const branch = BRANCHES.find((b) => b.id === id);
  if (!branch) throw new Error('Branch not found');
  Object.assign(branch, data);
  return { ...branch };
}

export async function deleteBranch(id: string): Promise<Branch> {
  await delay(300);
  const branch = BRANCHES.find((b) => b.id === id);
  if (!branch) throw new Error('Branch not found');
  branch.isActive = false;
  return { ...branch };
}

export async function hardDeleteBranch(id: string): Promise<void> {
  const { API_URL, HAS_API } = await import('./env');
  const { useAuth } = await import('@/stores/auth');
  if (!HAS_API) {
    await delay(300);
    const idx = BRANCHES.findIndex((b) => b.id === id);
    if (idx >= 0) BRANCHES.splice(idx, 1);
    return;
  }
  const token = useAuth.getState().token ?? '';
  const res = await fetch(`${API_URL}/api/v1/branches/${id}/permanent`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || 'Failed to delete branch');
  }
}

export type CreateBranchInput = { name: string; code: string; address?: string; phone?: string; email?: string };

export async function createBranch(data: CreateBranchInput): Promise<Branch> {
  await delay(300);
  const newBranch: Branch = {
    id: `b-${Date.now()}`,
    name: data.name,
    code: data.code,
    address: data.address,
    phone: data.phone,
    email: data.email,
    members: 0,
    monthlyRevenue: 0,
    monthlyExpense: 0,
    isActive: true,
  };
  BRANCHES.push(newBranch);
  return newBranch;
}

export async function getMembers(branchId?: string | null): Promise<Member[]> {
  await delay(200);
  if (!branchId) return MEMBERS;
  return MEMBERS.filter((m) => m.branchId === branchId);
}

export async function getRevenueTrend() {
  await delay(200);
  return REVENUE_TREND;
}
