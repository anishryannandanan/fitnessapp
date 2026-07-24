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
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';

@Injectable()
export class DietService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveBranchId(user: AuthUser): string {
    const branchId = (allowedBranchIds(user) ?? [])[0];
    if (!branchId) throw new BadRequestException('No branch assigned');
    return branchId;
  }

  async createPlan(user: AuthUser, dto: CreateDietPlanDto) {
    const branchId = this.resolveBranchId(user);
    if (dto.memberId) {
      const member = await this.prisma.member.findFirst({ where: { id: dto.memberId, businessId: user.businessId } });
      if (!member) throw new NotFoundException('Member not found');
      if (!canAccessBranch(user, member.homeBranchId)) throw new ForbiddenException('Member is outside your branch');
    }
    return this.prisma.dietPlan.create({
      data: {
        branchId,
        createdById: user.sub,
        memberId: dto.memberId ?? null,
        isTemplate: !dto.memberId,
        name: dto.name,
        dailyCalories: dto.dailyCalories,
        proteinG: dto.proteinG,
        carbsG: dto.carbsG,
        fatG: dto.fatG,
        waterGoalMl: dto.waterGoalMl,
        meals: dto.meals
          ? {
              create: dto.meals.map((m, i) => ({
                mealType: m.mealType,
                title: m.title,
                orderIndex: m.orderIndex ?? i,
                calories: m.calories,
                proteinG: m.proteinG,
                carbsG: m.carbsG,
                fatG: m.fatG,
              })),
            }
          : undefined,
      },
      include: { meals: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  listPlans(user: AuthUser, opts: { memberId?: string; templatesOnly?: boolean } = {}) {
    const allowed = allowedBranchIds(user);
    const where: Prisma.DietPlanWhereInput = {
      ...(allowed ? { branchId: { in: allowed } } : {}),
      ...(opts.memberId ? { memberId: opts.memberId } : {}),
      ...(opts.templatesOnly ? { isTemplate: true } : {}),
    };
    return this.prisma.dietPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { meals: { orderBy: { orderIndex: 'asc' } } },
      take: 100,
    });
  }

  async getPlan(user: AuthUser, id: string) {
    const plan = await this.prisma.dietPlan.findUnique({
      where: { id },
      include: { meals: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('Diet plan not found');
    if (!canAccessBranch(user, plan.branchId)) throw new ForbiddenException('Diet plan is outside your branch');
    return plan;
  }
}
