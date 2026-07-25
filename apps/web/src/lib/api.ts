// Mock API layer. Swap these functions for real fetch() calls to the REST API
// documented in docs/07-api-documentation.md — the component code stays the same.
import { BRANCHES, MEMBERS, REVENUE_TREND } from './mockData';
import type { Branch, Member } from './types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getBranches(): Promise<Branch[]> {
  await delay(200);
  return BRANCHES;
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
