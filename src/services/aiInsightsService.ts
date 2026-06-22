import { genAI, MODELS } from '../config/gemini';
import prisma from '../config/database';
import { createNotification } from './notificationService';

export const generateWeeklyInsight = async (userId: number) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get past 30 days transactions where user is sender (spending)
    const transactions = await prisma.transaction.findMany({
      where: {
        fromUserId: userId,
        createdAt: { gte: thirtyDaysAgo },
        status: 'completed'
      },
      select: { amount: true, aiCategory: true, createdAt: true }
    });

    if (transactions.length === 0) {
      return { insight: "You haven't made any transactions in the last 30 days." };
    }

    // Group by category manually
    const categoryTotals: Record<string, number> = {};
    let totalSpent = 0;
    for (const tx of transactions) {
      const cat = tx.aiCategory || 'Uncategorized';
      const amt = Number(tx.amount);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      totalSpent += amt;
    }

    const prompt = `
You are a financial advisor AI. The user has spent a total of $${totalSpent.toFixed(2)} in the last 30 days.
Here is the breakdown by category:
${Object.entries(categoryTotals).map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`).join('\n')}

Provide a brief (2-3 sentences), encouraging, and actionable financial insight or tip based on this spending pattern.
`;

    if (!process.env.GEMINI_API_KEY) {
      return { insight: "Fallback Insight: You spent the most on " + Object.keys(categoryTotals)[0] + "." };
    }

    const model = genAI.getGenerativeModel({ model: MODELS.CATEGORISATION });
    const result = await model.generateContent(prompt);
    const insightText = result.response.text();

    // Create a notification for the user
    await createNotification(
      userId,
      'ai_insight',
      'Your Weekly Financial Insight',
      insightText
    );

    return { insight: insightText, totalSpent, categoryTotals };
  } catch (error) {
    console.error('Insights Error:', error);
    throw error;
  }
};
