import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => {
  const tx = {
    payment: { create: jest.fn().mockResolvedValue({ id: 'pay-1', amount: 0, method: 'cash', paidAt: new Date() }) },
    invoice: { update: jest.fn() },
    branch: { findUnique: jest.fn() },
    invoice_count: jest.fn(),
  };
  return {
    _tx: tx,
    invoice: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    payment: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  };
};

const owner: AuthUser = { sub: 'o', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('BillingService', () => {
  let service: BillingService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new BillingService(prisma as any);
  });

  const invoice = (over: Partial<any> = {}) => ({
    id: 'inv-1',
    branchId: 'b-kochi',
    memberId: 'mem-1',
    total: 150000,
    amountPaid: 0,
    status: 'issued',
    invoiceNumber: 'INV-KCH-000001',
    ...over,
  });

  describe('recordPayment', () => {
    it('404 when the invoice is missing', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(
        service.recordPayment(owner, { invoiceId: 'x', amount: 100, method: 'cash' as any }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('403 when the invoice belongs to another branch', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice({ branchId: 'b-other' }));
      await expect(
        service.recordPayment(manager, { invoiceId: 'inv-1', amount: 100, method: 'cash' as any }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects overpayment (422)', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice({ total: 1000, amountPaid: 0 }));
      await expect(
        service.recordPayment(owner, { invoiceId: 'inv-1', amount: 2000, method: 'cash' as any }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects paying a void invoice (422)', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice({ status: 'void' }));
      await expect(
        service.recordPayment(owner, { invoiceId: 'inv-1', amount: 100, method: 'cash' as any }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects paying an already fully paid invoice (422)', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice({ total: 1000, amountPaid: 1000 }));
      await expect(
        service.recordPayment(owner, { invoiceId: 'inv-1', amount: 100, method: 'cash' as any }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('partial payment => status partially_paid', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice({ total: 150000, amountPaid: 0 }));
      prisma._tx.invoice.update.mockImplementation(({ data }: any) => ({ ...invoice(), ...data }));
      const res = await service.recordPayment(owner, { invoiceId: 'inv-1', amount: 50000, method: 'upi' as any });
      const updateArg = prisma._tx.invoice.update.mock.calls[0][0].data;
      expect(updateArg.amountPaid).toBe(50000);
      expect(updateArg.status).toBe('partially_paid');
      expect(res.receipt.balanceDue).toBe(100000);
    });

    it('full payment => status paid, balance 0', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice({ total: 150000, amountPaid: 0 }));
      prisma._tx.invoice.update.mockImplementation(({ data }: any) => ({ ...invoice(), ...data }));
      const res = await service.recordPayment(owner, { invoiceId: 'inv-1', amount: 150000, method: 'cash' as any });
      const updateArg = prisma._tx.invoice.update.mock.calls[0][0].data;
      expect(updateArg.status).toBe('paid');
      expect(res.receipt.balanceDue).toBe(0);
    });
  });

  describe('createInvoiceTx', () => {
    it('generates a sequential invoice number and totals subtotal + tax', async () => {
      prisma._tx.branch.findUnique.mockResolvedValue({ id: 'b-kochi', code: 'KCH' });
      const tx: any = {
        branch: prisma._tx.branch,
        invoice: {
          count: jest.fn().mockResolvedValue(4),
          create: jest.fn().mockImplementation(({ data }: any) => data),
        },
      };
      const inv = await service.createInvoiceTx(tx, {
        branchId: 'b-kochi', memberId: 'mem-1', subtotal: 150000, tax: 27000,
      });
      expect(inv.invoiceNumber).toBe('INV-KCH-000005');
      expect(inv.total).toBe(177000);
      expect(inv.status).toBe('issued');
    });
  });
});
