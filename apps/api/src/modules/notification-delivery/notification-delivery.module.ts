import { Module } from '@nestjs/common';
import { NotificationDeliveryService } from './notification-delivery.service';

@Module({
  providers: [NotificationDeliveryService],
  exports: [NotificationDeliveryService],
})
export class NotificationDeliveryModule {}
