// Load environment variables FIRST before anything else
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import prisma from './config/database';
import authRoutes from './routes/authRoutes';
import walletRoutes from './routes/walletRoutes';
import transferRoutes from './routes/transferRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { handleStripeWebhook } from './controllers/paymentController';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import aiRoutes from './routes/aiRoutes';
import { errorHandler } from './middleware/errorMiddleware';
import { enforceHttps, securityHeaders } from './middleware/securityMiddleware';
import { globalLimiter } from './middleware/rateLimiter';
import { initializeEmailService } from './services/emailService';
import upiRoutes from './routes/upiRoutes';
import { initSocket } from './services/socket';
import { startAiCategorisationWorker } from './workers/categoriseTransaction.worker';
import { startNotificationDispatchWorker } from './workers/notificationDispatch.worker';
import { closeQueues } from './config/bullmq';
import redisClient, { redisAvailable } from './config/redis';

// Initialize email service
initializeEmailService();

const app: Express = express();
const httpServer = createServer(app);
initSocket(httpServer);

app.disable('x-powered-by');

// Security middleware (apply early)
app.use(enforceHttps);
app.use(securityHeaders);
const PORT = process.env.PORT || 3000;

// Middleware for Stripe webhook (must be before json() middleware)
// Stripe needs raw body for signature verification
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json());

// Apply global rate limiter to all API routes
app.use('/api', globalLimiter);

// Basic health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    message: 'PayFlow server is running ✓',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Database health check endpoint
app.get('/api/db-health', async (req: Request, res: Response) => {
  try {
    // Test database connection by querying user count
    const userCount = await prisma.user.count();

    res.json({
      message: '✅ Database connection successful',
      database: 'PostgreSQL',
      status: 'connected',
      userCount: userCount
    });
  } catch (error) {
    console.error('DB Health Check Error:', error);
    res.status(500).json({
      message: '❌ Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upi', upiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    initializeEmailService();
    httpServer.listen(PORT, () => {
      console.log(`\n✅ PayFlow server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🗄️  DB health check: http://localhost:${PORT}/api/db-health`);
    });

    // Start background workers only if Redis is reachable
    // Redis uses lazyConnect + retryStrategy — give it a moment to connect
    setTimeout(() => {
      if (redisAvailable) {
        startAiCategorisationWorker();
        startNotificationDispatchWorker();
        console.log('🤖 Background workers started (Redis connected)');
      } else {
        console.warn(
          '⚠️  Background workers disabled (Redis not available).\n' +
          '   Notifications will still save to DB and be delivered via WebSocket.\n' +
          '   Email queuing and AI auto-categorisation are paused until Redis starts.'
        );
      }
    }, 5000); // 5s — enough time for Redis retries to complete
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await closeQueues();

    if (redisClient) {
      await redisClient.quit();
    }

    await prisma.$disconnect();

    process.exit(0);
  } catch (error) {
    console.error('Shutdown error:', error);
    process.exit(1);
  }
});