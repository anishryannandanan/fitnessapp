import { Controller, Get, Query } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

type Period = 'today' | 'week' | 'month';

@Controller('dashboard')
export class DashboardsController {
  constructor(private readonly dashboards: DashboardsService) {}

  @Roles('owner')
  @Get('owner')
  owner(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('period') period?: Period,
  ) {
    return this.dashboards.owner(user, { branchId, period });
  }

  @Roles('owner', 'manager')
  @Get('branch')
  branch(@CurrentUser() user: AuthUser, @Query('period') period?: Period) {
    return this.dashboards.branch(user, { period });
  }

  @Roles('owner', 'manager', 'receptionist')
  @Get('reception')
  reception(@CurrentUser() user: AuthUser) {
    return this.dashboards.reception(user);
  }
}
