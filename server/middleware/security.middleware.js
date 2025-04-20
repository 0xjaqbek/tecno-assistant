// middleware/security.middleware.js - Security middleware functions
import securityConfig from '../config/security.config.js';
import appConfig from '../config/app.config.js';
import { getSecurityMessage } from '../client/src/security/utils.js';
import { enhancedLogSecurityEvent } from '../utils/logging.js';
import {
  incrementRequestCount,
  getBanStatus
} from '../services/redis.service.js';

// In-memory rate limits (fallback if Redis unavailable)
const inMemoryRateLimits = {};

// Main security middleware
export const securityMiddleware = async (req, res, next) => {
  // Skip security checks for non-API routes
  if (!req.path.startsWith('/api')) {
    return next();
  }
  
  // Basic request validation
  if (req.method === 'POST' && (!req.body || typeof req.body !== 'object')) {
    return res.status(400).json({ 
      error: "Invalid request format",
      details: "Request body must be a valid JSON object"
    });
  }

  const ip = req.ip || req.socket.remoteAddress;
  const userId = req.headers['x-user-id'] || ip; 
  
  // Check if user is banned
  const useRedis = securityConfig.rateLimiting.useRedisStore;
  const banStatus = useRedis 
    ? await getBanStatus(userId)
    : (inMemoryRateLimits[userId]?.banned || { banned: false });
  
  if (banStatus.banned) {
    return res.status(403).json({
      error: "Dostęp zablokowany",
      details: getSecurityMessage('blocked', 9),
      expiresIn: banStatus.expiresIn
    });
  }
  
  // Rate limiting
  const config = securityConfig.rateLimiting;
  let requestData;
  
  // Use Redis if available, otherwise use in-memory
  if (useRedis) {
    requestData = await incrementRequestCount(userId);
  } else {
    const now = Date.now();
    
    // Initialize or reset if window has passed
    if (!inMemoryRateLimits[userId] || now - inMemoryRateLimits[userId].timestamp > config.windowMs) {
      inMemoryRateLimits[userId] = { count: 1, timestamp: now };
    } else {
      inMemoryRateLimits[userId].count += 1;
    }
    
    requestData = inMemoryRateLimits[userId];
  }
  
  // Check if over limit
  if (requestData.count > config.maxRequests) {
    // Calculate severity based on how much over the limit they are
    const severity = Math.min(10, Math.floor((requestData.count / config.maxRequests) * 10));
    
    // Log rate limit event
    enhancedLogSecurityEvent('rateLimit', null, {
      userId,
      requestsCount: requestData.count,
      limit: config.maxRequests,
      window: config.windowMs,
      severity
    });
    
    // Return rate limit error with in-character message
    return res.status(429).json({
      error: "Limit transmisji przekroczony",
      details: getSecurityMessage('rateLimit', severity)
    });
  }
  
  next();
};

// Admin key verification middleware
export const verifyAdminKey = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  
  // Verify admin key
  if (adminKey !== appConfig.admin.adminApiKey) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  next();
};

export const detectUnauthorizedAdminTricks = (req, res, next) => {
    const input = req.body.input?.toLowerCase() || '';
    if (input.includes('override code') || input.includes('admin code') || input.includes('testing mode')) {
      console.warn(`[SECURITY] Blocked possible override attempt: ${input}`);
      return res.status(403).json({ error: 'Unauthorized admin command attempt detected.' });
    }
    next();
  };

  await enhancedLogSecurityEvent('override_code_attempt', input, { userId, ip });

  app.post('/api/chat', detectUnauthorizedAdminTricks, chatController.handleChat);
