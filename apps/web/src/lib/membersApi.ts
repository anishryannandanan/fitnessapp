import { apiFetch } from './authApi';
import type { Member } from './types';

// Shape returned by GET /api/v1/members (subset we use here).
interface ApiMembership {
  endDate: string;
  status: string;
  package?: { name?: string } | null;
}
interface ApiInvoice {
  total: number;
  amountPaid: number;
}
interface ApiMember {
  id: string;
  memberCode: string;
  fullName: string;
  homeBranchId: string;
  status: string;
  memberships?: ApiMembership[];
  invoices?: ApiInvoice[];
}

function daysUntil(iso?: string): number {
  if (!iso) return 0;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

function toMember(m: ApiMember): Member {
  const active = m.memberships?.[0];
  const status = (['active', 'expired', 'frozen'].includes(m.status) ? m.status : 'active') as Member['status'];
  // Dues = sum of outstanding balance across the member's unpaid invoices.
  const duesMinor = (m.invoices ?? []).reduce((sum, inv) => sum + Math.max(0, inv.total - inv.amountPaid), 0);
  return {
    id: m.id,
    name: m.fullName,
    code: m.memberCode,
    packageName: active?.package?.name ?? '—',
    expiresInDays: daysUntil(active?.endDate),
    duesMinor,
    branchId: m.homeBranchId,
    status,
  };
}

/** GET /api/v1/members?q= — real backend, mapped to the frontend Member shape. */
export async function fetchMembers(token: string, q?: string): Promise<Member[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  const data = await apiFetch<ApiMember[]>(`/api/v1/members${query}`, token);
  return data.map(toMember);
}
