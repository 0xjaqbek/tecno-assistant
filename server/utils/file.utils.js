// utils/file.utils.js - File operations utilities
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import appConfig from '../config/app.config.js';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify fs functions
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

// Path to logs directory and files
const LOGS_DIR = path.join(__dirname, '..', appConfig.paths.logsDir);
const SECURITY_LOGS_FILE = path.join(LOGS_DIR, appConfig.paths.securityLogsFile);

/**
 * Initialize logs directory
 * @returns {Promise<boolean>} Success status
 */
export async function initLogsDirectory() {
  try {
    // Create logs directory if it doesn't exist
    console.log(`[LOGS] Checking logs directory: ${LOGS_DIR}`);
    if (!fs.existsSync(LOGS_DIR)) {
      console.log('[LOGS] Directory does not exist, creating...');
      await fs.promises.mkdir(LOGS_DIR, { recursive: true });
      console.log(`[LOGS] Successfully created directory at: ${LOGS_DIR}`);
    }
    
    // Sprawdź uprawnienia do zapisu
    try {
      fs.accessSync(LOGS_DIR, fs.constants.W_OK);
      console.log('[LOGS] Directory is writable');
      return true;
    } catch (error) {
      console.error(`[LOGS] Permission error: ${error.message}`);
      return false;
    }
  } catch (error) {
    console.error(`[LOGS] Error initializing logs directory: ${error.message}`);
    return false;
  }
}

/**
 * Read security logs from file
 * @returns {Promise<Array>} Security logs array
 */
export async function readSecurityLogs() {
  try {
    // Create logs directory if it doesn't exist
    await initLogsDirectory();
    
    // Read logs from file
    let logs = [];
    try {
      const logsData = await readFileAsync(SECURITY_LOGS_FILE, 'utf8');
      logs = JSON.parse(logsData);
      console.log(`Successfully read ${logs.length} logs`);
    } catch (error) {
      console.error('Error reading logs file:', error);
      // File doesn't exist or is invalid JSON, return empty array
      logs = [];
      console.log('Using empty logs array due to error');
    }
    
    return logs;
  } catch (error) {
    console.error('Error reading security logs:', error);
    return [];
  }
}

/**
 * Clear security logs file
 * @returns {Promise<boolean>} Success status
 */
export async function clearSecurityLogs() {
  try {
    // Create logs directory if it doesn't exist
    await initLogsDirectory();
    
    // Create an empty logs file
    await writeFileAsync(SECURITY_LOGS_FILE, JSON.stringify([]));
    console.log('Security logs cleared successfully');
    
    return true;
  } catch (error) {
    console.error('Error clearing security logs:', error);
    return false;
  }
}

/**
 * Ensure HTML files for admin views exist
 * @returns {Promise<boolean>} Success status
 */
export async function ensureAdminHtmlFiles() {
  try {
    const securityLogsHtmlPath = path.join(__dirname, '..', appConfig.paths.securityLogsHtml);
    const conversationsHtmlPath = path.join(__dirname, '..', appConfig.paths.conversationsHtml);
    
    // Check if files exist
    const securityLogsExists = fs.existsSync(securityLogsHtmlPath);
    const conversationsExists = fs.existsSync(conversationsHtmlPath);
    
    // Copy files or update tabs if needed
    // ... (implementation from your original server.js)
    
    return true;
  } catch (error) {
    console.error('Error ensuring admin HTML files:', error);
    return false;
  }
}