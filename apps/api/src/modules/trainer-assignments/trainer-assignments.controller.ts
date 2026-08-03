import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { TrainerAssignmentsService } from './trainer-assignments.service';
import { AssignTrainerDto } from './dto/assign-trainer.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('trainer-assignments')
export class TrainerAssignmentsController {
  constructor(private readonly service: TrainerAssignmentsService) {}

  @Roles('owner', 'manager')
  @Post()
  assign(@CurrentUser() user: AuthUser, @Body() dto: AssignTrainerDto) {
    return this.service.assign(user, dto);
  }

  @Roles('owner', 'manager')
  @Delete(':id')
  unassign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.unassign(user, id);
  }

  @Roles('owner', 'manager')
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('trainerId') trainerId?: string,
  ) {
    return this.service.list(user, { branchId, trainerId });
  }

  /** Trainer views their own assigned members. */
  @Roles('trainer')
  @Get('my-members')
  myMembers(@CurrentUser() user: AuthUser) {
    return this.service.myMembers(user.sub);
  }

  @Roles('owner', 'manager')
  @Get('member/:memberId/history')
  memberHistory(@CurrentUser() user: AuthUser, @Param('memberId') memberId: string) {
    return this.service.memberHistory(user, memberId);
  }
}
