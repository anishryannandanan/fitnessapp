import { apiFetch } from './authApi';

export interface DashboardKpis {
  totalMembers: number;
  revenue: number; // minor units
  monthlyProfit: number;
  outstanding: number;
  expiringMemberships: number;
  dailyAttendance: number;
}

export interface OwnerDashboard {
  scope: string;
  period: string;
  kpis: DashboardKpis;
  comparison: { branchId: string; name: string; code: string; revenue: number; members: number }[];
}

export interface BranchDashboard {
  branchId: string;
  period: string;
  kpis: DashboardKpis;
}

export function fetchOwnerDashboard(token: string, branchId: string | 'all' = 'all'): Promise<OwnerDashboard> {
  return apiFetch<OwnerDashboard>(`/api/v1/dashboard/owner?branchId=${branchId}`, token);
}

export function fetchBranchDashboard(token: string): Promise<BranchDashboard> {
  return apiFetch<BranchDashboard>('/api/v1/dashboard/branch', token);
}
