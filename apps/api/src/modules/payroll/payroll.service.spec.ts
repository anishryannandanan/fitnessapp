import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => {
  const tx = {
    payrollRecord: { update: jest.fn().mockResolvedValue({ id: 'pr1', status: 'paid' }) },
    expense: { create: jest.fn().mockResolvedValue({}) },
  };
  return {
    _tx: tx,
    payrollRecord: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  };
};

const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

const baseDto = {
  staffUserId: 'staff-1',
  periodStart: '2026-07-01',
  periodEnd: '2026-07-31',
  baseAmount: 3000000,
};

describe('PayrollService', () => {
  let service: PayrollService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new PayrollService(prisma as any);
  });

  it('computeNet = base + commission + bonus - deduction', () => {
    expect(PayrollService.computeNet({ baseAmount: 3000000, commissionAmount: 500000, bonus: 100000, deduction: 200000 })).toBe(3400000);
  });

  describe('create', () => {
    it('computes netAmount and stores draft', async () => {
      prisma.payrollRecord.create.mockResolvedValue({ id: 'pr1' });
      await service.create(manager, { ...baseDto, commissionAmount: 500000, bonus: 100000, deduction: 200000 } as any);
      const data = prisma.payrollRecord.create.mock.calls[0][0].data;
      expect(data.netAmount).toBe(3400000);
      expect(data.status).toBe('draft');
      expect(data.branchId).toBe('b-kochi');
    });

    it('rejects negative net pay (422)', async () => {
      await expect(service.create(manager, { ...baseDto, baseAmount: 1000, deduction: 5000 } as any)).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects period start after end (400)', async () => {
      await expect(service.create(manager, { ...baseDto, periodStart: '2026-08-01', periodEnd: '2026-07-01' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('approve', () => {
    it('403 when outside branch', async () => {
      prisma.payrollRecord.findUnique.mockResolvedValue({ id: 'pr1', branchId: 'b-other', status: 'draft' });
      await expect(service.approve(manager, 'pr1')).rejects.toBeInstanceOf(ForbiddenException);
    });
    it('404 when missing', async () => {
      prisma.payrollRecord.findUnique.mockResolvedValue(null);
      await expect(service.approve(manager, 'x')).rejects.toBeInstanceOf(NotFoundException);
    });
    it('rejects approving a non-draft (422)', async () => {
      prisma.payrollRecord.findUnique.mockResolvedValue({ id: 'pr1', branchId: 'b-kochi', status: 'approved' });
      await expect(service.approve(manager, 'pr1')).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
    it('approves a draft', async () => {
      prisma.payrollRecord.findUnique.mockResolvedValue({ id: 'pr1', branchId: 'b-kochi', status: 'draft' });
      prisma.payrollRecord.update.mockResolvedValue({ id: 'pr1', status: 'approved' });
      const res = await service.approve(manager, 'pr1');
      expect(res.status).toBe('approved');
    });
  });

  describe('pay', () => {
    it('only approved records can be paid (422)', async () => {
      prisma.payrollRecord.findUnique.mockResolvedValue({ id: 'pr1', branchId: 'b-kochi', status: 'draft' });
      await expect(service.pay(manager, 'pr1')).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('pays and records a salary expense', async () => {
      prisma.payrollRecord.findUnique.mockResolvedValue({ id: 'pr1', branchId: 'b-kochi', status: 'approved', netAmount: 3000000 });
      await service.pay(manager, 'pr1');
      expect(prisma._tx.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ category: 'salary', amount: 3000000 }) }),
      );
    });
  });
});
