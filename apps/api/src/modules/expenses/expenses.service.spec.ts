import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  expense: {
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
  },
  payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
});

const owner: AuthUser = { sub: 'o', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new ExpensesService(prisma as any);
  });

  describe('create', () => {
    it('owner must pass a branchId', async () => {
      await expect(service.create(owner, { category: 'rent', amount: 5000 } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('manager cannot target a foreign branch', async () => {
      await expect(
        service.create(manager, { category: 'rent', amount: 5000, branchId: 'b-other' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('manager creates for their own branch', async () => {
      prisma.expense.create.mockResolvedValue({ id: 'e1' });
      await service.create(manager, { category: 'electricity', amount: 8000 } as any);
      const data = prisma.expense.create.mock.calls[0][0].data;
      expect(data.branchId).toBe('b-kochi');
      expect(data.category).toBe('electricity');
    });
  });

  describe('list', () => {
    it('manager list is branch-scoped', async () => {
      await service.list(manager);
      const where = prisma.expense.findMany.mock.calls[0][0].where;
      expect(where.branchId).toEqual({ in: ['b-kochi'] });
    });
  });

  describe('remove', () => {
    it('404 when missing', async () => {
      prisma.expense.findUnique.mockResolvedValue(null);
      await expect(service.remove(manager, 'x')).rejects.toBeInstanceOf(NotFoundException);
    });
    it('403 when outside branch', async () => {
      prisma.expense.findUnique.mockResolvedValue({ id: 'e1', branchId: 'b-other' });
      await expect(service.remove(manager, 'e1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('profit', () => {
    it('computes income - expenses', async () => {
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 500000 } });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 180000 } });
      const res = await service.profit(manager);
      expect(res.income).toBe(500000);
      expect(res.expenses).toBe(180000);
      expect(res.profit).toBe(320000);
    });
  });
});
