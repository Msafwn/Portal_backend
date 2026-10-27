import express from 'express';
import {
  getChatSessions,
  sendChatMessage,
  saveChatSession,
  getChatSessionById,
  deleteChatSession,
  clearAllChatSessions,
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All career chat routes require candidate authentication
router.use(protect);

router.get('/sessions', getChatSessions);
router.post('/message', sendChatMessage);
router.post('/save', saveChatSession);
router.get('/session/:sessionId', getChatSessionById);
router.delete('/session/:sessionId', deleteChatSession);
router.delete('/sessions/clear', clearAllChatSessions);

export default router;
