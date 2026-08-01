import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { canAccessBranch, branchWhere } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { CreateSlotDto, UpdateSlotDto, BookSessionDto, SetPreferenceDto } from './dto/create-slot.dto';

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Trainer Slots CRUD ----

  async createSlot(user: AuthUser, dto: CreateSlotDto) {
    if (!canAccessBranch(user, dto.branchId)) {
      throw new ForbiddenException('Cannot manage slots for this branch');
    }
    return this.prisma.trainerSlot.create({
      data: {
        branchId: dto.branchId,
        trainerId: dto.trainerId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        maxClients: dto.maxClients ?? 1,
      },
    });
  }

  async updateSlot(user: AuthUser, slotId: string, dto: UpdateSlotDto) {
    const slot = await this.prisma.trainerSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Slot not found');
    if (!canAccessBranch(user, slot.branchId)) {
      throw new ForbiddenException('No access');
    }
    return this.prisma.trainerSlot.update({
      where: { id: slotId },
      data: {
        ...(dto.startTime ? { startTime: dto.startTime } : {}),
        ...(dto.endTime ? { endTime: dto.endTime } : {}),
        ...(dto.maxClients ? { maxClients: dto.maxClients } : {}),
      },
    });
  }

  async deleteSlot(user: AuthUser, slotId: string) {
    const slot = await this.prisma.trainerSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Slot not found');
    if (!canAccessBranch(user, slot.branchId)) throw new ForbiddenException('No access');
    await this.prisma.trainerSlot.update({ where: { id: slotId }, data: { isActive: false } });
    return { deleted: true };
  }

  async listSlots(user: AuthUser, opts: { branchId?: string; trainerId?: string } = {}) {
    return this.prisma.trainerSlot.findMany({
      where: {
        ...branchWhere(user),
        ...(opts.branchId ? { branchId: opts.branchId } : {}),
        ...(opts.trainerId ? { trainerId: opts.trainerId } : {}),
        isActive: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /** Get trainer availability for a specific date (checks existing bookings). */
  async getAvailability(user: AuthUser, trainerId: string, date: string) {
    const d = new Date(date);
    const dayOfWeek = d.getDay();

    const slots = await this.prisma.trainerSlot.findMany({
      where: { trainerId, dayOfWeek, isActive: true },
      orderBy: { startTime: 'asc' },
    });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.pTSession.findMany({
      where: {
        trainerId,
        scheduledDate: { gte: startOfDay, lte: endOfDay },
        status: { in: ['scheduled', 'completed'] },
      },
    });

    return slots.map((slot) => {
      const bookedCount = sessions.filter(
        (s) => s.slotId === slot.id || (s.startTime === slot.startTime && s.endTime === slot.endTime),
      ).length;
      return {
        ...slot,
        bookedCount,
        availableSpots: slot.maxClients - bookedCount,
        isAvailable: bookedCount < slot.maxClients,
      };
    });
  }

  // ---- PT Session Booking ----

  async bookSession(user: AuthUser, dto: BookSessionDto) {
    if (!canAccessBranch(user, dto.branchId)) {
      throw new ForbiddenException('Cannot book in this branch');
    }

    // Check if slot is available
    if (dto.slotId) {
      const slot = await this.prisma.trainerSlot.findUnique({ where: { id: dto.slotId } });
      if (!slot || !slot.isActive) throw new NotFoundException('Slot not found or inactive');

      const dateObj = new Date(dto.scheduledDate);
      const startOfDay = new Date(dateObj); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj); endOfDay.setHours(23, 59, 59, 999);

      const existingCount = await this.prisma.pTSession.count({
        where: {
          slotId: dto.slotId,
          scheduledDate: { gte: startOfDay, lte: endOfDay },
          status: 'scheduled',
        },
      });
      if (existingCount >= slot.maxClients) {
        throw new UnprocessableEntityException('Slot is fully booked');
      }
    }

    return this.prisma.pTSession.create({
      data: {
        branchId: dto.branchId,
        trainerId: dto.trainerId,
        memberId: dto.memberId,
        slotId: dto.slotId,
        scheduledDate: new Date(dto.scheduledDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        notes: dto.notes,
        status: 'scheduled',
      },
    });
  }

  async cancelSession(user: AuthUser, sessionId: string) {
    const session = await this.prisma.pTSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (!canAccessBranch(user, session.branchId)) throw new ForbiddenException('No access');
    if (session.status !== 'scheduled') {
      throw new UnprocessableEntityException('Can only cancel scheduled sessions');
    }
    return this.prisma.pTSession.update({
      where: { id: sessionId },
      data: { status: 'cancelled', cancelledById: user.sub },
    });
  }

  async completeSession(user: AuthUser, sessionId: string) {
    const session = await this.prisma.pTSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (!canAccessBranch(user, session.branchId)) throw new ForbiddenException('No access');
    return this.prisma.pTSession.update({
      where: { id: sessionId },
      data: { status: 'completed' },
    });
  }

  async listSessions(user: AuthUser, opts: { trainerId?: string; memberId?: string; date?: string } = {}) {
    const where: any = { ...branchWhere(user) };
    if (opts.trainerId) where.trainerId = opts.trainerId;
    if (opts.memberId) where.memberId = opts.memberId;
    if (opts.date) {
      const d = new Date(opts.date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      where.scheduledDate = { gte: start, lte: end };
    }
    return this.prisma.pTSession.findMany({
      where,
      orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
      take: 100,
    });
  }

  // ---- Trainer Preference & Matching ----

  async setPreference(user: AuthUser, dto: SetPreferenceDto) {
    return this.prisma.trainerPreference.upsert({
      where: { memberId: dto.memberId },
      update: {
        preferredTime: dto.preferredTime,
        preferredGender: dto.preferredGender,
        goals: dto.goals,
        notes: dto.notes,
      },
      create: {
        memberId: dto.memberId,
        preferredTime: dto.preferredTime,
        preferredGender: dto.preferredGender,
        goals: dto.goals,
        notes: dto.notes,
      },
    });
  }

  async getPreference(memberId: string) {
    return this.prisma.trainerPreference.findUnique({ where: { memberId } });
  }

  /** Match trainers to a member based on preferences and availability. */
  async suggestTrainers(user: AuthUser, memberId: string, branchId: string) {
    if (!canAccessBranch(user, branchId)) throw new ForbiddenException('No access');

    const preference = await this.prisma.trainerPreference.findUnique({ where: { memberId } });

    // Get all trainers in the branch
    const trainers = await this.prisma.user.findMany({
      where: {
        role: 'trainer',
        isActive: true,
        userBranches: { some: { branchId } },
      },
      include: { staffProfile: true },
    });

    // Get current session counts per trainer for the week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const sessionCounts = await this.prisma.pTSession.groupBy({
      by: ['trainerId'],
      where: {
        branchId,
        scheduledDate: { gte: weekStart },
        status: 'scheduled',
      },
      _count: { id: true },
    });

    const countMap = new Map(sessionCounts.map((s) => [s.trainerId, s._count.id]));

    // Score trainers
    const scored = trainers.map((trainer) => {
      let score = 100;
      const sessions = countMap.get(trainer.id) ?? 0;

      // Fewer sessions = more available = higher score
      score -= sessions * 5;

      // Preference matching
      if (preference?.preferredGender && preference.preferredGender !== 'any') {
        // Check if staff specialization mentions gender-related focus
        // (simplified matching)
      }

      if (preference?.goals && trainer.staffProfile?.specialization) {
        const spec = trainer.staffProfile.specialization.toLowerCase();
        if (spec.includes(preference.goals.replace('_', ' '))) {
          score += 20;
        }
      }

      return {
        trainerId: trainer.id,
        name: trainer.fullName,
        specialization: trainer.staffProfile?.specialization,
        weeklySessionCount: sessions,
        matchScore: Math.max(0, score),
      };
    });

    return scored.sort((a, b) => b.matchScore - a.matchScore);
  }
}
