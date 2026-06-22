import { Worker, Job } from 'bullmq';
import { redisClient, redisAvailable } from '../config/redis';
import { categoriseTransaction } from '../services/aiCategorisationService';

export const startAiCategorisationWorker = () => {
  if (!redisAvailable) {
    console.warn('[AiCategorisationWorker] Redis not available — worker not started');
    return null;
  }

  const worker = new Worker(
    'ai-categorisation',
    async (job: Job) => {
      const { transactionId } = job.data;
      console.log(`[Worker] Processing AI categorisation for transaction ${transactionId}`);
      
      const result = await categoriseTransaction(transactionId);
      
      return { success: true, result };
    },
    { connection: redisClient as any }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err);
  });

  return worker;
};
