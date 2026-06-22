import { Worker, Job } from 'bullmq';
import { redisClient, redisAvailable } from '../config/redis';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass',
  },
});

export const startNotificationDispatchWorker = () => {
  if (!redisAvailable) {
    console.warn('[NotificationWorker] Redis not available — worker not started');
    return null;
  }

  const worker = new Worker(
    'notifications',
    async (job: Job) => {
      const { userId, type, title, body, emailAddress } = job.data;
      console.log(`[Worker] Dispatching notification for user ${userId}: ${title}`);
      
      // Send email if address is provided
      if (emailAddress) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@payflow.com',
          to: emailAddress,
          subject: title,
          text: body,
          html: `<p>${body}</p>`,
        });
      }
      
      return { success: true };
    },
    { connection: redisClient as any }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Notification job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Notification job ${job?.id} failed:`, err);
  });

  return worker;
};
