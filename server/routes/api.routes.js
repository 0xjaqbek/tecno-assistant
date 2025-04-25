// routes/api.routes.js - API routes
import express from 'express';
import { processChat } from '../controllers/chat.controller.js';
import { processPortfolioChat } from '../controllers/portfolio-chat.controller.js';
import { detectUnauthorizedAdminTricks } from '../middleware/security.middleware.js';
import { getLastMessage } from '../controllers/chat.controller.js';

const router = express.Router();

// Simple health check endpoint
router.get('/simple-test', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.json({ success: true, message: 'API is working properly' });
});

// Original RPG chat endpoint
router.post('/chat', detectUnauthorizedAdminTricks, processChat);
router.get('/chat/last-message', getLastMessage);

// New portfolio assistant endpoint
router.post('/portfolio-chat', detectUnauthorizedAdminTricks, processPortfolioChat);

export default router;