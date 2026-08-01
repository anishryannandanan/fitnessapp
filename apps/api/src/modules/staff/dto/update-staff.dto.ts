import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export enum StaffTypeEnum {
  manager = 'manager',
  receptionist = 'receptionist',
  trainer = 'trainer',
  dietician = 'dietician',
  cleaner = 'cleaner',
  sales = 'sales',
  maintenance = 'maintenance',
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @Length(2, 60)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(StaffTypeEnum)
  staffType?: StaffTypeEnum;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
