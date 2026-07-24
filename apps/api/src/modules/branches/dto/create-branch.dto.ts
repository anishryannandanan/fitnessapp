import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @Length(2, 60)
  name!: string;

  @IsString()
  @Length(2, 10)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'code must be alphanumeric' })
  code!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
