import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StaffService } from './staff.service';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Roles('owner', 'manager')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.staff.list(user, { q });
  }

  @Roles('owner', 'manager')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.staff.findOne(user, id);
  }

  @Roles('owner')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStaffDto) {
    return this.staff.create(user, dto);
  }

  @Roles('owner', 'manager')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staff.update(user, id, dto);
  }

  @Roles('owner')
  @Post(':id/reset-password')
  resetPassword(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.staff.resetPassword(user, id, dto.newPassword);
  }
}
