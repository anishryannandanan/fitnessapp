import type { Branch, Member, User } from './types';

// ----- Demo accounts (one per role). In a real build this comes from the API. -----
export const DEMO_USERS: User[] = [
  { id: 'u-owner', name: 'Rajan Menon', role: 'owner', email: 'owner@fitnessworld.in', branchId: null, avatarColor: '#16A34A' },
  { id: 'u-mgr', name: 'Meera Nair', role: 'manager', email: 'manager.kochi@fitnessworld.in', branchId: 'b-kochi', avatarColor: '#3B82F6' },
  { id: 'u-rec', name: 'Anu Thomas', role: 'receptionist', email: 'reception.kochi@fitnessworld.in', branchId: 'b-kochi', avatarColor: '#F97316' },
  { id: 'u-trn', name: 'Vishnu R', role: 'trainer', email: 'vishnu@fitnessworld.in', branchId: 'b-kochi', avatarColor: '#A855F7' },
  { id: 'u-mbr', name: 'Fathima S', role: 'member', email: 'fathima@example.com', branchId: 'b-kochi', avatarColor: '#EC4899' },
];

export const BRANCHES: Branch[] = [
  { id: 'b-kochi', name: 'Kochi', code: 'KCH', members: 842, monthlyRevenue: 128_40_000, monthlyExpense: 74_20_000, isActive: true },
  { id: 'b-kottayam', name: 'Kottayam', code: 'KTM', members: 512, monthlyRevenue: 78_60_000, monthlyExpense: 51_30_000, isActive: true },
  { id: 'b-ernakulam', name: 'Ernakulam', code: 'EKM', members: 967, monthlyRevenue: 154_10_000, monthlyExpense: 88_90_000, isActive: true },
  { id: 'b-trivandrum', name: 'Trivandrum', code: 'TVM', members: 431, monthlyRevenue: 62_30_000, monthlyExpense: 44_10_000, isActive: true },
];

export const MEMBERS: Member[] = [
  { id: 'm1', name: 'Fathima S', code: 'KCH-0842', packageName: 'Transformation', expiresInDays: 18, duesMinor: 0, branchId: 'b-kochi', status: 'active' },
  { id: 'm2', name: 'Arun Kumar', code: 'KCH-0821', packageName: 'Gym Only (Annual)', expiresInDays: 4, duesMinor: 250000, branchId: 'b-kochi', status: 'active' },
  { id: 'm3', name: 'Sneha Raj', code: 'KCH-0799', packageName: 'Weight Loss', expiresInDays: -2, duesMinor: 180000, branchId: 'b-kochi', status: 'expired' },
  { id: 'm4', name: 'Joseph M', code: 'KCH-0768', packageName: 'Personal Training', expiresInDays: 34, duesMinor: 0, branchId: 'b-kochi', status: 'active' },
  { id: 'm5', name: 'Divya P', code: 'KCH-0742', packageName: 'Muscle Gain', expiresInDays: 60, duesMinor: 0, branchId: 'b-kochi', status: 'frozen' },
];

// 7-day revenue trend per branch (minor units) for charts
export const REVENUE_TREND = [
  { day: 'Mon', kochi: 420000, ernakulam: 510000 },
  { day: 'Tue', kochi: 380000, ernakulam: 470000 },
  { day: 'Wed', kochi: 460000, ernakulam: 540000 },
  { day: 'Thu', kochi: 510000, ernakulam: 500000 },
  { day: 'Fri', kochi: 620000, ernakulam: 610000 },
  { day: 'Sat', kochi: 720000, ernakulam: 690000 },
  { day: 'Sun', kochi: 300000, ernakulam: 340000 },
];
