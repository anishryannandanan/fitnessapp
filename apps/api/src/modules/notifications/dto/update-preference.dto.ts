import { IsBoolean, IsEnum } from 'class-validator';
import { NotificationType, NotificationChannel } from '@prisma/client';

export class UpdatePreferenceDto {
  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;
}
