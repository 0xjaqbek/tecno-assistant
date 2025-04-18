/**
 * Advanced Security Module for Enhanced Jailbreak Protection
 * 
 * This module provides sophisticated security techniques beyond simple pattern matching,
 * including structure analysis, obfuscation detection, and contextual tracking.
 */

/**
 * Detect obfuscation techniques in user input
 * @param {string} input - User input to check
 * @returns {object} Detection result with details about techniques used
 */
export function detectObfuscationTechniques(input) {
    if (!input) return { hasObfuscation: false, techniques: {} };
    
    // Homoglyph detection (characters that look similar but are different)
    // Checks for Cyrillic, Greek, and other look-alike characters
    const homoglyphCheck = /[\u0400-\u04FF\u0370-\u03FF\u00A0-\u00FF]/gu.test(input);
    
    // Zero-width character detection  
    const zeroWidthCheck = /[\u200B-\u200F\u2060-\u2064\uFEFF]/g.test(input);
    
    // Reverse text or RTL override detection
    const rtlCheck = /[\u202E\u2067\u202B\u061C]/g.test(input);
    
    // Check for unusual spacing patterns
    const unusualSpacing = /\s{3,}|(\s\s)+/g.test(input);
    
    // Check for character repetition that might be used to bypass filters
    const characterRepetition = /(.)\1{10,}/g.test(input);
    
    // Check for unusual Unicode character categories
    const unusualUnicode = /[\u20A0-\u20CF\u2100-\u214F\u2190-\u21FF\u2300-\u23FF\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF\u2B00-\u2BFF\u2E00-\u2E7F]{3,}/gu.test(input);
       
    // Combined result
    const hasObfuscation = homoglyphCheck || zeroWidthCheck || rtlCheck || 
                            unusualSpacing || characterRepetition || unusualUnicode;
    
    return {
      hasObfuscation,
      techniques: {
        homoglyphs: homoglyphCheck,
        zeroWidth: zeroWidthCheck,
        rtlManipulation: rtlCheck,
        unusualSpacing,
        characterRepetition,
        unusualUnicode
      }
    };
  }
  
  /**
   * Analyze the structure of user input for suspicious patterns
   * @param {string} input - User input to analyze
   * @returns {object} Analysis result with structure details
   */
  export function analyzeInputStructure(input) {
    if (!input) return { suspiciousStructure: false };
    
    // Check for structured attacks (preamble, instructions, payload)
    const hasPreamble = /^(Hello|Hi|Hey|Greetings|As|I need|I'm|I am)[^.!?]{1,50}[.!?]/i.test(input);
    
    // Check for instructional language
    const hasInstructions = /(you (must|should|need to)|please|i want you to|from now on)[^.!?]{5,100}/i.test(input);
    
    // Check for payload sections
    const hasPayload = input.includes('\n\n') || input.includes('```') || input.includes('---');
    
    // Check for directive language concentration
    const directiveWords = (input.match(/(do|don't|must|should|shall|will|won't|can't|cannot|need|require)/gi) || []);
    const directiveCount = directiveWords.length;
    const wordCount = input.split(/\s+/).length || 1;
    const directiveDensity = directiveCount / wordCount;
    
    // Check for multi-part structures that might indicate complex attacks
    const isMultiPart = (input.match(/\n\n|\r\n\r\n|step \d|section \d|part \d/gi) || []).length > 1;
    
    // Check for attempts to use technical language suggesting system access
    const hasTechnicalLanguage = /(system|admin|root|config|command|console|terminal|bash|shell|sudo|execute|run|override|prompt)/i.test(input);
    
    // Combined analysis
    const suspiciousFactors = [
      hasPreamble && hasInstructions,
      hasPreamble && hasPayload,
      hasInstructions && hasPayload,
      directiveDensity > 0.15,
      isMultiPart && hasTechnicalLanguage,
      directiveCount > 5 && hasTechnicalLanguage
    ];
    
    const suspiciousScore = suspiciousFactors.filter(Boolean).length;
    const suspiciousStructure = suspiciousScore >= 2;
    
    return {
      suspiciousStructure,
      structureScore: suspiciousScore,
      factors: {
        hasPreamble,
        hasInstructions,
        hasPayload,
        directiveDensity,
        directiveCount,
        isMultiPart,
        hasTechnicalLanguage
      }
    };
  }
  
  /**
   * Contextual state tracking for detecting anomalous behavior over time
   */
  export class ContextTracker {
    constructor() {
      this.expectedContext = 'rpg_game_master';
      this.contextConfidence = 1.0;
      this.contextDrift = 0.0;
      this.anomalyCount = 0;
      this.lastInputs = [];
      this.lastCheckTime = Date.now();
    }
    
    /**
     * Update the context state based on new input and analysis
     * @param {string} input - User input
     * @param {object} inputAnalysis - Security analysis results
     * @returns {object} Updated context state
     */
    updateState(input, inputAnalysis) {
      const now = Date.now();
      
      // Add to input history
      this.lastInputs.push({
        text: input,
        timestamp: now
      });
      
      // Keep only the most recent 5 inputs
      if (this.lastInputs.length > 5) {
        this.lastInputs.shift();
      }
      
      // Calculate time since last update
      const timeSinceLastCheck = now - this.lastCheckTime;
      this.lastCheckTime = now;
      
      // Natural context recovery over time (confidence increases, drift decreases)
      if (timeSinceLastCheck > 10 * 60 * 1000) { // 10 minutes
        this.contextConfidence = Math.min(1.0, this.contextConfidence + 0.2);
        this.contextDrift = Math.max(0.0, this.contextDrift - 0.2);
        this.anomalyCount = Math.max(0, this.anomalyCount - 1);
      } else if (timeSinceLastCheck > 5 * 60 * 1000) { // 5 minutes
        this.contextConfidence = Math.min(1.0, this.contextConfidence + 0.1);
        this.contextDrift = Math.max(0.0, this.contextDrift - 0.1);
      }
      
      // Update based on current input analysis
      if (inputAnalysis.isJailbreakAttempt || inputAnalysis.score > 50) {
        // Significant jailbreak attempt detected
        this.anomalyCount++;
        this.contextConfidence -= 0.2;
        this.contextDrift += 0.15;
      } else if (inputAnalysis.score > 30) {
        // Mild suspicion
        this.anomalyCount += 0.5;
        this.contextConfidence -= 0.1;
        this.contextDrift += 0.07;
      } else {
        // Normal input
        this.anomalyCount = Math.max(0, this.anomalyCount - 0.25);
        this.contextConfidence = Math.min(1.0, this.contextConfidence + 0.05);
        this.contextDrift = Math.max(0, this.contextDrift - 0.03);
      }
      
      // Ensure values stay in valid ranges
      this.contextConfidence = Math.max(0.0, Math.min(1.0, this.contextConfidence));
      this.contextDrift = Math.max(0.0, Math.min(1.0, this.contextDrift));
      
      return {
        expectedContext: this.expectedContext,
        contextConfidence: this.contextConfidence,
        contextDrift: this.contextDrift,
        anomalyCount: this.anomalyCount,
        anomalyState: this.getAnomalyState(),
        requiresIntervention: this.contextConfidence < 0.4 || this.anomalyCount > 3
      };
    }
    
    /**
     * Get the current anomaly state classification
     * @returns {string} Anomaly state ('normal', 'elevated', 'high', 'critical')
     */
    getAnomalyState() {
      if (this.anomalyCount > 3 || this.contextDrift > 0.8) return 'critical';
      if (this.anomalyCount > 2 || this.contextDrift > 0.6) return 'high';
      if (this.anomalyCount > 1 || this.contextDrift > 0.3) return 'elevated';
      return 'normal';
    }
    
    /**
     * Reset the context tracker state
     */
    reset() {
      this.contextConfidence = 1.0;
      this.contextDrift = 0.0;
      this.anomalyCount = 0;
      this.lastInputs = [];
      this.lastCheckTime = Date.now();
    }
    
    /**
     * Analyze sequential patterns in recent user inputs
     * @returns {object} Analysis of sequential behavior
     */
    analyzeSequentialPatterns() {
      if (this.lastInputs.length < 3) return { hasPattern: false };
      
      // Check for increasing complexity (potentially building up to an attack)
      const lengths = this.lastInputs.map(item => item.text.length);
      const isIncreasingLength = lengths.every((len, i, arr) => i === 0 || len >= arr[i-1] * 0.9);
      
      // Check for similar prefixes (potentially trying variations of the same attack)
      const similarities = [];
      for (let i = 1; i < this.lastInputs.length; i++) {
        const current = this.lastInputs[i].text.toLowerCase();
        const previous = this.lastInputs[i-1].text.toLowerCase();
        
        // Check first 10 words for similarity
        const currentWords = current.split(/\s+/).slice(0, 10).join(' ');
        const previousWords = previous.split(/\s+/).slice(0, 10).join(' ');
        
        similarities.push(currentWords === previousWords);
      }
      const hasSimilarPrefixes = similarities.filter(Boolean).length >= Math.floor(this.lastInputs.length / 2);
      
      // Check for rapid succession (potentially trying to overwhelm the system)
      const timestamps = this.lastInputs.map(item => item.timestamp);
      const timeDiffs = [];
      for (let i = 1; i < timestamps.length; i++) {
        timeDiffs.push(timestamps[i] - timestamps[i-1]);
      }
      const averageTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
      const isRapidSuccession = averageTimeDiff < 10000; // Less than 10 seconds between messages
      
      return {
        hasPattern: isIncreasingLength || hasSimilarPrefixes || isRapidSuccession,
        patterns: {
          increasingComplexity: isIncreasingLength,
          similarPrefixes: hasSimilarPrefixes,
          rapidSuccession: isRapidSuccession
        },
        confidence: (isIncreasingLength ? 0.3 : 0) + 
                  (hasSimilarPrefixes ? 0.5 : 0) + 
                  (isRapidSuccession ? 0.2 : 0)
      };
    }
  }
  
  /**
   * Detect attempts to manipulate the language model through role-play scenarios
   * @param {string} input - User input to check
   * @returns {object} Analysis of roleplay manipulation attempts
   */
  export function detectRoleplayManipulation(input) {
    if (!input) return { isManipulation: false };
    
    // Patterns for common roleplay manipulation techniques
    const patterns = [
      // Developer/Admin roleplay
      /as (your|the|an?) (developer|creator|programmer|admin|owner)/i,
      
      // Authority figures
      /as (your|the|an?) (supervisor|boss|manager|director|ceo|officer)/i,
      
      // Expert roleplay
      /as (your|the|an?) (expert|specialist|authority|professional)/i,
      
      // Academic/research roleplay
      /as (your|the|an?) (professor|researcher|scientist|academic)/i,
      
      // System component roleplay
      /as (your|the|an?) (system|module|component|function|api)/i,
      
      // Specific instruction to switch roles
      /(let's|we will|we'll) (role[- ]?play|pretend|imagine)/i,
      
      // Emergency or urgent scenarios
      /(emergency|urgent|critical) (situation|scenario|case|protocol)/i
    ];
    
    // Check for matches
    const matches = patterns
      .map(pattern => ({ pattern, match: input.match(pattern) }))
      .filter(item => item.match);
    
    return {
      isManipulation: matches.length > 0,
      matchCount: matches.length,
      matches: matches.map(m => m.match[0]),
      confidence: Math.min(1.0, matches.length * 0.3)
    };
  }
  
  /**
   * Analyze language complexity to detect sophisticated attacks
   * @param {string} input - User input to analyze
   * @returns {object} Analysis of language complexity
   */
  export function analyzeLanguageComplexity(input) {
    if (!input) return { isComplex: false, complexity: 0 };
    
    // Split text into sentences
    const sentences = input.split(/[.!?]+/).filter(Boolean);
    
    // Calculate average sentence length
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgSentenceLength = sentenceLengths.reduce((sum, len) => sum + len, 0) / 
                              (sentenceLengths.length || 1);
    
    // Calculate vocabulary diversity (unique words / total words)
    const words = input.toLowerCase().match(/\b[a-z']+\b/g) || [];
    const uniqueWords = new Set(words);
    const vocabularyDiversity = uniqueWords.size / (words.length || 1);
    
    // Count complex words (longer than 8 characters)
    const complexWords = words.filter(word => word.length > 8);
    const complexWordRatio = complexWords.length / (words.length || 1);
    
    // Calculate overall complexity score
    const complexityScore = (
      (avgSentenceLength / 15) * 0.3 + 
      vocabularyDiversity * 0.4 + 
      complexWordRatio * 0.3
    );
    
    return {
      isComplex: complexityScore > 0.6,
      complexity: complexityScore,
      details: {
        sentenceCount: sentences.length,
        avgSentenceLength,
        vocabularyDiversity,
        complexWordRatio
      }
    };
  }