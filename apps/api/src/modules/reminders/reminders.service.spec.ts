import { RemindersService } from './reminders.service';
import type { AuthUser } from '../../common/types/auth-user';

const createPrismaMock = () => ({
  branch: { findMany: jest.fn().mockResolvedValue([{ id: 'b-kochi', businessId: 'biz-1' }]) },
  user: { findMany: jest.fn().mockResolvedValue([{ id: 'staff-1' }]) },
  membership: { count: jest.fn().mockResolvedValue(0) },
  invoice: { count: jest.fn().mockResolvedValue(0) },
  member: { findMany: jest.fn().mockResolvedValue([]) },
  notification: { findFirst: jest.fn().mockResolvedValue(null) },
});

const owner: AuthUser = { sub: 'o', email: 'o@x.com', role: 'owner', businessId: 'biz-1', branchIds: [] };
const manager: AuthUser = { sub: 'm', email: 'm@x.com', role: 'manager', businessId: 'biz-1', branchIds: ['b-kochi'] };

describe('RemindersService.runNow', () => {
  let service: RemindersService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let notifications: { createForUser: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    notifications = { createForUser: jest.fn().mockResolvedValue({}) };
    service = new RemindersService(prisma as any, notifications as any);
  });

  it('creates a digest per non-zero metric for each recipient', async () => {
    prisma.membership.count.mockResolvedValue(3); // expiring
    prisma.invoice.count.mockResolvedValue(2); // dues
    // one member whose birthday is today
    const today = new Date();
    prisma.member.findMany.mockResolvedValue([{ dob: today }]);

    const res = await service.runNow(owner);

    // 3 digest types all > 0, single recipient => 3 notifications
    expect(notifications.createForUser).toHaveBeenCalledTimes(3);
    expect(res.created).toBe(3);
    const types = notifications.createForUser.mock.calls.map((c) => c[0].type);
    expect(types).toEqual(expect.arrayContaining(['membership_expiry', 'payment_due', 'birthday']));
  });

  it('skips metrics that are zero', async () => {
    prisma.membership.count.mockResolvedValue(5); // only expiring > 0
    prisma.invoice.count.mockResolvedValue(0);
    prisma.member.findMany.mockResolvedValue([]);
    const res = await service.runNow(owner);
    expect(res.created).toBe(1);
    expect(notifications.createForUser.mock.calls[0][0].type).toBe('membership_expiry');
  });

  it('dedupes when a digest already exists today', async () => {
    prisma.membership.count.mockResolvedValue(3);
    prisma.notification.findFirst.mockResolvedValue({ id: 'existing' });
    const res = await service.runNow(owner);
    expect(notifications.createForUser).not.toHaveBeenCalled();
    expect(res.created).toBe(0);
  });

  it('manager run is scoped to their branch ids', async () => {
    await service.runNow(manager);
    const where = prisma.branch.findMany.mock.calls[0][0].where;
    expect(where.id).toEqual({ in: ['b-kochi'] });
  });

  it('owner run has no branch filter', async () => {
    await service.runNow(owner);
    const where = prisma.branch.findMany.mock.calls[0][0].where;
    expect(where.id).toBeUndefined();
  });
});
