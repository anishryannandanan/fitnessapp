import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsOptional, IsString, Length, Min, ValidateNested,
} from 'class-validator';

export class DietMealDto {
  @IsString()
  mealType!: string; // breakfast/lunch/dinner/snack

  @IsString()
  @Length(1, 80)
  title!: string;

  @IsOptional() @IsInt() @Min(0)
  orderIndex?: number;

  @IsOptional() @IsInt() @Min(0)
  calories?: number;

  @IsOptional() @IsInt() @Min(0)
  proteinG?: number;

  @IsOptional() @IsInt() @Min(0)
  carbsG?: number;

  @IsOptional() @IsInt() @Min(0)
  fatG?: number;
}

export class CreateDietPlanDto {
  @IsString()
  @Length(2, 60)
  name!: string;

  @IsOptional() @IsString()
  memberId?: string;

  @IsOptional() @IsInt() @Min(0)
  dailyCalories?: number;

  @IsOptional() @IsInt() @Min(0)
  proteinG?: number;

  @IsOptional() @IsInt() @Min(0)
  carbsG?: number;

  @IsOptional() @IsInt() @Min(0)
  fatG?: number;

  @IsOptional() @IsInt() @Min(0)
  waterGoalMl?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DietMealDto)
  meals?: DietMealDto[];
}
