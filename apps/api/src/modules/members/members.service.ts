import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBranchIds, canAccessBranch } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { CreateMemberDto } from './dto/create-member.dto';
import { OnboardDto } from './dto/onboard.dto';
import { BillingService } from '../billing/billing.service';

// Invoice statuses that still owe money (used to compute dues on lists).
const UNPAID_STATUSES = ['issued', 'partially_paid', 'overdue'] as const;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

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
        // Unpaid invoices let the client compute dues per member.
        invoices: {
          where: { status: { in: [...UNPAID_STATUSES] } },
          select: { total: true, amountPaid: true },
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
        invoices: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { paidAt: 'desc' }, take: 20 },
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
      // Create login account for the member if password provided
      let userId: string | undefined;
      if (dto.password && dto.personal.email) {
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const memberUser = await tx.user.create({
          data: {
            businessId: user.businessId,
            role: UserRole.member,
            email: dto.personal.email,
            fullName: dto.personal.fullName,
            passwordHash,
            avatarColor: '#EC4899',
          },
        });
        await tx.userBranch.create({
          data: { userId: memberUser.id, branchId, isPrimary: true },
        });
        userId = memberUser.id;
      }

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
          userId: userId ?? undefined,
        },
      });

      const tax = Math.round((pkg.price * pkg.taxPercent) / 100);
      const membership = await tx.membership.create({
        data: {
          memberId: member.id,
          branchId,
          packageId: pkg.id,
          startDate: start,
          endDate: end,
          priceSnapshot: pkg.price,
          taxSnapshot: tax,
          sessionsTotal: pkg.ptSessions ?? undefined,
          status: 'active',
        },
        include: { package: { select: { name: true, type: true } } },
      });

      // Every sale produces an invoice (unpaid until a payment is recorded).
      const invoice = await this.billing.createInvoiceTx(tx, {
        branchId,
        memberId: member.id,
        membershipId: membership.id,
        subtotal: pkg.price,
        tax,
        issuedById: user.sub,
      });

      return { member, membership, invoice };
    });
  }
}
