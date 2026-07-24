import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import type { AuthUser } from '../../common/types/auth-user';

const DAY = 86400000;

const createPrismaMock = () => ({
  member: { findFirst: jest.fn() },
  membership: { findFirst: jest.fn() },
  attendanceLog: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
});

const owner: AuthUser = { sub: 'o', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new AttendanceService(prisma as any);
  });

  const member = (over: Partial<any> = {}) => ({
    id: 'mem-1', fullName: 'Fathima', memberCode: 'KCH-0001',
    homeBranchId: 'b-kochi', multiBranchAccess: false, ...over,
  });

  describe('checkIn', () => {
    it('owner must pass a branchId', async () => {
      await expect(service.checkIn(owner, { code: 'KCH-0001' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires an identifier', async () => {
      await expect(service.checkIn(manager, {})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404 when member not found', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      await expect(service.checkIn(manager, { code: 'NOPE' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('blocks a visiting member without multi-branch access (422)', async () => {
      prisma.member.findFirst.mockResolvedValue(member({ homeBranchId: 'b-other', multiBranchAccess: false }));
      await expect(service.checkIn(manager, { code: 'KCH-0001' })).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('returns existing session when already checked in', async () => {
      prisma.member.findFirst.mockResolvedValue(member());
      prisma.attendanceLog.findFirst.mockResolvedValue({ id: 'open-1', checkOutAt: null });
      const res = await service.checkIn(manager, { code: 'KCH-0001' });
      expect(res.alreadyCheckedIn).toBe(true);
      expect(res.warning).toBe('already_checked_in');
      expect(prisma.attendanceLog.create).not.toHaveBeenCalled();
    });

    it('checks in with an active membership (no warning)', async () => {
      prisma.member.findFirst.mockResolvedValue(member());
      prisma.attendanceLog.findFirst.mockResolvedValue(null);
      prisma.membership.findFirst.mockResolvedValue({ status: 'active', endDate: new Date(Date.now() + 10 * DAY) });
      prisma.attendanceLog.create.mockResolvedValue({ id: 'log-1' });
      const res = await service.checkIn(manager, { code: 'KCH-0001', method: 'qr' as any });
      expect(res.warning).toBeNull();
      expect(res.membership?.status).toBe('active');
      expect(prisma.attendanceLog.create).toHaveBeenCalled();
    });

    it('warns when the membership is expired but still records', async () => {
      prisma.member.findFirst.mockResolvedValue(member());
      prisma.attendanceLog.findFirst.mockResolvedValue(null);
      prisma.membership.findFirst.mockResolvedValue({ status: 'active', endDate: new Date(Date.now() - 3 * DAY) });
      prisma.attendanceLog.create.mockResolvedValue({ id: 'log-2' });
      const res = await service.checkIn(manager, { code: 'KCH-0001' });
      expect(res.warning).toBe('expired');
      expect(prisma.attendanceLog.create).toHaveBeenCalled();
    });

    it('allows a visiting member with multi-branch access', async () => {
      prisma.member.findFirst.mockResolvedValue(member({ homeBranchId: 'b-other', multiBranchAccess: true }));
      prisma.attendanceLog.findFirst.mockResolvedValue(null);
      prisma.membership.findFirst.mockResolvedValue({ status: 'active', endDate: new Date(Date.now() + DAY) });
      prisma.attendanceLog.create.mockResolvedValue({ id: 'log-3' });
      const res = await service.checkIn(manager, { code: 'KCH-0001' });
      expect(prisma.attendanceLog.create).toHaveBeenCalled();
      expect(res.alreadyCheckedIn).toBe(false);
    });
  });

  describe('checkOut', () => {
    it('computes a non-negative duration and closes the session', async () => {
      const checkInAt = new Date(Date.now() - 90 * 60000); // 90 min ago
      prisma.attendanceLog.findFirst.mockResolvedValue({ id: 'log-1', branchId: 'b-kochi', checkInAt, checkOutAt: null });
      prisma.attendanceLog.update.mockImplementation(({ data }: any) => data);
      const res: any = await service.checkOut(manager, { memberId: 'mem-1' });
      expect(res.durationMinutes).toBeGreaterThanOrEqual(89);
      expect(res.checkOutAt).toBeInstanceOf(Date);
    });

    it('403 when the log is in another branch', async () => {
      prisma.attendanceLog.findUnique.mockResolvedValue({ id: 'log-1', branchId: 'b-other', checkOutAt: null, checkInAt: new Date() });
      await expect(service.checkOut(manager, { attendanceId: 'log-1' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('404 when no open session', async () => {
      prisma.attendanceLog.findFirst.mockResolvedValue(null);
      await expect(service.checkOut(manager, { memberId: 'mem-1' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('peakHours', () => {
    it('buckets check-ins by hour and reports the peak', async () => {
      const at = (h: number) => { const d = new Date(); d.setHours(h, 0, 0, 0); return { checkInAt: d }; };
      prisma.attendanceLog.findMany.mockResolvedValue([at(18), at(18), at(7)]);
      const res = await service.peakHours(manager, {});
      expect(res.total).toBe(3);
      expect(res.peakHour).toBe(18);
      expect(res.buckets).toHaveLength(24);
    });
  });
});
