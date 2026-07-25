import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AttendanceMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBranchIds, branchWhere, canAccessBranch } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve which branch the acting user is recording attendance at. */
  private resolveBranchId(user: AuthUser, requested?: string): string {
    if (user.role === 'owner') {
      if (!requested) throw new BadRequestException('branchId is required when acting as owner');
      return requested;
    }
    const target = requested ?? user.branchIds[0];
    if (!target) throw new BadRequestException('No branch assigned');
    if (!canAccessBranch(user, target)) {
      throw new ForbiddenException('You cannot record attendance for this branch');
    }
    return target;
  }

  private async lookupMember(user: AuthUser, dto: CheckInDto) {
    const or: Prisma.MemberWhereInput[] = [];
    if (dto.memberId) or.push({ id: dto.memberId });
    if (dto.code) or.push({ memberCode: dto.code });
    if (dto.phone) or.push({ phone: dto.phone });
    if (or.length === 0) {
      throw new BadRequestException('Provide memberId, code or phone');
    }
    const member = await this.prisma.member.findFirst({
      where: { businessId: user.businessId, OR: or },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  private async activeMembership(memberId: string) {
    return this.prisma.membership.findFirst({
      where: { memberId },
      orderBy: { endDate: 'desc' },
    });
  }

  async checkIn(user: AuthUser, dto: CheckInDto) {
    const branchId = this.resolveBranchId(user, dto.branchId);
    const member = await this.lookupMember(user, dto);

    // Branch access: home branch always allowed; other branches require multi-branch access.
    if (member.homeBranchId !== branchId && !member.multiBranchAccess) {
      throw new UnprocessableEntityException({
        warning: 'branch_not_allowed',
        message: 'Member does not have access to this branch',
      });
    }

    // Prevent duplicate open session (already checked in, not checked out).
    const open = await this.prisma.attendanceLog.findFirst({
      where: { memberId: member.id, checkOutAt: null },
      orderBy: { checkInAt: 'desc' },
    });
    if (open) {
      return {
        alreadyCheckedIn: true,
        warning: 'already_checked_in',
        attendance: open,
        member: { id: member.id, name: member.fullName, code: member.memberCode },
      };
    }

    // Membership validity => warn (do not hard-block by default, see docs BR-27).
    const membership = await this.activeMembership(member.id);
    const now = new Date();
    const expired = !membership || membership.status !== 'active' || membership.endDate < now;

    const attendance = await this.prisma.attendanceLog.create({
      data: {
        branchId,
        memberId: member.id,
        method: dto.method ?? AttendanceMethod.manual,
        recordedById: user.sub,
      },
    });

    return {
      alreadyCheckedIn: false,
      warning: expired ? 'expired' : null,
      attendance,
      member: { id: member.id, name: member.fullName, code: member.memberCode },
      membership: membership
        ? { status: membership.status, endDate: membership.endDate, daysLeft: Math.ceil((membership.endDate.getTime() - now.getTime()) / 86400000) }
        : null,
    };
  }

  async checkOut(user: AuthUser, dto: CheckOutDto) {
    let log = null as null | Awaited<ReturnType<typeof this.prisma.attendanceLog.findFirst>>;
    if (dto.attendanceId) {
      log = await this.prisma.attendanceLog.findUnique({ where: { id: dto.attendanceId } });
    } else if (dto.memberId) {
      log = await this.prisma.attendanceLog.findFirst({
        where: { memberId: dto.memberId, checkOutAt: null },
        orderBy: { checkInAt: 'desc' },
      });
    } else {
      throw new BadRequestException('Provide attendanceId or memberId');
    }

    if (!log) throw new NotFoundException('No open check-in found');
    if (!canAccessBranch(user, log.branchId)) {
      throw new ForbiddenException('You cannot check out this member');
    }
    if (log.checkOutAt) throw new UnprocessableEntityException('Already checked out');

    const checkOutAt = new Date();
    const durationMinutes = Math.max(0, Math.round((checkOutAt.getTime() - log.checkInAt.getTime()) / 60000));
    return this.prisma.attendanceLog.update({
      where: { id: log.id },
      data: { checkOutAt, durationMinutes },
    });
  }

  async list(user: AuthUser, opts: { date?: string; memberId?: string } = {}) {
    let range: Prisma.DateTimeFilter | undefined;
    if (opts.date) {
      const start = new Date(opts.date);
      if (Number.isNaN(start.getTime())) throw new BadRequestException('Invalid date');
      const end = new Date(start.getTime() + 86400000);
      range = { gte: start, lt: end };
    }
    return this.prisma.attendanceLog.findMany({
      where: {
        ...branchWhere(user),
        ...(opts.memberId ? { memberId: opts.memberId } : {}),
        ...(range ? { checkInAt: range } : {}),
      },
      orderBy: { checkInAt: 'desc' },
      include: { member: { select: { fullName: true, memberCode: true } } },
      take: 200,
    });
  }

  /** Hourly footfall (0..23) over a date range, scoped to the user's branch(es). */
  async peakHours(user: AuthUser, opts: { from?: string; to?: string } = {}) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 7 * 86400000);
    const to = opts.to ? new Date(opts.to) : new Date();
    const logs = await this.prisma.attendanceLog.findMany({
      where: { ...branchWhere(user), checkInAt: { gte: from, lt: new Date(to.getTime() + 86400000) } },
      select: { checkInAt: true },
    });
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    for (const l of logs) buckets[l.checkInAt.getHours()].count += 1;
    const peak = buckets.reduce((a, b) => (b.count > a.count ? b : a), buckets[0]);
    return { total: logs.length, peakHour: peak.count > 0 ? peak.hour : null, buckets, branchScope: allowedBranchIds(user) ?? 'all' };
  }
}
