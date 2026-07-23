import {
  LayoutDashboard, Building2, BarChart3, Wallet, Users, UserCog,
  QrCode, CreditCard, Dumbbell, Salad, LineChart, CalendarClock,
  MessageSquare, Home, ClipboardList, Package,
} from 'lucide-react';
import type { Role } from '@/lib/types';

export interface NavItem {
  label: string;
  to: string;
  icon: typeof Home;
}

// Role-based bottom navigation (max 5 items) — see docs/01-product-vision.md §6.2
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  owner: [
    { label: 'Dashboard', to: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Branches', to: '/owner/branches', icon: Building2 },
    { label: 'Reports', to: '/owner/reports', icon: BarChart3 },
    { label: 'Finance', to: '/owner/finance', icon: Wallet },
    { label: 'Staff', to: '/owner/staff', icon: UserCog },
  ],
  manager: [
    { label: 'Dashboard', to: '/branch/dashboard', icon: LayoutDashboard },
    { label: 'Members', to: '/branch/members', icon: Users },
    { label: 'Staff', to: '/branch/staff', icon: UserCog },
    { label: 'Finance', to: '/branch/finance', icon: Wallet },
    { label: 'Reports', to: '/branch/reports', icon: BarChart3 },
  ],
  receptionist: [
    { label: 'Home', to: '/reception/home', icon: Home },
    { label: 'Check-in', to: '/reception/check-in', icon: QrCode },
    { label: 'Members', to: '/reception/members', icon: Users },
    { label: 'Payments', to: '/reception/payments', icon: CreditCard },
    { label: 'Enquiries', to: '/reception/enquiries', icon: ClipboardList },
  ],
  trainer: [
    { label: 'Today', to: '/trainer/today', icon: CalendarClock },
    { label: 'Members', to: '/trainer/members', icon: Users },
    { label: 'Workouts', to: '/trainer/workouts', icon: Dumbbell },
    { label: 'Diet', to: '/trainer/diet', icon: Salad },
    { label: 'Progress', to: '/trainer/progress', icon: LineChart },
  ],
  member: [
    { label: 'Home', to: '/member/home', icon: Home },
    { label: 'Workout', to: '/member/workout', icon: Dumbbell },
    { label: 'Diet', to: '/member/diet', icon: Salad },
    { label: 'Progress', to: '/member/progress', icon: LineChart },
    { label: 'Chat', to: '/member/chat', icon: MessageSquare },
  ],
};

// Landing route per role after login
export const HOME_BY_ROLE: Record<Role, string> = {
  owner: '/owner/dashboard',
  manager: '/branch/dashboard',
  receptionist: '/reception/home',
  trainer: '/trainer/today',
  member: '/member/home',
};

export const PACKAGE_ICON = Package;
