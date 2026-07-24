import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { canAccessBranch } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { RenewDto } from './dto/renew.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getMemberInScope(user: AuthUser, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, businessId: user.businessId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (!canAccessBranch(user, member.homeBranchId)) {
      throw new ForbiddenException('You cannot access this member');
    }
    return member;
  }

  async listForMember(user: AuthUser, memberId: string) {
    await this.getMemberInScope(user, memberId);
    return this.prisma.membership.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      include: { package: { select: { name: true, type: true } } },
    });
  }

  /**
   * Renew a member's membership.
   * Stacking rule (docs BR-16): if the current membership hasn't expired, the
   * new term starts at the current end date (no lost days); otherwise it starts today.
   */
  async renew(user: AuthUser, memberId: string, dto: RenewDto) {
    const member = await this.getMemberInScope(user, memberId);

    const current = await this.prisma.membership.findFirst({
      where: { memberId },
      orderBy: { endDate: 'desc' },
    });

    const packageId = dto.packageId ?? current?.packageId;
    if (!packageId) {
      throw new NotFoundException('No package to renew with; specify packageId');
    }

    const pkg = await this.prisma.package.findFirst({
      where: { id: packageId, businessId: user.businessId, isActive: true },
    });
    if (!pkg) throw new NotFoundException('Package not found or inactive');

    const now = new Date();
    const start =
      current && current.endDate > now ? current.endDate : now; // stacking
    const end = new Date(start.getTime() + pkg.durationDays * DAY_MS);

    return this.prisma.$transaction(async (tx) => {
      // Expire the previous active membership if it has already lapsed.
      if (current && current.status === 'active' && current.endDate <= now) {
        await tx.membership.update({
          where: { id: current.id },
          data: { status: 'expired' },
        });
      }

      return tx.membership.create({
        data: {
          memberId: member.id,
          branchId: member.homeBranchId,
          packageId: pkg.id,
          startDate: start,
          endDate: end,
          priceSnapshot: pkg.price,
          taxSnapshot: Math.round((pkg.price * pkg.taxPercent) / 100),
          sessionsTotal: pkg.ptSessions ?? undefined,
          status: 'active',
          isRenewalOf: current?.id ?? undefined,
        },
        include: { package: { select: { name: true, type: true } } },
      });
    });
  }
}
