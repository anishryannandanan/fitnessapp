import { IsEnum, IsInt, IsOptional, IsString, IsISO8601, Length, Min } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  /** Amount in minor units (paise). */
  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsISO8601()
  expenseDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  vendor?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  note?: string;

  /** Owner must pass a branch; scoped staff default to their own. */
  @IsOptional()
  @IsString()
  branchId?: string;
}
