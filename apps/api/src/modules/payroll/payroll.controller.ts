import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

// Salary data is visible to owner + manager only (never reception/trainer).
@Roles('owner', 'manager')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('staffUserId') staffUserId?: string) {
    return this.payroll.list(user, { staffUserId });
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePayrollDto) {
    return this.payroll.create(user, dto);
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payroll.approve(user, id);
  }

  @Post(':id/pay')
  pay(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payroll.pay(user, id);
  }
}
