import { z } from 'zod';

export const transferSchema = z.object({
  toEmail: z.string().email('Invalid recipient email address'),
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed 10,00,000'),
  description: z.string().max(255, 'Description too long').optional(),
  idempotencyKey: z.string().optional()
});
