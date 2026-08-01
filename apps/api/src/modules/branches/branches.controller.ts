import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  // All authenticated roles may list branches; results are scoped per role.
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.branches.list(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.branches.findOne(user, id);
  }

  @Roles('owner')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBranchDto) {
    return this.branches.create(user, dto);
  }

  @Roles('owner', 'manager')
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branches.update(user, id, dto);
  }

  @Roles('owner')
  @Delete(':id')
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.branches.deactivate(user, id);
  }
}
