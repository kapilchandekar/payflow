import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed 10,00,000'),
  currency: z.string().default('usd')
});

export const createUpiOrderSchema = z.object({
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed 10,00,000')
});

export const verifyUpiPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required')
});
