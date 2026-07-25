import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { AuthUser } from '../types/auth-user';

function contextFor(user: Partial<AuthUser> | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextFor({ role: 'trainer' }))).toBe(true);
  });

  it('allows when the user has a required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner']);
    expect(guard.canActivate(contextFor({ role: 'owner' }))).toBe(true);
  });

  it('forbids when the user lacks the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner']);
    expect(() => guard.canActivate(contextFor({ role: 'manager' }))).toThrow(ForbiddenException);
  });

  it('forbids when there is no user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['owner']);
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });
});
