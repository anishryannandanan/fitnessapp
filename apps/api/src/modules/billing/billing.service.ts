import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBranchIds, branchWhere, canAccessBranch } from '../../common/scope';
import type { AuthUser } from '../../common/types/auth-user';
import { RecordPaymentDto } from './dto/record-payment.dto';

interface CreateInvoiceParams {
  branchId: string;
  memberId: string;
  membershipId?: string;
  subtotal: number; // minor units
  tax?: number;
  dueDate?: Date;
  issuedById?: string;
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an issued invoice within an existing transaction. Used by
   * onboarding / renewal so member + membership + invoice are atomic.
   */
  async createInvoiceTx(tx: Prisma.TransactionClient, p: CreateInvoiceParams) {
    const branch = await tx.branch.findUnique({ where: { id: p.branchId } });
    if (!branch) throw new NotFoundException('Branch not found');
    const seq = (await tx.invoice.count({ where: { branchId: p.branchId } })) + 1;
    const invoiceNumber = `INV-${branch.code}-${String(seq).padStart(6, '0')}`;
    const tax = p.tax ?? 0;
    const total = p.subtotal + tax;
    return tx.invoice.create({
      data: {
        branchId: p.branchId,
        memberId: p.memberId,
        membershipId: p.membershipId,
        invoiceNumber,
        subtotal: p.subtotal,
        tax,
        total,
        amountPaid: 0,
        status: InvoiceStatus.issued,
        dueDate: p.dueDate,
        issuedById: p.issuedById,
      },
    });
  }

  async listInvoices(user: AuthUser, opts: { memberId?: string; status?: InvoiceStatus } = {}) {
    return this.prisma.invoice.findMany({
      where: {
        ...branchWhere(user),
        ...(opts.memberId ? { memberId: opts.memberId } : {}),
        ...(opts.status ? { status: opts.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { member: { select: { fullName: true, memberCode: true } } },
      take: 200,
    });
  }

  async getInvoice(user: AuthUser, id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        payments: { orderBy: { paidAt: 'desc' } },
        member: { select: { fullName: true, memberCode: true, phone: true } },
        membership: { include: { package: { select: { name: true } } } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!canAccessBranch(user, invoice.branchId)) {
      throw new ForbiddenException('You cannot access this invoice');
    }
    return { ...invoice, balanceDue: invoice.total - invoice.amountPaid };
  }

  async listPayments(user: AuthUser, opts: { memberId?: string } = {}) {
    return this.prisma.payment.findMany({
      where: {
        ...branchWhere(user),
        ...(opts.memberId ? { memberId: opts.memberId } : {}),
      },
      orderBy: { paidAt: 'desc' },
      include: { member: { select: { fullName: true, memberCode: true } } },
      take: 200,
    });
  }

  /**
   * Record a payment against an invoice. Enforces no-overpay (BR-21) and
   * transitions the invoice status. Returns a receipt payload.
   */
  async recordPayment(user: AuthUser, dto: RecordPaymentDto) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!canAccessBranch(user, invoice.branchId)) {
      throw new ForbiddenException('You cannot collect payment for this invoice');
    }
    if (invoice.status === InvoiceStatus.void) {
      throw new UnprocessableEntityException('Invoice is void');
    }

    const balanceDue = invoice.total - invoice.amountPaid;
    if (balanceDue <= 0) {
      throw new UnprocessableEntityException('Invoice is already fully paid');
    }
    if (dto.amount > balanceDue) {
      throw new UnprocessableEntityException('Amount exceeds the outstanding balance');
    }

    const newPaid = invoice.amountPaid + dto.amount;
    const newStatus =
      newPaid >= invoice.total ? InvoiceStatus.paid : InvoiceStatus.partially_paid;

    const { payment, updated } = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          branchId: invoice.branchId,
          invoiceId: invoice.id,
          memberId: invoice.memberId,
          amount: dto.amount,
          method: dto.method,
          status: 'paid',
          reference: dto.reference,
          notes: dto.notes,
          collectedById: user.sub,
        },
      });
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newPaid, status: newStatus },
      });
      return { payment, updated };
    });

    return {
      payment,
      invoice: { ...updated, balanceDue: updated.total - updated.amountPaid },
      receipt: {
        invoiceNumber: updated.invoiceNumber,
        amount: payment.amount,
        method: payment.method,
        paidAt: payment.paidAt,
        totalPaid: updated.amountPaid,
        balanceDue: updated.total - updated.amountPaid,
      },
    };
  }

  /** Members with an outstanding balance, aged for dunning. */
  async outstanding(user: AuthUser) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...branchWhere(user),
        status: { in: [InvoiceStatus.issued, InvoiceStatus.partially_paid, InvoiceStatus.overdue] },
      },
      include: { member: { select: { fullName: true, memberCode: true, homeBranchId: true } } },
    });

    const byMember = new Map<string, { memberId: string; name: string; code: string; branchId: string; balance: number; invoices: number }>();
    for (const inv of invoices) {
      const bal = inv.total - inv.amountPaid;
      if (bal <= 0) continue;
      const existing = byMember.get(inv.memberId);
      if (existing) {
        existing.balance += bal;
        existing.invoices += 1;
      } else {
        byMember.set(inv.memberId, {
          memberId: inv.memberId,
          name: inv.member.fullName,
          code: inv.member.memberCode,
          branchId: inv.member.homeBranchId,
          balance: bal,
          invoices: 1,
        });
      }
    }
    const rows = Array.from(byMember.values()).sort((a, b) => b.balance - a.balance);
    return {
      totalOutstanding: rows.reduce((s, r) => s + r.balance, 0),
      members: rows,
      branchScope: allowedBranchIds(user) ?? 'all',
    };
  }
}
