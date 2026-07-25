import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBranchIds, branchWhere, canAccessBranch } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { CreatePayrollDto } from './dto/create-payroll.dto';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveBranchId(user: AuthUser, requested?: string): string {
    if (user.role === 'owner') {
      if (!requested) throw new BadRequestException('branchId is required when acting as owner');
      return requested;
    }
    const target = requested ?? (allowedBranchIds(user) ?? [])[0];
    if (!target) throw new BadRequestException('No branch assigned');
    if (!canAccessBranch(user, target)) throw new ForbiddenException('Outside your branch');
    return target;
  }

  /** net = base + commission + bonus - deduction (must be >= 0). */
  static computeNet(d: { baseAmount: number; commissionAmount?: number; bonus?: number; deduction?: number }): number {
    return d.baseAmount + (d.commissionAmount ?? 0) + (d.bonus ?? 0) - (d.deduction ?? 0);
  }

  async create(user: AuthUser, dto: CreatePayrollDto) {
    const branchId = this.resolveBranchId(user, dto.branchId);
    if (new Date(dto.periodStart) > new Date(dto.periodEnd)) {
      throw new BadRequestException('periodStart must be on or before periodEnd');
    }
    const net = PayrollService.computeNet(dto);
    if (net < 0) throw new UnprocessableEntityException('Net pay cannot be negative');

    return this.prisma.payrollRecord.create({
      data: {
        branchId,
        staffUserId: dto.staffUserId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        baseAmount: dto.baseAmount,
        commissionAmount: dto.commissionAmount ?? 0,
        bonus: dto.bonus ?? 0,
        deduction: dto.deduction ?? 0,
        netAmount: net,
        status: 'draft',
      },
    });
  }

  list(user: AuthUser, opts: { staffUserId?: string } = {}) {
    return this.prisma.payrollRecord.findMany({
      where: { ...branchWhere(user), ...(opts.staffUserId ? { staffUserId: opts.staffUserId } : {}) },
      orderBy: { periodStart: 'desc' },
      include: { staff: { select: { fullName: true, role: true } } },
      take: 200,
    });
  }

  private async getInScope(user: AuthUser, id: string) {
    const rec = await this.prisma.payrollRecord.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Payroll record not found');
    if (!canAccessBranch(user, rec.branchId)) throw new ForbiddenException('Outside your branch');
    return rec;
  }

  async approve(user: AuthUser, id: string) {
    const rec = await this.getInScope(user, id);
    if (rec.status !== 'draft') throw new UnprocessableEntityException('Only draft records can be approved');
    return this.prisma.payrollRecord.update({
      where: { id },
      data: { status: 'approved', approvedById: user.sub },
    });
  }

  /** Mark paid and record it as a Salary expense feeding branch profit. */
  async pay(user: AuthUser, id: string) {
    const rec = await this.getInScope(user, id);
    if (rec.status !== 'approved') throw new UnprocessableEntityException('Only approved records can be paid');
    return this.prisma.$transaction(async (tx) => {
      const paid = await tx.payrollRecord.update({
        where: { id },
        data: { status: 'paid', paidAt: new Date() },
      });
      await tx.expense.create({
        data: {
          branchId: rec.branchId,
          category: 'salary',
          amount: rec.netAmount,
          expenseDate: new Date(),
          note: `Payroll ${rec.id}`,
          createdById: user.sub,
        },
      });
      return paid;
    });
  }
}
