import { Type } from 'class-transformer';
import { IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { CreateMemberDto } from './create-member.dto';

// A lean onboarding payload for Slice 2: personal details + chosen package.
// (Measurements, goals, medical, food, payment come in later slices.)
export class OnboardDto {
  @ValidateNested()
  @Type(() => CreateMemberDto)
  personal!: CreateMemberDto;

  @IsString()
  packageId!: string;

  /** Optional explicit start date (ISO). Defaults to today. */
  @IsOptional()
  @IsString()
  startDate?: string;

  /** Optional password to create a login account for the member. */
  @IsOptional()
  @IsString()
  @Length(6, 100)
  password?: string;
}
