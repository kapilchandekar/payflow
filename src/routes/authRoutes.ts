import { Router } from 'express';
import { 
  registerUser, 
  loginUser, 
  getUserProfile,
  verifyEmail,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout
} from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiter';
import { zodValidate } from '../middleware/zodValidate';
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '../schemas/authSchemas';

const router = Router();

// Public routes
router.post('/register', authLimiter, zodValidate(registerSchema), registerUser);
router.post('/login', authLimiter, zodValidate(loginSchema), loginUser);
router.get('/verify-email', verifyEmail);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', authLimiter, zodValidate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, zodValidate(resetPasswordSchema), resetPassword);

// Protected routes (require valid JWT token)
router.get('/profile', authMiddleware, getUserProfile);
router.post('/logout', authMiddleware, logout);

export default router;