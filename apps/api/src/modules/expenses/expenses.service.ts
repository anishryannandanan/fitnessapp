import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBranchIds, branchWhere, canAccessBranch } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { CreateExpenseDto } from './dto/create-expense.dto';

function monthToDate(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveBranchId(user: AuthUser, requested?: string): string {
    if (user.role === 'owner') {
      if (!requested) throw new BadRequestException('branchId is required when acting as owner');
      return requested;
    }
    const target = requested ?? (allowedBranchIds(user) ?? [])[0];
    if (!target) throw new BadRequestException('No branch assigned');
    if (!canAccessBranch(user, target)) {
      throw new ForbiddenException('You cannot record expenses for this branch');
    }
    return target;
  }

  async create(user: AuthUser, dto: CreateExpenseDto) {
    const branchId = this.resolveBranchId(user, dto.branchId);
    return this.prisma.expense.create({
      data: {
        branchId,
        category: dto.category,
        amount: dto.amount,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        vendor: dto.vendor,
        note: dto.note,
        createdById: user.sub,
      },
    });
  }

  list(user: AuthUser, opts: { category?: ExpenseCategory; from?: string; to?: string } = {}) {
    let range: Prisma.DateTimeFilter | undefined;
    if (opts.from || opts.to) {
      range = {};
      if (opts.from) range.gte = new Date(opts.from);
      if (opts.to) range.lt = new Date(new Date(opts.to).getTime() + 86400000);
    }
    return this.prisma.expense.findMany({
      where: {
        ...branchWhere(user),
        ...(opts.category ? { category: opts.category } : {}),
        ...(range ? { expenseDate: range } : {}),
      },
      orderBy: { expenseDate: 'desc' },
      take: 200,
    });
  }

  async remove(user: AuthUser, id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    if (!canAccessBranch(user, expense.branchId)) {
      throw new ForbiddenException('You cannot delete this expense');
    }
    await this.prisma.expense.delete({ where: { id } });
    return { deleted: true };
  }

  /** Profit for a branch/period: recognized revenue - expenses (month-to-date by default). */
  async profit(user: AuthUser, branchId?: string) {
    const { start } = monthToDate();
    // Owner may target a branch; others are forced to their scope.
    const scope =
      user.role === 'owner'
        ? branchId
          ? { branchId }
          : {}
        : branchWhere(user);

    const [revenueAgg, expenseAgg] = await Promise.all([
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'paid', paidAt: { gte: start }, ...scope } }),
      this.prisma.expense.aggregate({ _sum: { amount: true }, where: { expenseDate: { gte: start }, ...scope } }),
    ]);
    const income = revenueAgg._sum.amount ?? 0;
    const expenses = expenseAgg._sum.amount ?? 0;
    return { period: 'month', income, expenses, profit: income - expenses };
  }
}
