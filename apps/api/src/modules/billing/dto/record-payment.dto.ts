import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RecordPaymentDto {
  @IsString()
  invoiceId!: string;

  /** Amount in minor units (paise). Must not exceed the invoice balance. */
  @IsInt()
  @Min(1)
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  /** External reference (UTR / txn id) for non-cash payments. */
  @IsOptional()
  @IsString()
  @Length(0, 120)
  reference?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  notes?: string;
}
