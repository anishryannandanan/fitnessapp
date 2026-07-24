import { apiFetch } from './authApi';

// ---- Packages ----
export interface ApiPackage {
  id: string;
  name: string;
  type: 'trainer' | 'non_trainer' | 'custom';
  durationDays: number;
  price: number; // minor units
  taxPercent: number;
  ptSessions: number | null;
  includesTrainer: boolean;
  branchId: string | null;
  isActive: boolean;
}

export function fetchPackages(token: string): Promise<ApiPackage[]> {
  return apiFetch<ApiPackage[]>('/api/v1/packages?active=true', token);
}

// ---- Onboarding ----
export interface OnboardPersonal {
  fullName: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female' | 'other' | 'undisclosed';
  dob?: string;
  address?: string;
  branchId?: string;
}

export interface OnboardResult {
  member: { id: string; memberCode: string; fullName: string };
  membership: { id: string; status: string; endDate: string; priceSnapshot: number; taxSnapshot: number };
  invoice: { id: string; invoiceNumber: string; total: number; amountPaid: number };
}

export function onboardMember(
  token: string,
  payload: { personal: OnboardPersonal; packageId: string },
): Promise<OnboardResult> {
  return apiFetch<OnboardResult>('/api/v1/members/onboard', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ---- Payment ----
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer';

export interface PaymentResult {
  invoice: { status: string; total: number; amountPaid: number; balanceDue: number };
  receipt: { invoiceNumber: string; amount: number; method: string; balanceDue: number };
}

export function recordPayment(
  token: string,
  payload: { invoiceId: string; amount: number; method: PaymentMethod; reference?: string },
): Promise<PaymentResult> {
  return apiFetch<PaymentResult>('/api/v1/payments', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
