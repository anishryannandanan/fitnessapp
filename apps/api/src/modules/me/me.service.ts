import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/types/auth-user';
import { LogMyWorkoutDto } from './dto/log-my-workout.dto';
import { ProgressService } from '../progress/progress.service';
import { CreateMeasurementDto } from '../progress/dto/create-measurement.dto';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  // ---- Progress (member self-service) ----
  async measurements(user: AuthUser) {
    const member = await this.resolveMember(user);
    return this.progress.listMeasurements(member.id);
  }

  async addMeasurement(user: AuthUser, dto: CreateMeasurementDto) {
    const member = await this.resolveMember(user);
    return this.progress.addMeasurement(member.id, user.sub, dto);
  }

  /** Resolve the Member record linked to the current user (member self-service). */
  private async resolveMember(user: AuthUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.sub, businessId: user.businessId },
    });
    if (!member) {
      throw new NotFoundException('No member profile is linked to your account');
    }
    return member;
  }

  async profile(user: AuthUser) {
    const member = await this.resolveMember(user);
    return this.prisma.member.findUnique({
      where: { id: member.id },
      include: {
        memberships: { orderBy: { createdAt: 'desc' }, include: { package: { select: { name: true, type: true } } } },
        invoices: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { paidAt: 'desc' }, take: 20 },
      },
    });
  }

  async workoutPlans(user: AuthUser) {
    const member = await this.resolveMember(user);
    return this.prisma.workoutPlan.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      include: { exercises: { include: { exercise: { select: { name: true, muscleGroup: true } } }, orderBy: { orderIndex: 'asc' } } },
    });
  }

  async dietPlans(user: AuthUser) {
    const member = await this.resolveMember(user);
    return this.prisma.dietPlan.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      include: { meals: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async dietPlanPdfData(user: AuthUser, planId: string) {
    const member = await this.resolveMember(user);
    const plan = await this.prisma.dietPlan.findFirst({
      where: { id: planId, memberId: member.id },
      include: { meals: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('Diet plan not found');

    const creator = await this.prisma.user.findUnique({
      where: { id: plan.createdById },
      select: { fullName: true },
    });

    const memberRecord = await this.prisma.member.findUnique({
      where: { id: member.id },
      select: { fullName: true },
    });

    return {
      memberName: memberRecord?.fullName ?? 'Member',
      planName: plan.name,
      trainerName: creator?.fullName ?? 'Staff',
      dailyCalories: plan.dailyCalories ?? undefined,
      proteinG: plan.proteinG ?? undefined,
      carbsG: plan.carbsG ?? undefined,
      fatG: plan.fatG ?? undefined,
      waterGoalMl: plan.waterGoalMl ?? undefined,
      meals: plan.meals.map((m) => ({
        mealType: m.mealType,
        title: m.title,
        calories: m.calories ?? undefined,
        proteinG: m.proteinG ?? undefined,
        carbsG: m.carbsG ?? undefined,
        fatG: m.fatG ?? undefined,
      })),
      createdAt: plan.createdAt.toLocaleDateString('en-IN'),
    };
  }

  async workoutHistory(user: AuthUser) {
    const member = await this.resolveMember(user);
    return this.prisma.workoutLog.findMany({
      where: { memberId: member.id },
      orderBy: { performedAt: 'desc' },
      include: { sets: true },
      take: 50,
    });
  }

  async attendance(user: AuthUser) {
    const member = await this.resolveMember(user);
    return this.prisma.attendanceLog.findMany({
      where: { memberId: member.id },
      orderBy: { checkInAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Log a workout for the current member. The memberId is resolved from the
   * account (a member can only log for themselves), with server-side PR detection.
   */
  async logWorkout(user: AuthUser, dto: LogMyWorkoutDto) {
    const member = await this.resolveMember(user);

    const exerciseIds = [...new Set(dto.sets.map((s) => s.exerciseId))];
    const previousBests = await this.prisma.workoutLogSet.groupBy({
      by: ['exerciseId'],
      where: { exerciseId: { in: exerciseIds }, workoutLog: { memberId: member.id } },
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
            return {
              exerciseId: s.exerciseId,
              setIndex: s.setIndex,
              weightGrams: w,
              reps: s.reps ?? 0,
              isPr: w > 0 && w > (prevMap.get(s.exerciseId) ?? 0),
            };
          }) as Prisma.WorkoutLogSetCreateManyWorkoutLogInput[],
        },
      },
      include: { sets: true },
    });
  }
}
