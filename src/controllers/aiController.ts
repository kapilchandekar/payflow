import { Request, Response, NextFunction } from 'express';
import { processChat } from '../services/aiChatService';
import { generateWeeklyInsight } from '../services/aiInsightsService';
import prisma from '../config/database';
import { NotFoundError } from '../utils/errors';
import { aiCategorisationQueue } from '../config/bullmq';

export const chat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const result = await processChat(userId, sessionId || null, message);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const chatStream = async (req: Request, res: Response, next: NextFunction) => {
  // Currently falls back to non-streaming for simplicity in this iteration
  // In a real SSE implementation, we'd use res.write() and flush()
  try {
    const userId = (req as any).userId;
    const message = req.query.message as string;
    const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : null;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const result = await processChat(userId, sessionId, message);

    // Simulate streaming the response
    const words = result.response.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 50));
    }

    res.write(`data: ${JSON.stringify({ done: true, sessionId: result.sessionId })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: 'Failed to process chat' })}\n\n`);
    res.end();
  }
};

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    
    const sessions = await prisma.aiSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true }
    });

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const session = await prisma.aiSession.findUnique({
      where: { id: parseInt(id), userId }
    });

    if (!session) throw new NotFoundError('Session not found');

    res.status(200).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    await prisma.aiSession.deleteMany({
      where: { id: parseInt(id), userId }
    });

    res.status(200).json({ success: true, message: 'Session deleted' });
  } catch (error) {
    next(error);
  }
};

export const getInsights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const insight = await generateWeeklyInsight(userId);

    res.status(200).json({ success: true, data: insight });
  } catch (error) {
    next(error);
  }
};

export const triggerCategorisation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { txId } = req.params;
    
    await aiCategorisationQueue.add('categorise', { transactionId: parseInt(txId) });

    res.status(200).json({ success: true, message: 'Categorisation job queued' });
  } catch (error) {
    next(error);
  }
};
