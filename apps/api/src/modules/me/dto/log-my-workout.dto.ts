import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { LogSetDto } from '../../workouts/dto/log-workout.dto';

// Member self-logging: memberId is resolved from the account, never sent by the client.
export class LogMyWorkoutDto {
  @IsOptional() @IsString()
  planId?: string;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  rating?: number;

  @IsOptional() @IsInt() @Min(0)
  durationMinutes?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LogSetDto)
  sets!: LogSetDto[];
}
