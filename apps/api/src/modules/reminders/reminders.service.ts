import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { allowedBranchIds } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';

const DAY = 86400000;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Daily digest at 08:00 server time — front-desk actionable reminders. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async dailySweep() {
    const branches = await this.prisma.branch.findMany({ where: { isActive: true }, select: { id: true, businessId: true } });
    let created = 0;
    for (const b of branches) created += await this.processBranch(b.id, b.businessId);
    this.logger.log(`Daily reminder sweep: created ${created} notifications across ${branches.length} branches`);
    return { created, branches: branches.length };
  }

  /** Manual trigger (owner: all branches; manager: their branch). */
  async runNow(user: AuthUser) {
    const allowed = allowedBranchIds(user);
    const branches = await this.prisma.branch.findMany({
      where: { businessId: user.businessId, isActive: true, ...(allowed ? { id: { in: allowed } } : {}) },
      select: { id: true, businessId: true },
    });
    let created = 0;
    for (const b of branches) created += await this.processBranch(b.id, b.businessId);
    return { created, branches: branches.length };
  }

  /** Build the digest for a single branch and notify its manager + receptionist. */
  private async processBranch(branchId: string, businessId: string): Promise<number> {
    const now = new Date();

    const [recipients, expiringCount, unpaidCount, members] = await Promise.all([
      this.prisma.user.findMany({
        where: { businessId, isActive: true, role: { in: ['manager', 'receptionist'] }, userBranches: { some: { branchId } } },
        select: { id: true },
      }),
      this.prisma.membership.count({ where: { branchId, status: 'active', endDate: { gte: now, lte: new Date(now.getTime() + 7 * DAY) } } }),
      this.prisma.invoice.count({ where: { branchId, status: { in: ['issued', 'partially_paid', 'overdue'] } } }),
      this.prisma.member.findMany({ where: { homeBranchId: branchId, dob: { not: null } }, select: { dob: true } }),
    ]);

    const birthdayCount = members.filter((m) => {
      const d = m.dob!;
      return d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
    }).length;

    const digests: { type: NotificationType; title: string; count: number }[] = [
      { type: NotificationType.membership_expiry, title: `${expiringCount} membership(s) expiring in 7 days`, count: expiringCount },
      { type: NotificationType.payment_due, title: `${unpaidCount} member(s) with outstanding dues`, count: unpaidCount },
      { type: NotificationType.birthday, title: `${birthdayCount} member birthday(s) today`, count: birthdayCount },
    ];

    let created = 0;
    const since = startOfToday();
    for (const r of recipients) {
      for (const d of digests) {
        if (d.count <= 0) continue;
        // Dedupe: at most one digest of each type per recipient per branch per day.
        const existing = await this.prisma.notification.findFirst({
          where: { recipientUserId: r.id, branchId, type: d.type, createdAt: { gte: since } },
        });
        if (existing) continue;
        await this.notifications.createForUser({
          businessId,
          branchId,
          recipientUserId: r.id,
          type: d.type,
          title: d.title,
          body: 'Daily front-desk reminder',
          data: { kind: 'daily-digest', count: d.count },
        });
        created += 1;
      }
    }
    return created;
  }
}
