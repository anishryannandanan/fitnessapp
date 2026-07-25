import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import { HOME_BY_ROLE } from '@/config/navigation';

// Sends users to their role's landing page, or to sign-in if logged out.
export function RootRedirect() {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/sign-in" replace />;
  return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
}
