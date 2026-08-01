import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Download, IndianRupee, Package } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API, API_URL } from '@/lib/env';
import { apiFetch } from '@/lib/authApi';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

interface MembershipInfo {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  package: { name: string; type: string };
}

interface InvoiceInfo {
  id: string;
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  status: string;
  createdAt: string;
}

interface PaymentOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  prefill: { name?: string; email?: string; contact?: string };
}

export function MemberMembership() {
  const token = useAuth((s) => s.token);
  const [paying, setPaying] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['my-profile-membership'],
    queryFn: () =>
      HAS_API && token
        ? apiFetch<{ memberships: MembershipInfo[]; invoices: InvoiceInfo[] }>('/api/v1/me/profile', token)
        : Promise.resolve({
            memberships: [
              { id: '1', status: 'active', startDate: '2026-06-01', endDate: '2026-09-01', package: { name: 'Quarterly Gold', type: 'trainer' } },
            ],
            invoices: [
              { id: 'inv1', invoiceNumber: 'INV-KCH-000012', total: 500000, amountPaid: 500000, status: 'paid', createdAt: '2026-06-01' },
              { id: 'inv2', invoiceNumber: 'INV-KCH-000015', total: 200000, amountPaid: 0, status: 'issued', createdAt: '2026-07-15' },
            ],
          }),
  });

  const activeMembership = profile?.memberships?.find((m) => m.status === 'active');
  const daysLeft = activeMembership
    ? Math.max(0, Math.ceil((new Date(activeMembership.endDate).getTime() - Date.now()) / 86400000))
    : 0;

  const handlePayOnline = async (invoiceId: string) => {
    if (!token) return;
    setPaying(true);
    try {
      const order = await apiFetch<PaymentOrderResponse>('/api/v1/payment-gateway/create-order', token, {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      });

      // Open Razorpay checkout
      const options = {
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'FitCore Gym',
        description: `Invoice ${order.invoiceNumber}`,
        order_id: order.razorpayOrderId,
        prefill: order.prefill,
        handler: async (response: any) => {
          // Verify on backend
          await apiFetch('/api/v1/payment-gateway/verify', token, {
            method: 'POST',
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          alert('Payment successful!');
          window.location.reload();
        },
        theme: { color: '#16A34A' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const downloadReceipt = (invoiceId: string) => {
    if (!token) return;
    window.open(`${API_URL}/api/v1/invoices/${invoiceId}/pdf`, '_blank');
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Membership" subtitle="Your plan & billing" />

      {/* Active membership */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package size={20} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-text">{activeMembership?.package?.name ?? 'No active plan'}</div>
            <div className="text-xs text-muted">
              {activeMembership
                ? `Expires: ${new Date(activeMembership.endDate).toLocaleDateString('en-IN')} (${daysLeft} days left)`
                : 'Contact front desk to renew'}
            </div>
          </div>
          <div className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            activeMembership?.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
          }`}>
            {activeMembership?.status ?? 'inactive'}
          </div>
        </div>
      </Card>

      {/* Invoices & Payments */}
      <div className="text-sm font-medium text-muted">Invoices</div>
      {profile?.invoices?.map((inv) => {
        const balance = inv.total - inv.amountPaid;
        const isPaid = inv.status === 'paid';
        return (
          <Card key={inv.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text">{inv.invoiceNumber}</div>
                <div className="text-xs text-muted">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</div>
              </div>
              <div className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isPaid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}>
                {isPaid ? 'Paid' : `Due: Rs. ${(balance / 100).toFixed(0)}`}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Total: Rs. {(inv.total / 100).toFixed(0)}</span>
              <div className="flex gap-2">
                {isPaid && (
                  <button onClick={() => downloadReceipt(inv.id)}
                    className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-text hover:bg-surface-3">
                    <Download size={12} /> Receipt
                  </button>
                )}
                {!isPaid && (
                  <button onClick={() => handlePayOnline(inv.id)} disabled={paying}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-fg disabled:opacity-50">
                    <CreditCard size={12} /> {paying ? 'Processing...' : 'Pay Online'}
                  </button>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {(!profile?.invoices || profile.invoices.length === 0) && (
        <Card className="py-8 text-center text-sm text-muted">No invoices yet</Card>
      )}
    </div>
  );
}
