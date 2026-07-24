import { Controller, Get, Param, Query } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { BillingService } from './billing.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('memberId') memberId?: string,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.billing.listInvoices(user, { memberId, status });
  }

  // Declared before ':id' so the static path wins.
  @Roles('owner', 'manager')
  @Get('outstanding')
  outstanding(@CurrentUser() user: AuthUser) {
    return this.billing.outstanding(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.billing.getInvoice(user, id);
  }
}
