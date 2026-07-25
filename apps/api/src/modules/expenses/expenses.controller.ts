import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ExpenseCategory } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller()
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Roles('owner', 'manager')
  @Get('expenses')
  list(
    @CurrentUser() user: AuthUser,
    @Query('category') category?: ExpenseCategory,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.expenses.list(user, { category, from, to });
  }

  @Roles('owner', 'manager')
  @Post('expenses')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user, dto);
  }

  @Roles('owner', 'manager')
  @Delete('expenses/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expenses.remove(user, id);
  }

  @Roles('owner', 'manager')
  @Get('finance/profit')
  profit(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.expenses.profit(user, branchId);
  }
}
