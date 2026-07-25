import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  payment: { findMany: jest.fn().mockResolvedValue([]), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
  expense: { findMany: jest.fn().mockResolvedValue([]), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
  member: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  branch: { findMany: jest.fn().mockResolvedValue([]) },
});

const owner: AuthUser = { sub: 'o', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new ReportsService(prisma as any);
  });

  it('revenue: groups paid payments by day (amounts in rupees)', async () => {
    prisma.payment.findMany.mockResolvedValue([
      { amount: 150000, paidAt: new Date('2026-07-10T09:00:00Z') },
      { amount: 50000, paidAt: new Date('2026-07-10T18:00:00Z') },
      { amount: 200000, paidAt: new Date('2026-07-11T10:00:00Z') },
    ]);
    const r = await service.build(owner, 'revenue', { from: '2026-07-01', to: '2026-07-31' });
    expect(r.columns).toEqual(['Date', 'Payments', 'Amount (₹)']);
    expect(r.rows).toEqual([
      ['2026-07-10', 2, 2000],
      ['2026-07-11', 1, 2000],
    ]);
  });

  it('profit: income - expenses in rupees', async () => {
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 500000 } });
    prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 180000 } });
    const r = await service.build(manager, 'profit', {});
    expect(r.rows).toEqual([['Income', 5000], ['Expenses', 1800], ['Profit', 3200]]);
  });

  it('branch-comparison is owner-only', async () => {
    await expect(service.build(manager, 'branch-comparison', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown report type', async () => {
    await expect(service.build(owner, 'nope' as any, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('toCsv escapes commas and quotes', () => {
    const csv = service.toCsv({
      type: 'payments', title: 'x', generatedAt: 'now',
      columns: ['Member', 'Amount (₹)'],
      rows: [['Doe, John', 1500], ['Quote "Q"', 200]],
    });
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Member,Amount (₹)');
    expect(lines[1]).toBe('"Doe, John",1500');
    expect(lines[2]).toBe('"Quote ""Q""",200');
  });

  it('toXlsx returns a non-empty buffer', async () => {
    const buf = await service.toXlsx({ type: 'profit', title: 'P&L', generatedAt: 'now', columns: ['Metric', 'Amount (₹)'], rows: [['Income', 5000]] });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });
});
