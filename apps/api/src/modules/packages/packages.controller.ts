import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('packages')
export class PackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('active') active?: string) {
    return this.packages.list(user, { activeOnly: active === 'true' });
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.packages.findOne(user, id);
  }

  @Roles('owner', 'manager')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePackageDto) {
    return this.packages.create(user, dto);
  }

  @Roles('owner', 'manager')
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.packages.update(user, id, dto);
  }

  @Roles('owner')
  @Delete(':id')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.packages.deactivate(user, id);
  }
}
