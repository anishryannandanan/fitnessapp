import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { RenewDto } from './dto/renew.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  listForMember(@CurrentUser() user: AuthUser, @Query('memberId') memberId: string) {
    return this.memberships.listForMember(user, memberId);
  }

  @Roles('owner', 'manager', 'receptionist')
  @Post('member/:memberId/renew')
  renew(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
    @Body() dto: RenewDto,
  ) {
    return this.memberships.renew(user, memberId, dto);
  }
}
