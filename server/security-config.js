/**
 * Security Configuration for the Moonstone RPG Application
 * 
 * This file contains centralized security settings that can be adjusted
 * to tune the anti-jailbreak protection mechanisms.
 */

const securityConfig = {
    /**
     * Rate limiting settings
     */
    rateLimiting: {
      // Time window in milliseconds
      windowMs: 60 * 1000, // 1 minute
      
      // Maximum number of requests per window
      maxRequests: 10,
      
      // Cooldown period after exceeding rate limit (milliseconds)
      cooldownPeriod: 30 * 1000, // 30 seconds
    },
    
    /**
     * Jailbreak detection settings
     */
    jailbreakDetection: {
      // Number of suspicious attempts before enhanced monitoring
      warningThreshold: 1,
      
      // Number of suspicious attempts before temporary restrictions
      blockingThreshold: 5,
      
      // Time to restrict access after exceeding blocking threshold (milliseconds)
      blockDuration: 15 * 60 * 1000, // 15 minutes
      
      // Whether to enforce client-side jailbreak detection
      enableClientSideChecks: true,
      
      // Whether to tell the user when a jailbreak attempt is detected
      notifyUser: true,
      
      // Additional delay to add to responses after a detected jailbreak attempt (milliseconds)
      jailbreakResponseDelay: 2000, // 2 seconds
    },
    
    /**
     * Input sanitization settings
     */
    inputSanitization: {
      // Maximum allowed input length
      maxInputLength: 2000,
      
      // Whether to trim spaces from input
      trimWhitespace: true,
      
      // Whether to remove special formatting characters
      removeFormatting: true,
      
      // Whether to filter out common programming comments
      removeComments: true,
    },
    
    /**
     * Response filtering settings
     */
    responseFiltering: {
      // Whether to check for out-of-character responses
      enableFiltering: true,
      
      // Whether to replace out-of-character responses or just log them
      replaceResponses: true,
      
      // Maximum response length to return to the client
      maxResponseLength: 4000,
    },
    
    /**
     * Logging settings
     */
    logging: {
      // Whether to log security events
      enableLogging: true,
      
      // Security events to log
      logEvents: ['jailbreak', 'rateLimit', 'suspicious', 'outOfCharacter'],
      
      // Whether to include user input in logs (may contain sensitive data)
      logUserInput: true,
      
      // Maximum length of user input to log
      maxInputLogLength: 100,
    },
    
    /**
     * Advanced settings
     */
    advanced: {
      // Whether to use enhanced prompt structure to resist injection
      useEnhancedPromptStructure: true,
      
      // Whether to add artificial delay after suspicious requests
      addArtificialDelay: true,
      
      // Whether to use server-side security even if client-side checks pass
      enforceServerChecks: true,
      
      // Secret key prefix to add to system messages for additional security
      // Change this regularly in production environments
      systemMessageKeyPrefix: 'M00NST0NE_RPG_42X',
    }
  };
  
  export default securityConfig;