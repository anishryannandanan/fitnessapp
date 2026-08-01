import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateGroupClassDto {
  @IsString()
  branchId!: string;

  @IsString()
  coachId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  @IsOptional()
  @IsString()
  classType?: string; // general/yoga/cardio/hiit/strength

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}

export class UpdateGroupClassDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coachId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  @IsOptional()
  @IsString()
  classType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
