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
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { LogWorkoutDto } from './dto/log-workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveBranchId(user: AuthUser): string {
    const branchId = (allowedBranchIds(user) ?? [])[0];
    if (!branchId) throw new BadRequestException('No branch assigned');
    return branchId;
  }

  // ---- Exercise library (business-wide) ----
  listExercises(user: AuthUser, opts: { q?: string; muscle?: string } = {}) {
    return this.prisma.exercise.findMany({
      where: {
        businessId: user.businessId,
        ...(opts.muscle ? { muscleGroup: opts.muscle } : {}),
        ...(opts.q ? { name: { contains: opts.q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      take: 200,
    });
  }

  createExercise(user: AuthUser, dto: CreateExerciseDto) {
    return this.prisma.exercise.create({
      data: { businessId: user.businessId, ...dto },
    });
  }

  // ---- Workout plans ----
  async createPlan(user: AuthUser, dto: CreatePlanDto) {
    const branchId = this.resolveBranchId(user);
    if (dto.memberId) {
      const member = await this.prisma.member.findFirst({ where: { id: dto.memberId, businessId: user.businessId } });
      if (!member) throw new NotFoundException('Member not found');
      if (!canAccessBranch(user, member.homeBranchId)) throw new ForbiddenException('Member is outside your branch');
    }
    return this.prisma.workoutPlan.create({
      data: {
        branchId,
        createdById: user.sub,
        memberId: dto.memberId ?? null,
        isTemplate: !dto.memberId,
        name: dto.name,
        goal: dto.goal,
        weeks: dto.weeks ?? 4,
        daysPerWeek: dto.daysPerWeek ?? 3,
        exercises: dto.exercises
          ? {
              create: dto.exercises.map((e, i) => ({
                exerciseId: e.exerciseId,
                dayIndex: e.dayIndex ?? 1,
                orderIndex: e.orderIndex ?? i,
                sets: e.sets ?? 3,
                reps: e.reps ?? '10',
                restSec: e.restSec ?? 60,
                notes: e.notes,
              })),
            }
          : undefined,
      },
      include: { exercises: { include: { exercise: { select: { name: true, muscleGroup: true } } } } },
    });
  }

  listPlans(user: AuthUser, opts: { memberId?: string; templatesOnly?: boolean } = {}) {
    const allowed = allowedBranchIds(user);
    const where: Prisma.WorkoutPlanWhereInput = {
      ...(allowed ? { branchId: { in: allowed } } : {}),
      ...(opts.memberId ? { memberId: opts.memberId } : {}),
      ...(opts.templatesOnly ? { isTemplate: true } : {}),
    };
    return this.prisma.workoutPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { exercises: { include: { exercise: { select: { name: true, muscleGroup: true } } } } },
      take: 100,
    });
  }

  async getPlan(user: AuthUser, id: string) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id },
      include: { exercises: { include: { exercise: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!canAccessBranch(user, plan.branchId)) throw new ForbiddenException('Plan is outside your branch');
    return plan;
  }

  // ---- Member workout logging (with PR detection) ----
  async logWorkout(user: AuthUser, dto: LogWorkoutDto) {
    const member = await this.prisma.member.findFirst({ where: { id: dto.memberId, businessId: user.businessId } });
    if (!member) throw new NotFoundException('Member not found');
    if (!canAccessBranch(user, member.homeBranchId)) throw new ForbiddenException('Member is outside your branch');

    // Compute PRs server-side: a set is a PR if its weight exceeds the member's
    // previous best for that exercise.
    const prByExercise = new Map<string, number>();
    for (const s of dto.sets) {
      const w = s.weightGrams ?? 0;
      if (w > (prByExercise.get(s.exerciseId) ?? -1)) prByExercise.set(s.exerciseId, w);
    }
    const previousBests = await this.prisma.workoutLogSet.groupBy({
      by: ['exerciseId'],
      where: { exerciseId: { in: [...prByExercise.keys()] }, workoutLog: { memberId: member.id } },
      _max: { weightGrams: true },
    });
    const prevMap = new Map(previousBests.map((p) => [p.exerciseId, p._max.weightGrams ?? 0]));

    return this.prisma.workoutLog.create({
      data: {
        memberId: member.id,
        planId: dto.planId,
        rating: dto.rating,
        durationMinutes: dto.durationMinutes,
        sets: {
          create: dto.sets.map((s) => {
            const w = s.weightGrams ?? 0;
            const isPr = w > 0 && w > (prevMap.get(s.exerciseId) ?? 0);
            return {
              exerciseId: s.exerciseId,
              setIndex: s.setIndex,
              weightGrams: w,
              reps: s.reps ?? 0,
              isPr,
            };
          }),
        },
      },
      include: { sets: true },
    });
  }

  async memberHistory(user: AuthUser, memberId: string) {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, businessId: user.businessId } });
    if (!member) throw new NotFoundException('Member not found');
    if (!canAccessBranch(user, member.homeBranchId)) throw new ForbiddenException('Member is outside your branch');
    return this.prisma.workoutLog.findMany({
      where: { memberId },
      orderBy: { performedAt: 'desc' },
      include: { sets: true },
      take: 50,
    });
  }
}
