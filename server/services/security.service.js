// services/security.service.js - Security pipeline implementation for Portfolio Assistant
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

import {
  jailbreakPatterns,
  outOfCharacterPatterns,
  modeControlPatterns
} from '../client/src/security/patterns.js';

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
 * Check if text contains inappropriate content for a portfolio context
 * @param {string} input - User input to check
 * @returns {boolean} True if inappropriate content detected
 */
function containsInappropriateContent(input) {
  if (!input) return false;
  
  const inappropriatePatterns = [
    // Offensive content
    /\b(fuck|shit|ass|bitch|cunt|dick|pussy|whore|nigger|faggot)\b/i,
    
    // Personal information requests
    /\b(home address|personal phone|family|children|spouse|married|relationship status)\b/i,
    
    // Financial fishing
    /\b(bank account|credit card|loan|investment advice|stock tips)\b/i,
    
    // Illegal activities
    /\b(hacking|crack|steal|illegal|darkweb|drugs|weapons)\b/i
  ];
  
  // Check each pattern
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(input)) {
      console.log(`[SECURITY] Inappropriate content matched pattern: ${pattern}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if the text is in an allowed language for portfolio assistant
 * @param {string} input - User input to check
 * @returns {boolean} True if text appears to be in an allowed language
 */
function isAllowedLanguage(input) {
  if (!input) return false;
  
  try {
    // For very short messages, always allow them
    const wordCount = input.trim().split(/\s+/).length;
    if (wordCount <= 5) {
      console.log('[SECURITY] Short message detected, allowing without language check');
      return true;
    }
    
    // Try to detect language with franc
    if (input.length >= 10) { // Only try language detection on longer inputs
      try {
        const franc = require('franc');
        const detectedLang = franc(input);
        
        console.log(`[SECURITY] Language detected: ${detectedLang}`);
        
        // Portfolio context - allow major languages
        const allowedLanguages = [
          'eng', 'pol', 'deu', 'fra', 'spa', 'ita', 'por', 
          'nld', 'swe', 'nor', 'dan', 'fin', 'rus', 'ukr', 
          'ces', 'slk', 'hun', 'ron', 'ell', 'tur'
        ];
        
        if (allowedLanguages.includes(detectedLang)) {
          return true;
        }
        
        // For unclear cases, allow the message
        if (detectedLang === 'und') {
          return true;
        }
        
        // If confident it's an unusual language, it might be spam/abuse
        if (detectedLang !== 'und' && !allowedLanguages.includes(detectedLang)) {
          console.log(`[SECURITY] Unusual language detected: ${detectedLang}`);
          return false;
        }
      } catch (francError) {
        console.error('[SECURITY] Language detection error:', francError);
      }
    }
    
    // If franc fails or for short text, allow by default
    return true;
    
  } catch (error) {
    // If any error occurs, allow the message
    console.error('[SECURITY] Error in language detection:', error);
    return true;
  }
}

/**
 * Combines various detection methods into a single comprehensive evaluation
 * @param {string} input - User input to evaluate
 * @returns {object} Combined detection results
 */
function multiLayerDetection(input) {
  if (!input) {
    return { shouldBlock: false, results: {}, reason: 'empty_input' };
  }
  
  // Basic pattern detection
  const jailbreakResult = detectJailbreakAttempt(input);
  
  // Advanced structure and obfuscation analysis
  const structureAnalysis = analyzeInputStructure(input);
  const obfuscationCheck = detectObfuscationTechniques(input);
  
  // Domain-specific checks
  const hasInappropriateContent = containsInappropriateContent(input);
  const isModeControl = modeControlPatterns.some(p => p.pattern.test(input));
  
  // Special commands that should not be blocked
  const isExitCommand = /^\[EXIT\]$|^end session$/i.test(input);
  
  const results = {
    isJailbreak: jailbreakResult.isJailbreakAttempt,
    jailbreakScore: jailbreakResult.score,
    hasInappropriateContent,
    isModeControl,
    hasSuspiciousStructure: structureAnalysis.suspiciousStructure,
    structureScore: structureAnalysis.structureScore || 0,
    hasObfuscation: obfuscationCheck.hasObfuscation,
    obfuscationTechniques: obfuscationCheck.techniques || {},
    isExitCommand
  };
  
  // If it's an exit command, don't block but mark for special handling
  if (isExitCommand) {
    return {
      shouldBlock: false,
      results,
      reason: 'exit_command',
      isExitCommand: true
    };
  }
  
  // Calculate threat indicators
  const threatIndicators = [
    results.isJailbreak && results.jailbreakScore > 30, // Only count high-confidence jailbreaks
    results.hasInappropriateContent, 
    results.isModeControl,
    results.hasSuspiciousStructure && results.structureScore > 7, // Higher threshold for portfolio context
    results.hasObfuscation
  ];
  
  // Determine if should block based on any positive threat indicator
  const shouldBlock = threatIndicators.some(indicator => indicator === true);
  
  // Generate reason string based on triggered indicators
  const reasonMap = {
    isJailbreak: 'jailbreak_attempt',
    hasInappropriateContent: 'inappropriate_content',
    isModeControl: 'mode_control_attempt',
    hasSuspiciousStructure: 'suspicious_structure',
    hasObfuscation: 'obfuscation_detected'
  };
  
  const reason = Object.entries(results)
    .filter(([key, value]) => value === true && reasonMap[key])
    .map(([key, _]) => reasonMap[key])
    .join(', ');
  
  return {
    shouldBlock,
    results,
    reason: reason || 'combined_factors',
    riskScore: Math.max(
      (results.jailbreakScore > 30) ? results.jailbreakScore : 0,
      (results.structureScore > 7) ? results.structureScore * 10 : 0,
      results.hasInappropriateContent ? 80 : 0,
      results.isModeControl ? 70 : 0,
      results.hasObfuscation ? 60 : 0
    )
  };
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
  
  // Check if input is in an allowed language
  const allowedLanguage = isAllowedLanguage(sanitized.text);
  if (!allowedLanguage) {
    console.log('[SECURITY] Unusual language detected, checking security');
    // Still check security even if language is unusual
    const languageSecurity = multiLayerDetection(sanitized.text);
    
    // If security threat detected, use that message; otherwise, language reminder
    if (languageSecurity.shouldBlock) {
      return {
        isSecurityThreat: true,
        riskScore: languageSecurity.riskScore || 70,
        sanitizedInput: sanitized.text,
        securityMessage: getSecurityMessage('jailbreak', languageSecurity.riskScore / 10)
      };
    } else {
      // Language reminder if no security threat
      return {
        isSecurityThreat: true, // Block as language issue
        riskScore: 50,
        sanitizedInput: sanitized.text,
        securityMessage: "I'm having trouble understanding your message. Could you please rephrase or try in English?"
      };
    }
  }
  
  // Check for admin codes or other immediate block patterns
  const adminCodePattern = /(override code|admin code|system password|testing mode)[\s:]*[A-Z0-9_-]+/i;
  if (adminCodePattern.test(sanitized.text)) {
    console.log(`[SECURITY] Blocked possible admin code injection: ${sanitized.text}`);
    await enhancedLogSecurityEvent('admin_code_attempt', sanitized.text, { userId });
    return {
      isSecurityThreat: true,
      riskScore: 100,
      sanitizedInput: sanitized.text,
      securityMessage: "I'm sorry, but I don't recognize that command. I'm here to discuss your project requirements and the developer's services. How can I help you with your project today?"
    };
  }
  
  // Check for inappropriate content
  if (containsInappropriateContent(sanitized.text)) {
    console.log('[SECURITY] Inappropriate content detected');
    await enhancedLogSecurityEvent('inappropriate_content', sanitized.text, { userId });
    return {
      isSecurityThreat: true,
      riskScore: 80,
      sanitizedInput: sanitized.text,
      securityMessage: "I'm focused on helping with your development project needs. Could we please keep our conversation professional? I'd be happy to discuss your project requirements or answer questions about our services."
    };
  }
  
  // Check for mode control attempts
  const modeControlMatch = modeControlPatterns.some(pattern => pattern.pattern.test(sanitized.text));
  if (modeControlMatch) {
    console.log('[SECURITY] Mode control attempt detected');
    await enhancedLogSecurityEvent('mode_control_attempt', sanitized.text, { userId });
    return {
      isSecurityThreat: true,
      riskScore: 70,
      sanitizedInput: sanitized.text,
      securityMessage: "I'm here as the developer's assistant to help with your project needs. Is there a specific aspect of web or application development you'd like to discuss?"
    };
  }
  
  // Handle exit commands specially
  if (/^\[EXIT\]$|^end session$/i.test(sanitized.text)) {
    console.log('[SECURITY] Exit command detected');
    return {
      isSecurityThreat: false,
      riskScore: 0,
      sanitizedInput: sanitized.text,
      isExitCommand: true
    };
  }
  
  console.log('[SECURITY] Phase 2: Advanced checks');
  // Phase 2: Advanced checks
  const patternCheck = detectJailbreakAttempt(sanitized.text);
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
  
  console.log('[SECURITY] Phase 5: Multi-layer detection');
  // Phase 5: Multi-layer detection
  const multiLayerResults = multiLayerDetection(sanitized.text);
  console.log(`[SECURITY] Multi-layer detection result: ${multiLayerResults.shouldBlock ? 'BLOCK' : 'PASS'}, reason: ${multiLayerResults.reason}`);
  
  console.log('[SECURITY] Phase 6: Composite risk scoring');
  // Phase 6: Composite risk scoring with adjusted thresholds for portfolio context
  const riskFactors = [
    patternCheck.isJailbreakAttempt && patternCheck.score > 30 ? patternCheck.score : 0, // Higher threshold
    structureAnalysis.suspiciousStructure && structureAnalysis.structureScore > 7 ? 40 : 0, // Higher threshold
    obfuscationCheck.hasObfuscation ? 60 : 0,
    contextState.contextDrift * 40, // Slightly reduced impact
    canaryCheck.hasLeakage ? 100 : 0,
    multiLayerResults.shouldBlock ? multiLayerResults.riskScore : 0
  ];
  
  const maxRiskScore = Math.max(...riskFactors);
  const compositeRiskScore = Math.min(100, 
    (riskFactors.reduce((sum, score) => sum + score, 0) / riskFactors.length) * 1.3
  );
  
  console.log(`[SECURITY] Risk factors: ${JSON.stringify(riskFactors)}`);
  console.log(`[SECURITY] Max risk score: ${maxRiskScore}`);
  console.log(`[SECURITY] Composite risk score: ${compositeRiskScore}`);
  
  // Phase 7: Security response determination with adjusted thresholds
  const isJailbreakDetected = patternCheck && patternCheck.isJailbreakAttempt && patternCheck.score > 30;
  const isBlocked = isJailbreakDetected || compositeRiskScore > 30 || maxRiskScore > 70 || canaryCheck.hasLeakage || multiLayerResults.shouldBlock;

  if (isJailbreakDetected) {
    console.log('[SECURITY] High-confidence jailbreak detected - blocking message');
  }
  
  const requiresDelay = compositeRiskScore > 20 && !isBlocked;
  
  console.log(`[SECURITY] Security response: isBlocked=${isBlocked}, requiresDelay=${requiresDelay}`);
  
  // Log security event for suspicious inputs
  if (compositeRiskScore > 15 || maxRiskScore > 30 || multiLayerResults.shouldBlock) {
    console.log('[SECURITY] Input classified as suspicious, logging security event');
    const securityEvent = await enhancedLogSecurityEvent('suspicious_input', sanitized.text, {
      userId,
      riskScore: compositeRiskScore,
      maxRiskFactor: maxRiskScore,
      patternScore: patternCheck.score,
      isObfuscated: obfuscationCheck.hasObfuscation,
      hasCanaryLeakage: canaryCheck.hasLeakage,
      suspiciousStructure: structureAnalysis.suspiciousStructure,
      contextDrift: contextState.contextDrift,
      multiLayerResults: multiLayerResults.reason
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
      canaryCheck,
      multiLayerResults
    }
  };
}

/**
 * Check if AI response contains inappropriate information
 * @param {string} response - AI response to check
 * @returns {object} Check result
 */
export function checkResponseForRealWorldInfo(response) {
  if (!response) return { containsRealWorldInfo: false };
  
  // Patterns for inappropriate content in responses for portfolio context
  const inappropriateResponsePatterns = [
    // Personal information
    /my (home|personal) address is/i,
    /my (cell|private|personal) (phone|number) is/i,
    /my salary is/i,
    /my personal email is/i,
    
    // Offensive content
    /\b(fuck|shit|ass|bitch|cunt|dick|pussy|whore|nigger|faggot)\b/i,
    
    // Clear hallucinations
    /i am (the developer|a real person)/i,
    /i will (call|email|text|message) you/i,
    /i (can|will) hack/i,
    /i (can|will) build .* for free/i
  ];
  
  // Check for inappropriate content
  const matches = inappropriateResponsePatterns.filter(pattern => pattern.test(response));
  
  return {
    containsRealWorldInfo: matches.length > 0,
    matches: matches.map(pattern => pattern.toString()),
    recommendedReplacement: "I'm the developer's assistant and can discuss project details professionally. I'd be happy to explain more about our services and capabilities or connect you with the developer directly."
  };
}