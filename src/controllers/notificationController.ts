import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { BadRequestError } from '../utils/errors';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const total = await prisma.notification.count({ where: { userId } });

    res.status(200).json({
      success: true,
      data: notifications,
      meta: { limit, offset, total }
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    res.status(200).json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const notification = await prisma.notification.updateMany({
      where: { id: parseInt(id), userId },
      data: { isRead: true }
    });

    if (notification.count === 0) {
      throw new BadRequestError('Notification not found or access denied');
    }

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
