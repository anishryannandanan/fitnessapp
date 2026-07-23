import { useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { DEMO_USERS } from '@/lib/mockData';
import { HOME_BY_ROLE } from '@/config/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { User } from '@/lib/types';

// Demo sign-in: pick a role to explore the scaffold. Replace with real auth
// (docs/07-api-documentation.md §8.2) — the app shell/routing stays the same.
export function SignIn() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  const signInAs = (user: User) => {
    login(user);
    navigate(HOME_BY_ROLE[user.role]);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-lg">
          <Dumbbell size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-text">
            Fit<span className="text-primary">Core</span>
          </h1>
          <p className="text-sm text-muted">Multi-branch gym management</p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl border bg-surface p-5 shadow-sm">
        <p className="mb-4 text-center text-sm font-medium text-muted">
          Choose a role to explore the demo
        </p>
        <div className="space-y-2">
          {DEMO_USERS.map((u) => (
            <button
              key={u.id}
              onClick={() => signInAs(u)}
              className="flex w-full items-center gap-3 rounded-xl border bg-surface-2 px-3 py-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: u.avatarColor }}
              >
                {u.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-text">{u.name}</div>
                <div className="text-xs capitalize text-muted">{u.role}</div>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                Enter
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 max-w-sm text-center text-xs text-muted">
        This is a UI scaffold with mock data. Real authentication (email/password + member OTP)
        is specified in the docs.
      </p>
    </div>
  );
}
