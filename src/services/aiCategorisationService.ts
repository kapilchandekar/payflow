import { genAI, MODELS } from '../config/gemini';
import prisma from '../config/database';

const TAXONOMY = `
- Food & Dining
- Travel
- Shopping
- Entertainment
- Healthcare
- Utilities
- Education
- Transfers
- Salary/Income
- Other
`;

export const categoriseTransaction = async (transactionId: number) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        fromUser: { select: { email: true } },
        toUser: { select: { email: true } }
      }
    });

    if (!transaction) throw new Error(`Transaction ${transactionId} not found`);

    // Prepare context for Gemini
    const prompt = `
You are a financial AI assistant. Categorize the following transaction into exactly one of the categories below. 
Also provide a confidence score between 0.0 and 1.0, and a list of 1-3 relevant keywords (tags).

Categories:
${TAXONOMY}

Transaction Details:
Type: ${transaction.transactionType}
Amount: ${transaction.amount.toString()}
Description: ${transaction.description || 'N/A'}
From: ${transaction.fromUser?.email || 'System'}
To: ${transaction.toUser?.email || 'System'}

Respond strictly in the following JSON format without Markdown formatting:
{
  "category": "Selected Category",
  "confidence": 0.95,
  "tags": ["keyword1", "keyword2"]
}
    `;

    const model = genAI.getGenerativeModel({ model: MODELS.CATEGORISATION });
    
    // Fallback if API key is not set properly
    if (!process.env.GEMINI_API_KEY) {
      console.log('Skipping Gemini API call because GEMINI_API_KEY is missing.');
      return await updateTransactionFallback(transactionId);
    }

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse the JSON (handle possible markdown formatting in the output)
    const jsonStr = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    // Update the transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        aiCategory: parsed.category,
        aiCategoryConf: parsed.confidence,
        aiTags: parsed.tags
      }
    });

    console.log(`[AI] Categorised transaction ${transactionId} as ${parsed.category}`);
    return parsed;
  } catch (error) {
    console.error(`[AI] Error categorising transaction ${transactionId}:`, error);
    return await updateTransactionFallback(transactionId);
  }
};

// Fallback logic for local testing without API keys
const updateTransactionFallback = async (transactionId: number) => {
  const fallback = {
    category: 'Transfers',
    confidence: 0.8,
    tags: ['auto-categorised', 'fallback']
  };

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      aiCategory: fallback.category,
      aiCategoryConf: fallback.confidence,
      aiTags: fallback.tags
    }
  });
  
  return fallback;
};
