import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { Difficulty } from '@prisma/client';

export class CreateExerciseDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsString()
  muscleGroup?: string;

  @IsOptional()
  @IsString()
  equipment?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultSets?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultReps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultRestSec?: number;
}
