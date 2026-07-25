import { Bell, LogOut, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BranchSwitcher } from './BranchSwitcher';

export function TopBar() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/sign-in');
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-surface/95 px-4 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="md:hidden">
        <span className="text-lg font-extrabold text-text">Fit</span>
        <span className="text-lg font-extrabold text-primary">Core</span>
      </div>

      <div className="ml-1 flex-1">
        <BranchSwitcher />
      </div>

      <button aria-label="Search" className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-text">
        <Search size={20} />
      </button>
      <button aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-text">
        <Bell size={20} />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
      </button>
      <ThemeToggle />

      {user && (
        <div className="ml-1 flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: user.avatarColor }}
            title={user.name}
          >
            {user.name.charAt(0)}
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-danger"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </header>
  );
}
