import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch, User } from '@/lib/types';
import { BRANCHES } from '@/lib/mockData';

interface AuthState {
  user: User | null;
  /** Owner-only active branch context; 'all' = consolidated. */
  activeBranchId: string | 'all';
  login: (user: User) => void;
  logout: () => void;
  setActiveBranch: (id: string | 'all') => void;
  visibleBranches: () => Branch[];
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      activeBranchId: 'all',
      login: (user) =>
        set({
          user,
          activeBranchId: user.role === 'owner' ? 'all' : (user.branchId ?? 'all'),
        }),
      logout: () => set({ user: null, activeBranchId: 'all' }),
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
