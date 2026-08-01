import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Dumbbell, Loader2 } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { DEMO_USERS } from '@/lib/mockData';
import { HOME_BY_ROLE } from '@/config/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HAS_API } from '@/lib/env';
import { apiLogin } from '@/lib/authApi';
import type { User } from '@/lib/types';

export function SignIn() {
  const login = useAuth((s) => s.login);
  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();

  // Real-login form state (used when a backend is configured)
  const [email, setEmail] = useState('owner@fitnessworld.in');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo mode: pick a role and enter with mock data
  const signInAsDemo = (user: User) => {
    login(user);
    navigate(HOME_BY_ROLE[user.role]);
  };

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await apiLogin(email.trim(), password);
      setSession(session.user, session.token);
      navigate(HOME_BY_ROLE[session.user.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
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

      {HAS_API ? (
        // ---- Real authentication (backend configured) ----
        <form onSubmit={handleRealLogin} className="w-full max-w-sm rounded-2xl border bg-surface p-5 shadow-sm">
          <p className="mb-4 text-center text-sm font-medium text-muted">Sign in to your account</p>

          <label className="mb-1 block text-xs font-medium text-muted" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-3 w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
            required
          />

          <label className="mb-1 block text-xs font-medium text-muted" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Owner@123"
            className="mb-4 w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
            required
          />

          {error && (
            <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg transition hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="mt-4 text-center text-xs text-muted">
            Seeded demo: <span className="font-medium text-text">owner@fitnessworld.in</span> / Owner@123
          </p>
        </form>
      ) : (
        // ---- Demo mode (no backend) ----
        <div className="w-full max-w-sm rounded-2xl border bg-surface p-5 shadow-sm">
          <p className="mb-4 text-center text-sm font-medium text-muted">Choose a role to explore the demo</p>
          <div className="space-y-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => signInAsDemo(u)}
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
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Enter</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 max-w-sm text-center text-xs text-muted">
        {HAS_API
          ? 'Authenticated against the FitCore API. Branch access is scoped to your role.'
          : 'Standalone demo with mock data. Set VITE_API_URL to enable real authentication.'}
      </p>

      <Link
        to="/features"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:opacity-80"
      >
        Explore Platform Features &rarr;
      </Link>
    </div>
  );
}
