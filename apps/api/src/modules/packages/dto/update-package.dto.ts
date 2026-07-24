import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

// Note: `type` is intentionally not editable after creation.
export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  @Length(2, 60)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  taxPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  ptSessions?: number;

  @IsOptional()
  @IsBoolean()
  includesTrainer?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
