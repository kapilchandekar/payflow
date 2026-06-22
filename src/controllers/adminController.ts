import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { validatePagination } from '../services/validationService';
import { logAdminAction } from '../services/auditLogService';

/**
 * Get dashboard statistics
 * GET /api/admin/stats
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user count
    const userCount = await prisma.user.count();

    // Get admin count
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    });

    // Get wallet stats
    const walletStats = await prisma.wallet.aggregate({
      _sum: { balance: true },
      _avg: { balance: true },
      _count: true
    });

    // Get transaction stats
    const transactionStats = await prisma.transaction.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: 'completed' }
    });

    // Get payment stats
    const paymentStats = await prisma.stripePayment.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: 'succeeded' }
    });

    // Get failed payments count
    const failedPaymentsCount = await prisma.stripePayment.count({
      where: { status: 'failed' }
    });

    // Get pending reconciliation count
    const pendingReconciliationCount = await prisma.stripePayment.count({
      where: { reconcilationStatus: 'pending' }
    });

    res.status(200).json({
      message: 'Dashboard statistics retrieved',
      stats: {
        users: {
          total: userCount,
          admins: adminCount,
          regularUsers: userCount - adminCount
        },
        wallets: {
          totalWallets: walletStats._count,
          totalBalance: walletStats._sum.balance?.toString() || '0',
          averageBalance: walletStats._avg.balance?.toString() || '0'
        },
        transactions: {
          total: transactionStats._count,
          totalAmount: transactionStats._sum.amount?.toString() || '0'
        },
        payments: {
          successful: paymentStats._count,
          totalAmount: paymentStats._sum.amount?.toString() || '0',
          failed: failedPaymentsCount,
          pendingReconciliation: pendingReconciliationCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payments with filters
 * GET /api/admin/payments?status=succeeded&limit=20&offset=0
 */
export const getAllPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;

    // Validation
    const pagination = validatePagination(req.query.limit, req.query.offset);
    if (!pagination.valid) {
      throw new BadRequestError(pagination.error || 'Invalid pagination parameters');
    }
    const { limit, offset } = pagination;

    // Build filter
    const where: any = {};
    if (status) {
      where.status = status;
    }

    // Get payments
    const payments = await prisma.stripePayment.findMany({
      where,
      include: {
        transaction: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Get total count
    const totalCount = await prisma.stripePayment.count({ where });

    res.status(200).json({
      message: 'All payments retrieved',
      payments: payments.map(p => ({
        id: p.id,
        userId: p.userId,
        amount: p.amount.toString(),
        status: p.status,
        cardBrand: p.cardBrand,
        last4: p.last4Digits,
        reconcilationStatus: p.reconcilationStatus,
        webhookReceived: p.webhookReceived,
        createdAt: p.createdAt
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
 * Get failed payments
 * GET /api/admin/payments/failed?limit=20&offset=0
 */
export const getFailedPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validation
    const pagination = validatePagination(req.query.limit, req.query.offset);
    if (!pagination.valid) {
      throw new BadRequestError(pagination.error || 'Invalid pagination parameters');
    }
    const { limit, offset } = pagination;

    const failedPayments = await prisma.stripePayment.findMany({
      where: { status: 'failed' },
      include: {
        transaction: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.stripePayment.count({
      where: { status: 'failed' }
    });

    res.status(200).json({
      message: 'Failed payments retrieved',
      failedPayments: failedPayments.map(p => ({
        id: p.id,
        userId: p.userId,
        amount: p.amount.toString(),
        status: p.status,
        errorMessage: p.errorMessage,
        retryCount: p.retryCount,
        lastRetryAt: p.lastRetryAt,
        createdAt: p.createdAt
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
 * Get pending reconciliation payments
 * GET /api/admin/payments/pending-reconciliation?limit=20&offset=0
 */
export const getPendingReconciliationPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validation
    const pagination = validatePagination(req.query.limit, req.query.offset);
    if (!pagination.valid) {
      throw new BadRequestError(pagination.error || 'Invalid pagination parameters');
    }
    const { limit, offset } = pagination;

    const pendingPayments = await prisma.stripePayment.findMany({
      where: { reconcilationStatus: 'pending' },
      include: {
        transaction: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.stripePayment.count({
      where: { reconcilationStatus: 'pending' }
    });

    res.status(200).json({
      message: 'Pending reconciliation payments retrieved',
      pendingPayments: pendingPayments.map(p => ({
        id: p.id,
        userId: p.userId,
        amount: p.amount.toString(),
        status: p.status,
        webhookReceived: p.webhookReceived,
        webhookReceivedAt: p.webhookReceivedAt,
        createdAt: p.createdAt,
        ageMinutes: Math.floor(
          (Date.now() - new Date(p.createdAt).getTime()) / 60000
        )
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
 * Get payment details
 * GET /api/admin/payments/:paymentId
 */
export const getPaymentDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;

    const parsedPaymentId = parseInt(paymentId);
    if (isNaN(parsedPaymentId) || parsedPaymentId <= 0) {
      throw new BadRequestError('Invalid payment ID');
    }

    const payment = await prisma.stripePayment.findUnique({
      where: { id: parsedPaymentId },
      include: {
        transaction: {
          include: {
            fromUser: {
              select: { email: true, firstName: true, lastName: true }
            },
            toUser: {
              select: { email: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    res.status(200).json({
      message: 'Payment details retrieved',
      payment: {
        id: payment.id,
        userId: payment.userId,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        amount: payment.amount.toString(),
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        card: `${payment.cardBrand} ****${payment.last4Digits}`,
        receiptEmail: payment.receiptEmail,
        receiptUrl: payment.receiptUrl,
        errorMessage: payment.errorMessage,
        webhookReceived: payment.webhookReceived,
        webhookReceivedAt: payment.webhookReceivedAt,
        reconcilationStatus: payment.reconcilationStatus,
        reconciliationTimestamp: payment.reconciliationTimestamp,
        retryCount: payment.retryCount,
        lastRetryAt: payment.lastRetryAt,
        idempotencyKey: payment.idempotencyKey,
        transaction: {
          id: payment.transaction.id,
          type: payment.transaction.transactionType,
          status: payment.transaction.status,
          description: payment.transaction.description,
          fromUser: payment.transaction.fromUser
            ? `${payment.transaction.fromUser.firstName} ${payment.transaction.fromUser.lastName} (${payment.transaction.fromUser.email})`
            : 'System',
          toUser: payment.transaction.toUser
            ? `${payment.transaction.toUser.firstName} ${payment.transaction.toUser.lastName} (${payment.transaction.toUser.email})`
            : 'System'
        },
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user details with all transactions
 * GET /api/admin/users/:userId
 */
export const getUserDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      throw new BadRequestError('Invalid user ID');
    }

    const user = await prisma.user.findUnique({
      where: { id: parsedUserId },
      include: {
        wallet: true,
        sentTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        receivedTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get payment history
    const payments = await prisma.stripePayment.findMany({
      where: { userId: parsedUserId },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      message: 'User details retrieved',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        wallet: {
          id: user.wallet?.id,
          balance: user.wallet?.balance.toString() || '0'
        },
        transactions: {
          sent: user.sentTransactions.length,
          received: user.receivedTransactions.length
        },
        payments: {
          total: payments.length,
          succeeded: payments.filter(p => p.status === 'succeeded').length,
          failed: payments.filter(p => p.status === 'failed').length
        },
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users
 * GET /api/admin/users?limit=20&offset=0
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validation
    const pagination = validatePagination(req.query.limit, req.query.offset);
    if (!pagination.valid) {
      throw new BadRequestError(pagination.error || 'Invalid pagination parameters');
    }
    const { limit, offset } = pagination;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        wallet: {
          select: { balance: true }
        },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.user.count();

    res.status(200).json({
      message: 'All users retrieved',
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        balance: u.wallet?.balance.toString() || '0',
        createdAt: u.createdAt
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
 * Health check endpoint
 * GET /api/admin/health
 */
export const getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check database connection
    const userCount = await prisma.user.count();
    
    // Get recent errors (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedPaymentsLast24h = await prisma.stripePayment.count({
      where: {
        status: 'failed',
        createdAt: { gte: twentyFourHoursAgo }
      }
    });

    res.status(200).json({
      message: 'System health check',
      status: 'healthy',
      database: {
        status: 'connected',
        users: userCount
      },
      lastPayments: {
        failedInLast24h: failedPaymentsLast24h
      },
      timestamp: new Date()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all pending withdrawals
 * GET /api/admin/withdrawals?limit=20&offset=0
 */
export const getPendingWithdrawals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const withdrawals = await prisma.transaction.findMany({
      where: {
        transactionType: 'withdrawal',
        status: 'pending'
      },
      include: {
        fromUser: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.transaction.count({
      where: {
        transactionType: 'withdrawal',
        status: 'pending'
      }
    });

    const formattedWithdrawals = withdrawals.map(w => ({
      id: w.id,
      fromEmail: w.fromUser?.email || 'Unknown',
      amount: w.amount.toString(),
      status: w.status,
      transactionType: w.transactionType,
      description: w.description,
      createdAt: w.createdAt
    }));

    res.status(200).json({
      message: 'Pending withdrawals retrieved',
      withdrawals: formattedWithdrawals,
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
 * Block a user
 * PATCH /api/admin/users/:userId/block
 */
export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { userId } = req.params;

    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isBlocked: true }
    });

    // Log the action
    await logAdminAction(adminId, 'BLOCK_USER', 'USER', user.id, { isBlocked: false }, { isBlocked: true }, req.ip);

    res.status(200).json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Unblock a user
 * PATCH /api/admin/users/:userId/unblock
 */
export const unblockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { userId } = req.params;

    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { isBlocked: false }
    });

    // Log the action
    await logAdminAction(adminId, 'UNBLOCK_USER', 'USER', user.id, { isBlocked: true }, { isBlocked: false }, req.ip);

    res.status(200).json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Freeze/Unfreeze a wallet
 * PATCH /api/admin/wallets/:walletId/freeze
 * Body: { freeze: boolean }
 */
export const freezeWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).userId;
    const { walletId } = req.params;
    const { freeze } = req.body;

    const wallet = await prisma.wallet.findUnique({ where: { id: parseInt(walletId) }});
    if (!wallet) throw new NotFoundError('Wallet not found');

    const updatedWallet = await prisma.wallet.update({
      where: { id: parseInt(walletId) },
      data: { isFrozen: freeze }
    });

    // Log the action
    await logAdminAction(adminId, freeze ? 'FREEZE_WALLET' : 'UNFREEZE_WALLET', 'WALLET', updatedWallet.id, { isFrozen: wallet.isFrozen }, { isFrozen: freeze }, req.ip);

    res.status(200).json({ success: true, message: `Wallet ${freeze ? 'frozen' : 'unfrozen'} successfully` });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit logs
 * GET /api/admin/audit
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        actor: { select: { email: true, firstName: true } }
      }
    });

    const totalCount = await prisma.auditLog.count();

    res.status(200).json({
      success: true,
      data: logs,
      meta: { limit, offset, total: totalCount }
    });
  } catch (error) {
    next(error);
  }
};