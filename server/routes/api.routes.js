// routes/api.routes.js - API routes
import express from 'express';
import { processChat } from '../controllers/chat.controller.js';

const router = express.Router();

// Simple health check endpoint
router.get('/simple-test', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.json({ success: true, message: 'API is working properly' });
});

// Chat endpoint
router.post('/chat', processChat);

export default router;