import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 }, _count: 0 }) },
  member: { count: jest.fn().mockResolvedValue(0) },
  membership: { count: jest.fn().mockResolvedValue(0) },
  attendanceLog: { count: jest.fn().mockResolvedValue(0) },
  invoice: { findMany: jest.fn().mockResolvedValue([]) },
  branch: { findMany: jest.fn().mockResolvedValue([]) },
});

const owner: AuthUser = { sub: 'o', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };
const managerNoBranch: AuthUser = { ...manager, branchIds: [] };

describe('DashboardsService', () => {
  let service: DashboardsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new DashboardsService(prisma as any);
  });

  describe('owner', () => {
    it('forbids non-owners', async () => {
      await expect(service.owner(manager as any, {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('aggregates revenue and outstanding across branches', async () => {
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 500000 }, _count: 3 });
      prisma.member.count.mockResolvedValue(842);
      prisma.membership.count.mockResolvedValue(14);
      prisma.attendanceLog.count.mockResolvedValue(42);
      prisma.invoice.findMany.mockResolvedValue([{ total: 150000, amountPaid: 0 }, { total: 200000, amountPaid: 50000 }]);
      prisma.branch.findMany.mockResolvedValue([{ id: 'b-kochi', name: 'Kochi', code: 'KCH' }]);

      const res = await service.owner(owner, { branchId: 'all', period: 'month' });
      expect(res.scope).toBe('all');
      expect(res.kpis.revenue).toBe(500000);
      expect(res.kpis.monthlyProfit).toBe(500000); // no expenses module yet
      expect(res.kpis.outstanding).toBe(300000); // 150000 + 150000
      expect(res.kpis.expiringMemberships).toBe(14);
      expect(res.kpis.dailyAttendance).toBe(42);
      expect(res.comparison).toHaveLength(1);
    });

    it('scopes KPIs to a single branch when branchId is given', async () => {
      prisma.branch.findMany.mockResolvedValue([]);
      await service.owner(owner, { branchId: 'b-kochi', period: 'week' });
      // member.count called with homeBranchId filter for the KPI block
      const call = prisma.member.count.mock.calls[0][0];
      expect(call.where.homeBranchId).toBe('b-kochi');
    });
  });

  describe('branch', () => {
    it('scopes to the manager branch', async () => {
      await service.branch(manager, { period: 'month' });
      expect(prisma.member.count.mock.calls[0][0].where.homeBranchId).toBe('b-kochi');
    });

    it('errors when the manager has no branch', async () => {
      await expect(service.branch(managerNoBranch, {})).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('reception', () => {
    it('returns today counts scoped to the branch', async () => {
      prisma.attendanceLog.count.mockResolvedValue(5);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 120000 }, _count: 2 });
      prisma.member.count.mockResolvedValue(1);
      const res = await service.reception(manager);
      expect(res.branchId).toBe('b-kochi');
      expect(res.checkInsToday).toBe(5);
      expect(res.paymentsToday).toEqual({ count: 2, amount: 120000 });
      expect(res.newMembersToday).toBe(1);
    });
  });
});
