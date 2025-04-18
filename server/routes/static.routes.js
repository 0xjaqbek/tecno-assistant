// routes/static.routes.js - Static file serving routes
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Admin view pages
router.get(['/admin/security-logs', '/admin/security-logs.html', '/security-logs.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'security-logs.html'));
});

router.get(['/admin/conversations', '/admin/conversations.html', '/conversations.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'conversations.html'));
});

router.get('/admin/security-diagnostics', '/admin/security-diagnostics.html', '/security-diagnostics.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'security-diagnostics.html'));
});

// Logs troubleshooter
router.get(['/logs', '/logs.htm', '/logs.html'], (req, res) => {
  const filePath = path.join(__dirname, '..', 'logs.html');
  res.sendFile(filePath);
});

// Static files
router.use(express.static(path.join(__dirname, '..', './dist')));

// Catch-all route for client-side routing
router.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', './dist/index.html'));
});

export default router;