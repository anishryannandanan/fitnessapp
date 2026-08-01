import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GroupClassesService } from './group-classes.service';
import { CreateGroupClassDto, UpdateGroupClassDto } from './dto/create-class.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('group-classes')
export class GroupClassesController {
  constructor(private readonly service: GroupClassesService) {}

  @Roles('owner', 'manager')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupClassDto) {
    return this.service.createClass(user, dto);
  }

  @Roles('owner', 'manager')
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateGroupClassDto) {
    return this.service.updateClass(user, id, dto);
  }

  @Roles('owner', 'manager')
  @Delete(':id')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.deactivateClass(user, id);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('classType') classType?: string,
  ) {
    return this.service.listClasses(user, { branchId, classType });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getClass(user, id);
  }

  // ---- Enrollments ----

  @Roles('owner', 'manager', 'receptionist', 'trainer')
  @Post(':classId/enroll/:memberId')
  enroll(
    @CurrentUser() user: AuthUser,
    @Param('classId') classId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.enrollMember(user, classId, memberId);
  }

  @Roles('owner', 'manager', 'receptionist', 'trainer')
  @Delete(':classId/enroll/:memberId')
  unenroll(
    @CurrentUser() user: AuthUser,
    @Param('classId') classId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.unenrollMember(user, classId, memberId);
  }

  @Get('member/:memberId')
  memberClasses(@Param('memberId') memberId: string) {
    return this.service.getMemberClasses(memberId);
  }

  /** Trigger auto-assignment for a non-PT member. */
  @Roles('owner', 'manager', 'receptionist')
  @Post('auto-assign/:memberId')
  autoAssign(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.service.autoAssignToGroupClass(memberId, branchId);
  }
}
