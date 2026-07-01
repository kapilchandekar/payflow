import Redis from 'ioredis';

// Disable Redis locally using env
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Tracks whether Redis is actually reachable
export let redisAvailable = false;

let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;


// Create Redis client only when enabled
export const redisClient = REDIS_ENABLED
  ? new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableOfflineQueue: false,
    lazyConnect: true,

    retryStrategy: (times) => {
      connectionAttempts = times;

      if (times > MAX_RETRY_ATTEMPTS) {
        console.warn(
          `\n⚠️ Redis unavailable after ${MAX_RETRY_ATTEMPTS} attempts. ` +
          `Background job queues disabled.\n`
        );

        return null;
      }

      return Math.min(times * 1000, 3000);
    },
  })
  : null;


// Redis events only when enabled
if (redisClient) {
  redisClient.on('error', (err) => {
    if (connectionAttempts <= MAX_RETRY_ATTEMPTS) {
      if (connectionAttempts <= 1) {
        console.warn('⚠️ Redis connection error:', err.message);
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


  // Attempt connection
  redisClient.connect().catch(() => { });
} else {
  console.log('⚠️ Redis disabled for local development');
}


export default redisClient;