import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  notification: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    create: jest.fn(),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  notificationPreference: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
  user: { findMany: jest.fn().mockResolvedValue([]) },
});

const owner: AuthUser = { sub: 'o', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new NotificationsService(prisma as any);
  });

  describe('markRead / markAllRead', () => {
    it('marks read scoped to the current user only', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      await service.markRead(manager, 'n1');
      const where = prisma.notification.updateMany.mock.calls[0][0].where;
      expect(where).toMatchObject({ id: 'n1', recipientUserId: 'm', readAt: null });
    });

    it('marks all read for the user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });
      const res = await service.markAllRead(manager);
      expect(res.updated).toBe(5);
    });
  });

  describe('updatePreference', () => {
    it('upserts on (userId, type, channel)', async () => {
      prisma.notificationPreference.upsert.mockResolvedValue({ id: 'pref1' });
      await service.updatePreference(manager, { type: 'payment_due', channel: 'email', enabled: false } as any);
      const arg = prisma.notificationPreference.upsert.mock.calls[0][0];
      expect(arg.where.userId_type_channel).toEqual({ userId: 'm', type: 'payment_due', channel: 'email' });
      expect(arg.update.enabled).toBe(false);
    });
  });

  describe('announce', () => {
    it('owner broadcasting to all branches targets all users (no branch filter)', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      const res = await service.announce(owner, { title: 'Holiday hours' } as any);
      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.userBranches).toBeUndefined();
      expect(res.sent).toBe(2);
      expect(prisma.notification.createMany).toHaveBeenCalled();
    });

    it('manager is restricted to their own branch', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      await service.announce(manager, { title: 'Branch notice' } as any);
      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.userBranches.some.branchId.in).toEqual(['b-kochi']);
    });

    it('manager cannot target another branch (403)', async () => {
      await expect(service.announce(manager, { title: 'x', branchId: 'b-other' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('errors when the audience is empty', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await expect(service.announce(owner, { title: 'x' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('applies a role filter', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      await service.announce(owner, { title: 'members only', roles: ['member'] } as any);
      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.role.in).toEqual(['member']);
    });
  });
});
