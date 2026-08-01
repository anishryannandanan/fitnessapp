import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/types/auth-user';
import { CreatePaymentOrderDto } from './dto/create-order.dto';

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID', '');
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET', '');
    this.webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET', '');
  }

  /** Create a Razorpay order for a given invoice (member self-service). */
  async createOrder(user: AuthUser, dto: CreatePaymentOrderDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { member: { select: { id: true, userId: true, fullName: true, email: true, phone: true } } },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    // Members can only pay their own invoices
    if (user.role === 'member' && invoice.member.userId !== user.sub) {
      throw new ForbiddenException('You can only pay your own invoices');
    }

    const balanceDue = invoice.total - invoice.amountPaid;
    if (balanceDue <= 0) {
      throw new UnprocessableEntityException('Invoice is already fully paid');
    }
    if (invoice.status === InvoiceStatus.void) {
      throw new UnprocessableEntityException('Invoice is void');
    }

    const receipt = `rcpt_${invoice.invoiceNumber}_${Date.now()}`;

    // Create Razorpay order via their API
    const razorpayOrder = await this.createRazorpayOrder(balanceDue, 'INR', receipt, {
      invoiceId: invoice.id,
      memberId: invoice.memberId,
      memberName: invoice.member.fullName,
    });

    // Store locally
    const order = await this.prisma.paymentOrder.create({
      data: {
        branchId: invoice.branchId,
        memberId: invoice.memberId,
        invoiceId: invoice.id,
        razorpayOrderId: razorpayOrder.id,
        amount: balanceDue,
        currency: 'INR',
        receipt,
        status: 'created',
        notes: dto.notes ? { note: dto.notes } : undefined,
      },
    });

    return {
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: this.keyId,
      amount: balanceDue,
      currency: 'INR',
      invoiceNumber: invoice.invoiceNumber,
      prefill: {
        name: invoice.member.fullName,
        email: invoice.member.email,
        contact: invoice.member.phone,
      },
    };
  }

  /** Verify payment after client-side checkout (called by frontend). */
  async verifyPayment(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload;

    // Verify signature
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new UnprocessableEntityException('Invalid payment signature');
    }

    // Find and update order
    const order = await this.prisma.paymentOrder.findUnique({
      where: { razorpayOrderId },
    });
    if (!order) throw new NotFoundException('Payment order not found');

    if (order.status === 'paid') {
      return { success: true, message: 'Payment already recorded' };
    }

    // Complete the payment flow
    await this.prisma.$transaction(async (tx) => {
      // Update order status
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          razorpayPaymentId,
          status: 'paid',
          paidAt: new Date(),
        },
      });

      // Record actual payment
      await tx.payment.create({
        data: {
          branchId: order.branchId,
          invoiceId: order.invoiceId,
          memberId: order.memberId,
          amount: order.amount,
          method: 'online_gateway',
          status: 'paid',
          reference: razorpayPaymentId,
          notes: 'Paid via Razorpay (online)',
        },
      });

      // Update invoice
      const invoice = await tx.invoice.findUnique({ where: { id: order.invoiceId } });
      if (invoice) {
        const newPaid = invoice.amountPaid + order.amount;
        const newStatus = newPaid >= invoice.total ? InvoiceStatus.paid : InvoiceStatus.partially_paid;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { amountPaid: newPaid, status: newStatus },
        });
      }
    });

    return { success: true, message: 'Payment verified and recorded' };
  }

  /** Razorpay webhook handler for async payment events. */
  async handleWebhook(rawBody: string, signature: string) {
    // Verify webhook signature
    const expectedSig = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSig !== signature) {
      this.logger.warn('Webhook signature mismatch');
      return { status: 'ignored', reason: 'signature_mismatch' };
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    if (eventType === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (!payment) return { status: 'ignored', reason: 'no_payment_entity' };

      const orderId = payment.order_id;
      const order = await this.prisma.paymentOrder.findUnique({
        where: { razorpayOrderId: orderId },
      });

      if (!order || order.status === 'paid') {
        return { status: 'already_processed' };
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.paymentOrder.update({
          where: { id: order.id },
          data: { razorpayPaymentId: payment.id, status: 'paid', paidAt: new Date() },
        });

        await tx.payment.create({
          data: {
            branchId: order.branchId,
            invoiceId: order.invoiceId,
            memberId: order.memberId,
            amount: order.amount,
            method: 'online_gateway',
            status: 'paid',
            reference: payment.id,
            notes: 'Razorpay webhook: payment.captured',
          },
        });

        const invoice = await tx.invoice.findUnique({ where: { id: order.invoiceId } });
        if (invoice) {
          const newPaid = invoice.amountPaid + order.amount;
          const newStatus = newPaid >= invoice.total ? InvoiceStatus.paid : InvoiceStatus.partially_paid;
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { amountPaid: newPaid, status: newStatus },
          });
        }
      });

      return { status: 'captured' };
    }

    if (eventType === 'payment.failed') {
      const payment = event.payload?.payment?.entity;
      if (payment?.order_id) {
        await this.prisma.paymentOrder.updateMany({
          where: { razorpayOrderId: payment.order_id, status: { not: 'paid' } },
          data: { status: 'failed' },
        });
      }
      return { status: 'marked_failed' };
    }

    return { status: 'ignored', eventType };
  }

  /** Get payment history for a member (self-service). */
  async getMemberPaymentOrders(user: AuthUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.sub },
    });
    if (!member) throw new NotFoundException('Member profile not found');

    return this.prisma.paymentOrder.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ---- Private helpers ----

  private async createRazorpayOrder(
    amount: number,
    currency: string,
    receipt: string,
    notes: Record<string, string>,
  ): Promise<RazorpayOrder> {
    if (!this.keyId || !this.keySecret) {
      // Fallback for dev/demo: return a mock order
      this.logger.warn('Razorpay not configured, returning mock order');
      return {
        id: `order_mock_${Date.now()}`,
        entity: 'order',
        amount,
        currency,
        receipt,
        status: 'created',
      };
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ amount, currency, receipt, notes }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Razorpay order creation failed: ${err}`);
      throw new UnprocessableEntityException('Payment gateway error: could not create order');
    }

    return res.json() as Promise<RazorpayOrder>;
  }
}
