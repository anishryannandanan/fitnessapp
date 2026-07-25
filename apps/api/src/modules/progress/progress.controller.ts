import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { CreateMeasurementDto, CreateProgressPhotoDto } from './dto/create-measurement.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('members/:id')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('measurements')
  listMeasurements(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.progress.staffListMeasurements(user, id);
  }

  @Roles('owner', 'manager', 'trainer', 'dietician')
  @Post('measurements')
  addMeasurement(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateMeasurementDto) {
    return this.progress.staffAddMeasurement(user, id, dto);
  }

  @Get('progress-photos')
  listPhotos(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.progress.staffListPhotos(user, id);
  }

  @Roles('owner', 'manager', 'trainer', 'dietician')
  @Post('progress-photos')
  addPhoto(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateProgressPhotoDto) {
    return this.progress.staffAddPhoto(user, id, dto);
  }
}
