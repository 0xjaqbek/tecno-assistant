// middleware/rate-limiter.js - Rate limiting middleware
import securityConfig from '../config/security.config.js';
import { getSecurityMessage } from '../client/src/security/utils.js';
import { enhancedLogSecurityEvent } from '../utils/logging.js';
import {
  incrementRequestCount,
  getRateLimitData
} from '../services/redis.service.js';

// In-memory rate limits (fallback if Redis unavailable)
const inMemoryRateLimits = {};

/**
 * Rate limiting middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const rateLimiter = async (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress;
  const userId = req.headers['x-user-id'] || ip;
  
  // Rate limiting
  const config = securityConfig.rateLimiting;
  let requestData;
  
  // Use Redis if available, otherwise use in-memory
  if (securityConfig.rateLimiting.useRedisStore) {
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
    
    // Apply cooldown if specified
    if (config.cooldownPeriod > 0) {
      // Implement cooldown logic here
      // Could extend the window by cooldownPeriod for repeat offenders
    }
    
    // Return rate limit error with in-character message
    return res.status(429).json({
      error: "Limit transmisji przekroczony",
      details: getSecurityMessage('rateLimit', severity),
      retryAfter: Math.ceil((config.windowMs - (Date.now() - requestData.timestamp)) / 1000)
    });
  }
  
  next();
};

/**
 * Get current rate limit status for a user
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} Rate limit status
 */
export async function getRateLimitStatus(userId) {
  if (securityConfig.rateLimiting.useRedisStore) {
    return await getRateLimitData(userId) || { count: 0, timestamp: Date.now() };
  } else {
    return inMemoryRateLimits[userId] || { count: 0, timestamp: Date.now() };
  }
}

/**
 * Reset rate limit for a user
 * @param {string} userId - User identifier
 * @returns {Promise<boolean>} Success status
 */
export async function resetRateLimit(userId) {
  if (securityConfig.rateLimiting.useRedisStore) {
    // Implementation depends on your Redis service function
    // This would be a stub if not implemented
    return false;
  } else {
    if (inMemoryRateLimits[userId]) {
      inMemoryRateLimits[userId] = { count: 0, timestamp: Date.now() };
      return true;
    }
    return false;
  }
}