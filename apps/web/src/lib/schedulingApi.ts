import { apiFetch } from './authApi';

export interface TrainerSlot {
  id: string;
  branchId: string;
  trainerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxClients: number;
  isActive: boolean;
}

export interface SlotAvailability extends TrainerSlot {
  bookedCount: number;
  availableSpots: number;
  isAvailable: boolean;
}

export interface PTSession {
  id: string;
  branchId: string;
  trainerId: string;
  memberId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
}

export interface TrainerSuggestion {
  trainerId: string;
  name: string;
  specialization?: string;
  weeklySessionCount: number;
  matchScore: number;
}

export interface GroupClass {
  id: string;
  branchId: string;
  coachId: string;
  name: string;
  description?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  classType: string;
  _count?: { enrollments: number };
}

// ---- Slots ----
export const listSlots = (token: string, params?: { branchId?: string; trainerId?: string }) => {
  const qs = new URLSearchParams();
  if (params?.branchId) qs.set('branchId', params.branchId);
  if (params?.trainerId) qs.set('trainerId', params.trainerId);
  return apiFetch<TrainerSlot[]>(`/api/v1/scheduling/slots?${qs}`, token);
};

export const getAvailability = (token: string, trainerId: string, date: string) =>
  apiFetch<SlotAvailability[]>(`/api/v1/scheduling/availability/${trainerId}?date=${date}`, token);

// ---- Sessions ----
export const listSessions = (token: string, params?: { trainerId?: string; memberId?: string; date?: string }) => {
  const qs = new URLSearchParams();
  if (params?.trainerId) qs.set('trainerId', params.trainerId);
  if (params?.memberId) qs.set('memberId', params.memberId);
  if (params?.date) qs.set('date', params.date);
  return apiFetch<PTSession[]>(`/api/v1/scheduling/sessions?${qs}`, token);
};

export const bookSession = (token: string, data: {
  memberId: string; trainerId: string; branchId: string;
  slotId?: string; scheduledDate: string; startTime: string; endTime: string; notes?: string;
}) => apiFetch<PTSession>('/api/v1/scheduling/sessions', token, { method: 'POST', body: JSON.stringify(data) });

// ---- Trainer matching ----
export const suggestTrainers = (token: string, memberId: string, branchId: string) =>
  apiFetch<TrainerSuggestion[]>(`/api/v1/scheduling/suggest-trainer/${memberId}?branchId=${branchId}`, token);

// ---- Group classes ----
export const listGroupClasses = (token: string, params?: { branchId?: string; classType?: string }) => {
  const qs = new URLSearchParams();
  if (params?.branchId) qs.set('branchId', params.branchId);
  if (params?.classType) qs.set('classType', params.classType);
  return apiFetch<GroupClass[]>(`/api/v1/group-classes?${qs}`, token);
};
