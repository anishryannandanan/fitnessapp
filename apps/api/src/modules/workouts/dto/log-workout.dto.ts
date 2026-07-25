import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested,
} from 'class-validator';

export class LogSetDto {
  @IsString()
  exerciseId!: string;

  @IsInt() @Min(0)
  setIndex!: number;

  @IsOptional() @IsInt() @Min(0)
  weightGrams?: number;

  @IsOptional() @IsInt() @Min(0) @Max(1000)
  reps?: number;
}

export class LogWorkoutDto {
  @IsString()
  memberId!: string;

  @IsOptional() @IsString()
  planId?: string;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  rating?: number;

  @IsOptional() @IsInt() @Min(0)
  durationMinutes?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LogSetDto)
  sets!: LogSetDto[];
}
