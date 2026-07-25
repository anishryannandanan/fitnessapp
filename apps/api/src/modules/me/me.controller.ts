import { Body, Controller, Get, Post } from '@nestjs/common';
import { MeService } from './me.service';
import { LogMyWorkoutDto } from './dto/log-my-workout.dto';
import { CreateMeasurementDto } from '../progress/dto/create-measurement.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

// Member self-service. All endpoints resolve data from the caller's linked member record.
@Roles('member')
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('profile')
  profile(@CurrentUser() user: AuthUser) {
    return this.me.profile(user);
  }

  @Get('workout-plans')
  workoutPlans(@CurrentUser() user: AuthUser) {
    return this.me.workoutPlans(user);
  }

  @Get('diet-plans')
  dietPlans(@CurrentUser() user: AuthUser) {
    return this.me.dietPlans(user);
  }

  @Get('workout-history')
  workoutHistory(@CurrentUser() user: AuthUser) {
    return this.me.workoutHistory(user);
  }

  @Get('attendance')
  attendance(@CurrentUser() user: AuthUser) {
    return this.me.attendance(user);
  }

  @Post('workout-logs')
  logWorkout(@CurrentUser() user: AuthUser, @Body() dto: LogMyWorkoutDto) {
    return this.me.logWorkout(user, dto);
  }

  @Get('measurements')
  measurements(@CurrentUser() user: AuthUser) {
    return this.me.measurements(user);
  }

  @Post('measurements')
  addMeasurement(@CurrentUser() user: AuthUser, @Body() dto: CreateMeasurementDto) {
    return this.me.addMeasurement(user, dto);
  }
}
