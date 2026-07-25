import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DietService } from './diet.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  member: { findFirst: jest.fn() },
  dietPlan: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
});

const trainer: AuthUser = { sub: 't', email: 't@x.com', role: 'trainer', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('DietService', () => {
  let service: DietService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new DietService(prisma as any);
  });

  it('creates a template diet plan with meals when no member is given', async () => {
    prisma.dietPlan.create.mockResolvedValue({ id: 'd1' });
    await service.createPlan(trainer, {
      name: 'Cutting', dailyCalories: 1800,
      meals: [{ mealType: 'breakfast', title: 'Oats', calories: 400 }],
    } as any);
    const data = prisma.dietPlan.create.mock.calls[0][0].data;
    expect(data.isTemplate).toBe(true);
    expect(data.branchId).toBe('b-kochi');
    expect(data.meals.create).toHaveLength(1);
  });

  it('403 when assigning to a member of another branch', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'm1', homeBranchId: 'b-other' });
    await expect(service.createPlan(trainer, { name: 'X', memberId: 'm1' } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404 when member not found', async () => {
    prisma.member.findFirst.mockResolvedValue(null);
    await expect(service.createPlan(trainer, { name: 'X', memberId: 'zzz' } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getPlan 403 when outside branch', async () => {
    prisma.dietPlan.findUnique.mockResolvedValue({ id: 'd1', branchId: 'b-other' });
    await expect(service.getPlan(trainer, 'd1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
