import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationDeliveryModule } from '../notification-delivery/notification-delivery.module';

@Module({
  imports: [NotificationsModule, NotificationDeliveryModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
