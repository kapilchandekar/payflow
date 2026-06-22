import { Router } from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  testConfirmPaymentWithCard,
  reconcileSpecificPayment,
  retryPayment
} from '../controllers/paymentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { zodValidate } from '../middleware/zodValidate';
import { createPaymentIntentSchema } from '../schemas/paymentSchemas';

const router = Router();

// Protected routes (require authentication)
router.use(authMiddleware);

/**
 * POST /api/payment/create-intent
// Create a Stripe Payment Intent for adding funds
// POST /api/payment/create-intent
// Body: { amount, currency? }
 */
router.post('/create-intent', authMiddleware, zodValidate(createPaymentIntentSchema), createPaymentIntent);

/**
 * POST /api/payment/confirm
 * Confirm payment and add money to wallet
 * Body: { paymentIntentId, amount }
 */
router.post('/confirm', confirmPayment);

/**
 * POST /api/payment/test-confirm
 * TEST ONLY - Confirm payment with test card (for development/testing)
 * This simulates what the frontend would do with Stripe.js
 * Body: { paymentIntentId, amount }
 */
router.post('/test-confirm', testConfirmPaymentWithCard);

/**
 * GET /api/payment/history?limit=10&offset=0
 * Get payment history
 */
router.get('/history', getPaymentHistory);

/**
 * GET /api/payment/reconcile/:paymentIntentId
 * Reconcile a specific payment (verify Stripe status matches our DB)
 */
router.get('/reconcile/:paymentIntentId', reconcileSpecificPayment);

/**
 * POST /api/payment/retry/:paymentIntentId
 * Retry a failed payment
 */
router.post('/retry/:paymentIntentId', retryPayment);

export default router;