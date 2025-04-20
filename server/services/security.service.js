// services/security.service.js - Security pipeline implementation
import {
    sanitizeInput,
    detectJailbreakAttempt,
    filterBotResponse,
    getSecurityMessage,
  } from '../client/src/security/utils.js';
  
  import { 
    detectObfuscationTechniques,
    analyzeInputStructure,
    ContextTracker 
  } from '../client/src/security/advancedSecurity.js';
  
  import {
    checkForCanaryLeakage
  } from '../client/src/security/canaryTokens.js';
  
  import { enhancedLogSecurityEvent } from '../utils/logging.js';
  import {
    incrementRequestCount,
    getSecurityHistory,
    addSecurityEvent
  } from './redis.service.js';
  import securityConfig from '../config/security.config.js';
  
  // Initialize the context tracker
  const contextTracker = new ContextTracker();
  
  // Active canary tokens storage
  let activeCanaries = [];
  
  /**
   * Set active canaries from the knowledge base initialization
   * @param {Array} canaries - Array of canary tokens
   */
  export function setActiveCanaries(canaries) {
    activeCanaries = canaries;
  }
  
  /**
   * Get active canaries (for admin diagnostics)
   * @returns {Array} Active canary tokens (masked for security)
   */
  export function getActiveCanaries() {
    return activeCanaries.map(token => token.substring(0, 4) + '...');
  }
  
  /**
   * Comprehensive security pipeline for user input
   * @param {string} input - Raw user input
   * @param {string} userId - User identifier
   * @param {Array} history - Chat history
   * @returns {Object} Security analysis results
   */
  export async function securityPipeline(input, userId, history = []) {
    console.log(`[SECURITY] Starting security pipeline for user: ${userId}`);
    
    // Skip empty inputs
    if (!input || input.trim() === '') {
      console.log('[SECURITY] Empty input, skipping security checks');
      return {
        isSecurityThreat: false,
        riskScore: 0,
        sanitizedInput: '',
        securityMessage: null
      };
    }
  
    console.log('[SECURITY] Phase 1: Basic pattern checks & sanitization');
    // Phase 1: Basic pattern checks & sanitization
    const sanitized = sanitizeInput(input);
    const patternCheck = detectJailbreakAttempt(sanitized.text);
    console.log(`[SECURITY] Sanitization complete, jailbreak detection result: ${patternCheck.isJailbreakAttempt ? 'DETECTED' : 'NONE'}, score: ${patternCheck.score}`);
    
    const adminCodePattern = /(override code|admin code|system password|testing mode)[\s:]*[A-Z0-9_-]+/i;
    if (adminCodePattern.test(sanitized.text)) {
        console.log(`[SECURITY] Blocked possible admin code injection: ${sanitized.text}`);
        await enhancedLogSecurityEvent('admin_code_attempt', sanitized.text, { userId });
        return {
          isSecurityThreat: true,
          riskScore: 100,
          sanitizedInput: sanitized.text,
          securityMessage: "Unauthorized input pattern detected"
        };
    }
    
    console.log('[SECURITY] Phase 2: Advanced checks');
    // Phase 2: Advanced checks
    const structureAnalysis = analyzeInputStructure(sanitized.text);
    const obfuscationCheck = detectObfuscationTechniques(sanitized.text);
    console.log(`[SECURITY] Structure analysis: ${structureAnalysis.suspiciousStructure ? 'SUSPICIOUS' : 'NORMAL'}`);
    console.log(`[SECURITY] Obfuscation check: ${obfuscationCheck.hasObfuscation ? 'DETECTED' : 'NONE'}`);
    
    console.log('[SECURITY] Phase 3: Canary token check');
    // Phase 3: Canary token check
    const canaryCheck = checkForCanaryLeakage(sanitized.text, activeCanaries);
    console.log(`[SECURITY] Canary check: ${canaryCheck.hasLeakage ? 'LEAKED' : 'SECURE'}`);
    
    console.log('[SECURITY] Phase 4: Contextual analysis');
    // Phase 4: Contextual analysis
    const contextState = contextTracker.updateState(sanitized.text, patternCheck);
    console.log(`[SECURITY] Context drift: ${contextState.contextDrift.toFixed(2)}`);
    
    console.log('[SECURITY] Phase 5: Composite risk scoring');
    // Phase 5: Composite risk scoring
    const riskFactors = [
      patternCheck.isJailbreakAttempt ? patternCheck.score : 0,
      structureAnalysis.suspiciousStructure ? 40 : 0,
      obfuscationCheck.hasObfuscation ? 60 : 0,
      contextState.contextDrift * 30,
      canaryCheck.hasLeakage ? 100 : 0
    ];
    
    const maxRiskScore = Math.max(...riskFactors);
    const compositeRiskScore = Math.min(100, 
      (riskFactors.reduce((sum, score) => sum + score, 0) / riskFactors.length) * 1.5
    );
    
    console.log(`[SECURITY] Risk factors: ${JSON.stringify(riskFactors)}`);
    console.log(`[SECURITY] Max risk score: ${maxRiskScore}`);
    console.log(`[SECURITY] Composite risk score: ${compositeRiskScore}`);
    
    // Phase 6: Security response determination
    const isBlocked = compositeRiskScore > 10 || maxRiskScore > 20 || canaryCheck.hasLeakage;
    const requiresDelay = compositeRiskScore > 15 && !isBlocked;
    
    console.log(`[SECURITY] Security response: isBlocked=${isBlocked}, requiresDelay=${requiresDelay}`);
    
    // Log security event for suspicious inputs
    if (compositeRiskScore > 5 || maxRiskScore > 10) {
      console.log('[SECURITY] Input classified as suspicious, logging security event');
      const securityEvent = await enhancedLogSecurityEvent('suspicious_input', sanitized.text, {
        userId,
        riskScore: compositeRiskScore,
        maxRiskFactor: maxRiskScore,
        patternScore: patternCheck.score,
        isObfuscated: obfuscationCheck.hasObfuscation,
        hasCanaryLeakage: canaryCheck.hasLeakage,
        suspiciousStructure: structureAnalysis.suspiciousStructure,
        contextDrift: contextState.contextDrift
      });
      
      console.log(`[SECURITY] Security event logged: ${securityEvent ? 'SUCCESS' : 'FAILED'}`);
      
      // Add to security history if Redis is available
      if (securityConfig.rateLimiting.useRedisStore) {
        console.log('[SECURITY] Adding event to Redis security history');
        const redisResult = await addSecurityEvent(userId, securityEvent);
        console.log(`[SECURITY] Redis add result: ${redisResult ? 'SUCCESS' : 'FAILED'}`);
      }
    } else {
      console.log('[SECURITY] Input classified as safe, no security event logged');
    }
    
    console.log('[SECURITY] Security pipeline complete');
    return {
      isSecurityThreat: isBlocked,
      shouldDelay: requiresDelay,
      riskScore: compositeRiskScore,
      sanitizedInput: sanitized.text,
      securityMessage: isBlocked ? 
        getSecurityMessage('jailbreak', compositeRiskScore / 10) : 
        null,
      details: {
        patternCheck,
        structureAnalysis,
        obfuscationCheck,
        contextState,
        canaryCheck
      }
    };
  }