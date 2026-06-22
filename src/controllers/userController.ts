import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';
import {
  validateEmail,
  validatePassword,
  validateName,
  validateRequiredFields
} from '../services/validationService';
import { BadRequestError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { 
  sendWelcomeEmail, 
  sendLoginAlertEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
} from '../services/emailService';
import { 
  generateEmailVerificationToken, 
  generateRefreshToken, 
  generatePasswordResetToken,
  verifyToken
} from '../utils/auth';

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { email, password, firstName, lastName }
 */
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    const requiredValidation = validateRequiredFields(
      { email, password },
      ['email', 'password']
    );

    if (!requiredValidation.valid) {
      throw new ValidationError('Missing required fields', {
        missingFields: requiredValidation.missingFields
      });
    }

    // Validate email
    if (!validateEmail(email)) {
      throw new BadRequestError('Invalid email format');
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new ValidationError('Password does not meet requirements', {
        passwordErrors: passwordValidation.errors
      });
    }

    // Validate names (if provided)
    if (firstName) {
      const firstNameValidation = validateName(firstName);
      if (!firstNameValidation.valid) {
        throw new BadRequestError(`First name: ${firstNameValidation.error}`);
      }
    }

    if (lastName) {
      const lastNameValidation = validateName(lastName);
      if (!lastNameValidation.valid) {
        throw new BadRequestError(`Last name: ${lastNameValidation.error}`);
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        isVerified: false,
        wallet: {
          create: {
            balance: 0
          }
        }
      },
      include: {
        wallet: true
      }
    });

    // Generate Verification Token
    const verifyToken = generateEmailVerificationToken(user.email);
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyLink = `${FRONTEND_URL}/verify-email?token=${verifyToken}`;

    // Send verification email
    sendVerificationEmail(user.email, user.firstName || 'User', verifyLink).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    // Generate JWT token (for immediate use if we don't strictly enforce verification)
    const token = generateToken(user.id, user.email);

    // Return user data (without password)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        wallet: user.wallet
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 * Body: { email, password }
 */
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    const requiredValidation = validateRequiredFields(
      { email, password },
      ['email', 'password']
    );

    if (!requiredValidation.valid) {
      throw new ValidationError('Missing required fields', {
        missingFields: requiredValidation.missingFields
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      throw new BadRequestError('Invalid email format');
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: true }
    });

    if (!user) {
      throw new BadRequestError('Invalid email or password');
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in.' });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestError('Invalid email or password');
    }

    // Generate tokens
    const token = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Set HttpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Send login alert email (fire and forget)
    sendLoginAlertEmail(
      user.email, 
      user.firstName || 'User', 
      new Date().toLocaleString(), 
      req.ip
    ).catch(err => {
      console.error('Failed to send login alert email:', err);
    });

    // Return user data (without password)
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        wallet: user.wallet
      },
      token,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });

    if (!user) {
      throw new NotFoundError ('User not found');
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        wallet: user.wallet,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Email
 * GET /api/auth/verify-email?token=xxx
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw new BadRequestError('Verification token is required');
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'verify') {
      throw new BadRequestError('Invalid or expired verification token');
    }

    const user = await prisma.user.findUnique({
      where: { email: decoded.email }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isVerified) {
      return res.status(200).json({ message: 'Email already verified' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true }
    });

    // Send welcome email now that they are verified
    sendWelcomeEmail(user.email, user.firstName || 'User').catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Token
 * POST /api/auth/refresh-token
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get refresh token from cookie or body
    const rfToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!rfToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    const decoded = verifyToken(rfToken);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.isBlocked) {
      return res.status(401).json({ error: 'User not found or blocked' });
    }

    const newToken = generateToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id);

    // Set HttpOnly cookie for new refresh token
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      message: 'Token refreshed successfully',
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      throw new BadRequestError('Valid email is required');
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Return 200 anyway to prevent email enumeration
      return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = generatePasswordResetToken(user.id);
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, user.firstName || 'User', resetLink);

    res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new BadRequestError('Token and new password are required');
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new ValidationError('Password does not meet requirements', {
        passwordErrors: passwordValidation.errors
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'reset') {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword }
    });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};