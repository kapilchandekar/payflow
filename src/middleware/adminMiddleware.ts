import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

/**
 * Middleware to verify user is an admin
 * Must be used after authMiddleware
 */
export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get user and check role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      error: 'Authorization check failed'
    });
  }
};