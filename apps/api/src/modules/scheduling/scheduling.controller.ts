import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { CreateSlotDto, UpdateSlotDto, BookSessionDto, SetPreferenceDto } from './dto/create-slot.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly scheduling: SchedulingService) {}

  // ---- Trainer Slots ----

  @Roles('owner', 'manager', 'trainer')
  @Post('slots')
  createSlot(@CurrentUser() user: AuthUser, @Body() dto: CreateSlotDto) {
    return this.scheduling.createSlot(user, dto);
  }

  @Roles('owner', 'manager', 'trainer')
  @Patch('slots/:id')
  updateSlot(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSlotDto) {
    return this.scheduling.updateSlot(user, id, dto);
  }

  @Roles('owner', 'manager', 'trainer')
  @Delete('slots/:id')
  deleteSlot(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.scheduling.deleteSlot(user, id);
  }

  @Get('slots')
  listSlots(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('trainerId') trainerId?: string,
  ) {
    return this.scheduling.listSlots(user, { branchId, trainerId });
  }

  @Get('availability/:trainerId')
  getAvailability(
    @CurrentUser() user: AuthUser,
    @Param('trainerId') trainerId: string,
    @Query('date') date: string,
  ) {
    return this.scheduling.getAvailability(user, trainerId, date);
  }

  // ---- PT Sessions ----

  @Roles('owner', 'manager', 'trainer', 'receptionist')
  @Post('sessions')
  bookSession(@CurrentUser() user: AuthUser, @Body() dto: BookSessionDto) {
    return this.scheduling.bookSession(user, dto);
  }

  @Roles('owner', 'manager', 'trainer')
  @Post('sessions/:id/cancel')
  @HttpCode(200)
  cancelSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.scheduling.cancelSession(user, id);
  }

  @Roles('owner', 'manager', 'trainer')
  @Post('sessions/:id/complete')
  @HttpCode(200)
  completeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.scheduling.completeSession(user, id);
  }

  @Get('sessions')
  listSessions(
    @CurrentUser() user: AuthUser,
    @Query('trainerId') trainerId?: string,
    @Query('memberId') memberId?: string,
    @Query('date') date?: string,
  ) {
    return this.scheduling.listSessions(user, { trainerId, memberId, date });
  }

  // ---- Trainer Preferences & Matching ----

  @Roles('owner', 'manager', 'receptionist')
  @Post('preferences')
  setPreference(@CurrentUser() user: AuthUser, @Body() dto: SetPreferenceDto) {
    return this.scheduling.setPreference(user, dto);
  }

  @Get('preferences/:memberId')
  getPreference(@Param('memberId') memberId: string) {
    return this.scheduling.getPreference(memberId);
  }

  @Roles('owner', 'manager', 'receptionist')
  @Get('suggest-trainer/:memberId')
  suggestTrainers(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.scheduling.suggestTrainers(user, memberId, branchId);
  }
}
