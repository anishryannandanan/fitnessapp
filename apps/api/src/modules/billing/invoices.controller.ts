import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { BillingService } from './billing.service';
import { PdfService } from '../pdf/pdf.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly billing: BillingService,
    private readonly pdf: PdfService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('memberId') memberId?: string,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.billing.listInvoices(user, { memberId, status });
  }

  // Declared before ':id' so the static path wins.
  @Roles('owner', 'manager')
  @Get('outstanding')
  outstanding(@CurrentUser() user: AuthUser) {
    return this.billing.outstanding(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.billing.getInvoice(user, id);
  }

  /** Download invoice as PDF receipt. */
  @Get(':id/pdf')
  async downloadPdf(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: any) {
    const invoice = await this.billing.getInvoice(user, id);

    const pdfBuffer = await this.pdf.generateInvoiceReceipt({
      invoiceNumber: invoice.invoiceNumber,
      businessName: 'FitCore Gym',
      branchName: 'Branch',
      memberName: invoice.member.fullName,
      memberCode: invoice.member.memberCode,
      packageName: invoice.membership?.package?.name,
      items: [
        { description: invoice.membership?.package?.name ?? 'Membership', amount: invoice.subtotal },
      ],
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      payments: invoice.payments.map((p) => ({
        date: p.paidAt.toISOString().split('T')[0],
        method: p.method,
        amount: p.amount,
        reference: p.reference ?? undefined,
      })),
      issuedAt: invoice.createdAt.toISOString().split('T')[0],
    });

    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="receipt-${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  }
}
