import { IsArray, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AnnounceDto {
  @IsString()
  @Length(2, 80)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  body?: string;

  /** Owner: specific branch or omit for all. Managers are forced to their branch. */
  @IsOptional()
  @IsString()
  branchId?: string;

  /** Optional role filter (e.g. only members). */
  @IsOptional()
  @IsArray()
  @IsIn(['owner', 'manager', 'receptionist', 'trainer', 'dietician', 'member'], { each: true })
  roles?: UserRole[];
}
