import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBranchIds, canAccessBranch } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List packages visible to the user. Everyone sees all-branch packages
   * (branchId = null); non-owners additionally see only their branch's packages.
   */
  async list(user: AuthUser, opts: { activeOnly?: boolean } = {}) {
    const allowed = allowedBranchIds(user);
    return this.prisma.package.findMany({
      where: {
        businessId: user.businessId,
        ...(opts.activeOnly ? { isActive: true } : {}),
        ...(allowed
          ? { OR: [{ branchId: null }, { branchId: { in: allowed } }] }
          : {}),
      },
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
    });
  }

  async findOne(user: AuthUser, id: string) {
    const pkg = await this.prisma.package.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    if (pkg.branchId && !canAccessBranch(user, pkg.branchId)) {
      throw new ForbiddenException('You cannot access this package');
    }
    return pkg;
  }

  async create(user: AuthUser, dto: CreatePackageDto) {
    // A manager may only create packages for their own branch (or all-branch is owner-only).
    if (dto.branchId) {
      if (!canAccessBranch(user, dto.branchId)) {
        throw new ForbiddenException('You cannot create a package for this branch');
      }
    } else if (user.role !== 'owner') {
      throw new ForbiddenException('Only the owner can create all-branch packages');
    }

    if (dto.type === 'trainer' && !dto.ptSessions) {
      throw new ForbiddenException('Trainer packages require ptSessions');
    }

    return this.prisma.package.create({
      data: {
        businessId: user.businessId,
        branchId: dto.branchId ?? null,
        name: dto.name,
        type: dto.type,
        description: dto.description,
        durationDays: dto.durationDays,
        price: dto.price,
        taxPercent: dto.taxPercent ?? 0,
        ptSessions: dto.ptSessions ?? null,
        includesTrainer: dto.includesTrainer ?? dto.type === 'trainer',
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdatePackageDto) {
    // Ensures scope (throws 403/404 as appropriate).
    await this.findOne(user, id);
    return this.prisma.package.update({ where: { id }, data: dto });
  }

  /** Deactivate (never hard-delete — memberships reference packages). */
  async deactivate(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.package.update({ where: { id }, data: { isActive: false } });
  }
}
