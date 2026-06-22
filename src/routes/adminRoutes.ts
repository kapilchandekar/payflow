import { Router } from 'express';
import {
  getDashboardStats,
  getAllPayments,
  getFailedPayments,
  getPendingReconciliationPayments,
  getPaymentDetails,
  getUserDetails,
  getAllUsers,
  getSystemHealth,
  getPendingWithdrawals,
  blockUser,
  unblockUser,
  freezeWallet,
  getAuditLogs
} from '../controllers/adminController';
import { approveWithdrawal, rejectWithdrawal } from '../controllers/walletController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', getDashboardStats);

/**
 * GET /api/admin/health
 * Get system health status
 */
router.get('/health', getSystemHealth);

/**
 * GET /api/admin/payments?status=succeeded&limit=20&offset=0
 * Get all payments with optional filters
 */
router.get('/payments', getAllPayments);

/**
 * GET /api/admin/payments/failed?limit=20&offset=0
 * Get failed payments
 */
router.get('/payments/failed', getFailedPayments);

/**
 * GET /api/admin/payments/pending-reconciliation?limit=20&offset=0
 * Get pending reconciliation payments
 */
router.get('/payments/pending-reconciliation', getPendingReconciliationPayments);

/**
 * GET /api/admin/payments/:paymentId
 * Get payment details
 */
router.get('/payments/:paymentId', getPaymentDetails);

/**
 * GET /api/admin/users?limit=20&offset=0
 * Get all users
 */
router.get('/users', getAllUsers);

/**
 * GET /api/admin/users/:userId
 * Get user details with transactions
 */
router.get('/users/:userId', getUserDetails);

/**
 * GET /api/admin/withdrawals
 * Get all withdrawals
 */
router.get('/withdrawals', getPendingWithdrawals);

/**
 * POST /api/admin/withdrawals/approve
 * Approve a pending withdrawal
 */
router.post('/withdrawals/approve', approveWithdrawal);

/**
 * POST /api/admin/withdrawals/reject
 * Reject a pending withdrawal
 */
router.post('/withdrawals/reject', rejectWithdrawal);

/**
 * PATCH /api/admin/users/:userId/block
 * Block a user
 */
router.patch('/users/:userId/block', blockUser);

/**
 * PATCH /api/admin/users/:userId/unblock
 * Unblock a user
 */
router.patch('/users/:userId/unblock', unblockUser);

/**
 * PATCH /api/admin/wallets/:walletId/freeze
 * Freeze/Unfreeze a wallet
 */
router.patch('/wallets/:walletId/freeze', freezeWallet);

/**
 * GET /api/admin/audit
 * Get audit logs
 */
router.get('/audit', getAuditLogs);

export default router;