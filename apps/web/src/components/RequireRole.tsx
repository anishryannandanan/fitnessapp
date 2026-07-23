import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/stores/auth';
import type { Role } from '@/lib/types';
import { HOME_BY_ROLE } from '@/config/navigation';

// Guards a route group to a specific role (mirrors backend RBAC in docs/11-security-model.md)
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }
  if (user.role !== role) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  }
  return <>{children}</>;
}
