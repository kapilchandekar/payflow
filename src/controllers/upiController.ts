import { Request, Response } from 'express';
import crypto from 'crypto';
import razorpayInstance from '../config/razorpay';
import prisma from '../config/database';
import { BadRequestError } from '../utils/errors';
import { validateAmount } from '../services/validationService';
import { sendDepositConfirmationEmail } from '../services/emailService';

/**
 * Create UPI payment order
 */
export const createUpiOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { amount, description } = req.body;

    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      throw new BadRequestError(amountValidation.error || 'Invalid amount');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new BadRequestError('User not found');
    }

    const order = await razorpayInstance.orders.create({
      amount: Math.round(amountValidation.value! * 100),
      currency: 'INR',
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        userEmail: user.email,
        description: description || `PayFlow Wallet Deposit`
      }
    });

    const upiPayment = await prisma.upiPayment.create({
      data: {
        userId,
        razorpayOrderId: (order as any).id,
        amount: amountValidation.value!,
        currency: 'INR',
        status: 'created',
        description: description || 'Wallet Deposit'
      }
    });

    res.status(201).json({
      message: 'UPI order created',
      order: {
        id: (order as any).id,
        amount: amountValidation.value,
        currency: 'INR',
        upiPaymentId: upiPayment.id
      }
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Verify UPI payment
 */
export const verifyUpiPayment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestError('Missing payment details');
    }

    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new BadRequestError('Invalid signature');
    }

    const payment = await razorpayInstance.payments.fetch(razorpayPaymentId);

    if (payment.status !== 'captured') {
      throw new BadRequestError('Payment not captured');
    }

    const upiPayment = await prisma.upiPayment.findUnique({
      where: { razorpayOrderId }
    });

    if (!upiPayment || upiPayment.userId !== userId) {
      throw new BadRequestError('Payment not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });

    if (!user || !user.wallet) {
      throw new BadRequestError('Wallet not found');
    }

    await prisma.upiPayment.update({
      where: { id: upiPayment.id },
      data: {
        status: 'completed',
        razorpayPaymentId,
        verifiedAt: new Date()
      }
    });

    const updatedWallet = await prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          increment: upiPayment.amount
        }
      }
    });

    const transaction = await prisma.transaction.create({
      data: {
        toUserId: userId,
        amount: upiPayment.amount,
        status: 'completed',
        transactionType: 'deposit',
        description: `UPI Deposit`
      }
    });

    await sendDepositConfirmationEmail(
      user.email,
      user.firstName || 'User',
      upiPayment.amount.toNumber(),
      updatedWallet.balance.toNumber()
    );

    res.status(200).json({
      message: 'Payment verified',
      payment: {
        id: upiPayment.id,
        amount: upiPayment.amount,
        status: 'completed',
        newBalance: updatedWallet.balance.toString()
      }
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get UPI history
 */
export const getUpiHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const payments = await prisma.upiPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.upiPayment.count({
      where: { userId }
    });

    res.status(200).json({
      message: 'UPI history retrieved',
      payments,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Webhook handler
 */
export const handleUpiWebhook = async (req: Request, res: Response) => {
  try {
    const { event, payload } = req.body;
    
    console.log(`Webhook: ${event}`);

    if (event === 'payment.authorized' || event === 'payment.captured') {
      const payment = payload.payment;
      const order = payload.order;

      const upiPayment = await prisma.upiPayment.findUnique({
        where: { razorpayOrderId: order.id }
      });

      if (upiPayment) {
        await prisma.upiPayment.update({
          where: { id: upiPayment.id },
          data: { status: 'completed', razorpayPaymentId: payment.id }
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ success: true });
  }
};
