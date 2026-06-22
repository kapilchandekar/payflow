import { Request, Response } from 'express';
import prisma from '../config/database';
import { emitToUser } from '../services/socket';

/**
 * Transfer money between users (P2P)
 * POST /api/transfer/send
 * Body: { toEmail, amount, description?, idempotencyKey? }
 */
export const transferMoney = async (req: Request, res: Response) => {
  try {
    const fromUserId = (req as any).userId;
    const fromEmail = (req as any).email;
    const { toEmail, amount, description, idempotencyKey } = req.body;

    // Validation
    if (!toEmail || !amount) {
      return res.status(400).json({
        error: 'toEmail and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    if (amount > 1000000) {
      return res.status(400).json({
        error: 'Amount cannot exceed 10,00,000'
      });
    }

    if (fromEmail === toEmail) {
      return res.status(400).json({
        error: 'Cannot transfer to yourself'
      });
    }

    // Check if idempotency key was already processed (prevent duplicate transfers)
    if (idempotencyKey) {
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          description: `${idempotencyKey}`,
          fromUserId: fromUserId
        }
      });

      if (existingTransaction) {
        return res.status(200).json({
          message: 'Transfer already processed',
          transaction: {
            id: existingTransaction.id,
            status: existingTransaction.status
          },
          isDuplicate: true
        });
      }
    }

    // Find recipient user
    const toUser = await prisma.user.findUnique({
      where: { email: toEmail }
    });

    if (!toUser) {
      return res.status(404).json({
        error: 'Recipient user not found'
      });
    }

    // Get sender's wallet
    const fromWallet = await prisma.wallet.findUnique({
      where: { userId: fromUserId }
    });

    if (!fromWallet) {
      return res.status(404).json({
        error: 'Sender wallet not found'
      });
    }

    // Check balance
    if (fromWallet.balance < amount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        currentBalance: fromWallet.balance.toString(),
        requestedAmount: amount.toString()
      });
    }

    // Get recipient's wallet
    const toWallet = await prisma.wallet.findUnique({
      where: { userId: toUser.id }
    });

    if (!toWallet) {
      return res.status(404).json({
        error: 'Recipient wallet not found'
      });
    }

    // Perform transfer using transaction (ACID compliance)
    // This ensures both operations succeed or both fail
    const transfer = await prisma.$transaction(async (tx: any) => {
      // Deduct from sender
      const updatedFromWallet = await tx.wallet.update({
        where: { userId: fromUserId },
        data: {
          balance: {
            decrement: amount
          }
        }
      });

      // Add to recipient
      const updatedToWallet = await tx.wallet.update({
        where: { userId: toUser.id },
        data: {
          balance: {
            increment: amount
          }
        }
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          fromUserId: fromUserId,
          toUserId: toUser.id,
          amount: amount,
          status: 'completed',
          transactionType: 'transfer',
          description: description || `Transfer from ${fromEmail} to ${toEmail}${idempotencyKey ? ` (ID: ${idempotencyKey})` : ''}`
        }
      });

      return {
        transaction,
        fromWallet: updatedFromWallet,
        toWallet: updatedToWallet
      };
    });

    res.status(200).json({
      message: 'Transfer successful',
      transfer: {
        id: transfer.transaction.id,
        from: fromEmail,
        to: toEmail,
        amount: transfer.transaction.amount.toString(),
        status: transfer.transaction.status,
        timestamp: transfer.transaction.createdAt,
        yourNewBalance: transfer.fromWallet.balance.toString()
      }
    });

    // Real-time notification to the receiver
    emitToUser(toUser.id, 'notification', {
      type: 'success',
      title: 'Money Received!',
      message: `${fromEmail} sent you ₹${amount}.`
    });
    
    emitToUser(toUser.id, 'balance_update', {
      balance: transfer.toWallet.balance.toString()
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      error: 'Failed to transfer money'
    });
  }
};

/**
 * Get transfer history (sent & received)
 * GET /api/transfer/history?limit=10&offset=0
 */
export const getTransferHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (limit > 100) {
      return res.status(400).json({
        error: 'Limit cannot exceed 100'
      });
    }

    // Get all transfers (sent and received)
    const transfers = await prisma.transaction.findMany({
      where: {
        transactionType: 'transfer',
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      select: {
        id: true,
        fromUserId: true,
        toUserId: true,
        amount: true,
        status: true,
        description: true,
        createdAt: true,
        fromUser: {
          select: { email: true }
        },
        toUser: {
          select: { email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.transaction.count({
      where: {
        transactionType: 'transfer',
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      }
    });

    // Format response
    const formattedTransfers = transfers.map((t: any) => ({
      id: t.id,
      from: t.fromUser?.email || 'Unknown',
      to: t.toUser?.email || 'Unknown',
      amount: t.amount.toString(),
      status: t.status,
      type: t.fromUserId === userId ? 'sent' : 'received',
      description: t.description,
      timestamp: t.createdAt
    }));

    res.status(200).json({
      message: 'Transfer history retrieved',
      transfers: formattedTransfers,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Transfer history error:', error);
    res.status(500).json({
      error: 'Failed to get transfer history'
    });
  }
};

/**
 * Get transfer details by ID
 * GET /api/transfer/:transactionId
 */
export const getTransferDetails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { transactionId } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(transactionId) },
      include: {
        fromUser: {
          select: { email: true, firstName: true, lastName: true }
        },
        toUser: {
          select: { email: true, firstName: true, lastName: true }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    // Verify user is part of this transaction
    if (transaction.fromUserId !== userId && transaction.toUserId !== userId) {
      return res.status(403).json({
        error: 'Unauthorized - not part of this transaction'
      });
    }

    res.status(200).json({
      message: 'Transaction details retrieved',
      transaction: {
        id: transaction.id,
        from: {
          email: transaction.fromUser?.email,
          name: `${transaction.fromUser?.firstName} ${transaction.fromUser?.lastName}`.trim()
        },
        to: {
          email: transaction.toUser?.email,
          name: `${transaction.toUser?.firstName} ${transaction.toUser?.lastName}`.trim()
        },
        amount: transaction.amount.toString(),
        status: transaction.status,
        type: transaction.transactionType,
        description: transaction.description,
        timestamp: transaction.createdAt
      }
    });
  } catch (error) {
    console.error('Transfer details error:', error);
    res.status(500).json({
      error: 'Failed to get transfer details'
    });
  }
};