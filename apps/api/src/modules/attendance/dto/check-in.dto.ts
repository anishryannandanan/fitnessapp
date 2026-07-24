import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceMethod } from '@prisma/client';

// Identify the member by exactly one of these; the service resolves it.
export class CheckInDto {
  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(AttendanceMethod)
  method?: AttendanceMethod;

  /** Owner must specify the branch; scoped staff default to their own. */
  @IsOptional()
  @IsString()
  branchId?: string;
}
