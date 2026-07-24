import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly billing: BillingService) {}

  @Roles('owner', 'manager', 'receptionist')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('memberId') memberId?: string) {
    return this.billing.listPayments(user, { memberId });
  }

  @Roles('owner', 'manager', 'receptionist')
  @Post()
  @HttpCode(201)
  record(@CurrentUser() user: AuthUser, @Body() dto: RecordPaymentDto) {
    return this.billing.recordPayment(user, dto);
  }
}
