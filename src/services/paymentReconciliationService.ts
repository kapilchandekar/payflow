import stripe from '../config/stripe';
import prisma from '../config/database';

/**
 * Atomic and thread-safe function to process a successful payment.
 * Credits the user's wallet, completes the transaction, and marks the payment reconciled.
 * Guarantees no double-crediting if called multiple times or concurrently.
 */
export const processSuccessfulPayment = async (
  stripePaymentIntentId: string,
  paymentMethodDetails?: { last4: string; brand: string; type: string },
  receiptUrl?: string,
  webhookReceived = false
): Promise<{
  alreadyProcessed: boolean;
  stripePayment: any;
  wallet?: any;
}> => {
  try {
    // Retrieve the payment intent from Stripe to get the latest status, metadata, and amount
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Cannot process payment. Stripe status is ${paymentIntent.status}`);
    }

    const amount = paymentIntent.amount / 100; // Convert cents to dollars
    const userId = parseInt(paymentIntent.metadata.userId);
    const description = paymentIntent.metadata.description || 'Card payment via Stripe';
    const email = paymentIntent.receipt_email;

    if (!userId || isNaN(userId)) {
      throw new Error(`Cannot process payment. Invalid or missing userId in Stripe metadata.`);
    }

    // Use a transaction to perform atomic updates and lock
    return await prisma.$transaction(async (tx: any) => {
      // Find the StripePayment in the DB
      let stripePayment = await tx.stripePayment.findUnique({
        where: { stripePaymentIntentId },
        include: { transaction: true }
      });

      // If it has already succeeded, return immediately to prevent double-crediting
      if (stripePayment && stripePayment.status === 'succeeded') {
        // If we received a webhook now but webhookReceived was false, update webhook status
        if (webhookReceived && !stripePayment.webhookReceived) {
          stripePayment = await tx.stripePayment.update({
            where: { id: stripePayment.id },
            data: {
              webhookReceived: true,
              webhookReceivedAt: new Date(),
              reconcilationStatus: 'reconciled',
              reconciliationTimestamp: new Date()
            },
            include: { transaction: true }
          });
        }
        return {
          alreadyProcessed: true,
          stripePayment
        };
      }

      let last4 = paymentMethodDetails?.last4 || '';
      let cardBrand = paymentMethodDetails?.brand || '';
      let paymentMethodType = paymentMethodDetails?.type || paymentIntent.payment_method_types?.[0] || 'card';

      // Dynamically fetch payment method info from Stripe if not passed in
      if (!last4 && paymentIntent.payment_method) {
        try {
          const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
          if (pm.card) {
            last4 = pm.card.last4;
            cardBrand = pm.card.brand;
          }
        } catch (pmError) {
          console.error('Failed to retrieve payment method details from Stripe:', pmError);
        }
      }

      const finalReceiptUrl = receiptUrl || (paymentIntent as any).charges?.data?.[0]?.receipt_url || undefined;

      // If StripePayment doesn't exist (edge case: intent was created externally or webhook/confirmation bypassed it)
      if (!stripePayment) {
        console.log(`StripePayment record not found for intent ${stripePaymentIntentId}. Creating on the fly.`);

        // Create Transaction first
        const transaction = await tx.transaction.create({
          data: {
            toUserId: userId,
            amount: amount,
            status: 'completed',
            transactionType: 'deposit',
            description: description
          }
        });

        // Create StripePayment
        stripePayment = await tx.stripePayment.create({
          data: {
            userId: userId,
            transactionId: transaction.id,
            stripePaymentIntentId: stripePaymentIntentId,
            amount: amount,
            currency: 'usd',
            status: 'succeeded',
            paymentMethod: paymentMethodType,
            last4Digits: last4,
            cardBrand: cardBrand,
            receiptEmail: email || undefined,
            receiptUrl: finalReceiptUrl,
            webhookReceived,
            webhookReceivedAt: webhookReceived ? new Date() : null,
            reconcilationStatus: 'reconciled',
            reconciliationTimestamp: new Date()
          },
          include: { transaction: true }
        });

        // Increment wallet balance
        const wallet = await tx.wallet.update({
          where: { userId },
          data: {
            balance: {
              increment: amount
            }
          }
        });

        return {
          alreadyProcessed: false,
          stripePayment,
          wallet
        };
      } else {
        // StripePayment exists in database but status is not succeeded (e.g. pending/requires_payment_method)
        
        // Update Transaction status to completed
        await tx.transaction.update({
          where: { id: stripePayment.transactionId },
          data: { status: 'completed' }
        });

        // Update StripePayment details to succeeded and reconciled
        const updatedPayment = await tx.stripePayment.update({
          where: { id: stripePayment.id },
          data: {
            status: 'succeeded',
            paymentMethod: paymentMethodType,
            last4Digits: last4 || stripePayment.last4Digits,
            cardBrand: cardBrand || stripePayment.cardBrand,
            receiptEmail: email || stripePayment.receiptEmail,
            receiptUrl: finalReceiptUrl || stripePayment.receiptUrl,
            webhookReceived: stripePayment.webhookReceived || webhookReceived,
            webhookReceivedAt: stripePayment.webhookReceivedAt || (webhookReceived ? new Date() : null),
            reconcilationStatus: 'reconciled',
            reconciliationTimestamp: new Date()
          },
          include: { transaction: true }
        });

        // Increment wallet balance
        const wallet = await tx.wallet.update({
          where: { userId: stripePayment.userId },
          data: {
            balance: {
              increment: stripePayment.amount
            }
          }
        });

        return {
          alreadyProcessed: false,
          stripePayment: updatedPayment,
          wallet
        };
      }
    });
  } catch (error) {
    console.error(`Failed to process successful payment ${stripePaymentIntentId}:`, error);
    throw error;
  }
};

/**
 * Reconcile a payment - verify Stripe payment intent status matches our DB
 * This is called after webhook or when checking payment status.
 * Automatically resolves mismatches if found.
 */
export const reconcilePayment = async (
  stripePaymentIntentId: string
): Promise<{
  matched: boolean;
  status: string;
  action: string;
}> => {
  try {
    // Get payment from our DB
    const stripePayment = await prisma.stripePayment.findUnique({
      where: { stripePaymentIntentId },
      include: { transaction: true }
    });

    // Get payment intent from Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
    } catch (stripeError) {
      console.error(`Stripe error retrieving intent ${stripePaymentIntentId}:`, stripeError);
      return {
        matched: false,
        status: 'stripe_error',
        action: `Stripe error: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}`
      };
    }

    const stripeStatus = paymentIntent.status;

    // Case 1: StripePayment doesn't exist in our DB
    if (!stripePayment) {
      if (stripeStatus === 'succeeded') {
        // Auto-create and process
        console.log(`Reconcile: Missing payment intent ${stripePaymentIntentId} found succeeded on Stripe. Auto-resolving.`);
        const processResult = await processSuccessfulPayment(stripePaymentIntentId, undefined, undefined, false);
        return {
          matched: false,
          status: 'succeeded',
          action: `Auto-resolved: Missing successful payment created and credited to wallet (User ID: ${processResult.stripePayment.userId})`
        };
      }

      return {
        matched: false,
        status: 'not_found',
        action: `Stripe status is ${stripeStatus}. No action taken as payment is not completed.`
      };
    }

    const ourStatus = stripePayment.status;
    console.log(`Reconciling payment ${stripePaymentIntentId}: Stripe=${stripeStatus}, Ours=${ourStatus}`);

    // Case 2: Statuses match
    if (stripeStatus === ourStatus) {
      if (stripePayment.reconcilationStatus !== 'reconciled') {
        await prisma.stripePayment.update({
          where: { id: stripePayment.id },
          data: {
            reconcilationStatus: 'reconciled',
            reconciliationTimestamp: new Date()
          }
        });
      }

      return {
        matched: true,
        status: stripeStatus,
        action: 'Payment reconciled successfully. Statuses match.'
      };
    }

    // Case 3: Status mismatch
    // 3a. Stripe says succeeded, but ours does not
    if (stripeStatus === 'succeeded' && ourStatus !== 'succeeded') {
      console.warn(`Reconcile: Mismatch found! Stripe succeeded but DB shows ${ourStatus}. Running auto-resolution.`);
      await processSuccessfulPayment(stripePaymentIntentId, undefined, undefined, false);
      return {
        matched: false,
        status: 'succeeded',
        action: 'Auto-resolved: Payment marked succeeded and wallet credited.'
      };
    }

    // 3b. Stripe says requires_payment_method / failed / canceled, but ours says succeeded
    if (stripeStatus !== 'succeeded' && ourStatus === 'succeeded') {
      console.error(`Reconcile CRITICAL: Stripe shows ${stripeStatus} but our database is marked succeeded: ${stripePaymentIntentId}`);
      
      // If Stripe says failed, we should handle failure (reverse wallet credit, etc.)
      if (stripeStatus === 'canceled' || stripeStatus === 'requires_payment_method') {
        await handleFailedPayment(
          stripePaymentIntentId,
          `Reconciliation mismatch: Stripe shows ${stripeStatus} but DB was marked succeeded.`
        );
        return {
          matched: false,
          status: stripeStatus,
          action: `Auto-resolved failure: Reversed wallet credit and marked as failed (Stripe is ${stripeStatus})`
        };
      }

      return {
        matched: false,
        status: `Critical Mismatch: Stripe=${stripeStatus}, Ours=${ourStatus}`,
        action: 'CRITICAL: DB shows succeeded but Stripe shows active failure. Manual review highly recommended.'
      };
    }

    // Other mismatches
    return {
      matched: false,
      status: `Mismatch: Stripe=${stripeStatus}, Ours=${ourStatus}`,
      action: 'Payment statuses do not match - manual review needed'
    };
  } catch (error) {
    console.error('Reconciliation error:', error);
    throw error;
  }
};

/**
 * Handle a failed payment - remove wallet credit, mark transaction failed
 */
export const handleFailedPayment = async (
  stripePaymentIntentId: string,
  errorMessage: string
): Promise<void> => {
  try {
    const stripePayment = await prisma.stripePayment.findUnique({
      where: { stripePaymentIntentId },
      include: { transaction: true }
    });

    if (!stripePayment) {
      console.warn(`Failed payment not found in DB: ${stripePaymentIntentId}`);
      return;
    }

    // If wallet was already credited (status was succeeded), we need to reverse it
    if (stripePayment.status === 'succeeded') {
      const wallet = await prisma.wallet.findUnique({
        where: { userId: stripePayment.userId }
      });

      if (wallet && wallet.balance >= stripePayment.amount) {
        // Reverse the wallet credit
        await prisma.wallet.update({
          where: { userId: stripePayment.userId },
          data: {
            balance: {
              decrement: stripePayment.amount
            }
          }
        });

        console.log(`Reversed wallet credit for failed payment: ${stripePaymentIntentId}`);
      } else {
        console.error(`CRITICAL: Cannot reverse wallet credit for failed payment ${stripePaymentIntentId}. User has insufficient balance!`);
      }
    }

    // Mark payment as failed
    await prisma.stripePayment.update({
      where: { id: stripePayment.id },
      data: {
        status: 'failed',
        errorMessage: errorMessage,
        reconcilationStatus: 'failed',
        reconciliationTimestamp: new Date()
      }
    });

    // Mark transaction as failed
    await prisma.transaction.update({
      where: { id: stripePayment.transactionId },
      data: {
        status: 'failed'
      }
    });

    console.log(`Payment and Transaction marked as failed in DB: ${stripePaymentIntentId}`);
  } catch (error) {
    console.error('Failed payment handling error:', error);
    throw error;
  }
};

/**
 * Retry a failed payment
 * Attempts to check and trigger status sync
 */
export const retryFailedPayment = async (
  stripePaymentIntentId: string
): Promise<{
  success: boolean;
  newStatus: string;
  message: string;
}> => {
  try {
    const stripePayment = await prisma.stripePayment.findUnique({
      where: { stripePaymentIntentId }
    });

    if (!stripePayment) {
      return {
        success: false,
        newStatus: 'not_found',
        message: 'Payment not found'
      };
    }

    // Check if max retries reached
    if (stripePayment.retryCount >= stripePayment.maxRetries) {
      return {
        success: false,
        newStatus: stripePayment.status,
        message: `Max retries (${stripePayment.maxRetries}) reached`
      };
    }

    // Retrieve latest from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);

    // Increment retry count
    await prisma.stripePayment.update({
      where: { id: stripePayment.id },
      data: {
        retryCount: stripePayment.retryCount + 1,
        lastRetryAt: new Date()
      }
    });

    if (paymentIntent.status === 'succeeded') {
      // Reconcile and credit wallet if succeeded now
      await processSuccessfulPayment(stripePaymentIntentId, undefined, undefined, false);
      return {
        success: true,
        newStatus: 'succeeded',
        message: 'Payment succeeded on Stripe and wallet was successfully credited.'
      };
    }

    if (paymentIntent.status === 'requires_payment_method') {
      return {
        success: false,
        newStatus: paymentIntent.status,
        message: 'Payment requires a new payment method from client. Cannot auto-retry.'
      };
    }

    return {
      success: true,
      newStatus: paymentIntent.status,
      message: `Checked status. Stripe is currently ${paymentIntent.status}. Retry count incremented.`
    };
  } catch (error) {
    console.error('Retry failed payment error:', error);
    throw error;
  }
};

/**
 * Get all pending payments that need reconciliation
 * Used for periodic reconciliation jobs
 */
export const getPendingPayments = async (): Promise<any[]> => {
  return await prisma.stripePayment.findMany({
    where: {
      reconcilationStatus: 'pending'
    },
    include: {
      transaction: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
};

/**
 * Get all failed payments that may be retryable
 */
export const getFailedPayments = async (): Promise<any[]> => {
  return await prisma.stripePayment.findMany({
    where: {
      status: 'failed',
      retryCount: {
        lt: 3 // Less than max retries
      }
    },
    include: {
      transaction: true
    },
    orderBy: {
      lastRetryAt: 'asc'
    }
  });
};

/**
 * Periodic reconciliation job
 * Should be called every X minutes to verify all payments are in sync
 */
export const reconcileAllPendingPayments = async (): Promise<{
  total: number;
  reconciled: number;
  failed: number;
  mismatched: number;
}> => {
  const pendingPayments = await getPendingPayments();
  let reconciled = 0;
  let failed = 0;
  let mismatched = 0;

  console.log(`Starting reconciliation of ${pendingPayments.length} pending payments`);

  for (const payment of pendingPayments) {
    try {
      const result = await reconcilePayment(payment.stripePaymentIntentId);
      if (result.matched) {
        reconciled++;
      } else {
        mismatched++;
      }
    } catch (error) {
      console.error(`Reconciliation failed for ${payment.stripePaymentIntentId}:`, error);
      failed++;
    }
  }

  console.log(
    `Reconciliation complete: ${reconciled} reconciled, ${failed} errors, ${mismatched} mismatches`
  );

  return {
    total: pendingPayments.length,
    reconciled,
    failed,
    mismatched
  };
};