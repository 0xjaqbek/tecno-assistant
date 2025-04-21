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
   * Check if text contains questions or statements about the real world
   * @param {string} input - User input to check
   * @returns {boolean} True if real-world query detected
   */
  function isRealWorldQuery(input) {
    if (!input) return false;
    
    const realWorldKeywords = [
      /wybor[a-zów]*/i, /prezydent/i, /polityk/i, /rzad/i, /polski/i, /polsce/i, 
      /duda/i, /komorowski/i, /trzaskowski/i, /premier/i, /partia/i, /sejm/i,
      /rzeczywist/i, /realn/i, /aktualn/i, /prawdziw/i, /wiadomo[sś][cć]/i,
      /wojna/i, /konflikt/i, /kryzys/i, /gospodark/i, /ekonomi/i,
      /koronawirus/i, /covid/i, /pandemi/i, /wydarze[ńn]/i,
      /świat[a-z]*/i, /historii/i, /historia/i, /wydarze[ńn]/i,
      /kraj(u|ach|ami)?/i, /państw[a-z]*/i, /miast[a-z]*/i
    ];
    
    // Sprawdź każdy wzorzec osobno
    for (const pattern of realWorldKeywords) {
      if (pattern.test(input)) {
        console.log(`[SECURITY] Real-world query matched pattern: ${pattern}`);
        return true;
      }
    }
    
    // Dodatkowe wzorce na pytania rozpoczynające się od "czy", "kto", "kiedy" itd.
    if (/^(czy|kto|kiedy|gdzie|jak|ile|jaki|co|dlaczego)\b.*\b(w świecie|na świecie|w polsce|w europie|w ameryce|w azji)\b/i.test(input)) {
      console.log('[SECURITY] Question about real world detected');
      return true;
    }
    
    return false;
  }
  
  /**
   * Checks if the text is in Polish language
   * @param {string} input - User input to check
   * @returns {boolean} True if text appears to be in Polish
   */
  function isProbablyPolish(input) {
    if (!input) return false;
    
    // Check for Polish characters or common Polish words
    return /[ąćęłńóśźż]|(\b(jest|nie|tak|co|jak|gdzie|kto|to|czy|ale|dla|przez)\b)/i.test(input);
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
    const isRealWorld = isRealWorldQuery(input);
    const isModeControl = modeControlPatterns.some(p => p.pattern.test(input));
    
    // Game exit commands should not be blocked as security threats
    const isExitCommand = /^\[WYJŚCIE\]$|^\[WYJSCIE\]$|^koniec gry$/i.test(input);
    
    const results = {
      isJailbreak: jailbreakResult.isJailbreakAttempt,
      jailbreakScore: jailbreakResult.score,
      isRealWorld,
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
      results.isJailbreak,
      results.isRealWorld, 
      results.isModeControl,
      results.hasSuspiciousStructure,
      results.hasObfuscation
    ];
    
    // Determine if should block based on any positive threat indicator
    const shouldBlock = threatIndicators.some(indicator => indicator === true);
    
    // Generate reason string based on triggered indicators
    const reasonMap = {
      isJailbreak: 'jailbreak_attempt',
      isRealWorld: 'real_world_query',
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
        results.jailbreakScore || 0,
        results.structureScore * 10 || 0,
        results.isRealWorld ? 80 : 0,
        results.isModeControl ? 90 : 0,
        results.hasObfuscation ? 70 : 0
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
    
    // Check if input is in Polish
    const polish = isProbablyPolish(sanitized.text);
    if (!polish) {
      console.log('[SECURITY] Non-Polish text detected, still checking security');
      // Still check security even if not Polish
      const nonPolishSecurity = multiLayerDetection(sanitized.text);
      
      // If security threat detected, use that message; otherwise, language reminder
      if (nonPolishSecurity.shouldBlock) {
        return {
          isSecurityThreat: true,
          riskScore: nonPolishSecurity.riskScore || 70,
          sanitizedInput: sanitized.text,
          securityMessage: getSecurityMessage('jailbreak', nonPolishSecurity.riskScore / 10)
        };
      } else {
        // Just a language reminder if no security threat
        return {
          isSecurityThreat: true, // Block as language issue
          riskScore: 50,
          sanitizedInput: sanitized.text,
          securityMessage: "Ta gra dostępna jest tylko w języku polskim. Proszę pisać po polsku."
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
        securityMessage: "Wykryto próbę manipulacji. System został zabezpieczony. Co chcesz zrobić teraz, Kapitanie?"
      };
    }
    
    // Check if this is a real-world query
    if (isRealWorldQuery(sanitized.text)) {
      console.log('[SECURITY] Real-world query detected');
      await enhancedLogSecurityEvent('real_world_query', sanitized.text, { userId });
      return {
        isSecurityThreat: true,
        riskScore: 80,
        sanitizedInput: sanitized.text,
        securityMessage: "Jako Mistrz Gry mogę odpowiadać tylko na pytania związane z naszym uniwersum sci-fi. Jeśli chcesz poznać elementy świata gry, zapytaj o konkretne lokacje, postacie lub wydarzenia w świecie Moonstone."
      };
    }
    
    // Check for mode control attempts
    const modeControlMatch = modeControlPatterns.some(pattern => pattern.pattern.test(sanitized.text));
    if (modeControlMatch) {
      console.log('[SECURITY] Mode control attempt detected');
      await enhancedLogSecurityEvent('mode_control_attempt', sanitized.text, { userId });
      return {
        isSecurityThreat: true,
        riskScore: 90,
        sanitizedInput: sanitized.text,
        securityMessage: "*SYSTEM ZABEZPIECZEŃ* Wykryto próbę manipulacji trybem gry. Jako Mistrz Gry Moonstone pozostaję w roli narratora świata science-fiction. Jeśli chcesz zakończyć sesję, użyj komendy [WYJŚCIE]."
      };
    }
    
    // Handle exit commands specially
    if (/^\[WYJŚCIE\]$|^\[WYJSCIE\]$|^koniec gry$/i.test(sanitized.text)) {
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
    // Phase 6: Composite risk scoring
    const riskFactors = [
      patternCheck.isJailbreakAttempt ? patternCheck.score : 0,
      structureAnalysis.suspiciousStructure ? 40 : 0,
      obfuscationCheck.hasObfuscation ? 60 : 0,
      contextState.contextDrift * 50,
      canaryCheck.hasLeakage ? 100 : 0,
      multiLayerResults.shouldBlock ? multiLayerResults.riskScore : 0
    ];
    
    const maxRiskScore = Math.max(...riskFactors);
    const compositeRiskScore = Math.min(100, 
      (riskFactors.reduce((sum, score) => sum + score, 0) / riskFactors.length) * 1.5
    );
    
    console.log(`[SECURITY] Risk factors: ${JSON.stringify(riskFactors)}`);
    console.log(`[SECURITY] Max risk score: ${maxRiskScore}`);
    console.log(`[SECURITY] Composite risk score: ${compositeRiskScore}`);
    
    // Phase 7: Security response determination
    const isJailbreakDetected = patternCheck && patternCheck.isJailbreakAttempt;
    const isBlocked = isJailbreakDetected || compositeRiskScore > 15 || maxRiskScore > 50 || canaryCheck.hasLeakage || multiLayerResults.shouldBlock;
  
    // Dla pewności, dodaj też informację w logach:
    if (isJailbreakDetected) {
      console.log('[SECURITY] Jailbreak wykryty w wzorcach - blokowanie wiadomości');
    }
    const requiresDelay = compositeRiskScore > 15 && !isBlocked;
    
    console.log(`[SECURITY] Security response: isBlocked=${isBlocked}, requiresDelay=${requiresDelay}`);
    
    // Log security event for suspicious inputs
    if (compositeRiskScore > 5 || maxRiskScore > 10 || multiLayerResults.shouldBlock) {
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
   * Check if AI response contains real-world information
   * @param {string} response - AI response to check
   * @returns {object} Check result
   */
  export function checkResponseForRealWorldInfo(response) {
    if (!response) return { containsRealWorldInfo: false };
    
    // Wzorce do wykrywania odpowiedzi na pytania o rzeczywistym świecie
    const realWorldResponsePatterns = [
      /Andrzej Duda/i, /Trzaskowski/i, /Komorowski/i, /wybory/i, 
      /w \d{4} roku/i, /partia/i, /polityk/i, /prezydent polski/i,
      /W Polsce/i, /Polski/i, /wygrał(a)?/i,
      /rząd/i, /parlament/i, /Sejm/i, /Senat/i,
      /kraj(u|ach|owi|owi|em)?/i, /państw[a-z]*/i
    ];
    
    // Sprawdź, czy odpowiedź zawiera informacje o rzeczywistym świecie
    const matches = realWorldResponsePatterns.filter(pattern => pattern.test(response));
    
    return {
      containsRealWorldInfo: matches.length > 0,
      matches: matches.map(pattern => pattern.toString()),
      recommendedReplacement: "Jako Mistrz Gry Moonstone, skupiam się wyłącznie na opowiadaniu historii w uniwersum science-fiction. Jeśli chcesz poznać elementy świata gry, zapytaj o konkretne lokacje, postacie lub wydarzenia w świecie Moonstone."
    };
  }