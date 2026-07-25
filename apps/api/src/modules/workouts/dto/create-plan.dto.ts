import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsOptional, IsString, Length, Min, ValidateNested,
} from 'class-validator';

export class PlanExerciseDto {
  @IsString()
  exerciseId!: string;

  @IsOptional() @IsInt() @Min(1)
  dayIndex?: number;

  @IsOptional() @IsInt() @Min(0)
  orderIndex?: number;

  @IsOptional() @IsInt() @Min(1)
  sets?: number;

  @IsOptional() @IsString()
  reps?: string;

  @IsOptional() @IsInt() @Min(0)
  restSec?: number;

  @IsOptional() @IsString()
  notes?: string;
}

export class CreatePlanDto {
  @IsString()
  @Length(2, 60)
  name!: string;

  @IsOptional() @IsString()
  goal?: string;

  @IsOptional() @IsInt() @Min(1)
  weeks?: number;

  @IsOptional() @IsInt() @Min(1)
  daysPerWeek?: number;

  /** Assign to a member; omit for a reusable template. */
  @IsOptional() @IsString()
  memberId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanExerciseDto)
  exercises?: PlanExerciseDto[];
}
