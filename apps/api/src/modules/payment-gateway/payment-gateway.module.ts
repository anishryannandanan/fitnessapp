import { Module } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentGatewayController } from './payment-gateway.controller';

@Module({
  controllers: [PaymentGatewayController],
  providers: [PaymentGatewayService],
  exports: [PaymentGatewayService],
})
export class PaymentGatewayModule {}
