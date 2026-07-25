import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DietService } from './diet.service';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('diet-plans')
export class DietController {
  constructor(private readonly diet: DietService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('memberId') memberId?: string,
    @Query('templatesOnly') templatesOnly?: string,
  ) {
    return this.diet.listPlans(user, { memberId, templatesOnly: templatesOnly === 'true' });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.diet.getPlan(user, id);
  }

  @Roles('owner', 'manager', 'trainer', 'dietician')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDietPlanDto) {
    return this.diet.createPlan(user, dto);
  }
}
