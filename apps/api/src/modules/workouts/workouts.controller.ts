import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller()
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  // Exercise library
  @Get('exercises')
  listExercises(@CurrentUser() user: AuthUser, @Query('q') q?: string, @Query('muscle') muscle?: string) {
    return this.workouts.listExercises(user, { q, muscle });
  }

  @Roles('owner', 'manager', 'trainer')
  @Post('exercises')
  createExercise(@CurrentUser() user: AuthUser, @Body() dto: CreateExerciseDto) {
    return this.workouts.createExercise(user, dto);
  }

  // Workout plans
  @Get('workout-plans')
  listPlans(
    @CurrentUser() user: AuthUser,
    @Query('memberId') memberId?: string,
    @Query('templatesOnly') templatesOnly?: string,
  ) {
    return this.workouts.listPlans(user, { memberId, templatesOnly: templatesOnly === 'true' });
  }

  @Get('workout-plans/:id')
  getPlan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workouts.getPlan(user, id);
  }

  @Roles('owner', 'manager', 'trainer')
  @Post('workout-plans')
  createPlan(@CurrentUser() user: AuthUser, @Body() dto: CreatePlanDto) {
    return this.workouts.createPlan(user, dto);
  }

  // Logging
  @Roles('owner', 'manager', 'trainer', 'member')
  @Post('workout-logs')
  log(@CurrentUser() user: AuthUser, @Body() dto: LogWorkoutDto) {
    return this.workouts.logWorkout(user, dto);
  }

  @Get('members/:id/workout-history')
  history(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workouts.memberHistory(user, id);
  }
}
