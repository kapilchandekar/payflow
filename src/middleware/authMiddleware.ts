import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { UnauthorizedError } from '../utils/errors';

/**
 * Middleware to verify JWT token from Authorization header
 * Adds userId to request object if token is valid
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Authorization token missing'));
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }

    // Add userId to request object for use in route handlers
    (req as any).userId = decoded.userId;
    (req as any).email = decoded.email;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(new UnauthorizedError('Token verification failed'));
  }
};