import type { AuthUser } from './types/auth-user';

/**
 * Branch ids a user may access.
 * - Owner => undefined (means "all branches", no filter).
 * - Everyone else => their assigned branch ids.
 * See docs/11-security-model.md (branch-scoped data isolation).
 */
export function allowedBranchIds(user: AuthUser): string[] | undefined {
  return user.role === 'owner' ? undefined : user.branchIds;
}

/** True if the user may act within the given branch. */
export function canAccessBranch(user: AuthUser, branchId: string): boolean {
  const allowed = allowedBranchIds(user);
  return allowed === undefined || allowed.includes(branchId);
}

/** Prisma `where` fragment that scopes a query to the user's branch(es) via a field. */
export function branchWhere(user: AuthUser, field = 'branchId'): Record<string, unknown> {
  const allowed = allowedBranchIds(user);
  return allowed ? { [field]: { in: allowed } } : {};
}
