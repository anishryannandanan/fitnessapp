import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/stores/auth';

// Guards a route for any authenticated user (used for shared screens like notifications).
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/sign-in" replace state={{ from: location }} />;
  return <>{children}</>;
}
