import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { MeService } from './me.service';
import { LogMyWorkoutDto } from './dto/log-my-workout.dto';
import { CreateMeasurementDto } from '../progress/dto/create-measurement.dto';
import { PdfService } from '../pdf/pdf.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

// Member self-service. All endpoints resolve data from the caller's linked member record.
@Roles('member')
@Controller('me')
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly pdf: PdfService,
  ) {}

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

  @Get('diet-plans/:planId/pdf')
  async dietPlanPdf(@CurrentUser() user: AuthUser, @Param('planId') planId: string, @Res() reply: FastifyReply) {
    const data = await this.me.dietPlanPdfData(user, planId);
    const buffer = await this.pdf.generateDietPlanPdf(data);
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="diet-plan-${planId}.pdf"`)
      .header('Content-Length', buffer.length)
      .send(buffer);
  }
}
