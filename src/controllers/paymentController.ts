import { Request, Response, NextFunction } from 'express';
import stripe from '../config/stripe';
import prisma from '../config/database';
import { BadRequestError, NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { validateAmount, validatePagination, validateRequiredFields } from '../services/validationService';
import {
  reconcilePayment,
  handleFailedPayment,
  retryFailedPayment,
  processSuccessfulPayment
} from '../services/paymentReconciliationService';

/**
 * Create a payment intent for card payment
 * POST /api/payment/create-intent
 * Body: { amount, description?, idempotencyKey? }
 */
export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { amount, description, idempotencyKey: bodyIdempotencyKey } = req.body;
    const idempotencyKey = bodyIdempotencyKey || (req.headers['idempotency-key'] as string);

    // Validation
    const requiredValidation = validateRequiredFields({ amount }, ['amount']);
    if (!requiredValidation.valid) {
      throw new ValidationError('Missing required fields', {
        missingFields: requiredValidation.missingFields
      });
    }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid || !amountValidation.value) {
      throw new BadRequestError(amountValidation.error || 'Invalid amount');
    }

    const validatedAmount = amountValidation.value;
    if (validatedAmount > 10000) { // Max $10,000
      throw new BadRequestError('Amount cannot exceed $10,000');
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 1. Idempotency Check: Check if an intent was already created for this key
    if (idempotencyKey) {
      const existingPayment = await prisma.stripePayment.findUnique({
        where: { idempotencyKey },
        select: {
          stripePaymentIntentId: true,
          amount: true,
          status: true
        }
      });

      if (existingPayment) {
        try {
          // Retrieve existing intent from Stripe to get current status and client secret
          const paymentIntent = await stripe.paymentIntents.retrieve(existingPayment.stripePaymentIntentId);
          return res.status(200).json({
            message: 'Payment intent retrieved successfully (Idempotent)',
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: (paymentIntent.amount / 100).toString(),
            status: paymentIntent.status
          });
        } catch (stripeError) {
          console.warn('Idempotent payment retrieved from DB but Stripe retrieval failed:', stripeError);
          // Fall through to recreate if Stripe has deleted or lost it
        }
      }
    }

    // Amount is in paise, so multiply by 100
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(validatedAmount * 100),
      currency: 'inr',
      description: 'Software development services', // Required by Indian regulations
      metadata: {
        userId: userId.toString(),
        description: description || 'PayFlow wallet deposit'
      },
      receipt_email: user.email
    });

    // 3. Pre-create pending DB records immediately
    // This allows webhooks or reconciliation to find the record even if confirm fails
    await prisma.$transaction(async (tx: any) => {
      // Create pending Transaction
      const transaction = await tx.transaction.create({
        data: {
          toUserId: userId,
          amount: validatedAmount,
          status: 'pending',
          transactionType: 'deposit',
          description: description || 'Card payment via Stripe'
        }
      });

      // Create pending StripePayment details
      await tx.stripePayment.create({
        data: {
          userId: userId,
          transactionId: transaction.id,
          stripePaymentIntentId: paymentIntent.id,
          amount: validatedAmount,
          currency: 'inr',
          status: paymentIntent.status, // e.g. "requires_payment_method"
          paymentMethod: 'card',
          idempotencyKey: idempotencyKey || null,
          reconcilationStatus: 'pending'
        }
      });
    });

    res.status(200).json({
      message: 'Payment intent created and recorded successfully',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: (paymentIntent.amount / 100).toString(),
      status: paymentIntent.status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm payment and add money to wallet
 * POST /api/payment/confirm
 * Body: { paymentIntentId, amount }
 */
export const confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { paymentIntentId } = req.body;

    const requiredValidation = validateRequiredFields({ paymentIntentId }, ['paymentIntentId']);
    if (!requiredValidation.valid) {
      throw new ValidationError('Missing required fields', {
        missingFields: requiredValidation.missingFields
      });
    }

    // Retrieve payment intent from Stripe to check authorization
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.metadata || parseInt(paymentIntent.metadata.userId) !== userId) {
      throw new ForbiddenError('Unauthorized - payment intent does not belong to this user');
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestError(`Payment is not successful in Stripe. Current status: ${paymentIntent.status}`);
    }

    // Extract payment method details from Stripe if available
    let last4 = '';
    let cardBrand = '';
    let pmType = 'card';
    if (paymentIntent.payment_method) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
        if (pm.card) {
          last4 = pm.card.last4;
          cardBrand = pm.card.brand;
          pmType = pm.type;
        }
      } catch (pmErr) {
        console.error('Retrieve PM error in confirm:', pmErr);
      }
    }

    const receiptUrl = (paymentIntent as any).charges?.data?.[0]?.receipt_url || undefined;

    // Call thread-safe, atomic service to process success
    const result = await processSuccessfulPayment(
      paymentIntentId,
      { last4, brand: cardBrand, type: pmType },
      receiptUrl,
      false
    );

    // Retrieve the wallet to return the user's new balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    res.status(200).json({
      message: result.alreadyProcessed
        ? 'Payment has already been processed'
        : 'Payment confirmed and wallet updated successfully',
      payment: {
        id: result.stripePayment.id,
        amount: result.stripePayment.amount.toString(),
        status: result.stripePayment.status,
        cardBrand: result.stripePayment.cardBrand,
        last4: result.stripePayment.last4Digits,
        newBalance: wallet ? wallet.balance.toString() : '0.00',
        receiptUrl: result.stripePayment.receiptUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment history
 * GET /api/payment/history?limit=10&offset=0
 */
export const getPaymentHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    // Validation
    const pagination = validatePagination(req.query.limit, req.query.offset);
    if (!pagination.valid) {
      throw new BadRequestError(pagination.error || 'Invalid pagination parameters');
    }
    const { limit, offset } = pagination;

    const payments = await prisma.stripePayment.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        status: true,
        cardBrand: true,
        last4Digits: true,
        createdAt: true,
        receiptUrl: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.stripePayment.count({
      where: { userId }
    });

    res.status(200).json({
      message: 'Payment history retrieved',
      payments: payments.map((p: any) => ({
        id: p.id,
        amount: p.amount.toString(),
        status: p.status,
        card: p.cardBrand && p.last4Digits ? `${p.cardBrand} ****${p.last4Digits}` : 'Payment Method',
        timestamp: p.createdAt,
        receiptUrl: p.receiptUrl
      })),
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * TEST ONLY - Confirm payment with test card (for development)
 * This simulates what the frontend would do with Stripe.js
 * In production, the client confirms the payment with Stripe first
 */
export const testConfirmPaymentWithCard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { paymentIntentId } = req.body;

    const requiredValidation = validateRequiredFields({ paymentIntentId }, ['paymentIntentId']);
    if (!requiredValidation.valid) {
      throw new ValidationError('Missing required fields', {
        missingFields: requiredValidation.missingFields
      });
    }

    // Get the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify it belongs to this user
    if (!paymentIntent.metadata || parseInt(paymentIntent.metadata.userId) !== userId) {
      throw new ForbiddenError('Unauthorized - payment intent does not belong to this user');
    }

    // For TEST ONLY: Create a test card payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: 2028,
        cvc: '123'
      }
    });

    // Confirm the payment intent with the test card
    const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethod.id
    });

    // Check if payment succeeded
    if (confirmedIntent.status !== 'succeeded') {
      throw new BadRequestError(`Payment not successful. Status: ${confirmedIntent.status}`, {
        stripeError: confirmedIntent.last_payment_error?.message
      });
    }

    // Extract details
    let last4 = '4242';
    let cardBrand = 'visa';
    if (confirmedIntent.payment_method) {
      try {
        const pm = await stripe.paymentMethods.retrieve(confirmedIntent.payment_method as string);
        if (pm.card) {
          last4 = pm.card.last4;
          cardBrand = pm.card.brand;
        }
      } catch (e) {
        console.error('Retrieve PM error in testConfirm:', e);
      }
    }

    const receiptUrl = (confirmedIntent as any).charges?.data?.[0]?.receipt_url || undefined;

    // Call atomic success processing
    const result = await processSuccessfulPayment(
      paymentIntentId,
      { last4, brand: cardBrand, type: 'card' },
      receiptUrl,
      false
    );

    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    res.status(200).json({
      message: result.alreadyProcessed
        ? 'Test payment already processed'
        : 'Test payment confirmed successfully',
      payment: {
        id: result.stripePayment.id,
        amount: result.stripePayment.amount.toString(),
        status: result.stripePayment.status,
        cardBrand: result.stripePayment.cardBrand,
        last4: result.stripePayment.last4Digits,
        newBalance: wallet ? wallet.balance.toString() : '0.00',
        receiptUrl: result.stripePayment.receiptUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reconcile a specific payment
 * GET /api/payment/reconcile/:paymentIntentId
 */
export const reconcileSpecificPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      throw new BadRequestError('paymentIntentId is required');
    }

    const result = await reconcilePayment(paymentIntentId);

    res.status(200).json({
      message: 'Payment reconciliation completed',
      result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retry a failed payment
 * POST /api/payment/retry/:paymentIntentId
 */
export const retryPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      throw new BadRequestError('paymentIntentId is required');
    }

    // Verify payment belongs to user
    const stripePayment = await prisma.stripePayment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId }
    });

    if (!stripePayment || stripePayment.userId !== userId) {
      throw new ForbiddenError('Unauthorized - this payment intent does not belong to you.');
    }

    const result = await retryFailedPayment(paymentIntentId);

    res.status(200).json({
      message: 'Payment retry processed',
      result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Webhook endpoint for Stripe events
 * POST /api/payment/webhook
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not configured - signature verification skipped.');
      if (process.env.NODE_ENV === 'production') {
        return res.status(400).json({
          error: 'Webhook secret not configured in production!'
        });
      }
    }

    // Verify webhook signature (only if secret is configured)
    let event;
    try {
      if (webhookSecret && sig) {
        // Express raw body is required here
        event = stripe.webhooks.constructEvent(
          req.body as any,
          sig,
          webhookSecret
        );
      } else {
        // Development mode without signature verification
        // If req.body is a Buffer (raw body), parse it as JSON
        event = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
      }
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({
        error: `Invalid webhook signature: ${err instanceof Error ? err.message : 'Unknown'}`
      });
    }

    console.log(`Processing Stripe webhook: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        console.log('Webhook: Payment succeeded:', paymentIntent.id);

        let last4 = '';
        let cardBrand = '';
        let pmType = 'card';
        if (paymentIntent.payment_method) {
          try {
            const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
            if (pm.card) {
              last4 = pm.card.last4;
              cardBrand = pm.card.brand;
              pmType = pm.type;
            }
          } catch (pmErr) {
            console.error('Webhook: Retrieve PM details failed:', pmErr);
          }
        }

        const receiptUrl = paymentIntent.charges?.data?.[0]?.receipt_url || undefined;

        // Auto-process and credit user safely
        await processSuccessfulPayment(
          paymentIntent.id,
          { last4, brand: cardBrand, type: pmType },
          receiptUrl,
          true // webhookReceived = true
        );
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedIntent = event.data.object as any;
        console.log('Webhook: Payment failed:', failedIntent.id);

        await handleFailedPayment(
          failedIntent.id,
          failedIntent.last_payment_error?.message || 'Payment failed'
        );
        break;
      }

      case 'payment_intent.canceled': {
        const cancelledIntent = event.data.object as any;
        console.log('Webhook: Payment cancelled:', cancelledIntent.id);

        await prisma.stripePayment.updateMany({
          where: { stripePaymentIntentId: cancelledIntent.id },
          data: {
            status: 'canceled',
            webhookReceived: true,
            webhookReceivedAt: new Date()
          }
        });
        break;
      }

      case 'charge.refunded': {
        const refundedCharge = event.data.object as any;
        console.log('Webhook: Charge refunded:', refundedCharge.id);

        if (refundedCharge.payment_intent) {
          const stripePayment = await prisma.stripePayment.findUnique({
            where: { stripePaymentIntentId: refundedCharge.payment_intent }
          });

          if (stripePayment) {
            // Reverse the wallet credit safely
            const wallet = await prisma.wallet.findUnique({
              where: { userId: stripePayment.userId }
            });

            if (wallet) {
              await prisma.wallet.update({
                where: { userId: stripePayment.userId },
                data: {
                  balance: {
                    decrement: stripePayment.amount
                  }
                }
              });
            }

            // Mark payment as refunded
            await prisma.stripePayment.update({
              where: { id: stripePayment.id },
              data: {
                status: 'refunded',
                webhookReceived: true,
                webhookReceivedAt: new Date()
              }
            });

            // Mark transaction as refunded
            await prisma.transaction.update({
              where: { id: stripePayment.transactionId },
              data: { status: 'refunded' }
            });

            console.log(`Webhook: Refund completed and wallet decremented for intent ${refundedCharge.payment_intent}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.status(200).json({
      received: true,
      eventType: event.type
    });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to acknowledge Stripe and avoid continuous retry loops
    res.status(200).json({
      received: true,
      error: error instanceof Error ? error.message : 'Processing error - skipped'
    });
  }
};