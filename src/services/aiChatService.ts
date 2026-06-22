import { genAI, MODELS } from '../config/gemini';
import prisma from '../config/database';

export const processChat = async (userId: number, sessionId: number | null, message: string) => {
  let session;
  
  if (sessionId) {
    session = await prisma.aiSession.findUnique({ where: { id: sessionId, userId } });
  }

  // Create new session if none exists
  if (!session) {
    session = await prisma.aiSession.create({
      data: {
        userId,
        title: message.substring(0, 30) + '...',
        messages: [
          { role: 'system', content: 'You are an AI financial assistant for PayFlow. Answer questions about the user\'s transactions and spending.' }
        ]
      }
    });
  }

  // Get user's recent transactions for context
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }]
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      amount: true,
      transactionType: true,
      status: true,
      description: true,
      aiCategory: true,
      createdAt: true
    }
  });

  const txContext = recentTransactions.map(tx => 
    `[${tx.createdAt.toISOString()}] ${tx.transactionType} of ${tx.amount} (${tx.status}) - ${tx.description} - Category: ${tx.aiCategory}`
  ).join('\n');

  // Build the prompt history
  const history = session.messages as { role: string; content: string }[];
  history.push({ role: 'user', content: message });

  // Format history for Gemini SDK
  const geminiHistory = history
    .filter(msg => msg.role === 'user' || msg.role === 'model') // Exclude system
    .map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

  const systemInstruction = `You are a financial assistant. Context of recent user transactions:\n${txContext}`;
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      const fallbackMsg = "I am a fallback assistant since no Gemini API key is configured. You asked: " + message;
      history.push({ role: 'model', content: fallbackMsg });
      await prisma.aiSession.update({
        where: { id: session.id },
        data: { messages: history as any }
      });
      return { response: fallbackMsg, sessionId: session.id };
    }

    const model = genAI.getGenerativeModel({ 
      model: MODELS.CHAT,
      systemInstruction: systemInstruction 
    });

    const chat = model.startChat({
      history: geminiHistory.slice(0, -1), // Everything except the last message
    });

    const result = await chat.sendMessage(message);
    const textResponse = result.response.text();

    history.push({ role: 'model', content: textResponse });

    await prisma.aiSession.update({
      where: { id: session.id },
      data: { messages: history as any }
    });

    return { response: textResponse, sessionId: session.id };
  } catch (error) {
    console.error('AI Chat Error:', error);
    throw new Error('Failed to process AI chat');
  }
};
