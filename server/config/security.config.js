// config/security.config.js - Security configuration
// This is a wrapper for your existing client-side security config
import clientSecurityConfig from '../client/src/security/config.js';

// Export the client security config with optional server-side overrides
export default {
  ...clientSecurityConfig,
  
  // Server-side specific settings can be added here
  server: {
    // Redis connection (if using Redis)
    redisEnabled: process.env.USE_REDIS === 'true',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    
    // Security logs
    maxSecurityLogs: 1000,
    
    // Additional server-specific settings
    rejectMalformedRequests: true,
    validateJsonInput: true,
  }
};