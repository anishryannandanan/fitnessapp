import { IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateMeasurementDto {
  /** Weight in grams. */
  @IsOptional() @IsInt() @Min(20000) @Max(400000)
  weightG?: number;

  @IsOptional() @IsNumber() @Min(1) @Max(70)
  bodyFatPct?: number;

  @IsOptional() @IsNumber() @Min(1) @Max(70)
  musclePct?: number;

  @IsOptional() @IsNumber() @Min(20) @Max(250)
  waistCm?: number;

  @IsOptional() @IsNumber() @Min(20) @Max(250)
  chestCm?: number;

  @IsOptional() @IsNumber() @Min(5) @Max(120)
  armsCm?: number;

  @IsOptional() @IsNumber() @Min(20) @Max(250)
  hipsCm?: number;

  @IsOptional() @IsNumber() @Min(20) @Max(150)
  thighsCm?: number;

  @IsOptional() @IsString() @Length(0, 300)
  note?: string;
}

export class CreateProgressPhotoDto {
  @IsString()
  photoUrl!: string;

  @IsString()
  @Length(1, 20)
  pose!: string; // front / side / back

  @IsOptional() @IsString() @Length(0, 300)
  note?: string;
}
