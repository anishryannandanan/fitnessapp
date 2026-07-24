import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { OnboardDto } from './dto/onboard.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    return this.members.list(user, { q, status });
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.members.findOne(user, id);
  }

  @Roles('owner', 'manager', 'receptionist')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMemberDto) {
    return this.members.create(user, dto);
  }

  @Roles('owner', 'manager', 'receptionist')
  @Post('onboard')
  onboard(@CurrentUser() user: AuthUser, @Body() dto: OnboardDto) {
    return this.members.onboard(user, dto);
  }
}
