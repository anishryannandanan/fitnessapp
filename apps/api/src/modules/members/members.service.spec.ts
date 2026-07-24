import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MembersService } from './members.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => {
  const tx = {
    member: { create: jest.fn().mockResolvedValue({ id: 'mem-1', memberCode: 'KCH-0001' }) },
    membership: { create: jest.fn().mockResolvedValue({ id: 'ms-1' }) },
  };
  return {
    _tx: tx,
    branch: { findUnique: jest.fn() },
    member: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), create: jest.fn() },
    package: { findFirst: jest.fn() },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  };
};

const owner: AuthUser = { sub: 'o', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('MembersService', () => {
  let service: MembersService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    const billing = { createInvoiceTx: jest.fn().mockResolvedValue({ id: 'inv-1' }) };
    service = new MembersService(prisma as any, billing as any);
    prisma.branch.findUnique.mockResolvedValue({ id: 'b-kochi', code: 'KCH' });
    prisma.member.count.mockResolvedValue(0);
  });

  describe('list', () => {
    it('manager: scoped to their branch ids', async () => {
      await service.list(manager);
      const where = prisma.member.findMany.mock.calls[0][0].where;
      expect(where.homeBranchId).toEqual({ in: ['b-kochi'] });
    });

    it('applies a search query across name/phone/code', async () => {
      await service.list(owner, { q: 'fathima' });
      const where = prisma.member.findMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(3);
    });
  });

  describe('create', () => {
    it('owner must pass an explicit branchId', async () => {
      await expect(
        service.create(owner, { fullName: 'A B', phone: '+911234567890' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('manager cannot target a foreign branch', async () => {
      await expect(
        service.create(manager, { fullName: 'A B', phone: '+911234567890', branchId: 'b-other' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('manager: creates with generated member code', async () => {
      prisma.member.create.mockResolvedValue({ id: 'mem-1', memberCode: 'KCH-0001' });
      await service.create(manager, { fullName: 'Fathima S', phone: '+919000000001' } as any);
      const data = prisma.member.create.mock.calls[0][0].data;
      expect(data.memberCode).toBe('KCH-0001');
      expect(data.homeBranchId).toBe('b-kochi');
    });

    it('increments the member code from the branch count', async () => {
      prisma.member.count.mockResolvedValue(41);
      prisma.member.create.mockResolvedValue({ id: 'x' });
      await service.create(manager, { fullName: 'X Y', phone: '+919000000002' } as any);
      expect(prisma.member.create.mock.calls[0][0].data.memberCode).toBe('KCH-0042');
    });
  });

  describe('onboard', () => {
    it('creates member + membership atomically with a price snapshot', async () => {
      prisma.package.findFirst.mockResolvedValue({
        id: 'pkg-1', price: 150000, taxPercent: 18, durationDays: 30, ptSessions: null, branchId: null,
      });

      const res = await service.onboard(manager, {
        personal: { fullName: 'Fathima S', phone: '+919000000001' } as any,
        packageId: 'pkg-1',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      const membershipData = prisma._tx.membership.create.mock.calls[0][0].data;
      expect(membershipData.priceSnapshot).toBe(150000);
      expect(membershipData.taxSnapshot).toBe(27000); // 18% of 150000
      expect(res.member.id).toBe('mem-1');
    });

    it('rejects an inactive/missing package', async () => {
      prisma.package.findFirst.mockResolvedValue(null);
      await expect(
        service.onboard(manager, { personal: { fullName: 'A B', phone: '+911' } as any, packageId: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a package not available at the target branch', async () => {
      prisma.package.findFirst.mockResolvedValue({
        id: 'pkg-1', price: 1000, taxPercent: 0, durationDays: 30, ptSessions: null, branchId: 'b-other',
      });
      await expect(
        service.onboard(manager, { personal: { fullName: 'A B', phone: '+911' } as any, packageId: 'pkg-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
