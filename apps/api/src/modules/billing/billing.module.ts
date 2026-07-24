import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { InvoicesController } from './invoices.controller';
import { PaymentsController } from './payments.controller';

@Module({
  controllers: [InvoicesController, PaymentsController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
