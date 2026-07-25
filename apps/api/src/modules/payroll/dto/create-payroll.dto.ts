import { IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class CreatePayrollDto {
  @IsString()
  staffUserId!: string;

  @IsISO8601()
  periodStart!: string;

  @IsISO8601()
  periodEnd!: string;

  @IsInt() @Min(0)
  baseAmount!: number;

  @IsOptional() @IsInt() @Min(0)
  commissionAmount?: number;

  @IsOptional() @IsInt() @Min(0)
  bonus?: number;

  @IsOptional() @IsInt() @Min(0)
  deduction?: number;

  /** Owner must pass a branch; scoped staff default to their own. */
  @IsOptional() @IsString()
  branchId?: string;
}
