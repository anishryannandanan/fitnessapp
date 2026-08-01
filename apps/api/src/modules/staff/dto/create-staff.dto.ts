import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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

  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsString()
  specialization?: string;
}
