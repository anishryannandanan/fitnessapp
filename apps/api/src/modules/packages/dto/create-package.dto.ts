import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PackageType } from '@prisma/client';

export class CreatePackageDto {
  @IsString()
  @Length(2, 60)
  name!: string;

  @IsEnum(PackageType)
  type!: PackageType;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays!: number;

  /** Price in minor units (paise). */
  @IsInt()
  @Min(0)
  price!: number;

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

  /** null / omitted => available at all branches. */
  @IsOptional()
  @IsString()
  branchId?: string | null;
}
