/**
 * Redis Store Implementation for Distributed Security Data
 * 
 * This module provides Redis-based storage for security data that needs
 * to persist across server restarts and be shared across multiple instances.
 */

import securityConfig from './config.js';

// Flag to track if Redis is available
let redisAvailable = false;
let redisClient = null;

/**
 * Initialize Redis connection
 * @returns {Promise<boolean>} True if connection successful
 */
export async function initRedisConnection() {
  if (!securityConfig.rateLimiting.useRedisStore) {
    console.log('Redis storage disabled by configuration');
    return false;
  }
  
  try {
    // Dynamic import to avoid requiring redis in environments that don't use it
    const { createClient } = await import('redis');
    
    redisClient = createClient({
      url: securityConfig.rateLimiting.redisUrl
    });
    
    // Set up event handlers
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
      redisAvailable = false;
    });
    
    redisClient.on('connect', () => {
      console.log('Connected to Redis successfully');
      redisAvailable = true;
    });
    
    // Connect to Redis
    await redisClient.connect();
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    redisAvailable = false;
    return false;
  }
}

/**
 * Get rate limit data for a user
 * @param {string} userId - User identifier (or IP address)
 * @returns {Promise<object|null>} Rate limit data or null if not found
 */
export async function getRateLimitData(userId) {
  if (!redisAvailable || !redisClient) return null;
  
  try {
    const key = `rate_limit:${userId}`;
    const data = await redisClient.get(key);
    
    if (!data) return null;
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting rate limit data from Redis:', error);
    return null;
  }
}

/**
 * Set rate limit data for a user
 * @param {string} userId - User identifier (or IP address)
 * @param {object} data - Rate limit data to store
 * @param {number} ttl - Time-to-live in seconds (optional)
 * @returns {Promise<boolean>} True if successful
 */
export async function setRateLimitData(userId, data, ttl = 3600) {
  if (!redisAvailable || !redisClient) return false;
  
  try {
    const key = `rate_limit:${userId}`;
    await redisClient.set(key, JSON.stringify(data), { EX: ttl });
    
    return true;
  } catch (error) {
    console.error('Error setting rate limit data in Redis:', error);
    return false;
  }
}

/**
 * Increment request count for rate limiting
 * @param {string} userId - User identifier (or IP address)
 * @returns {Promise<object>} Updated rate limit data
 */
export async function incrementRequestCount(userId) {
  if (!redisAvailable || !redisClient) {
    // Fall back to in-memory storage
    return { count: 1, timestamp: Date.now() };
  }
  
  try {
    const key = `rate_limit:${userId}`;
    const windowMs = securityConfig.rateLimiting.windowMs;
    const now = Date.now();
    
    // Get existing data or create new
    let data = await getRateLimitData(userId) || { count: 0, timestamp: now };
    
    // Reset if window has passed
    if (now - data.timestamp > windowMs) {
      data = { count: 1, timestamp: now };
    } else {
      data.count += 1;
    }
    
    // Store updated data
    const ttlSeconds = Math.ceil(windowMs / 1000) * 2; // Double the window for TTL
    await setRateLimitData(userId, data, ttlSeconds);
    
    return data;
  } catch (error) {
    console.error('Error incrementing request count in Redis:', error);
    // Fall back to in-memory count on error
    return { count: 1, timestamp: Date.now() };
  }
}

/**
 * Get security history for a user
 * @param {string} userId - User identifier (or IP address)
 * @returns {Promise<object|null>} Security history or null if not found
 */
export async function getSecurityHistory(userId) {
  if (!redisAvailable || !redisClient) return null;
  
  try {
    const key = `security_history:${userId}`;
    const data = await redisClient.get(key);
    
    if (!data) return { events: [] };
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting security history from Redis:', error);
    return { events: [] };
  }
}

/**
 * Add a security event to user history
 * @param {string} userId - User identifier (or IP address)
 * @param {object} event - Security event to add
 * @returns {Promise<boolean>} True if successful
 */
export async function addSecurityEvent(userId, event) {
  if (!redisAvailable || !redisClient) return false;
  
  try {
    const key = `security_history:${userId}`;
    
    // Get existing history or create new
    const history = await getSecurityHistory(userId) || { events: [] };
    
    // Add new event
    history.events.unshift({
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    });
    
    // Limit history size to avoid unbounded growth
    const maxEvents = 100;
    if (history.events.length > maxEvents) {
      history.events = history.events.slice(-maxEvents);
    }
    
    // Store updated history with a long TTL (30 days)
    await redisClient.set(key, JSON.stringify(history), { EX: 30 * 24 * 60 * 60 });
    
    return true;
  } catch (error) {
    console.error('Error adding security event to Redis:', error);
    return false;
  }
}

/**
 * Get ban status for a user
 * @param {string} userId - User identifier (or IP address)
 * @returns {Promise<object>} Ban status with expiration
 */
export async function getBanStatus(userId) {
  if (!redisAvailable || !redisClient) return { banned: false };
  
  try {
    const key = `banned:${userId}`;
    const data = await redisClient.get(key);
    
    if (!data) return { banned: false };
    
    // Get TTL to know when ban expires
    const ttl = await redisClient.ttl(key);
    const banData = JSON.parse(data);
    
    return {
      banned: true,
      reason: banData.reason || 'security_violation',
      expiresIn: ttl > 0 ? ttl : null,
      timestamp: banData.timestamp
    };
  } catch (error) {
    console.error('Error getting ban status from Redis:', error);
    return { banned: false };
  }
}

/**
 * Set ban status for a user
 * @param {string} userId - User identifier (or IP address)
 * @param {string} reason - Reason for ban
 * @param {number} durationSeconds - Ban duration in seconds
 * @returns {Promise<boolean>} True if successful
 */
export async function setBanStatus(userId, reason, durationSeconds) {
  if (!redisAvailable || !redisClient) return false;
  
  try {
    const key = `banned:${userId}`;
    const banData = {
      reason,
      timestamp: new Date().toISOString()
    };
    
    await redisClient.set(key, JSON.stringify(banData), { EX: durationSeconds });
    
    return true;
  } catch (error) {
    console.error('Error setting ban status in Redis:', error);
    return false;
  }
}