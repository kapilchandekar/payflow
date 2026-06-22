import prisma from '../config/database';
import { notificationsQueue } from '../config/bullmq';
import { emitToUser } from './socket';

export const createNotification = async (
  userId: number,
  type: string,
  title: string,
  body: string,
  metadata?: any,
  sendEmailAddress?: string
) => {
  try {
    // 1. Save to database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        metadata: metadata || undefined,
      }
    });

    // 2. Emit WebSocket event for real-time update
    emitToUser(userId, 'notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.body,
      metadata: metadata,
      createdAt: notification.createdAt
    });

    // 3. Queue email if requested
    if (sendEmailAddress) {
      await notificationsQueue.add('send-email', {
        userId,
        type,
        title,
        body,
        emailAddress: sendEmailAddress
      });
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};
