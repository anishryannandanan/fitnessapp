import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BranchesService } from './branches.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  branch: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
});

const owner: AuthUser = { sub: 'u-owner', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const manager: AuthUser = { sub: 'u-mgr', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('BranchesService', () => {
  let service: BranchesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new BranchesService(prisma as any);
  });

  describe('list', () => {
    it('owner: queries all branches (no id filter)', async () => {
      await service.list(owner);
      const where = prisma.branch.findMany.mock.calls[0][0].where;
      expect(where.businessId).toBe('biz-1');
      expect(where.id).toBeUndefined();
    });

    it('manager: restricts to assigned branch ids', async () => {
      await service.list(manager);
      const where = prisma.branch.findMany.mock.calls[0][0].where;
      expect(where.id).toEqual({ in: ['b-kochi'] });
    });
  });

  describe('findOne', () => {
    it('manager: 403 when the branch is outside their scope', async () => {
      await expect(service.findOne(manager, 'b-other')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.branch.findFirst).not.toHaveBeenCalled();
    });

    it('manager: 404 when in-scope branch does not exist', async () => {
      prisma.branch.findFirst.mockResolvedValue(null);
      await expect(service.findOne(manager, 'b-kochi')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('owner: returns any branch', async () => {
      prisma.branch.findFirst.mockResolvedValue({ id: 'b-any', name: 'Any' });
      const res = await service.findOne(owner, 'b-any');
      expect(res).toEqual({ id: 'b-any', name: 'Any' });
    });
  });

  describe('create', () => {
    it('rejects non-owners with 403', async () => {
      await expect(
        service.create(manager, { name: 'Aluva', code: 'alv' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.branch.create).not.toHaveBeenCalled();
    });

    it('owner: creates with an uppercased code', async () => {
      prisma.branch.create.mockResolvedValue({ id: 'b-new' });
      await service.create(owner, { name: 'Aluva', code: 'alv' });
      const data = prisma.branch.create.mock.calls[0][0].data;
      expect(data.code).toBe('ALV');
      expect(data.businessId).toBe('biz-1');
    });
  });
});
