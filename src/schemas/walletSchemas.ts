import { z } from 'zod';

export const depositSchema = z.object({
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed 10,00,000')
});

export const withdrawSchema = z.object({
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed 10,00,000')
});
