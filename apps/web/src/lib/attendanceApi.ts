import { apiFetch } from './authApi';

export interface CheckInResult {
  alreadyCheckedIn: boolean;
  warning: 'already_checked_in' | 'expired' | null;
  attendance: { id: string; checkInAt: string };
  member: { id: string; name: string; code: string };
  membership?: { status: string; endDate: string; daysLeft: number } | null;
}

export interface CheckOutResult {
  id: string;
  checkOutAt: string;
  durationMinutes: number;
}

export function checkInMember(
  token: string,
  payload: { code?: string; phone?: string; memberId?: string; method?: 'qr' | 'member_id' | 'mobile' | 'manual' },
): Promise<CheckInResult> {
  return apiFetch<CheckInResult>('/api/v1/attendance/check-in', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkOutMember(token: string, memberId: string): Promise<CheckOutResult> {
  return apiFetch<CheckOutResult>('/api/v1/attendance/check-out', token, {
    method: 'POST',
    body: JSON.stringify({ memberId }),
  });
}
