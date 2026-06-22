import { Router } from 'express';
import { 
  chat, 
  chatStream, 
  getSessions, 
  getSession, 
  deleteSession, 
  getInsights,
  triggerCategorisation
} from '../controllers/aiController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.use(authMiddleware);

// Chat endpoints
router.post('/chat', chat);
router.get('/chat/stream', chatStream);

// Session management
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSession);
router.delete('/sessions/:id', deleteSession);

// Insights
router.get('/insights', getInsights);

// Admin
router.post('/categorise/:txId', adminMiddleware, triggerCategorisation);

export default router;
