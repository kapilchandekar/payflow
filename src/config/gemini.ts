import { GoogleGenerativeAI } from '@google/generative-ai';

let genAIInstance: GoogleGenerativeAI | null = null;

export const getGenAI = () => {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey && process.env.NODE_ENV === 'production') {
      console.warn('⚠️  GEMINI_API_KEY is not set. AI features will not work.');
    }
    genAIInstance = new GoogleGenerativeAI(apiKey || 'dummy-key-for-dev');
  }
  return genAIInstance;
};

// Models to use
export const MODELS = {
  CATEGORISATION: 'gemini-2.5-flash',
  CHAT: 'gemini-2.5-flash',
  EMBEDDING: 'text-embedding-004',
};
