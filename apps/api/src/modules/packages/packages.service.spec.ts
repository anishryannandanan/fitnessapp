import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PackagesService } from './packages.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  package: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
});

const owner: AuthUser = { sub: 'o', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('PackagesService', () => {
  let service: PackagesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new PackagesService(prisma as any);
  });

  describe('list', () => {
    it('owner: no branch filter', async () => {
      await service.list(owner);
      const where = prisma.package.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeUndefined();
    });

    it('manager: sees all-branch OR own-branch packages', async () => {
      await service.list(manager);
      const where = prisma.package.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ branchId: null }, { branchId: { in: ['b-kochi'] } }]);
    });

    it('activeOnly filters inactive', async () => {
      await service.list(owner, { activeOnly: true });
      expect(prisma.package.findMany.mock.calls[0][0].where.isActive).toBe(true);
    });
  });

  describe('create', () => {
    it('manager: 403 when creating an all-branch package', async () => {
      await expect(
        service.create(manager, { name: 'X', type: 'non_trainer', durationDays: 30, price: 1000 } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('manager: 403 for another branch', async () => {
      await expect(
        service.create(manager, { name: 'X', type: 'non_trainer', durationDays: 30, price: 1000, branchId: 'b-other' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('trainer package requires ptSessions', async () => {
      await expect(
        service.create(owner, { name: 'PT', type: 'trainer', durationDays: 30, price: 5000 } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('owner: creates an all-branch package', async () => {
      prisma.package.create.mockResolvedValue({ id: 'p1' });
      await service.create(owner, { name: 'Gym', type: 'non_trainer', durationDays: 30, price: 150000 } as any);
      const data = prisma.package.create.mock.calls[0][0].data;
      expect(data.branchId).toBeNull();
      expect(data.businessId).toBe('biz-1');
    });
  });

  describe('findOne', () => {
    it('404 when missing', async () => {
      prisma.package.findFirst.mockResolvedValue(null);
      await expect(service.findOne(owner, 'nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('manager: 403 for a package of another branch', async () => {
      prisma.package.findFirst.mockResolvedValue({ id: 'p1', branchId: 'b-other' });
      await expect(service.findOne(manager, 'p1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('manager: allows an all-branch package', async () => {
      prisma.package.findFirst.mockResolvedValue({ id: 'p1', branchId: null });
      await expect(service.findOne(manager, 'p1')).resolves.toEqual({ id: 'p1', branchId: null });
    });
  });
});
