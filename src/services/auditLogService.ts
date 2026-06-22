import prisma from '../config/database';

export const logAdminAction = async (
  actorId: number,
  action: string,
  targetType: string,
  targetId: number,
  beforeState?: any,
  afterState?: any,
  ipAddress?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        beforeState: beforeState || undefined,
        afterState: afterState || undefined,
        ipAddress,
      }
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};
