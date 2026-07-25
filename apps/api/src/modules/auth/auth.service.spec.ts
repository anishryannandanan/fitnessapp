import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

// Minimal typed mocks for the collaborators AuthService depends on.
const createPrismaMock = () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
});

const jwtMock = {
  signAsync: jest.fn(),
};

const configMock = {
  get: jest.fn((key: string) => (key === 'JWT_EXPIRES_IN' ? '15m' : '7d')),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  const password = 'Owner@123';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    jwtMock.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
    service = new AuthService(prisma as any, jwtMock as any, configMock as any);
  });

  describe('login', () => {
    it('logs in an owner with empty branchIds (all branches)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-owner',
        email: 'owner@fitnessworld.in',
        role: 'owner',
        businessId: 'biz-1',
        passwordHash,
        isActive: true,
        fullName: 'Rajan',
        avatarColor: '#16A34A',
        userBranches: [],
      });

      const result = await service.login('owner@fitnessworld.in', password);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.role).toBe('owner');
      expect(result.user.branchId).toBeNull();

      // Owner's signed payload must carry empty branchIds => "all branches".
      const payload = jwtMock.signAsync.mock.calls[0][0];
      expect(payload.branchIds).toEqual([]);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u-owner' } }),
      );
    });

    it('logs in a manager scoped to their branch', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-mgr',
        email: 'manager.kochi@fitnessworld.in',
        role: 'manager',
        businessId: 'biz-1',
        passwordHash,
        isActive: true,
        fullName: 'Meera',
        avatarColor: '#3B82F6',
        userBranches: [{ branchId: 'b-kochi' }],
      });

      const result = await service.login('manager.kochi@fitnessworld.in', password);

      expect(result.user.branchId).toBe('b-kochi');
      const payload = jwtMock.signAsync.mock.calls[0][0];
      expect(payload.branchIds).toEqual(['b-kochi']);
    });

    it('normalizes the email before lookup', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'a@b.com', role: 'owner', businessId: 'biz-1',
        passwordHash, isActive: true, fullName: 'X', avatarColor: null, userBranches: [],
      });
      await service.login('  OWNER@Fitnessworld.IN  ', password);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'owner@fitnessworld.in' } }),
      );
    });

    it('rejects an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('nope@x.com', password)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'a@b.com', role: 'owner', businessId: 'biz-1',
        passwordHash, isActive: false, fullName: 'X', avatarColor: null, userBranches: [],
      });
      await expect(service.login('a@b.com', password)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'a@b.com', role: 'owner', businessId: 'biz-1',
        passwordHash, isActive: true, fullName: 'X', avatarColor: null, userBranches: [],
      });
      await expect(service.login('a@b.com', 'wrong-password')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('me', () => {
    it('returns the profile with allBranches=true for an owner', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-owner', fullName: 'Rajan', email: 'owner@fitnessworld.in', role: 'owner',
        avatarColor: '#16A34A',
        business: { id: 'biz-1', name: 'Fitness World', currency: 'INR' },
        userBranches: [],
      });

      const me = await service.me({
        sub: 'u-owner', email: 'owner@fitnessworld.in', role: 'owner', businessId: 'biz-1', branchIds: [],
      });

      expect(me.allBranches).toBe(true);
      expect(me.business.name).toBe('Fitness World');
    });

    it('throws when the user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.me({ sub: 'gone', email: 'x', role: 'owner', businessId: 'b', branchIds: [] }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
