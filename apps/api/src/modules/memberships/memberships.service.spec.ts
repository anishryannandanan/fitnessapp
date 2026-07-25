import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import type { AuthUser } from '../../common/types/auth-user';

const DAY = 24 * 60 * 60 * 1000;

const createPrismaMock = () => {
  const tx = {
    membership: { update: jest.fn(), create: jest.fn().mockResolvedValue({ id: 'new' }) },
  };
  return {
    _tx: tx,
    member: { findFirst: jest.fn() },
    membership: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    package: { findFirst: jest.fn() },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  };
};

const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('MembershipsService.renew', () => {
  let service: MembershipsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    const billing = { createInvoiceTx: jest.fn().mockResolvedValue({ id: 'inv-1' }) };
    service = new MembershipsService(prisma as any, billing as any);
    prisma.member.findFirst.mockResolvedValue({ id: 'mem-1', homeBranchId: 'b-kochi' });
    prisma.package.findFirst.mockResolvedValue({ id: 'pkg-1', price: 150000, taxPercent: 0, durationDays: 30, ptSessions: null });
  });

  it('403 when member is out of scope', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'mem-1', homeBranchId: 'b-other' });
    await expect(service.renew(manager, 'mem-1', {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404 when member not found', async () => {
    prisma.member.findFirst.mockResolvedValue(null);
    await expect(service.renew(manager, 'x', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('stacks the new term on top of a still-active membership (no lost days)', async () => {
    const futureEnd = new Date(Date.now() + 10 * DAY);
    prisma.membership.findFirst.mockResolvedValue({ id: 'cur', packageId: 'pkg-1', endDate: futureEnd, status: 'active' });

    await service.renew(manager, 'mem-1', {});

    const created = prisma._tx.membership.create.mock.calls[0][0].data;
    // new start == current end date
    expect(new Date(created.startDate).getTime()).toBe(futureEnd.getTime());
    expect(new Date(created.endDate).getTime()).toBe(futureEnd.getTime() + 30 * DAY);
    expect(created.isRenewalOf).toBe('cur');
    // active membership not expired
    expect(prisma._tx.membership.update).not.toHaveBeenCalled();
  });

  it('starts today and expires the old one when already lapsed', async () => {
    const pastEnd = new Date(Date.now() - 5 * DAY);
    prisma.membership.findFirst.mockResolvedValue({ id: 'cur', packageId: 'pkg-1', endDate: pastEnd, status: 'active' });

    const before = Date.now();
    await service.renew(manager, 'mem-1', {});

    const created = prisma._tx.membership.create.mock.calls[0][0].data;
    expect(new Date(created.startDate).getTime()).toBeGreaterThanOrEqual(before);
    // lapsed active membership should be expired
    expect(prisma._tx.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cur' }, data: { status: 'expired' } }),
    );
  });

  it('404 when no package to renew with', async () => {
    prisma.membership.findFirst.mockResolvedValue(null); // no current
    await expect(service.renew(manager, 'mem-1', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
