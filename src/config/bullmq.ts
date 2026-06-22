import { Queue, DefaultJobOptions } from 'bullmq';
import { redisClient, redisAvailable } from './redis';

// Default options for all jobs
const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s
  },
  removeOnComplete: true,
  removeOnFail: false,
};

// Queues are created lazily — only used when redisAvailable is true
let _notificationsQueue: Queue | null = null;
let _aiCategorisationQueue: Queue | null = null;

export const getNotificationsQueue = (): Queue | null => {
  if (!redisAvailable) return null;
  if (!_notificationsQueue) {
    _notificationsQueue = new Queue('notifications', {
      connection: redisClient as any,
    });
  }
  return _notificationsQueue;
};

export const getAiCategorisationQueue = (): Queue | null => {
  if (!redisAvailable) return null;
  if (!_aiCategorisationQueue) {
    _aiCategorisationQueue = new Queue('ai-categorisation', {
      connection: redisClient as any,
      defaultJobOptions,
    });
  }
  return _aiCategorisationQueue;
};

// Keep legacy named exports for backward compatibility (may be null if Redis is down)
export const notificationsQueue = {
  add: async (...args: Parameters<Queue['add']>) => {
    const q = getNotificationsQueue();
    if (!q) {
      console.warn('[BullMQ] Redis unavailable — skipping notification queue job');
      return null;
    }
    return q.add(...args);
  }
} as unknown as Queue;

export const aiCategorisationQueue = {
  add: async (...args: Parameters<Queue['add']>) => {
    const q = getAiCategorisationQueue();
    if (!q) {
      console.warn('[BullMQ] Redis unavailable — skipping AI categorisation queue job');
      return null;
    }
    return q.add(...args);
  }
} as unknown as Queue;

// Helper function to gracefully shutdown queues
export const closeQueues = async () => {
  if (_aiCategorisationQueue) await _aiCategorisationQueue.close();
  if (_notificationsQueue) await _notificationsQueue.close();
};
