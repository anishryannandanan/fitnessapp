import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBranchIds } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { AnnounceDto } from './dto/announce.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Internal helper other modules can use to create an in-app notification.
   * (Real push/SMS/email delivery would be enqueued here per the spec.)
   */
  createForUser(params: {
    businessId: string;
    recipientUserId: string;
    type: NotificationType;
    title: string;
    body?: string;
    branchId?: string;
    data?: Prisma.InputJsonValue;
    createdById?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        businessId: params.businessId,
        branchId: params.branchId,
        recipientUserId: params.recipientUserId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data,
        createdById: params.createdById,
      },
    });
  }

  listMine(user: AuthUser, opts: { unreadOnly?: boolean } = {}) {
    return this.prisma.notification.findMany({
      where: {
        recipientUserId: user.sub,
        ...(opts.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async unreadCount(user: AuthUser) {
    const count = await this.prisma.notification.count({
      where: { recipientUserId: user.sub, readAt: null },
    });
    return { count };
  }

  async markRead(user: AuthUser, id: string) {
    // updateMany scoped to the owner so users can only mark their own.
    const res = await this.prisma.notification.updateMany({
      where: { id, recipientUserId: user.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }

  async markAllRead(user: AuthUser) {
    const res = await this.prisma.notification.updateMany({
      where: { recipientUserId: user.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }

  // ---- Preferences ----
  getPreferences(user: AuthUser) {
    return this.prisma.notificationPreference.findMany({ where: { userId: user.sub } });
  }

  updatePreference(user: AuthUser, dto: UpdatePreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_type_channel: { userId: user.sub, type: dto.type, channel: dto.channel } },
      update: { enabled: dto.enabled },
      create: { userId: user.sub, type: dto.type, channel: dto.channel, enabled: dto.enabled },
    });
  }

  // ---- Announcements (broadcast) ----
  async announce(user: AuthUser, dto: AnnounceDto) {
    // Determine target branches.
    let targetBranchIds: string[] | undefined;
    if (user.role === 'owner') {
      targetBranchIds = dto.branchId ? [dto.branchId] : undefined; // undefined => all
    } else {
      const allowed = allowedBranchIds(user) ?? [];
      if (dto.branchId && !allowed.includes(dto.branchId)) {
        throw new ForbiddenException('You cannot broadcast to this branch');
      }
      targetBranchIds = dto.branchId ? [dto.branchId] : allowed;
      if (targetBranchIds.length === 0) throw new BadRequestException('No branch to broadcast to');
    }

    const recipients = await this.prisma.user.findMany({
      where: {
        businessId: user.businessId,
        isActive: true,
        ...(dto.roles && dto.roles.length ? { role: { in: dto.roles } } : {}),
        ...(targetBranchIds ? { userBranches: { some: { branchId: { in: targetBranchIds } } } } : {}),
      },
      select: { id: true },
    });

    if (recipients.length === 0) {
      throw new BadRequestException('Audience resolved to 0 recipients');
    }

    await this.prisma.notification.createMany({
      data: recipients.map((r) => ({
        businessId: user.businessId,
        branchId: dto.branchId ?? null,
        recipientUserId: r.id,
        type: NotificationType.announcement,
        title: dto.title,
        body: dto.body,
        createdById: user.sub,
      })),
    });

    return { sent: recipients.length };
  }
}
