// Shared domain types (subset of docs/06-database-schema.md, frontend view models)

export type Role = 'owner' | 'manager' | 'receptionist' | 'trainer' | 'member';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  branchId: string | null; // null => owner (all branches)
  avatarColor: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  members: number;
  monthlyRevenue: number; // minor units (paise)
  monthlyExpense: number;
  isActive: boolean;
}

export interface Kpi {
  label: string;
  value: string;
  delta?: number; // percentage change
  icon?: string;
}

export interface Member {
  id: string;
  name: string;
  code: string;
  packageName: string;
  expiresInDays: number;
  duesMinor: number;
  branchId: string;
  status: 'active' | 'expired' | 'frozen';
}
