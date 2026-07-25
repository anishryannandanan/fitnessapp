import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AnnounceDto } from './dto/announce.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  listMine(@CurrentUser() user: AuthUser, @Query('unread') unread?: string) {
    return this.notifications.listMine(user, { unreadOnly: unread === 'true' });
  }

  @Get('notifications/unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user);
  }

  @Post('notifications/:id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user, id);
  }

  @Post('notifications/read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user);
  }

  @Get('notification-preferences')
  getPreferences(@CurrentUser() user: AuthUser) {
    return this.notifications.getPreferences(user);
  }

  @Patch('notification-preferences')
  updatePreference(@CurrentUser() user: AuthUser, @Body() dto: UpdatePreferenceDto) {
    return this.notifications.updatePreference(user, dto);
  }

  @Roles('owner', 'manager')
  @Post('announcements')
  announce(@CurrentUser() user: AuthUser, @Body() dto: AnnounceDto) {
    return this.notifications.announce(user, dto);
  }
}
