import { Module } from '@nestjs/common';
import { MeService } from './me.service';
import { MeController } from './me.controller';
import { ProgressModule } from '../progress/progress.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [ProgressModule, PdfModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
