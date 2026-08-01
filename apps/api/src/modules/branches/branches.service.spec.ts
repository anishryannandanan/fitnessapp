import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BranchesService } from './branches.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  branch: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

  describe('update', () => {
    it('owner: can update any branch', async () => {
      prisma.branch.findFirst.mockResolvedValue({ id: 'b-any', name: 'Any' });
      prisma.branch.update.mockResolvedValue({ id: 'b-any', name: 'Updated' });
      const res = await service.update(owner, 'b-any', { name: 'Updated' });
      expect(prisma.branch.update).toHaveBeenCalledWith({
        where: { id: 'b-any' },
        data: { name: 'Updated' },
      });
      expect(res.name).toBe('Updated');
    });

    it('manager: can update their assigned branch', async () => {
      prisma.branch.findFirst.mockResolvedValue({ id: 'b-kochi', name: 'Kochi' });
      prisma.branch.update.mockResolvedValue({ id: 'b-kochi', phone: '+91999' });
      await service.update(manager, 'b-kochi', { phone: '+91999' });
      expect(prisma.branch.update).toHaveBeenCalledWith({
        where: { id: 'b-kochi' },
        data: { phone: '+91999' },
      });
    });

    it('manager: 403 when updating a branch outside their scope', async () => {
      await expect(
        service.update(manager, 'b-other', { name: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.branch.update).not.toHaveBeenCalled();
    });

    it('404 when branch does not exist', async () => {
      prisma.branch.findFirst.mockResolvedValue(null);
      await expect(
        service.update(owner, 'b-missing', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.branch.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('owner: soft-deletes by setting isActive to false', async () => {
      prisma.branch.findFirst.mockResolvedValue({ id: 'b-any', isActive: true });
      prisma.branch.update.mockResolvedValue({ id: 'b-any', isActive: false });
      const res = await service.deactivate(owner, 'b-any');
      expect(prisma.branch.update).toHaveBeenCalledWith({
        where: { id: 'b-any' },
        data: { isActive: false },
      });
      expect(res.isActive).toBe(false);
    });

    it('manager: 403 when trying to deactivate', async () => {
      await expect(service.deactivate(manager, 'b-kochi')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.branch.update).not.toHaveBeenCalled();
    });

    it('owner: 404 when branch does not exist', async () => {
      prisma.branch.findFirst.mockResolvedValue(null);
      await expect(service.deactivate(owner, 'b-missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.branch.update).not.toHaveBeenCalled();
    });
  });
});
