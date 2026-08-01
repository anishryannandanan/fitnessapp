import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { canAccessBranch, branchWhere } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { CreateGroupClassDto, UpdateGroupClassDto } from './dto/create-class.dto';

@Injectable()
export class GroupClassesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Group Class CRUD ----

  async createClass(user: AuthUser, dto: CreateGroupClassDto) {
    if (!canAccessBranch(user, dto.branchId)) {
      throw new ForbiddenException('No access to this branch');
    }
    return this.prisma.groupClass.create({
      data: {
        branchId: dto.branchId,
        coachId: dto.coachId,
        name: dto.name,
        description: dto.description,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        maxCapacity: dto.maxCapacity ?? 20,
        classType: dto.classType ?? 'general',
        isRecurring: dto.isRecurring ?? true,
      },
    });
  }

  async updateClass(user: AuthUser, classId: string, dto: UpdateGroupClassDto) {
    const cls = await this.prisma.groupClass.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (!canAccessBranch(user, cls.branchId)) throw new ForbiddenException('No access');

    return this.prisma.groupClass.update({
      where: { id: classId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.coachId !== undefined ? { coachId: dto.coachId } : {}),
        ...(dto.maxCapacity !== undefined ? { maxCapacity: dto.maxCapacity } : {}),
        ...(dto.classType !== undefined ? { classType: dto.classType } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deactivateClass(user: AuthUser, classId: string) {
    const cls = await this.prisma.groupClass.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (!canAccessBranch(user, cls.branchId)) throw new ForbiddenException('No access');
    return this.prisma.groupClass.update({ where: { id: classId }, data: { isActive: false } });
  }

  async listClasses(user: AuthUser, opts: { branchId?: string; classType?: string } = {}) {
    return this.prisma.groupClass.findMany({
      where: {
        ...branchWhere(user),
        isActive: true,
        ...(opts.branchId ? { branchId: opts.branchId } : {}),
        ...(opts.classType ? { classType: opts.classType } : {}),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: { _count: { select: { enrollments: true } } },
    });
  }

  async getClass(user: AuthUser, classId: string) {
    const cls = await this.prisma.groupClass.findUnique({
      where: { id: classId },
      include: {
        enrollments: true,
        _count: { select: { enrollments: true } },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');
    if (!canAccessBranch(user, cls.branchId)) throw new ForbiddenException('No access');
    return { ...cls, spotsLeft: cls.maxCapacity - cls._count.enrollments };
  }

  // ---- Enrollment ----

  async enrollMember(user: AuthUser, classId: string, memberId: string, isAutoAssign = false) {
    const cls = await this.prisma.groupClass.findUnique({
      where: { id: classId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!cls || !cls.isActive) throw new NotFoundException('Class not found or inactive');
    if (!canAccessBranch(user, cls.branchId)) throw new ForbiddenException('No access');

    if (cls._count.enrollments >= cls.maxCapacity) {
      throw new UnprocessableEntityException('Class is full');
    }

    return this.prisma.classEnrollment.create({
      data: { classId, memberId, isAutoAssign },
    });
  }

  async unenrollMember(user: AuthUser, classId: string, memberId: string) {
    const cls = await this.prisma.groupClass.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (!canAccessBranch(user, cls.branchId)) throw new ForbiddenException('No access');

    const enrollment = await this.prisma.classEnrollment.findUnique({
      where: { classId_memberId: { classId, memberId } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.prisma.classEnrollment.delete({ where: { id: enrollment.id } });
    return { removed: true };
  }

  async getMemberClasses(memberId: string) {
    return this.prisma.classEnrollment.findMany({
      where: { memberId },
      include: { groupClass: true },
    });
  }

  // ---- Auto-assignment for non-PT members ----

  /**
   * For members who don't have personal training (non_trainer package),
   * auto-assign them to the best-fit group class in their branch.
   */
  async autoAssignToGroupClass(memberId: string, branchId: string) {
    // Find active group classes in the branch with available capacity
    const availableClasses = await this.prisma.groupClass.findMany({
      where: { branchId, isActive: true, classType: 'general' },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Find one with spots available
    const targetClass = availableClasses.find(
      (c) => c._count.enrollments < c.maxCapacity,
    );

    if (!targetClass) return null; // No available class

    // Check if already enrolled
    const existing = await this.prisma.classEnrollment.findUnique({
      where: { classId_memberId: { classId: targetClass.id, memberId } },
    });
    if (existing) return existing;

    return this.prisma.classEnrollment.create({
      data: { classId: targetClass.id, memberId, isAutoAssign: true },
    });
  }
}
