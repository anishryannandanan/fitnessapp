import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  exercise: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
  member: { findFirst: jest.fn() },
  workoutPlan: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
  workoutLog: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  workoutLogSet: { groupBy: jest.fn().mockResolvedValue([]) },
});

const owner: AuthUser = { sub: 'o', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const trainer: AuthUser = { sub: 't', email: 't@x.com', role: 'trainer', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('WorkoutsService', () => {
  let service: WorkoutsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new WorkoutsService(prisma as any);
  });

  describe('createExercise', () => {
    it('creates a business-scoped exercise', async () => {
      prisma.exercise.create.mockResolvedValue({ id: 'e1' });
      await service.createExercise(trainer, { name: 'Bench Press' } as any);
      expect(prisma.exercise.create.mock.calls[0][0].data.businessId).toBe('biz-1');
    });
  });

  describe('createPlan', () => {
    it('creates a template when no member is given', async () => {
      prisma.workoutPlan.create.mockResolvedValue({ id: 'p1' });
      await service.createPlan(trainer, { name: 'Push Day' } as any);
      const data = prisma.workoutPlan.create.mock.calls[0][0].data;
      expect(data.isTemplate).toBe(true);
      expect(data.branchId).toBe('b-kochi');
    });

    it('403 when assigning to a member of another branch', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', homeBranchId: 'b-other' });
      await expect(service.createPlan(trainer, { name: 'X', memberId: 'm1' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('logWorkout', () => {
    beforeEach(() => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', homeBranchId: 'b-kochi' });
    });

    it('404 when member not found', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      await expect(service.logWorkout(trainer, { memberId: 'x', sets: [] } as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('flags a set as PR when weight beats the previous best', async () => {
      prisma.workoutLogSet.groupBy.mockResolvedValue([{ exerciseId: 'e1', _max: { weightGrams: 50000 } }]);
      prisma.workoutLog.create.mockImplementation(({ data }: any) => ({ id: 'log-1', sets: data.sets.create }));
      const res: any = await service.logWorkout(trainer, {
        memberId: 'm1',
        sets: [{ exerciseId: 'e1', setIndex: 0, weightGrams: 60000, reps: 5 }],
      } as any);
      expect(res.sets[0].isPr).toBe(true);
    });

    it('does not flag a PR when weight is not higher than the best', async () => {
      prisma.workoutLogSet.groupBy.mockResolvedValue([{ exerciseId: 'e1', _max: { weightGrams: 60000 } }]);
      prisma.workoutLog.create.mockImplementation(({ data }: any) => ({ id: 'log-2', sets: data.sets.create }));
      const res: any = await service.logWorkout(trainer, {
        memberId: 'm1',
        sets: [{ exerciseId: 'e1', setIndex: 0, weightGrams: 60000, reps: 5 }],
      } as any);
      expect(res.sets[0].isPr).toBe(false);
    });

    it('first-ever lift with weight is a PR', async () => {
      prisma.workoutLogSet.groupBy.mockResolvedValue([]);
      prisma.workoutLog.create.mockImplementation(({ data }: any) => ({ id: 'log-3', sets: data.sets.create }));
      const res: any = await service.logWorkout(trainer, {
        memberId: 'm1',
        sets: [{ exerciseId: 'e1', setIndex: 0, weightGrams: 20000, reps: 10 }],
      } as any);
      expect(res.sets[0].isPr).toBe(true);
    });
  });

  describe('getPlan', () => {
    it('403 when plan is outside the trainer branch', async () => {
      prisma.workoutPlan.findUnique.mockResolvedValue({ id: 'p1', branchId: 'b-other' });
      await expect(service.getPlan(trainer, 'p1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('owner can access any plan', async () => {
      prisma.workoutPlan.findUnique.mockResolvedValue({ id: 'p1', branchId: 'b-other' });
      await expect(service.getPlan(owner, 'p1')).resolves.toMatchObject({ id: 'p1' });
    });
  });
});
