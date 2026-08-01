import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import {
  Wallet, UserCog, CreditCard,
  LineChart, ClipboardList, CalendarClock, MessageSquare, Package, User,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { RequireRole } from '@/components/RequireRole';
import { RequireAuth } from '@/components/RequireAuth';
import { RootRedirect } from '@/components/RootRedirect';
import { Notifications } from '@/pages/shared/Notifications';
import { MemberProfile } from '@/pages/shared/MemberProfile';
import { PageLoader } from '@/components/ui/PageLoader';

import { SignIn } from '@/pages/SignIn';
import { Features } from '@/pages/Features';
import { Branches } from '@/pages/owner/Branches';
import { Reports } from '@/pages/owner/Reports';

// Lazy-load the chart-heavy dashboard so the recharts bundle only downloads
// when an Owner actually opens it (not for other roles or the initial load).
const OwnerDashboard = lazy(() =>
  import('@/pages/owner/OwnerDashboard').then((m) => ({ default: m.OwnerDashboard }))
);

const lazyEl = (el: React.ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;
import { ManagerDashboard } from '@/pages/branch/ManagerDashboard';
import { ReceptionHome } from '@/pages/reception/ReceptionHome';
import { OnboardWizard } from '@/pages/reception/OnboardWizard';
import { CheckIn } from '@/pages/reception/CheckIn';
import { TrainerToday } from '@/pages/trainer/TrainerToday';
import { TrainerWorkouts } from '@/pages/trainer/TrainerWorkouts';
import { TrainerDiet } from '@/pages/trainer/TrainerDiet';
import { MemberHome } from '@/pages/member/MemberHome';
import { MemberWorkout } from '@/pages/member/MemberWorkout';
import { MemberDiet } from '@/pages/member/MemberDiet';
import { MemberProgress } from '@/pages/member/MemberProgress';
import { MembersList } from '@/pages/shared/MembersList';
import { ComingSoon } from '@/pages/shared/ComingSoon';
import type { Role } from '@/lib/types';

// Wrap a route group's element with its role guard + app shell layout.
function roleShell(role: Role) {
  return (
    <RequireRole role={role}>
      <AppShell />
    </RequireRole>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/sign-in', element: <SignIn /> },
  { path: '/features', element: <Features /> },

  // Shared, any authenticated role
  {
    path: '/notifications',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [{ index: true, element: <Notifications /> }],
  },
  {
    path: '/members/:id',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [{ index: true, element: <MemberProfile /> }],
  },

  // ---- Owner ----
  {
    path: '/owner',
    element: roleShell('owner'),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: lazyEl(<OwnerDashboard />) },
      { path: 'branches', element: <Branches /> },
      { path: 'reports', element: <Reports /> },
      { path: 'finance', element: <ComingSoon title="Finance" icon={Wallet} description="Consolidated revenue, expenses, payroll and outstanding dues across all branches." /> },
      { path: 'staff', element: <ComingSoon title="Staff" icon={UserCog} description="Manage trainers, managers, receptionists and other staff across branches." /> },
    ],
  },

  // ---- Branch Manager ----
  {
    path: '/branch',
    element: roleShell('manager'),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <ManagerDashboard /> },
      { path: 'members', element: <MembersList /> },
      { path: 'staff', element: <ComingSoon title="Staff" icon={UserCog} description="Manage staff for your branch." /> },
      { path: 'finance', element: <ComingSoon title="Finance" icon={Wallet} description="Branch revenue, expenses and profit." /> },
      { path: 'reports', element: <Reports /> },
    ],
  },

  // ---- Receptionist ----
  {
    path: '/reception',
    element: roleShell('receptionist'),
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <ReceptionHome /> },
      { path: 'check-in', element: <CheckIn /> },
      { path: 'members', element: <MembersList /> },
      { path: 'members/new', element: <OnboardWizard /> },
      { path: 'payments', element: <ComingSoon title="Payments" icon={CreditCard} description="Collect payments, generate receipts and share them via WhatsApp / SMS / email." /> },
      { path: 'enquiries', element: <ComingSoon title="Enquiries" icon={ClipboardList} description="Capture and follow up on leads, then convert them into members." /> },
    ],
  },

  // ---- Trainer ----
  {
    path: '/trainer',
    element: roleShell('trainer'),
    children: [
      { index: true, element: <Navigate to="today" replace /> },
      { path: 'today', element: <TrainerToday /> },
      { path: 'members', element: <MembersList /> },
      { path: 'workouts', element: <TrainerWorkouts /> },
      { path: 'diet', element: <TrainerDiet /> },
      { path: 'progress', element: <ComingSoon title="Progress" icon={LineChart} description="Track measurements and view progress charts and before/after photos." /> },
    ],
  },

  // ---- Member ----
  {
    path: '/member',
    element: roleShell('member'),
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <MemberHome /> },
      { path: 'workout', element: <MemberWorkout /> },
      { path: 'diet', element: <MemberDiet /> },
      { path: 'progress', element: <MemberProgress /> },
      { path: 'chat', element: <ComingSoon title="Chat" icon={MessageSquare} description="Message your assigned trainer and request plan changes." /> },
      { path: 'membership', element: <ComingSoon title="Membership" icon={Package} description="View your package, expiry and dues, and pay online." /> },
      { path: 'profile', element: <ComingSoon title="Profile" icon={User} description="Manage your details, notification preferences and theme." /> },
      { path: 'schedule', element: <ComingSoon title="PT Schedule" icon={CalendarClock} description="Upcoming personal training sessions." /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
