import { defineConfig } from '@prisma/internals';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});