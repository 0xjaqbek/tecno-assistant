// routes/api.routes.js - API routes
import express from 'express';
import { processChat } from '../controllers/chat.controller.js';
import { detectUnauthorizedAdminTricks } from '../middleware/security.middleware.js';

const router = express.Router();

// Simple health check endpoint
router.get('/simple-test', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.json({ success: true, message: 'API is working properly' });
});

// Chat endpoint with security filter
router.post('/chat', detectUnauthorizedAdminTricks, processChat);
router.get('/chat/last-message', getLastMessage);

export default router;
