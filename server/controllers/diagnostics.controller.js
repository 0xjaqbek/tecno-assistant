// controllers/diagnostics.controller.js - Diagnostic and system monitoring endpoints
import { securityPipeline } from '../services/security.service.js';
import { enhancedLogSecurityEvent } from '../utils/logging.js';
import { getActiveCanaries } from '../services/security.service.js';
import appConfig from '../config/app.config.js';
import securityConfig from '../config/security.config.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify fs functions
const writeFileAsync = promisify(fs.writeFile);

// Path to logs directory
const LOGS_DIR = path.join(__dirname, '..', appConfig.paths.logsDir);

/**
 * Run a diagnostic security check on provided input
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function runSecurityCheck(req, res) {
  try {
    const { input } = req.body;
    
    // Run security checks without taking any action
    const securityResult = await securityPipeline(input, 'admin_diagnostic');
    
    return res.json({
      input,
      securityResult,
      activeCanaries: getActiveCanaries(),
      securityConfig: {
        advanced: securityConfig.advanced,
        rateLimiting: {
          ...securityConfig.rateLimiting,
          redisUrl: securityConfig.rateLimiting.useRedisStore ? 'REDACTED' : securityConfig.rateLimiting.redisUrl
        },
        jailbreakDetection: securityConfig.jailbreakDetection,
        responseFiltering: securityConfig.responseFiltering,
        inputSanitization: securityConfig.inputSanitization
      }
    });
  } catch (error) {
    console.error("Security diagnostic error:", error);
    return res.status(500).json({ error: 'Security diagnostic failed', details: error.message });
  }
}

/**
 * Get system health and status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getSystemHealth(req, res) {
  try {
    // Check various system components
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: appConfig.version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      components: {
        server: {
          status: 'ok',
          uptime: process.uptime(),
          memory: process.memoryUsage()
        },
        filesystem: {
          status: 'unknown'
        },
        aiService: {
          status: appConfig.deepseek.apiKey ? 'configured' : 'missing_key',
          provider: 'DeepSeek',
          model: appConfig.deepseek.model
        }
      }
    };
    
    // Check filesystem access
    try {
      const testFile = path.join(LOGS_DIR, '.health-check');
      await writeFileAsync(testFile, `Health check: ${new Date().toISOString()}`);
      fs.unlinkSync(testFile);
      health.components.filesystem.status = 'ok';
    } catch (error) {
      health.components.filesystem.status = 'error';
      health.components.filesystem.error = error.message;
      // If filesystem is critical, update overall status
      health.status = 'degraded';
    }
    
    return res.json(health);
  } catch (error) {
    console.error("System health check error:", error);
    return res.status(500).json({ 
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Test file writing functionality
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function testFileWrite(req, res) {
  try {
    console.log('Test file write endpoint called');
    
    const testFile = path.join(LOGS_DIR, 'test.json');
    console.log(`Writing test file to: ${testFile}`);
    
    const testData = { 
      test: 'data', 
      timestamp: new Date().toISOString(),
      randomId: Math.random().toString(36).substring(2, 15)
    };
    
    await writeFileAsync(testFile, JSON.stringify(testData, null, 2));
    console.log('Test file written successfully');
    
    return res.json({ 
      success: true, 
      message: 'Test file written successfully',
      filePath: testFile,
      data: testData
    });
  } catch (error) {
    console.error('Error writing test file:', error);
    return res.status(500).json({ 
      error: 'Error writing test file', 
      details: error.message,
      stack: error.stack
    });
  }
}

/**
 * Test security log functionality
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function testSecurityLog(req, res) {
  try {
    console.log('Test security log endpoint called');
    
    const testEvent = await enhancedLogSecurityEvent('test_event', 'This is a test security event', {
      userId: 'admin_test',
      testId: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString()
    });

    const testFilePath = path.join(LOGS_DIR, 'test_log_event.json');
    const testData = {
      test: 'data',
      timestamp: new Date().toISOString(),
      randomId: Math.random().toString(36).substring(2, 15)
    };

    await writeFileAsync(testFilePath, JSON.stringify(testData, null, 2));

    return res.json({
      success: true,
      message: 'Test security event logged successfully',
      eventData: testEvent,
      fileTest: {
        path: testFilePath,
        data: testData
      }
    });
  } catch (error) {
    console.error('Error in test security log endpoint:', error);
    return res.status(500).json({
      error: 'Error generating test security log',
      details: error.message,
      stack: error.stack
    });
  }
}