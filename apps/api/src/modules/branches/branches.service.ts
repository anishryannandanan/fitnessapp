import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/types/auth-user';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  private isOwner(user: AuthUser) {
    return user.role === 'owner';
  }

  /** Branch ids the user may access. Owner => undefined (all). */
  private allowedBranchIds(user: AuthUser): string[] | undefined {
    return this.isOwner(user) ? undefined : user.branchIds;
  }

  async list(user: AuthUser) {
    const allowed = this.allowedBranchIds(user);
    return this.prisma.branch.findMany({
      where: {
        businessId: user.businessId,
        ...(allowed ? { id: { in: allowed } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const allowed = this.allowedBranchIds(user);
    if (allowed && !allowed.includes(id)) {
      // Explicit 403 for out-of-scope access (audit-friendly, see docs/11).
      throw new ForbiddenException('You cannot access this branch');
    }
    const branch = await this.prisma.branch.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(user: AuthUser, dto: CreateBranchDto) {
    // Only the owner can create branches (also enforced by @Roles at the route).
    if (!this.isOwner(user)) {
      throw new ForbiddenException('Only the owner can create branches');
    }
    return this.prisma.branch.create({
      data: {
        businessId: user.businessId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateBranchDto) {
    // findOne already checks scope + existence (throws 403 or 404).
    await this.findOne(user, id);
    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async deactivate(user: AuthUser, id: string) {
    // Only owner can deactivate (also enforced by @Roles at the route).
    if (!this.isOwner(user)) {
      throw new ForbiddenException('Only the owner can deactivate branches');
    }
    await this.findOne(user, id);
    return this.prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async hardDelete(user: AuthUser, id: string) {
    if (!this.isOwner(user)) {
      throw new ForbiddenException('Only the owner can delete branches');
    }
    await this.findOne(user, id);

    // Check if branch has members — prevent deletion if members exist
    const memberCount = await this.prisma.member.count({ where: { homeBranchId: id } });
    if (memberCount > 0) {
      throw new ForbiddenException(
        `Cannot delete branch with ${memberCount} member(s). Move or remove members first.`,
      );
    }

    // Delete related records first (cascade not automatic for all)
    await this.prisma.userBranch.deleteMany({ where: { branchId: id } });
    await this.prisma.staffProfile.deleteMany({ where: { branchId: id } });
    await this.prisma.expense.deleteMany({ where: { branchId: id } });
    await this.prisma.attendanceLog.deleteMany({ where: { branchId: id } });
    await this.prisma.trainerSlot.deleteMany({ where: { branchId: id } });
    await this.prisma.pTSession.deleteMany({ where: { branchId: id } });
    await this.prisma.groupClass.deleteMany({ where: { branchId: id } });

    return this.prisma.branch.delete({ where: { id } });
  }
}
