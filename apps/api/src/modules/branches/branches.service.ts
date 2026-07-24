import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/types/auth-user';
import { CreateBranchDto } from './dto/create-branch.dto';

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
}
