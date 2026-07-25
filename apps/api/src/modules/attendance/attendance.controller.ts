import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Roles('owner', 'manager', 'receptionist')
  @Post('check-in')
  @HttpCode(201)
  checkIn(@CurrentUser() user: AuthUser, @Body() dto: CheckInDto) {
    return this.attendance.checkIn(user, dto);
  }

  @Roles('owner', 'manager', 'receptionist')
  @Post('check-out')
  @HttpCode(200)
  checkOut(@CurrentUser() user: AuthUser, @Body() dto: CheckOutDto) {
    return this.attendance.checkOut(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('date') date?: string,
    @Query('memberId') memberId?: string,
  ) {
    return this.attendance.list(user, { date, memberId });
  }

  @Roles('owner', 'manager')
  @Get('peak-hours')
  peakHours(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendance.peakHours(user, { from, to });
  }
}
