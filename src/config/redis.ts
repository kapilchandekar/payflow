import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Tracks whether Redis is actually reachable
export let redisAvailable = false;

let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;

// Create a singleton Redis client
export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableOfflineQueue: false,  // Don't queue commands when disconnected
  lazyConnect: true,          // Don't connect immediately on creation
  retryStrategy: (times) => {
    connectionAttempts = times;
    if (times > MAX_RETRY_ATTEMPTS) {
      // Stop retrying — Redis is not available
      console.warn(
        `\n⚠️  Redis unavailable after ${MAX_RETRY_ATTEMPTS} attempts. ` +
        `Background job queues (email notifications, AI categorisation) will be disabled.\n` +
        `To enable Redis: install and start Redis, or run: docker run -d -p 6379:6379 redis\n`
      );
      return null; // null = stop retrying
    }
    return Math.min(times * 1000, 3000); // 1s, 2s, 3s
  },
});

redisClient.on('error', (err) => {
  if (connectionAttempts <= MAX_RETRY_ATTEMPTS) {
    // Only log on first error to avoid spam
    if (connectionAttempts <= 1) {
      console.warn('⚠️  Redis connection error:', err.message);
    }
  }
  redisAvailable = false;
});

redisClient.on('connect', () => {
  redisAvailable = true;
  console.log('✅ Connected to Redis');
});

redisClient.on('ready', () => {
  redisAvailable = true;
});

redisClient.on('close', () => {
  redisAvailable = false;
});

// Attempt to connect (non-blocking, errors are handled above)
redisClient.connect().catch(() => {
  // Silently handled by the error/retryStrategy above
});

export default redisClient;
