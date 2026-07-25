import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { canAccessBranch } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { CreateMeasurementDto, CreateProgressPhotoDto } from './dto/create-measurement.dto';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMemberInScope(user: AuthUser, memberId: string) {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, businessId: user.businessId } });
    if (!member) throw new NotFoundException('Member not found');
    if (!canAccessBranch(user, member.homeBranchId)) throw new ForbiddenException('Member is outside your branch');
    return member;
  }

  // ---- Core (used by staff routes and by member self-service) ----
  addMeasurement(memberId: string, recordedById: string | null, dto: CreateMeasurementDto) {
    return this.prisma.measurement.create({ data: { memberId, recordedById: recordedById ?? undefined, ...dto } });
  }

  listMeasurements(memberId: string) {
    return this.prisma.measurement.findMany({ where: { memberId }, orderBy: { recordedAt: 'asc' }, take: 365 });
  }

  addPhoto(memberId: string, dto: CreateProgressPhotoDto) {
    return this.prisma.progressPhoto.create({ data: { memberId, ...dto } });
  }

  listPhotos(memberId: string) {
    return this.prisma.progressPhoto.findMany({ where: { memberId }, orderBy: { takenAt: 'desc' }, take: 100 });
  }

  // ---- Staff routes (scope-checked) ----
  async staffAddMeasurement(user: AuthUser, memberId: string, dto: CreateMeasurementDto) {
    await this.assertMemberInScope(user, memberId);
    return this.addMeasurement(memberId, user.sub, dto);
  }
  async staffListMeasurements(user: AuthUser, memberId: string) {
    await this.assertMemberInScope(user, memberId);
    return this.listMeasurements(memberId);
  }
  async staffAddPhoto(user: AuthUser, memberId: string, dto: CreateProgressPhotoDto) {
    await this.assertMemberInScope(user, memberId);
    return this.addPhoto(memberId, dto);
  }
  async staffListPhotos(user: AuthUser, memberId: string) {
    await this.assertMemberInScope(user, memberId);
    return this.listPhotos(memberId);
  }
}
