import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBranchIds } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';

type Period = 'today' | 'week' | 'month';

const DAY = 86400000;

function periodRange(period: Period): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    start.setTime(end.getTime() - 7 * DAY);
  } else {
    // month-to-date
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Sum of the outstanding balance across unpaid invoices for a branch filter. */
  private async outstanding(branchId?: string): Promise<number> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['issued', 'partially_paid', 'overdue'] },
        ...(branchId ? { branchId } : {}),
      },
      select: { total: true, amountPaid: true },
    });
    return invoices.reduce((s, i) => s + Math.max(0, i.total - i.amountPaid), 0);
  }

  /** KPIs for a single branch filter (branchId undefined => all branches). */
  private async kpisFor(branchId: string | undefined, period: Period) {
    const { start } = periodRange(period);
    const now = new Date();
    const [revenueAgg, members, expiring, checkInsToday, outstanding] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'paid', paidAt: { gte: start }, ...(branchId ? { branchId } : {}) },
      }),
      this.prisma.member.count({ where: { ...(branchId ? { homeBranchId: branchId } : {}) } }),
      this.prisma.membership.count({
        where: {
          status: 'active',
          endDate: { gte: now, lte: new Date(now.getTime() + 7 * DAY) },
          ...(branchId ? { branchId } : {}),
        },
      }),
      this.prisma.attendanceLog.count({
        where: { checkInAt: { gte: startOfToday() }, ...(branchId ? { branchId } : {}) },
      }),
      this.outstanding(branchId),
    ]);

    const revenue = revenueAgg._sum.amount ?? 0;
    return {
      totalMembers: members,
      revenue, // minor units, recognized in the period
      // No expense module yet, so profit == recognized revenue for now.
      monthlyProfit: revenue,
      outstanding,
      expiringMemberships: expiring,
      dailyAttendance: checkInsToday,
    };
  }

  async owner(user: AuthUser, opts: { branchId?: string; period?: Period } = {}) {
    if (user.role !== 'owner') throw new ForbiddenException();
    const period = opts.period ?? 'month';
    const branchId = opts.branchId && opts.branchId !== 'all' ? opts.branchId : undefined;

    const kpis = await this.kpisFor(branchId, period);

    // Branch comparison (always across all branches for the owner).
    const branches = await this.prisma.branch.findMany({
      where: { businessId: user.businessId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    const { start } = periodRange(period);
    const comparison = await Promise.all(
      branches.map(async (b) => {
        const [rev, members] = await Promise.all([
          this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'paid', paidAt: { gte: start }, branchId: b.id } }),
          this.prisma.member.count({ where: { homeBranchId: b.id } }),
        ]);
        return { branchId: b.id, name: b.name, code: b.code, revenue: rev._sum.amount ?? 0, members };
      }),
    );

    return { scope: branchId ?? 'all', period, kpis, comparison };
  }

  async branch(user: AuthUser, opts: { period?: Period } = {}) {
    const period = opts.period ?? 'month';
    const branchId = user.role === 'owner' ? undefined : (allowedBranchIds(user) ?? [])[0];
    if (!branchId) throw new BadRequestException('No branch assigned');
    const kpis = await this.kpisFor(branchId, period);
    return { branchId, period, kpis };
  }

  async reception(user: AuthUser) {
    const branchId = user.role === 'owner' ? undefined : (allowedBranchIds(user) ?? [])[0];
    if (!branchId) throw new BadRequestException('No branch assigned');
    const today = startOfToday();
    const [checkIns, paymentsAgg, newMembers] = await Promise.all([
      this.prisma.attendanceLog.count({ where: { branchId, checkInAt: { gte: today } } }),
      this.prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { branchId, status: 'paid', paidAt: { gte: today } } }),
      this.prisma.member.count({ where: { homeBranchId: branchId, createdAt: { gte: today } } }),
    ]);
    return {
      branchId,
      checkInsToday: checkIns,
      paymentsToday: { count: paymentsAgg._count, amount: paymentsAgg._sum.amount ?? 0 },
      newMembersToday: newMembers,
    };
  }
}
