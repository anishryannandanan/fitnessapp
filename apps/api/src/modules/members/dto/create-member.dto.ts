import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateMemberDto {
  /** Target home branch. Optional for scoped staff (defaults to their branch). */
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @Length(2, 80)
  fullName!: string;

  @IsString()
  @Length(6, 20)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsISO8601()
  dob?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  address?: string;
}
