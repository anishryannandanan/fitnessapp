import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch, User } from '@/lib/types';
import { BRANCHES } from '@/lib/mockData';

interface AuthState {
  user: User | null;
  /** JWT access token when authenticated against the real backend (null in demo mode). */
  token: string | null;
  /** Owner-only active branch context; 'all' = consolidated. */
  activeBranchId: string | 'all';
  /** Demo login (mock mode) — no token. */
  login: (user: User) => void;
  /** Real login — stores the user and JWT from the backend. */
  setSession: (user: User, token: string) => void;
  logout: () => void;
  setActiveBranch: (id: string | 'all') => void;
  visibleBranches: () => Branch[];
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      activeBranchId: 'all',
      login: (user) =>
        set({
          user,
          token: null,
          activeBranchId: user.role === 'owner' ? 'all' : (user.branchId ?? 'all'),
        }),
      setSession: (user, token) =>
        set({
          user,
          token,
          activeBranchId: user.role === 'owner' ? 'all' : (user.branchId ?? 'all'),
        }),
      logout: () => set({ user: null, token: null, activeBranchId: 'all' }),
      setActiveBranch: (id) => set({ activeBranchId: id }),
      visibleBranches: () => {
        const { user } = get();
        if (!user) return [];
        if (user.role === 'owner') return BRANCHES;
        return BRANCHES.filter((b) => b.id === user.branchId);
      },
    }),
    { name: 'fitcore-auth' }
  )
);
