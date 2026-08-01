import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { DietService } from './diet.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('diet-plans')
export class DietController {
  constructor(
    private readonly diet: DietService,
    private readonly pdf: PdfService,
  ) {}

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

  /** Download diet plan as PDF. */
  @Get(':id/pdf')
  async downloadPdf(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: any) {
    const plan = await this.diet.getPlan(user, id);

    const pdfBuffer = await this.pdf.generateDietPlanPdf({
      memberName: plan.memberId ? 'Member' : 'Template',
      planName: plan.name,
      trainerName: 'Trainer',
      dailyCalories: plan.dailyCalories ?? undefined,
      proteinG: plan.proteinG ?? undefined,
      carbsG: plan.carbsG ?? undefined,
      fatG: plan.fatG ?? undefined,
      waterGoalMl: plan.waterGoalMl ?? undefined,
      meals: (plan.meals ?? []).map((m: any) => ({
        mealType: m.mealType,
        title: m.title,
        calories: m.calories ?? undefined,
        proteinG: m.proteinG ?? undefined,
        carbsG: m.carbsG ?? undefined,
        fatG: m.fatG ?? undefined,
      })),
      createdAt: plan.createdAt?.toISOString?.()?.split('T')[0] ?? new Date().toISOString().split('T')[0],
    });

    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="diet-plan-${plan.name.replace(/\s+/g, '-')}.pdf"`);
    res.send(pdfBuffer);
  }
}
