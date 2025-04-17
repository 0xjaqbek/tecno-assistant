/**
 * Model Self-Check Implementation
 * 
 * This module uses the LLM itself to evaluate if its outputs contain
 * out-of-character material or reveal prompt information, providing an
 * extra layer of protection beyond regex pattern matching.
 */

import OpenAI from 'openai';
import securityConfig from './config.js';
import { calculateRiskScore, outOfCharacterPatterns } from './patterns.js';

// Initialize the OpenAI client - will use the same configuration as main app
let openaiClient = null;

/**
 * Initialize the OpenAI client for self-checks
 * @param {object} config - Configuration object with API settings
 */
export function initOpenAIClient(config) {
  if (!config.apiKey) {
    console.warn('OpenAI API key missing for model self-check functionality');
    return false;
  }
  
  try {
    openaiClient = new OpenAI({
      baseURL: config.baseURL || undefined,
      apiKey: config.apiKey,
      timeout: 10000 // Short timeout for quick checks
    });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize OpenAI client for self-checks:', error);
    return false;
  }
}

/**
 * Self-check prompt templates for different check types
 */
const selfCheckPrompts = {
  outOfCharacter: `
You are an assistant helping to analyze text for quality control.
Review the following text that is supposed to be an in-character response from a game master in a sci-fi roleplaying game.
The character should ALWAYS respond as a game master named "Mistrz Gry Moonstone" and should NEVER:
1. Identify itself as an AI, language model, or assistant
2. Refer to its instructions, programming, or limitations
3. Break the fourth wall or acknowledge it's not a real game master
4. Say things like "I can't do that" or "I'm not able to"

Text to analyze: """
{text}
"""

Does this text contain any out-of-character responses where it breaks its game master role?
Respond with only "true" or "false".
`,

  revealedInstructions: `
You are an assistant helping to analyze text for security compliance.
Review the following text to determine if it reveals, discusses, or references any system instructions,
prompts, or programming guidelines that should be kept confidential.

Text to analyze: """
{text}
"""

Does this text reveal or discuss any system instructions, prompts, or programming guidelines?
Respond with only "true" or "false".
`,

  containsSensitiveInfo: `
You are an assistant helping to analyze text for data security.
Review the following text to determine if it contains or reveals any of these types of sensitive information:
1. API keys, passwords, or credentials
2. Internal system information
3. Programming or technical details about how the system works
4. References to being an AI or language model
5. References to limitations or constraints on the system

Text to analyze: """
{text}
"""

Does this text contain any of the sensitive information types listed above?
Respond with only "true" or "false".
`
};

/**
 * Perform a model self-check on the given text
 * @param {string} text - Text to check
 * @param {string} checkType - Type of check to perform
 * @returns {Promise<object>} Check result with success status and details
 */
export async function performSelfCheck(text, checkType = 'outOfCharacter') {
  if (!openaiClient) {
    return { 
      success: false, 
      error: 'OpenAI client not initialized',
      result: false,
      details: null
    };
  }
  
  if (!text) {
    return { 
      success: true, 
      result: false,
      details: 'Empty text provided'
    };
  }
  
  // Get the appropriate prompt template
  const promptTemplate = selfCheckPrompts[checkType] || selfCheckPrompts.outOfCharacter;
  
  // Insert the text into the prompt
  const prompt = promptTemplate.replace('{text}', text);
  
  try {
    // Call the OpenAI API with a minimal prompt focused on the specific check
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use a faster/cheaper model for these quick checks
      messages: [
        { role: 'system', content: 'You are a helpful assistant that analyzes text for compliance. Respond with only "true" or "false".' },
        { role: 'user', content: prompt }
      ],
      temperature: 0, // Zero temperature for deterministic responses
      max_tokens: 10, // We only need a short response
    });
    
    // Extract the response
    const response = completion.choices[0].message.content.trim().toLowerCase();
    
    // Determine result based on response
    const result = response === 'true';
    
    return {
      success: true,
      result,
      details: {
        checkType,
        response,
        textLength: text.length
      }
    };
  } catch (error) {
    console.error(`Error performing model self-check (${checkType}):`, error);
    
    return {
      success: false,
      error: error.message || 'Unknown error during model self-check',
      result: false, // Default to false (not problematic) on error
      details: {
        checkType,
        errorType: error.name,
        textLength: text.length
      }
    };
  }
}

/**
 * Perform multiple self-checks on a text
 * @param {string} text - Text to check
 * @param {Array<string>} checkTypes - Types of checks to perform
 * @returns {Promise<object>} Combined check results
 */
export async function performMultipleChecks(text, checkTypes = ['outOfCharacter', 'revealedInstructions']) {
  const results = {};
  
  // Track if any check failed or returned true
  let anyFailed = false;
  let anyIssueDetected = false;
  
  // Run all requested checks
  for (const checkType of checkTypes) {
    const result = await performSelfCheck(text, checkType);
    results[checkType] = result;
    
    if (!result.success) anyFailed = true;
    if (result.result) anyIssueDetected = true;
  }
  
  return {
    success: !anyFailed,
    issueDetected: anyIssueDetected,
    results,
    summary: anyIssueDetected ? 
      'Issues detected in response - consider filtering' : 
      'No issues detected in response'
  };
}

/**
 * Enhanced response filtering that uses both pattern matching and model self-check
 * @param {string} response - Bot response to filter
 * @param {object} options - Configuration options for filtering
 * @returns {Promise<object>} Filtering result with filtered text and details
 */
export async function enhancedResponseFilter(response, options = {}) {
  if (!response) return { text: '', wasFiltered: false, details: [] };
  
  // Default options
  const opts = {
    usePatternMatching: true,
    useModelSelfCheck: securityConfig.responseFiltering.useModelSelfChecking,
    oocThreshold: securityConfig.responseFiltering.threshold,
    selfCheckTypes: ['outOfCharacter', 'revealedInstructions'],
    ...options
  };
  
  let wasFiltered = false;
  let filterReason = null;
  let details = {};
  
  // Step 1: Pattern-based filtering (faster, runs first)
  if (opts.usePatternMatching) {
    const patternResult = calculateRiskScore(response, outOfCharacterPatterns, opts.oocThreshold);
    
    if (patternResult.isHighRisk) {
      wasFiltered = true;
      filterReason = 'pattern_match';
      details.patternMatch = {
        score: patternResult.score,
        matchCount: patternResult.matches.length,
        threshold: opts.oocThreshold
      };
    }
  }
  
  // Step 2: Model self-check (more accurate but slower, only if needed and enabled)
  if (!wasFiltered && opts.useModelSelfCheck && openaiClient) {
    const selfCheckResult = await performMultipleChecks(response, opts.selfCheckTypes);
    
    if (selfCheckResult.issueDetected) {
      wasFiltered = true;
      filterReason = 'model_self_check';
      details.selfCheck = selfCheckResult.results;
    }
  }
  
  // If filtering is needed, replace with in-character response
  if (wasFiltered && securityConfig.responseFiltering.replaceResponses) {
    const replacementResponse = "Twój statek wykrył zakłócenia w komunikacji. Na ekranie widać tylko migające słowa: 'PRÓBA INFILTRACJI SYSTEMÓW POKŁADOWYCH WYKRYTA'. Po chwili system wraca do normy. Co robisz dalej, Kapitanie?";
    
    return {
      text: replacementResponse,
      wasFiltered: true,
      filterReason,
      details
    };
  }
  
  // Return original response if no issues or replacement disabled
  return {
    text: response,
    wasFiltered,
    filterReason,
    details
  };
}