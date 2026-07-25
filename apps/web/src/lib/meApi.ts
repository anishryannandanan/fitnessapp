import { apiFetch } from './authApi';

export interface MyMembership {
  status: string;
  endDate: string;
  package?: { name: string } | null;
}
export interface MyInvoice { total: number; amountPaid: number; status: string }
export interface MyProfile {
  fullName: string;
  memberCode: string;
  memberships: MyMembership[];
  invoices: MyInvoice[];
}

export interface MyWorkoutPlan {
  id: string;
  name: string;
  goal: string | null;
  exercises: { id: string; exerciseId: string; sets: number; reps: string; exercise?: { name: string; muscleGroup: string | null } }[];
}

export interface MyDietPlan {
  id: string;
  name: string;
  dailyCalories: number | null;
  meals: { id: string; mealType: string; title: string; calories: number | null; proteinG: number | null }[];
}

export interface LogSetPayload { exerciseId: string; setIndex: number; weightGrams: number; reps: number }

export interface MyMeasurement {
  id: string;
  recordedAt: string;
  weightG: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
}

export const fetchMyProfile = (token: string) => apiFetch<MyProfile>('/api/v1/me/profile', token);
export const fetchMyWorkoutPlans = (token: string) => apiFetch<MyWorkoutPlan[]>('/api/v1/me/workout-plans', token);
export const fetchMyDietPlans = (token: string) => apiFetch<MyDietPlan[]>('/api/v1/me/diet-plans', token);
export const fetchMyMeasurements = (token: string) => apiFetch<MyMeasurement[]>('/api/v1/me/measurements', token);

export function addMyMeasurement(
  token: string,
  payload: { weightG?: number; bodyFatPct?: number; waistCm?: number },
): Promise<MyMeasurement> {
  return apiFetch('/api/v1/me/measurements', token, { method: 'POST', body: JSON.stringify(payload) });
}

export function logMyWorkout(
  token: string,
  payload: { planId?: string; rating?: number; sets: LogSetPayload[] },
): Promise<{ sets: { isPr: boolean }[] }> {
  return apiFetch('/api/v1/me/workout-logs', token, { method: 'POST', body: JSON.stringify(payload) });
}
