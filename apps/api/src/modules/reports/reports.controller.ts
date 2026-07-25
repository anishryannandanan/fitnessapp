import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ReportsService, ReportType } from './reports.service';

// Minimal Fastify reply shape we use (avoids a direct 'fastify' type dependency).
interface ExportReply {
  header(key: string, value: string): ExportReply;
  send(payload: unknown): void;
}
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Roles('owner', 'manager')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get(':type')
  build(
    @CurrentUser() user: AuthUser,
    @Param('type') type: ReportType,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.build(user, type, { from, to });
  }

  @Get(':type/export')
  async export(
    @CurrentUser() user: AuthUser,
    @Param('type') type: ReportType,
    @Res() reply: ExportReply,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const report = await this.reports.build(user, type, { from, to });
    const base = `${type}-report-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'xlsx') {
      const buf = await this.reports.toXlsx(report);
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${base}.xlsx"`)
        .send(buf);
      return;
    }

    const csv = this.reports.toCsv(report);
    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${base}.csv"`)
      .send(csv);
  }
}
