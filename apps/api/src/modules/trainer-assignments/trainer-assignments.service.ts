import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { canAccessBranch, branchWhere } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { AssignTrainerDto } from './dto/assign-trainer.dto';

@Injectable()
export class TrainerAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assign a trainer to a member. Deactivates any previous assignment first.
   */
  async assign(user: AuthUser, dto: AssignTrainerDto) {
    if (!canAccessBranch(user, dto.branchId)) {
      throw new ForbiddenException('No access to this branch');
    }

    // Verify trainer exists and is a trainer at this branch
    const trainer = await this.prisma.user.findFirst({
      where: { id: dto.trainerId, role: 'trainer', isActive: true },
    });
    if (!trainer) throw new NotFoundException('Trainer not found');

    // Verify member exists at this branch
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, homeBranchId: dto.branchId },
    });
    if (!member) throw new NotFoundException('Member not found at this branch');

    // Deactivate any existing active assignment for this member
    await this.prisma.trainerAssignment.updateMany({
      where: { memberId: dto.memberId, isActive: true },
      data: { isActive: false, unassignedAt: new Date() },
    });

    // Create new assignment
    return this.prisma.trainerAssignment.create({
      data: {
        branchId: dto.branchId,
        trainerId: dto.trainerId,
        memberId: dto.memberId,
        assignedById: user.sub,
        notes: dto.notes,
      },
    });
  }

  /**
   * Unassign (deactivate) the current trainer assignment for a member.
   */
  async unassign(user: AuthUser, assignmentId: string) {
    const assignment = await this.prisma.trainerAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (!canAccessBranch(user, assignment.branchId)) {
      throw new ForbiddenException('No access');
    }
    if (!assignment.isActive) {
      throw new UnprocessableEntityException('Assignment is already inactive');
    }

    return this.prisma.trainerAssignment.update({
      where: { id: assignmentId },
      data: { isActive: false, unassignedAt: new Date() },
    });
  }

  /**
   * List active trainer assignments (scoped by branch).
   */
  async list(user: AuthUser, opts: { branchId?: string; trainerId?: string } = {}) {
    return this.prisma.trainerAssignment.findMany({
      where: {
        ...branchWhere(user),
        isActive: true,
        ...(opts.branchId ? { branchId: opts.branchId } : {}),
        ...(opts.trainerId ? { trainerId: opts.trainerId } : {}),
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  /**
   * Get trainer's assigned members (for trainer's own view).
   */
  async myMembers(trainerId: string) {
    const assignments = await this.prisma.trainerAssignment.findMany({
      where: { trainerId, isActive: true },
      include: {
        // We need member info - query separately since no relation defined
      },
    });

    // Fetch member details for each assignment
    const memberIds = assignments.map((a) => a.memberId);
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        fullName: true,
        memberCode: true,
        phone: true,
        email: true,
        photoUrl: true,
        status: true,
      },
    });

    return assignments.map((a) => ({
      ...a,
      member: members.find((m) => m.id === a.memberId) ?? null,
    }));
  }

  /**
   * Get assignment history for a member.
   */
  async memberHistory(user: AuthUser, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (!canAccessBranch(user, member.homeBranchId)) {
      throw new ForbiddenException('No access');
    }

    return this.prisma.trainerAssignment.findMany({
      where: { memberId },
      orderBy: { assignedAt: 'desc' },
    });
  }
}
