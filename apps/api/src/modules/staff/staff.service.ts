import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBranchIds, canAccessBranch } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all staff (non-member users) scoped to the caller's branches.
   * Owner sees all staff; manager sees only their branch staff.
   */
  async list(user: AuthUser, opts: { q?: string } = {}) {
    const allowed = allowedBranchIds(user);

    // Staff are users with role != 'owner' and role != 'member'
    // who have at least one UserBranch row.
    const where: any = {
      businessId: user.businessId,
      role: { notIn: ['owner', 'member'] },
      ...(opts.q
        ? {
            OR: [
              { fullName: { contains: opts.q, mode: 'insensitive' } },
              { email: { contains: opts.q, mode: 'insensitive' } },
              { phone: { contains: opts.q } },
            ],
          }
        : {}),
      ...(allowed
        ? { userBranches: { some: { branchId: { in: allowed } } } }
        : {}),
    };

    return this.prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        avatarColor: true,
        lastLoginAt: true,
        createdAt: true,
        staffProfile: {
          select: {
            staffType: true,
            specialization: true,
            dateOfJoining: true,
          },
        },
        userBranches: {
          select: {
            branch: { select: { id: true, name: true, code: true } },
            isPrimary: true,
          },
        },
      },
      take: 100,
    });
  }

  async findOne(user: AuthUser, id: string) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id,
        businessId: user.businessId,
        role: { notIn: ['owner', 'member'] },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        avatarColor: true,
        lastLoginAt: true,
        createdAt: true,
        staffProfile: {
          select: {
            id: true,
            staffType: true,
            specialization: true,
            dateOfJoining: true,
            branchId: true,
          },
        },
        userBranches: {
          select: {
            branch: { select: { id: true, name: true, code: true } },
            isPrimary: true,
          },
        },
      },
    });

    if (!staff) throw new NotFoundException('Staff member not found');

    // Check branch scope for non-owners
    const staffBranchIds = staff.userBranches.map((ub) => ub.branch.id);
    const allowed = allowedBranchIds(user);
    if (allowed && !staffBranchIds.some((bid) => allowed.includes(bid))) {
      throw new ForbiddenException('You cannot access this staff member');
    }

    return staff;
  }

  async update(user: AuthUser, id: string, dto: UpdateStaffDto) {
    // Verify exists + scope
    const staff = await this.findOne(user, id);

    // Update user record
    const userData: any = {};
    if (dto.fullName !== undefined) userData.fullName = dto.fullName;
    if (dto.email !== undefined) userData.email = dto.email;
    if (dto.phone !== undefined) userData.phone = dto.phone || null;
    if (dto.isActive !== undefined) userData.isActive = dto.isActive;

    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({
        where: { id },
        data: userData,
      });
    }

    // Update staff profile if staffType or specialization changed
    if (dto.staffType !== undefined || dto.specialization !== undefined) {
      if (staff.staffProfile) {
        const profileData: any = {};
        if (dto.staffType !== undefined) profileData.staffType = dto.staffType;
        if (dto.specialization !== undefined) profileData.specialization = dto.specialization;
        await this.prisma.staffProfile.update({
          where: { userId: id },
          data: profileData,
        });
      }
    }

    return this.findOne(user, id);
  }

  /**
   * Reset a staff member's password (owner-only).
   * Hashes the new password with bcrypt and stores it.
   */
  async resetPassword(user: AuthUser, staffId: string, newPassword: string) {
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only the owner can reset staff passwords');
    }

    // Verify the staff user exists
    const staff = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        businessId: user.businessId,
        role: { notIn: ['owner'] }, // owner can reset anyone except themselves via this endpoint
      },
    });

    if (!staff) throw new NotFoundException('Staff member not found');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: staffId },
      data: { passwordHash: hash },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Create a new staff member (owner-only).
   * Creates User + StaffProfile + UserBranch in one go.
   */
  async create(user: AuthUser, dto: CreateStaffDto) {
    if (user.role !== 'owner') {
      throw new ForbiddenException('Only the owner can add staff');
    }

    // Verify the branch exists
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, businessId: user.businessId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    // Map staffType to UserRole
    const roleMap: Record<string, string> = {
      manager: 'manager',
      receptionist: 'receptionist',
      trainer: 'trainer',
      dietician: 'dietician',
    };
    const userRole = roleMap[dto.staffType] ?? 'trainer';

    const hash = await bcrypt.hash(dto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        businessId: user.businessId,
        role: userRole as any,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone || null,
        fullName: dto.fullName,
        passwordHash: hash,
        avatarColor: this.randomColor(),
      },
    });

    // Create branch assignment
    await this.prisma.userBranch.create({
      data: {
        userId: newUser.id,
        branchId: dto.branchId,
        isPrimary: true,
      },
    });

    // Create staff profile
    await this.prisma.staffProfile.create({
      data: {
        userId: newUser.id,
        branchId: dto.branchId,
        staffType: dto.staffType as any,
        specialization: dto.specialization || null,
      },
    });

    return this.findOne(user, newUser.id);
  }

  private randomColor(): string {
    const colors = ['#3B82F6', '#F97316', '#A855F7', '#EC4899', '#16A34A', '#EAB308', '#06B6D4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
