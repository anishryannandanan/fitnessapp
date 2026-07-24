import type { UserRole } from '@prisma/client';

/** Shape attached to the request after JWT verification. */
export interface AuthUser {
  sub: string; // user id
  email: string;
  role: UserRole;
  businessId: string;
  /** Branch ids the user is assigned to. Empty for owner => all branches. */
  branchIds: string[];
}

/** JWT payload we sign at login. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  businessId: string;
  branchIds: string[];
}
