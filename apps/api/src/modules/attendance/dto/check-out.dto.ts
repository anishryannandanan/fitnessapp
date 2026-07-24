import { IsOptional, IsString } from 'class-validator';

// Close a visit by attendance log id, or by member (latest open session).
export class CheckOutDto {
  @IsOptional()
  @IsString()
  attendanceId?: string;

  @IsOptional()
  @IsString()
  memberId?: string;
}
