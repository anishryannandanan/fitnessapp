import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  member: { findFirst: jest.fn() },
  measurement: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  progressPhoto: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
});

const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('ProgressService', () => {
  let service: ProgressService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new ProgressService(prisma as any);
  });

  describe('staff scope', () => {
    it('404 when member not found', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      await expect(service.staffAddMeasurement(manager, 'x', { weightG: 70000 })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('403 when member is outside the branch', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'mem-1', homeBranchId: 'b-other' });
      await expect(service.staffListMeasurements(manager, 'mem-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('records a measurement with the recorder id', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'mem-1', homeBranchId: 'b-kochi' });
      prisma.measurement.create.mockResolvedValue({ id: 'ms-1' });
      await service.staffAddMeasurement(manager, 'mem-1', { weightG: 68000, bodyFatPct: 22 });
      const data = prisma.measurement.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ memberId: 'mem-1', recordedById: 'm', weightG: 68000, bodyFatPct: 22 });
    });
  });

  describe('core', () => {
    it('lists measurements ascending by date', async () => {
      await service.listMeasurements('mem-1');
      const args = prisma.measurement.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ memberId: 'mem-1' });
      expect(args.orderBy).toEqual({ recordedAt: 'asc' });
    });

    it('adds a progress photo', async () => {
      prisma.progressPhoto.create.mockResolvedValue({ id: 'p1' });
      await service.addPhoto('mem-1', { photoUrl: 'https://x/y.jpg', pose: 'front' });
      expect(prisma.progressPhoto.create.mock.calls[0][0].data).toMatchObject({ memberId: 'mem-1', pose: 'front' });
    });
  });
});
