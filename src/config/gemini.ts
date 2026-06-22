import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
// Note: We expect GEMINI_API_KEY in the environment variables
const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  GEMINI_API_KEY is not set. AI features will not work.');
}

export const genAI = new GoogleGenerativeAI(apiKey || 'dummy-key-for-dev');

// Models to use
export const MODELS = {
  CATEGORISATION: 'gemini-1.5-flash',
  CHAT: 'gemini-1.5-pro',
  EMBEDDING: 'text-embedding-004',
};
