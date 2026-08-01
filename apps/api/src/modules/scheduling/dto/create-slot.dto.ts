import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateSlotDto {
  @IsString()
  branchId!: string;

  @IsString()
  trainerId!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxClients?: number;
}

export class UpdateSlotDto {
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxClients?: number;
}

export class BookSessionDto {
  @IsString()
  memberId!: string;

  @IsString()
  trainerId!: string;

  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  slotId?: string;

  @IsString()
  scheduledDate!: string; // ISO date

  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetPreferenceDto {
  @IsString()
  memberId!: string;

  @IsOptional()
  @IsString()
  preferredTime?: string; // morning/afternoon/evening

  @IsOptional()
  @IsString()
  preferredGender?: string; // male/female/any

  @IsOptional()
  @IsString()
  goals?: string; // weight_loss/muscle_gain/general_fitness

  @IsOptional()
  @IsString()
  notes?: string;
}
