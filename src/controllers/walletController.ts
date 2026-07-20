import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendDepositConfirmationEmail, sendWithdrawalConfirmationEmail } from '../services/emailService';
import { emitToUser } from '../services/socket';

/**
 * Get user's wallet balance
 * GET /api/wallet/balance
 */
export const getWalletBalance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        balance: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    res.status(200).json({
      message: 'Wallet balance retrieved',
      wallet: {
        id: wallet.id,
        balance: wallet.balance.toString(),
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Failed to get wallet balance'
    });
  }
};

/**
 * Add money to wallet (Deposit)
 * POST /api/wallet/deposit
 * Body: { amount }
 */
export const depositMoney = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { amount } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    if (amount > 1000000) {
      return res.status(400).json({
        error: 'Amount cannot exceed 10,00,000'
      });
    }

    const walletCheck = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!walletCheck) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    if (walletCheck.isFrozen) {
      return res.status(400).json({
        error: 'Your wallet is frozen. Deposits are disabled.'
      });
    }

    // Update wallet balance
    const wallet = await prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          increment: amount
        }
      },
      include: {
        user: true
      }
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        toUserId: userId,
        amount: amount,
        status: 'completed',
        transactionType: 'deposit',
        description: 'Money deposited to wallet'
      }
    });

    // Send deposit email asynchronously
    if (wallet.user && wallet.user.email) {
      sendDepositConfirmationEmail(
        wallet.user.email,
        wallet.user.firstName || 'User',
        amount,
        wallet.balance.toNumber()
      ).catch(console.error);
    }

    res.status(200).json({
      message: 'Money deposited successfully',
      wallet: {
        balance: wallet.balance.toString()
      }
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      error: 'Failed to deposit money'
    });
  }
};

/**
 * Withdraw money from wallet
 * POST /api/wallet/withdraw
 * Body: { amount }
 */
export const withdrawMoney = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { amount } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    // Check current balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true, isFrozen: true }
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    if (wallet.isFrozen) {
      return res.status(400).json({
        error: 'Your wallet is frozen. Withdrawals are disabled.'
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        currentBalance: wallet.balance.toString(),
        requestedAmount: amount.toString()
      });
    }

    // Update wallet balance
    const updatedWallet = await prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          decrement: amount
        }
      },
      include: {
        user: true
      }
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        fromUserId: userId,
        amount: amount,
        status: 'pending',
        transactionType: 'withdrawal',
        description: 'Withdrawal to bank account (Pending)'
      }
    });

    // Send withdrawal email asynchronously
    if (updatedWallet.user && updatedWallet.user.email) {
      sendWithdrawalConfirmationEmail(
        updatedWallet.user.email,
        updatedWallet.user.firstName || 'User',
        amount,
        updatedWallet.balance.toNumber()
      ).catch(console.error);
    }

    res.status(200).json({
      message: 'Money withdrawn successfully',
      wallet: {
        balance: updatedWallet.balance.toString()
      }
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({
      error: 'Failed to withdraw money'
    });
  }
};

/**
 * Get wallet transaction history
 * GET /api/wallet/transactions?limit=10&offset=0
 */
export const getWalletTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validation
    if (limit > 100) {
      return res.status(400).json({
        error: 'Limit cannot exceed 100'
      });
    }

    // Get transactions where user is sender or receiver
    const transactions = await prisma.transaction.findMany({
      where: {
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
        transactionType: true,
        description: true,
        aiCategory: true,
        aiCategoryConf: true,
        aiTags: true,
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

    // Get total count
    const totalCount = await prisma.transaction.count({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      }
    });

    // Format response — determine sent vs received for transfers
    const formattedTransactions = transactions.map((t: any) => {
      let type = t.transactionType;
      
      // Map 'transfer' to 'sent' or 'received' based on which side the current user is on
      if (t.transactionType === 'transfer') {
        type = t.fromUserId === userId ? 'sent' : 'received';
      }

      return {
        id: t.id,
        fromEmail: t.fromUser?.email || 'System',
        toEmail: t.toUser?.email || 'System',
        amount: t.amount.toString(),
        status: t.status,
        type,
        description: t.description,
        aiCategory: t.aiCategory,
        aiCategoryConf: t.aiCategoryConf,
        aiTags: t.aiTags,
        createdAt: t.createdAt
      };
    });

    res.status(200).json({
      message: 'Transactions retrieved',
      transactions: formattedTransactions,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Failed to get transactions'
    });
  }
};

/**
 * Get wallet details (with balance and recent transactions)
 * GET /api/wallet
 */
export const getWalletDetails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Get recent transactions (last 5)
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        amount: true,
        status: true,
        transactionType: true,
        createdAt: true
      }
    });

    res.status(200).json({
      message: 'Wallet details retrieved',
      wallet: {
        id: wallet.id,
        balance: wallet.balance.toString(),
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get wallet details error:', error);
    res.status(500).json({
      error: 'Failed to get wallet details'
    });
  }
};

/**
 * Admin: Approve pending withdrawal
 * POST /api/wallet/admin/approve-withdrawal
 */
export const approveWithdrawal = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body;
    
    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction || transaction.transactionType !== 'withdrawal' || transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid or already processed withdrawal' });
    }

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'completed', description: 'Withdrawal to bank account (Completed)' }
    });

    if (transaction.fromUserId) {
      emitToUser(transaction.fromUserId, 'notification', {
        type: 'success',
        title: 'Withdrawal Approved',
        message: `Your withdrawal of ₹${transaction.amount} has been approved and sent to your bank.`
      });
      // The balance doesn't change here since it was deducted when requested, but we can emit update just in case
      const wallet = await prisma.wallet.findUnique({ where: { userId: transaction.fromUserId } });
      if (wallet) {
        emitToUser(transaction.fromUserId, 'balance_update', { balance: wallet.balance.toString() });
      }
    }

    res.json({ message: 'Withdrawal approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
};

/**
 * Admin: Reject pending withdrawal
 * POST /api/wallet/admin/reject-withdrawal
 */
export const rejectWithdrawal = async (req: Request, res: Response) => {
  try {
    const { transactionId, reason } = req.body;
    
    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction || transaction.transactionType !== 'withdrawal' || transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid or already processed withdrawal' });
    }

    if (!transaction.fromUserId) {
      return res.status(400).json({ error: 'Missing user ID on transaction' });
    }

    // Refund the user
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: transaction.fromUserId },
        data: { balance: { increment: transaction.amount } }
      }),
      prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'failed', description: `Withdrawal Rejected: ${reason || 'Admin rejected'}` }
      })
    ]);

    emitToUser(transaction.fromUserId, 'notification', {
      type: 'error',
      title: 'Withdrawal Rejected',
      message: `Your withdrawal of ₹${transaction.amount} was rejected. Funds have been refunded to your wallet.`
    });
    
    const wallet = await prisma.wallet.findUnique({ where: { userId: transaction.fromUserId } });
    if (wallet) {
      emitToUser(transaction.fromUserId, 'balance_update', { balance: wallet.balance.toString() });
    }

    res.json({ message: 'Withdrawal rejected and refunded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
};