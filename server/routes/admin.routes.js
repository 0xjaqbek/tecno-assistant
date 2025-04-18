// routes/admin.routes.js - Admin routes
import express from 'express';
import { 
  getConversations, 
  getConversationById,
  clearConversations,
  endConversation,
  toggleArchiving,
  getArchivingStatus,
  getSecurityLogs,
  clearSecurityLogs
} from '../controllers/admin.controller.js';
import {
  runSecurityCheck,
  testFileWrite,
  testSecurityLog,
  getSystemHealth
} from '../controllers/diagnostics.controller.js';
import { verifyAdminKey } from '../middleware/security.middleware.js';

const router = express.Router();

// All admin routes require admin key verification
router.use(verifyAdminKey);

// Conversation endpoints
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations', clearConversations);
router.post('/conversations/:id/end', endConversation);

// Archiving endpoints
router.post('/toggle-archiving', toggleArchiving);
router.get('/archiving-status', getArchivingStatus);

// Security logs endpoints
router.get('/security-logs', getSecurityLogs);
router.delete('/security-logs', clearSecurityLogs);

// Diagnostic endpoints
router.post('/security-check', runSecurityCheck);
router.get('/system-health', getSystemHealth);
router.get('/test-file-write', testFileWrite);
router.post('/test-security-log', testSecurityLog);

export default router;