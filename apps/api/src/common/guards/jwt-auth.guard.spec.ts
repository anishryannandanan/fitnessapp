import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextFor(authorization?: string) {
  const request: any = { headers: authorization ? { authorization } : {} };
  const ctx = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

describe('JwtAuthGuard', () => {
  let jwt: JwtService;
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jwt = new JwtService({ secret: 'test-secret' });
    reflector = new Reflector();
    guard = new JwtAuthGuard(jwt, reflector);
  });

  it('bypasses auth for @Public routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const { ctx } = contextFor();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects a request with no bearer token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const { ctx } = contextFor();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const { ctx } = contextFor('Bearer not-a-real-token');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid token and attaches the user to the request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const token = await jwt.signAsync({
      sub: 'u1', email: 'a@b.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'],
    });
    const { ctx, request } = contextFor(`Bearer ${token}`);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      sub: 'u1',
      role: 'manager',
      branchIds: ['b-kochi'],
    });
  });
});
