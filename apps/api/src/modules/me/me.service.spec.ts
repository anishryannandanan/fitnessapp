import { NotFoundException } from '@nestjs/common';
import { MeService } from './me.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  member: { findFirst: jest.fn(), findUnique: jest.fn() },
  workoutPlan: { findMany: jest.fn().mockResolvedValue([]) },
  dietPlan: { findMany: jest.fn().mockResolvedValue([]) },
  workoutLog: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
  workoutLogSet: { groupBy: jest.fn().mockResolvedValue([]) },
  attendanceLog: { findMany: jest.fn().mockResolvedValue([]) },
});

const memberUser: AuthUser = { sub: 'u-mbr', email: 'f@x.com', role: 'member', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('MeService', () => {
  let service: MeService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new MeService(prisma as any);
  });

  it('404 when the account has no linked member record', async () => {
    prisma.member.findFirst.mockResolvedValue(null);
    await expect(service.profile(memberUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolves the linked member for the current user', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'mem-1' });
    prisma.member.findUnique.mockResolvedValue({ id: 'mem-1', fullName: 'Fathima' });
    const res = await service.profile(memberUser);
    expect(prisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u-mbr', businessId: 'biz-1' } }),
    );
    expect(res).toMatchObject({ id: 'mem-1' });
  });

  it('lists the member\u2019s own workout plans', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'mem-1' });
    await service.workoutPlans(memberUser);
    expect(prisma.workoutPlan.findMany.mock.calls[0][0].where).toEqual({ memberId: 'mem-1' });
  });

  describe('logWorkout', () => {
    beforeEach(() => prisma.member.findFirst.mockResolvedValue({ id: 'mem-1' }));

    it('logs for self with PR detection and forces the resolved memberId', async () => {
      prisma.workoutLogSet.groupBy.mockResolvedValue([{ exerciseId: 'e1', _max: { weightGrams: 50000 } }]);
      prisma.workoutLog.create.mockImplementation(({ data }: any) => ({ id: 'log-1', memberId: data.memberId, sets: data.sets.create }));
      const res: any = await service.logWorkout(memberUser, {
        sets: [{ exerciseId: 'e1', setIndex: 0, weightGrams: 60000, reps: 5 }],
      } as any);
      expect(res.memberId).toBe('mem-1');
      expect(res.sets[0].isPr).toBe(true);
    });
  });
});
