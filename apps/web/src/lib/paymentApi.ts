import { apiFetch } from './authApi';

export interface PaymentOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  prefill: { name?: string; email?: string; contact?: string };
}

export interface PaymentOrder {
  id: string;
  invoiceId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  status: string;
  paidAt?: string;
  createdAt: string;
}

/** Create a Razorpay order for online payment of an invoice. */
export function createPaymentOrder(token: string, invoiceId: string, notes?: string): Promise<PaymentOrderResponse> {
  return apiFetch('/api/v1/payment-gateway/create-order', token, {
    method: 'POST',
    body: JSON.stringify({ invoiceId, notes }),
  });
}

/** Verify a completed Razorpay payment. */
export function verifyPayment(
  token: string,
  data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
): Promise<{ success: boolean; message: string }> {
  return apiFetch('/api/v1/payment-gateway/verify', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Get member's payment order history. */
export function getMyPaymentOrders(token: string): Promise<PaymentOrder[]> {
  return apiFetch('/api/v1/payment-gateway/my-orders', token);
}
