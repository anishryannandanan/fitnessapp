import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { StaffTypeEnum } from './update-staff.dto';

export class CreateStaffDto {
  @IsString()
  @Length(2, 60)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(StaffTypeEnum)
  staffType!: StaffTypeEnum;

  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  specialization?: string;
}
