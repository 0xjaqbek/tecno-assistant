// utils/logging.js - Enhanced logging functionality
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import securityConfig from '../config/security.config.js';
import appConfig from '../config/app.config.js';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify fs functions
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Path to logs storage directory and file
const LOGS_DIR = path.join(__dirname, '..', appConfig.paths.logsDir);
const SECURITY_LOGS_FILE = path.join(LOGS_DIR, appConfig.paths.securityLogsFile);

// Max number of logs to store
const MAX_LOGS = appConfig.logging.maxLogs;

/**
 * Enhanced log security event function that saves logs to file
 * @param {string} type - Event type
 * @param {string} input - User input that triggered the event
 * @param {Object} context - Additional context information
 * @returns {Object|null} Log entry or null if logging is disabled
 */
export async function enhancedLogSecurityEvent(type, input, context = {}) {
  console.log(`[LOG ATTEMPT] Attempting to log security event of type: ${type}`);
  
  // Debug info about configuration
  console.log('[LOG CONFIG]', {
    loggingEnabled: securityConfig.logging.enableLogging,
    logEvents: securityConfig.logging.logEvents,
    logEventIncluded: securityConfig.logging.logEvents.includes(type)
  });
  
  if (!securityConfig.logging.enableLogging) {
    console.log('[LOG SKIPPED] Logging is disabled in security config');
    return null;
  }
  
  // Only log event types configured in settings
  if (!securityConfig.logging.logEvents.includes(type)) {
    console.log(`[LOG SKIPPED] Event type ${type} is not in configured log events list`);
    return null;
  }
  
  const timestamp = new Date().toISOString();
  console.log(`[LOG INFO] Creating log entry with timestamp: ${timestamp}`);
  
  // Prepare input for logging with length limitation
  let inputForLog = '';
  if (securityConfig.logging.logUserInput && input) {
    const maxLength = securityConfig.logging.maxInputLogLength || 100;
    inputForLog = input.substring(0, maxLength) + (input.length > maxLength ? '...' : '');
    console.log(`[LOG INFO] Input truncated to ${inputForLog.length} characters`);
  }
  
  // Create structured log entry
  const logEntry = {
    timestamp,
    type,
    input: inputForLog,
    ...context
  };
  
  // Determine environment (browser vs node)
  const isBrowser = typeof window !== 'undefined';
  console.log(`[LOG INFO] Environment detection: isBrowser=${isBrowser}`);
  
  // Console log for development 
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[SECURITY EVENT] ${timestamp} - ${type}`);
    console.warn(JSON.stringify(logEntry, null, 2));
  } else {
    console.log(`[LOG INFO] Not in development mode, NODE_ENV=${process.env.NODE_ENV}`);
  }
  
  // Always log security events regardless of environment
  console.warn(`[SECURITY EVENT] ${timestamp} - ${type}`);
  
  // Save to file in Node.js environment
  if (!isBrowser) {
    console.log(`[LOG INFO] Attempting to save log to file system at: ${LOGS_DIR}`);
    try {
      // Create logs directory if it doesn't exist
      console.log(`[LOG INFO] Checking if logs directory exists: ${LOGS_DIR}`);
      if (!fs.existsSync(LOGS_DIR)) {
        console.log('[LOG INFO] Logs directory does not exist, creating it');
        await fs.promises.mkdir(LOGS_DIR, { recursive: true });
        console.log('[LOG INFO] Logs directory created successfully');
      } else {
        console.log('[LOG INFO] Logs directory already exists');
      }
      
      // Read existing logs or create empty array
      let logs = [];
      console.log(`[LOG INFO] Attempting to read existing logs from: ${SECURITY_LOGS_FILE}`);
      try {
        const logsData = await readFileAsync(SECURITY_LOGS_FILE, 'utf8');
        logs = JSON.parse(logsData);
        console.log(`[LOG INFO] Successfully read ${logs.length} existing logs`);
      } catch (error) {
        console.log('[LOG INFO] Could not read existing logs file, details:', error.message);
        // File doesn't exist or is invalid JSON, start with empty array
        logs = [];
        console.log('[LOG INFO] Starting with empty logs array');
      }
      
      // Add new log entry
      logs.unshift(logEntry);
      console.log(`[LOG INFO] Added new log entry, logs array now has ${logs.length} entries`);
      
      // Trim logs if over maximum
      if (logs.length > MAX_LOGS) {
        logs = logs.slice(0, MAX_LOGS);
        console.log(`[LOG INFO] Trimmed logs to maximum of ${MAX_LOGS} entries`);
      }
      
      // Write logs back to file
      console.log(`[LOG INFO] Writing logs to file: ${SECURITY_LOGS_FILE}`);
      await writeFileAsync(SECURITY_LOGS_FILE, JSON.stringify(logs, null, 2));
      console.log('[LOG INFO] Successfully wrote logs to file');
    } catch (error) {
      console.error('[LOG ERROR] Error saving security log to file:', error);
      console.error('[LOG ERROR] Error details:', {
        message: error.message, 
        stack: error.stack,
        logsDir: LOGS_DIR,
        logsFile: SECURITY_LOGS_FILE
      });
    }
  } else {
    console.log('[LOG INFO] In browser environment, skipping file system operations');
  }
  
  console.log('[LOG INFO] Returning log entry');
  return logEntry;
}