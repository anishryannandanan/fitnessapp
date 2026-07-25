import { apiFetch } from './authApi';

export interface MemberMembership {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  priceSnapshot: number;
  sessionsTotal: number | null;
  sessionsUsed: number;
  package?: { name: string; type: string } | null;
}

export interface MemberInvoice {
  id: string;
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  status: string;
  createdAt: string;
}

export interface MemberPayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
}

export interface MemberProfileData {
  id: string;
  fullName: string;
  memberCode: string;
  status: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  homeBranchId: string;
  memberships: MemberMembership[];
  invoices: MemberInvoice[];
  payments: MemberPayment[];
}

export interface MemberAttendance {
  id: string;
  checkInAt: string;
  checkOutAt: string | null;
  durationMinutes: number | null;
}

export function fetchMember(token: string, id: string): Promise<MemberProfileData> {
  return apiFetch<MemberProfileData>(`/api/v1/members/${id}`, token);
}

export function fetchMemberAttendance(token: string, memberId: string): Promise<MemberAttendance[]> {
  return apiFetch<MemberAttendance[]>(`/api/v1/attendance?memberId=${memberId}`, token);
}

export function collectPayment(
  token: string,
  payload: { invoiceId: string; amount: number; method: 'cash' | 'card' | 'upi' | 'bank_transfer' },
): Promise<{ receipt: { balanceDue: number } }> {
  return apiFetch(`/api/v1/payments`, token, { method: 'POST', body: JSON.stringify(payload) });
}
