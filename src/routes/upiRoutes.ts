import { Router } from 'express';
import {
  createUpiOrder,
  verifyUpiPayment,
  getUpiHistory,
  handleUpiWebhook
} from '../controllers/upiController';
import { authMiddleware } from '../middleware/authMiddleware';
import { zodValidate } from '../middleware/zodValidate';
import { createUpiOrderSchema, verifyUpiPaymentSchema } from '../schemas/paymentSchemas';

const router = Router();

router.post('/webhook', handleUpiWebhook);

router.use(authMiddleware);

// Create Razorpay Order
// POST /api/upi/create-order
// Body: { amount }
router.post('/create-order', authMiddleware, zodValidate(createUpiOrderSchema), createUpiOrder);

// Verify Payment and add funds
// POST /api/upi/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
router.post('/verify', authMiddleware, zodValidate(verifyUpiPaymentSchema), verifyUpiPayment);
router.get('/history', getUpiHistory);

export default router;
