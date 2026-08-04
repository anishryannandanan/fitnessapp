// Mock API layer. Swap these functions for real fetch() calls to the REST API
// documented in docs/07-api-documentation.md — the component code stays the same.
import { BRANCHES, MEMBERS, REVENUE_TREND } from './mockData';
import type { Branch, Member } from './types';
import { API_URL, HAS_API } from './env';
import { useAuth } from '@/stores/auth';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getToken(): string {
  return useAuth.getState().token ?? '';
}

export async function getBranches(): Promise<Branch[]> {
  if (!HAS_API) {
    await delay(200);
    return BRANCHES;
  }
  const res = await fetch(`${API_URL}/api/v1/branches`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch branches');
  const data = await res.json();
  // Map API response to Branch type
  return data.map((b: any) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    address: b.address,
    phone: b.phone,
    email: b.email,
    timezone: b.timezone,
    isActive: b.isActive,
    members: 0,
    monthlyRevenue: 0,
    monthlyExpense: 0,
  }));
}

export type UpdateBranchInput = Partial<Pick<Branch, 'name' | 'address' | 'phone' | 'email' | 'timezone' | 'isActive'>>;

export async function updateBranch(id: string, data: UpdateBranchInput): Promise<Branch> {
  if (!HAS_API) {
    await delay(300);
    const branch = BRANCHES.find((b) => b.id === id);
    if (!branch) throw new Error('Branch not found');
    Object.assign(branch, data);
    return { ...branch };
  }
  const res = await fetch(`${API_URL}/api/v1/branches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update branch');
  const b = await res.json();
  return { ...b, members: 0, monthlyRevenue: 0, monthlyExpense: 0 };
}

export async function deleteBranch(id: string): Promise<Branch> {
  if (!HAS_API) {
    await delay(300);
    const branch = BRANCHES.find((b) => b.id === id);
    if (!branch) throw new Error('Branch not found');
    branch.isActive = false;
    return { ...branch };
  }
  const res = await fetch(`${API_URL}/api/v1/branches/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || 'Failed to deactivate branch');
  }
  const b = await res.json();
  return { ...b, members: 0, monthlyRevenue: 0, monthlyExpense: 0 };
}

export async function hardDeleteBranch(id: string): Promise<void> {
  if (!HAS_API) {
    await delay(300);
    const idx = BRANCHES.findIndex((b) => b.id === id);
    if (idx >= 0) BRANCHES.splice(idx, 1);
    return;
  }
  const res = await fetch(`${API_URL}/api/v1/branches/${id}/permanent`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || 'Failed to delete branch');
  }
}

export type CreateBranchInput = { name: string; code: string; address?: string; phone?: string; email?: string };

export async function createBranch(data: CreateBranchInput): Promise<Branch> {
  if (!HAS_API) {
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
  const res = await fetch(`${API_URL}/api/v1/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || 'Failed to create branch');
  }
  const b = await res.json();
  return { ...b, members: 0, monthlyRevenue: 0, monthlyExpense: 0 };
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
