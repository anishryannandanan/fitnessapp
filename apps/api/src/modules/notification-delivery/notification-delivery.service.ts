import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface SendParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface DeliveryResult {
  channel: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  private readonly twilioSid: string;
  private readonly twilioToken: string;
  private readonly twilioPhone: string;
  private readonly twilioWhatsapp: string;
  private readonly sendgridKey: string;
  private readonly sendgridFrom: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.twilioSid = this.config.get<string>('TWILIO_ACCOUNT_SID', '');
    this.twilioToken = this.config.get<string>('TWILIO_AUTH_TOKEN', '');
    this.twilioPhone = this.config.get<string>('TWILIO_PHONE_NUMBER', '');
    this.twilioWhatsapp = this.config.get<string>('TWILIO_WHATSAPP_NUMBER', '');
    this.sendgridKey = this.config.get<string>('SENDGRID_API_KEY', '');
    this.sendgridFrom = this.config.get<string>('SENDGRID_FROM_EMAIL', 'noreply@fitcore.app');
  }

  /**
   * Send notification via all user-preferred channels.
   * Returns delivery results for each channel attempted.
   */
  async sendNotification(params: SendParams): Promise<DeliveryResult[]> {
    const { userId, type, title, body } = params;

    // Look up user and their preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });
    if (!user) return [];

    const prefs = await this.prisma.notificationPreference.findMany({
      where: { userId, type, enabled: true },
    });

    // If no preferences set, deliver via all channels where contact info available
    const channels: NotificationChannel[] = prefs.length > 0
      ? prefs.map((p) => p.channel)
      : this.getDefaultChannels(type, user);

    const results: DeliveryResult[] = [];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'sms':
            if (user.phone) {
              await this.sendSms(user.phone, `${title}: ${body}`);
              results.push({ channel: 'sms', success: true });
            }
            break;
          case 'whatsapp':
            if (user.phone) {
              await this.sendWhatsApp(user.phone, title, body);
              results.push({ channel: 'whatsapp', success: true });
            }
            break;
          case 'email':
            if (user.email) {
              await this.sendEmail(user.email, title, body);
              results.push({ channel: 'email', success: true });
            }
            break;
          case 'push':
            // In-app push is handled by the existing notification system
            results.push({ channel: 'push', success: true });
            break;
        }
      } catch (err: any) {
        this.logger.error(`Failed to send ${channel}: ${err.message}`);
        results.push({ channel, success: false, error: err.message });
      }
    }

    return results;
  }

  /** Send subscription renewal auto-reminders. */
  async sendRenewalReminders(): Promise<{ sent: number; errors: number }> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 86400000);

    // Find memberships expiring within 7 days
    const expiring = await this.prisma.membership.findMany({
      where: {
        status: 'active',
        endDate: { gte: now, lte: in7Days },
      },
      include: {
        member: { include: { user: { select: { id: true, email: true, phone: true } } } },
        package: { select: { name: true } },
      },
    });

    let sent = 0;
    let errors = 0;

    for (const ms of expiring) {
      if (!ms.member.user) continue;

      const daysLeft = Math.ceil((ms.endDate.getTime() - now.getTime()) / 86400000);
      const title = `Membership expiring in ${daysLeft} day(s)`;
      const body = `Your "${ms.package.name}" membership expires on ${ms.endDate.toLocaleDateString('en-IN')}. Please renew to continue uninterrupted access.`;

      const results = await this.sendNotification({
        userId: ms.member.user.id,
        type: NotificationType.membership_expiry,
        title,
        body,
      });

      const success = results.some((r) => r.success);
      if (success) sent++; else errors++;
    }

    return { sent, errors };
  }

  /** Send payment due reminders. */
  async sendPaymentDueReminders(): Promise<{ sent: number; errors: number }> {
    const overdue = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['issued', 'partially_paid', 'overdue'] },
      },
      include: {
        member: { include: { user: { select: { id: true, email: true, phone: true } } } },
      },
      take: 200,
    });

    let sent = 0;
    let errors = 0;

    for (const inv of overdue) {
      if (!inv.member.user) continue;
      const balance = inv.total - inv.amountPaid;
      if (balance <= 0) continue;

      const title = 'Payment due reminder';
      const body = `You have an outstanding balance of Rs. ${(balance / 100).toFixed(2)} (Invoice: ${inv.invoiceNumber}). Please clear your dues.`;

      const results = await this.sendNotification({
        userId: inv.member.user.id,
        type: NotificationType.payment_due,
        title,
        body,
      });

      const success = results.some((r) => r.success);
      if (success) sent++; else errors++;
    }

    return { sent, errors };
  }

  // ---- Private channel-specific senders ----

  private async sendSms(to: string, message: string): Promise<void> {
    if (!this.twilioSid || !this.twilioToken) {
      this.logger.warn('Twilio not configured, skipping SMS');
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`;
    const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');

    const body = new URLSearchParams({
      To: to.startsWith('+') ? to : `+91${to}`,
      From: this.twilioPhone,
      Body: message,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Twilio SMS failed: ${err}`);
    }
  }

  private async sendWhatsApp(to: string, title: string, body: string): Promise<void> {
    if (!this.twilioSid || !this.twilioToken || !this.twilioWhatsapp) {
      this.logger.warn('WhatsApp not configured, skipping');
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`;
    const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');
    const toNumber = to.startsWith('+') ? to : `+91${to}`;

    const params = new URLSearchParams({
      To: `whatsapp:${toNumber}`,
      From: `whatsapp:${this.twilioWhatsapp}`,
      Body: `*${title}*\n\n${body}`,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WhatsApp failed: ${err}`);
    }
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (!this.sendgridKey) {
      this.logger.warn('SendGrid not configured, skipping email');
      return;
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: this.sendgridFrom, name: 'FitCore Gym' },
        subject,
        content: [
          { type: 'text/plain', value: body },
          {
            type: 'text/html',
            value: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#16A34A;">${subject}</h2><p>${body}</p><hr/><p style="color:#666;font-size:12px;">FitCore Gym Management</p></div>`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SendGrid email failed: ${err}`);
    }
  }

  /** Default channels for a notification type when no preferences are set. */
  private getDefaultChannels(
    type: NotificationType,
    user: { email: string | null; phone: string | null },
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = ['push'];

    switch (type) {
      case 'membership_expiry':
      case 'payment_due':
        // High-priority: all channels
        if (user.phone) channels.push('sms', 'whatsapp');
        if (user.email) channels.push('email');
        break;
      case 'workout_reminder':
      case 'meal_reminder':
        // Medium: push + whatsapp
        if (user.phone) channels.push('whatsapp');
        break;
      case 'announcement':
        // Email + push
        if (user.email) channels.push('email');
        break;
      default:
        if (user.email) channels.push('email');
        break;
    }
    return channels;
  }
}
