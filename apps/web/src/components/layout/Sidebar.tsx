import { NavLink } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';
import { NAV_BY_ROLE } from '@/config/navigation';

// Desktop/tablet sidebar (hidden on mobile, where BottomNav is used instead)
export function Sidebar() {
  const user = useAuth((s) => s.user);
  if (!user) return null;
  const items = NAV_BY_ROLE[user.role];

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-surface md:flex md:flex-col">
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-fg">
          <Dumbbell size={20} />
        </div>
        <span className="text-lg font-extrabold text-text">FitCore</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-2 hover:text-text'
              )
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-3 text-xs text-muted">Role: {user.role}</div>
    </aside>
  );
}
