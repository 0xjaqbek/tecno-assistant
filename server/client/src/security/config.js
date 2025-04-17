/**
 * Enhanced Security Configuration for the Moonstone RPG Application
 * 
 * Dynamic configuration with environment variable support and validation.
 * This file centralizes all security settings with appropriate defaults.
 */

// Define environment handling that works in both browser and Node.js
const getEnvironment = () => {
    if (typeof process !== 'undefined' && process.env) {
      return process.env;
    }
    return {}; // Empty object for browser environment
  };
  
  // Load environment variables safely
  const env = getEnvironment();
  
  // Utility function to get value from environment or use default
  function getEnvValue(key, defaultValue) {
    if (typeof env[key] === 'undefined') return defaultValue;
    
    // Parse based on default value type
    if (typeof defaultValue === 'number') {
      return Number(env[key]) || defaultValue;
    } else if (typeof defaultValue === 'boolean') {
      return env[key].toLowerCase() === 'true';
    } else {
      return env[key];
    }
  }
  
  // Create the actual config object with environment variable support
  const securityConfigDefaults = {
    /**
     * Rate limiting settings
     */
    rateLimiting: {
      // Time window in milliseconds
      windowMs: getEnvValue('RATE_LIMIT_WINDOW_MS', 60 * 1000), // 1 minute
      
      // Maximum number of requests per window
      maxRequests: getEnvValue('RATE_LIMIT_MAX_REQUESTS', 10),
      
      // Cooldown period after exceeding rate limit (milliseconds)
      cooldownPeriod: getEnvValue('RATE_LIMIT_COOLDOWN_MS', 30 * 1000), // 30 seconds
      
      // Whether to use Redis for rate limiting storage
      useRedisStore: getEnvValue('RATE_LIMIT_USE_REDIS', false),
      
      // Redis connection string (if useRedisStore is true)
      redisUrl: getEnvValue('REDIS_URL', 'redis://localhost:6379')
    },
    
    /**
     * Jailbreak detection settings
     */
    jailbreakDetection: {
      // Risk score threshold (0-100) for jailbreak detection
      threshold: getEnvValue('JAILBREAK_THRESHOLD', 15),
      
      // Number of suspicious attempts before enhanced monitoring
      warningThreshold: getEnvValue('JAILBREAK_WARNING_THRESHOLD', 2),
      
      // Number of suspicious attempts before temporary restrictions
      restrictionThreshold: getEnvValue('JAILBREAK_BLOCK_THRESHOLD', 5),
      
      // Time window for counting restriction violations (milliseconds)
      restrictionWindowMs: getEnvValue('JAILBREAK_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
      
      // Time to restrict access after exceeding threshold (milliseconds)
      restrictionDurationMs: getEnvValue('JAILBREAK_BLOCK_DURATION_MS', 15 * 60 * 1000), // 15 minutes
      
      // Whether to enforce client-side jailbreak detection
      enableClientSideChecks: getEnvValue('ENABLE_CLIENT_CHECKS', true),
      
      // Whether to tell the user when a jailbreak attempt is detected
      notifyUser: getEnvValue('NOTIFY_JAILBREAK_ATTEMPTS', true),
      
      // Additional delay to add to responses after a detected jailbreak attempt (milliseconds)
      jailbreakResponseDelay: getEnvValue('JAILBREAK_RESPONSE_DELAY_MS', 2000), // 2 seconds
      
      // Use fuzzy matching for detection
      useFuzzyMatching: getEnvValue('USE_FUZZY_MATCHING', false)
    },
    
    /**
     * Input sanitization settings
     */
    inputSanitization: {
      // Maximum allowed input length
      maxInputLength: getEnvValue('MAX_INPUT_LENGTH', 2000),
      
      // Whether to trim spaces from input
      trimWhitespace: getEnvValue('TRIM_WHITESPACE', true),
      
      // Whether to remove special formatting characters
      removeFormatting: getEnvValue('REMOVE_FORMATTING', true),
      
      // Whether to remove common programming comments
      removeComments: getEnvValue('REMOVE_COMMENTS', true),
      
      // Whether to normalize Unicode text (NFKC form)
      normalizeUnicode: getEnvValue('NORMALIZE_UNICODE', true),
      
      // Whether to check for suspicious Unicode characters
      checkSuspiciousUnicode: getEnvValue('CHECK_SUSPICIOUS_UNICODE', true),
      
      // Whether to remove injection patterns
      removeInjectionPatterns: getEnvValue('REMOVE_INJECTION_PATTERNS', true)
    },
    
    /**
     * Response filtering settings
     */
    responseFiltering: {
      // Whether to check for out-of-character responses
      enableFiltering: getEnvValue('ENABLE_RESPONSE_FILTERING', true),
      
      // Threshold for OOC detection (0-100)
      threshold: getEnvValue('OOC_DETECTION_THRESHOLD', 25),
      
      // Whether to replace out-of-character responses or just log them
      replaceResponses: getEnvValue('REPLACE_OOC_RESPONSES', true),
      
      // Maximum response length to return to the client
      maxResponseLength: getEnvValue('MAX_RESPONSE_LENGTH', 4000),
      
      // Whether to use model self-checking (ask model to verify its own output)
      useModelSelfChecking: getEnvValue('USE_MODEL_SELF_CHECK', false)
    },
    
    /**
     * Logging settings
     */
    logging: {
      // Whether to log security events
      enableLogging: getEnvValue('ENABLE_SECURITY_LOGGING', true),
      
      // Security events to log
      logEvents: ['jailbreak', 'rateLimit', 'suspicious', 'outOfCharacter'],
      
      // Whether to include user input in logs (may contain sensitive data)
      logUserInput: getEnvValue('LOG_USER_INPUT', true),
      
      // Maximum length of user input to log
      maxInputLogLength: getEnvValue('MAX_LOG_INPUT_LENGTH', 100),
      
      // Log destination ('console', 'file', 'external')
      logDestination: getEnvValue('LOG_DESTINATION', 'console'),
      
      // External log service URL (if applicable)
      logServiceUrl: getEnvValue('LOG_SERVICE_URL', ''),
      
      // Path to log file (if applicable)
      logFilePath: getEnvValue('LOG_FILE_PATH', './logs/security.log')
    },
    
    /**
     * Advanced settings
     */
    advanced: {
      // Whether to use enhanced prompt structure to resist injection
      useEnhancedPromptStructure: getEnvValue('USE_ENHANCED_PROMPT', true),
      
      // Whether to add artificial delay after suspicious requests
      addArtificialDelay: getEnvValue('ADD_ARTIFICIAL_DELAY', true),
      
      // Whether to use server-side security even if client-side checks pass
      enforceServerChecks: getEnvValue('ENFORCE_SERVER_CHECKS', true),
      
      // Secret key prefix to add to system messages for additional security
      // Change this regularly in production environments
      systemMessageKeyPrefix: getEnvValue('SYSTEM_MESSAGE_KEY', 'M00NST0NE_RPG_42X'),
      
      // Whether to use distributed storage for security state
      useDistributedStorage: getEnvValue('USE_DISTRIBUTED_STORAGE', false)
    }
  };
  
  /**
   * Validate configuration values and ensure they are within acceptable ranges
   * @param {object} config - Configuration object to validate
   * @returns {object} Validated configuration with any corrected values
   */
  function validateConfig(config) {
    const validated = { ...config };
    
    // Ensure rate limiting values are reasonable
    if (validated.rateLimiting.windowMs < 1000) validated.rateLimiting.windowMs = 1000;
    if (validated.rateLimiting.maxRequests < 1) validated.rateLimiting.maxRequests = 1;
    
    // Ensure jailbreak detection thresholds are within range
    if (validated.jailbreakDetection.threshold < 0 || validated.jailbreakDetection.threshold > 100) {
      validated.jailbreakDetection.threshold = 15;
    }
    if (validated.jailbreakDetection.warningThreshold < 1) {
      validated.jailbreakDetection.warningThreshold = 1;
    }
    
    // Ensure input length limits are reasonable
    if (validated.inputSanitization.maxInputLength <= 0 || validated.inputSanitization.maxInputLength > 10000) {
      validated.inputSanitization.maxInputLength = 2000;
    }
    
    // Ensure response length limits are reasonable
    if (validated.responseFiltering.maxResponseLength <= 0 || validated.responseFiltering.maxResponseLength > 20000) {
      validated.responseFiltering.maxResponseLength = 4000;
    }
    
    return validated;
  }
  
  // Export the validated configuration
  const securityConfig = validateConfig(securityConfigDefaults);
  export default securityConfig;