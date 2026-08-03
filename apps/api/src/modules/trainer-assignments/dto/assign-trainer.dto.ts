import { IsString, IsOptional } from 'class-validator';

export class AssignTrainerDto {
  @IsString()
  branchId: string;

  @IsString()
  trainerId: string;

  @IsString()
  memberId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
