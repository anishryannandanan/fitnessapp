import { Controller, HttpCode, Post } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  // Manually run the reminder sweep for the caller's branch scope.
  @Roles('owner', 'manager')
  @Post('run')
  @HttpCode(200)
  run(@CurrentUser() user: AuthUser) {
    return this.reminders.runNow(user);
  }
}
