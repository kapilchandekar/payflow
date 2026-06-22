import { Router } from 'express';
import { 
  transferMoney, 
  getTransferHistory,
  getTransferDetails 
} from '../controllers/transferController';
import { authMiddleware } from '../middleware/authMiddleware';
import { zodValidate } from '../middleware/zodValidate';
import { transferSchema } from '../schemas/transferSchemas';
import { transactionLimiter } from '../middleware/rateLimiter';

const router = Router();

// All transfer routes require authentication
router.use(authMiddleware);

/**
 * POST /api/transfer/send
 * Transfer money to another user
 * Body: { toEmail, amount, description?, idempotencyKey? }
 */
router.post('/send', transactionLimiter, zodValidate(transferSchema), transferMoney);

/**
 * GET /api/transfer/history?limit=10&offset=0
 * Get transfer history (sent and received)
 * Query params: limit (default 10), offset (default 0)
 */
router.get('/history', getTransferHistory);

/**
 * GET /api/transfer/:transactionId
 * Get details of a specific transfer
 */
router.get('/:transactionId', getTransferDetails);

export default router;