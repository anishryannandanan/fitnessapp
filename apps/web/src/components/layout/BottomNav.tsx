import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';
import { NAV_BY_ROLE } from '@/config/navigation';

export function BottomNav() {
  const user = useAuth((s) => s.user);
  if (!user) return null;
  const items = NAV_BY_ROLE[user.role];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition',
                  isActive ? 'text-primary' : 'text-muted hover:text-text'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={22} strokeWidth={isActive ? 2.4 : 1.9} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
