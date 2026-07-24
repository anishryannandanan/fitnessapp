import { IsOptional, IsString } from 'class-validator';

export class RenewDto {
  /** Package to renew with. Defaults to the member's current package. */
  @IsOptional()
  @IsString()
  packageId?: string;
}
