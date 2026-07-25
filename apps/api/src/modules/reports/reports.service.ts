import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { branchWhere } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';

export type ReportType =
  | 'revenue'
  | 'expenses'
  | 'profit'
  | 'payments'
  | 'members'
  | 'branch-comparison';

export interface ReportData {
  type: ReportType;
  title: string;
  columns: string[];
  rows: (string | number)[][];
  generatedAt: string;
}

const RUPEES = (minor: number) => Math.round(minor) / 100;

function dateRange(from?: string, to?: string) {
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
  const end = to ? new Date(new Date(to).getTime() + 86400000) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestException('Invalid date range');
  }
  return { start, end };
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async build(user: AuthUser, type: ReportType, opts: { from?: string; to?: string } = {}): Promise<ReportData> {
    const { start, end } = dateRange(opts.from, opts.to);
    const scope = branchWhere(user); // {} for owner, {branchId:{in:[...]}} otherwise
    const generatedAt = new Date().toISOString();

    switch (type) {
      case 'revenue': {
        const payments = await this.prisma.payment.findMany({
          where: { status: 'paid', paidAt: { gte: start, lt: end }, ...scope },
          select: { amount: true, paidAt: true },
        });
        const byDay = new Map<string, { count: number; amount: number }>();
        for (const p of payments) {
          const k = ymd(p.paidAt);
          const cur = byDay.get(k) ?? { count: 0, amount: 0 };
          cur.count += 1;
          cur.amount += p.amount;
          byDay.set(k, cur);
        }
        const rows = [...byDay.entries()].sort().map(([d, v]) => [d, v.count, RUPEES(v.amount)]);
        return { type, title: 'Revenue', columns: ['Date', 'Payments', 'Amount (₹)'], rows, generatedAt };
      }

      case 'expenses': {
        const expenses = await this.prisma.expense.findMany({
          where: { expenseDate: { gte: start, lt: end }, ...scope },
          select: { category: true, amount: true },
        });
        const byCat = new Map<string, { count: number; amount: number }>();
        for (const e of expenses) {
          const cur = byCat.get(e.category) ?? { count: 0, amount: 0 };
          cur.count += 1;
          cur.amount += e.amount;
          byCat.set(e.category, cur);
        }
        const rows = [...byCat.entries()].map(([c, v]) => [c, v.count, RUPEES(v.amount)]);
        return { type, title: 'Expenses by category', columns: ['Category', 'Count', 'Amount (₹)'], rows, generatedAt };
      }

      case 'profit': {
        const [rev, exp] = await Promise.all([
          this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'paid', paidAt: { gte: start, lt: end }, ...scope } }),
          this.prisma.expense.aggregate({ _sum: { amount: true }, where: { expenseDate: { gte: start, lt: end }, ...scope } }),
        ]);
        const income = rev._sum.amount ?? 0;
        const expenses = exp._sum.amount ?? 0;
        return {
          type, title: 'Profit & Loss', columns: ['Metric', 'Amount (₹)'],
          rows: [['Income', RUPEES(income)], ['Expenses', RUPEES(expenses)], ['Profit', RUPEES(income - expenses)]],
          generatedAt,
        };
      }

      case 'payments': {
        const payments = await this.prisma.payment.findMany({
          where: { paidAt: { gte: start, lt: end }, ...scope },
          orderBy: { paidAt: 'desc' },
          include: { member: { select: { fullName: true, memberCode: true } } },
          take: 1000,
        });
        const rows = payments.map((p) => [ymd(p.paidAt), p.member.memberCode, p.member.fullName, p.method, p.status, RUPEES(p.amount)]);
        return { type, title: 'Payments', columns: ['Date', 'Member Code', 'Member', 'Method', 'Status', 'Amount (₹)'], rows, generatedAt };
      }

      case 'members': {
        const members = await this.prisma.member.findMany({
          where: { createdAt: { gte: start, lt: end }, ...(branchWhere(user, 'homeBranchId')) },
          select: { createdAt: true },
        });
        const byDay = new Map<string, number>();
        for (const m of members) {
          const k = ymd(m.createdAt);
          byDay.set(k, (byDay.get(k) ?? 0) + 1);
        }
        const rows = [...byDay.entries()].sort().map(([d, n]) => [d, n]);
        return { type, title: 'Member growth (new joins)', columns: ['Date', 'New members'], rows, generatedAt };
      }

      case 'branch-comparison': {
        if (user.role !== 'owner') throw new BadRequestException('Branch comparison is owner-only');
        const branches = await this.prisma.branch.findMany({ where: { businessId: user.businessId }, orderBy: { name: 'asc' } });
        const rows: (string | number)[][] = [];
        for (const b of branches) {
          const [rev, exp, members] = await Promise.all([
            this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'paid', paidAt: { gte: start, lt: end }, branchId: b.id } }),
            this.prisma.expense.aggregate({ _sum: { amount: true }, where: { expenseDate: { gte: start, lt: end }, branchId: b.id } }),
            this.prisma.member.count({ where: { homeBranchId: b.id } }),
          ]);
          const income = rev._sum.amount ?? 0;
          const expenses = exp._sum.amount ?? 0;
          rows.push([b.name, members, RUPEES(income), RUPEES(expenses), RUPEES(income - expenses)]);
        }
        return { type, title: 'Branch comparison', columns: ['Branch', 'Members', 'Revenue (₹)', 'Expenses (₹)', 'Profit (₹)'], rows, generatedAt };
      }

      default:
        throw new BadRequestException(`Unknown report type: ${type}`);
    }
  }

  toCsv(report: ReportData): string {
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [report.columns.map(escape).join(','), ...report.rows.map((r) => r.map(escape).join(','))];
    return lines.join('\n');
  }

  async toXlsx(report: ReportData): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'FitCore';
    const ws = wb.addWorksheet(report.title.slice(0, 28) || 'Report');
    ws.addRow([report.title]);
    ws.addRow([`Generated ${report.generatedAt}`]);
    ws.addRow([]);
    const header = ws.addRow(report.columns);
    header.font = { bold: true };
    report.rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((c) => { c.width = 22; });
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
