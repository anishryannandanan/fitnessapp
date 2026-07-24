import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBranchIds, canAccessBranch } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { CreateMemberDto } from './dto/create-member.dto';
import { OnboardDto } from './dto/onboard.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve which branch a create/onboard should target for this user. */
  private resolveBranchId(user: AuthUser, requested?: string): string {
    if (user.role === 'owner') {
      if (!requested) {
        throw new BadRequestException('branchId is required when acting as owner');
      }
      return requested;
    }
    // Scoped staff: default to their (first) branch; reject foreign branches.
    const target = requested ?? user.branchIds[0];
    if (!target) throw new BadRequestException('No branch assigned');
    if (!canAccessBranch(user, target)) {
      throw new ForbiddenException('You cannot create members for this branch');
    }
    return target;
  }

  /** Next member code for a branch, e.g. KCH-0001. */
  private async nextMemberCode(branchId: string): Promise<string> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');
    const count = await this.prisma.member.count({ where: { homeBranchId: branchId } });
    return `${branch.code}-${String(count + 1).padStart(4, '0')}`;
  }

  async list(user: AuthUser, opts: { q?: string; status?: string } = {}) {
    const allowed = allowedBranchIds(user);
    const where: Prisma.MemberWhereInput = {
      businessId: user.businessId,
      ...(allowed ? { homeBranchId: { in: allowed } } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { fullName: { contains: opts.q, mode: 'insensitive' } },
              { phone: { contains: opts.q } },
              { memberCode: { contains: opts.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.member.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          where: { status: 'active' },
          orderBy: { endDate: 'desc' },
          take: 1,
          include: { package: { select: { name: true } } },
        },
      },
      take: 100,
    });
  }

  async findOne(user: AuthUser, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, businessId: user.businessId },
      include: {
        memberships: {
          orderBy: { createdAt: 'desc' },
          include: { package: { select: { name: true, type: true } } },
        },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (!canAccessBranch(user, member.homeBranchId)) {
      throw new ForbiddenException('You cannot access this member');
    }
    return member;
  }

  async create(user: AuthUser, dto: CreateMemberDto) {
    const branchId = this.resolveBranchId(user, dto.branchId);
    const memberCode = await this.nextMemberCode(branchId);
    return this.prisma.member.create({
      data: {
        businessId: user.businessId,
        homeBranchId: branchId,
        memberCode,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        gender: dto.gender,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        address: dto.address,
        createdById: user.sub,
      },
    });
  }

  /**
   * Atomic onboarding: create the member + an active membership for the chosen
   * package, in a single transaction. Returns the member with its membership.
   */
  async onboard(user: AuthUser, dto: OnboardDto) {
    const branchId = this.resolveBranchId(user, dto.personal.branchId);

    const pkg = await this.prisma.package.findFirst({
      where: { id: dto.packageId, businessId: user.businessId, isActive: true },
    });
    if (!pkg) throw new NotFoundException('Package not found or inactive');
    // Package must be all-branch or belong to the target branch.
    if (pkg.branchId && pkg.branchId !== branchId) {
      throw new BadRequestException('Package is not available at this branch');
    }

    const memberCode = await this.nextMemberCode(branchId);
    const start = dto.startDate ? new Date(dto.startDate) : new Date();
    const end = new Date(start.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          businessId: user.businessId,
          homeBranchId: branchId,
          memberCode,
          fullName: dto.personal.fullName,
          phone: dto.personal.phone,
          email: dto.personal.email,
          gender: dto.personal.gender,
          dob: dto.personal.dob ? new Date(dto.personal.dob) : undefined,
          address: dto.personal.address,
          createdById: user.sub,
        },
      });

      const membership = await tx.membership.create({
        data: {
          memberId: member.id,
          branchId,
          packageId: pkg.id,
          startDate: start,
          endDate: end,
          priceSnapshot: pkg.price,
          taxSnapshot: Math.round((pkg.price * pkg.taxPercent) / 100),
          sessionsTotal: pkg.ptSessions ?? undefined,
          status: 'active',
        },
        include: { package: { select: { name: true, type: true } } },
      });

      return { member, membership };
    });
  }
}
