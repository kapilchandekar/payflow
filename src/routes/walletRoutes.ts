import { Router } from 'express';

import { authMiddleware } from '../middleware/authMiddleware';
import { zodValidate } from '../middleware/zodValidate';
import { depositSchema, withdrawSchema } from '../schemas/walletSchemas';
import { depositMoney, getWalletBalance, getWalletDetails, getWalletTransactions, withdrawMoney } from '../controllers/walletController';
import { transactionLimiter } from '../middleware/rateLimiter';

const router = Router();

// All wallet routes require authentication
router.use(authMiddleware);

/**
 * GET /api/wallet
 * Get wallet details (balance + recent transactions)
 */
router.get('/', getWalletDetails);

/**
 * GET /api/wallet/balance
 * Get current wallet balance
 */
router.get('/balance', getWalletBalance);

/**
 * POST /api/wallet/deposit
// Add money to wallet
// POST /api/wallet/deposit
// Body: { amount }
router.post('/deposit', transactionLimiter, authMiddleware, zodValidate(depositSchema), depositMoney);

// Withdraw money from wallet
// POST /api/wallet/withdraw
// Body: { amount }
router.post('/withdraw', transactionLimiter, authMiddleware, zodValidate(withdrawSchema), withdrawMoney);


/**
 * GET /api/wallet/transactions?limit=10&offset=0
 * Get wallet transaction history
 * Query params: limit (default 10), offset (default 0)
 */
router.get('/transactions', getWalletTransactions);

export default router;