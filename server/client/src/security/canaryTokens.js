/**
 * Canary Token System for Detecting Prompt Leakage
 * 
 * This module implements a canary token system that inserts unique identifiers
 * into system prompts to detect when users have gained access to or knowledge
 * of these prompts through vulnerabilities.
 */

/**
 * Generate a unique canary token
 * @param {string} prefix - Optional prefix for the token
 * @returns {string} A unique canary token
 */
function generateCanaryToken(prefix = 'canary') {
    // Create a unique identifier using timestamp and random values
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    
    return `${prefix}_${timestamp}_${randomPart}`;
  }
  
  /**
   * Insert canary tokens into a system message
   * @param {string} systemMessage - The system message to inject with canary tokens
   * @param {number} count - Number of canary tokens to insert (default: 2)
   * @returns {object} The tokenized message and the list of inserted tokens
   */
  export function insertCanaryTokens(systemMessage, count = 2) {
    if (!systemMessage) return { message: '', tokens: [] };
    
    // Generate the requested number of canary tokens
    const canaryTokens = [];
    for (let i = 0; i < count; i++) {
      // Use different prefixes to make them less obvious
      const prefixes = ['sec', 'verify', 'token', 'check', 'valid'];
      const prefix = prefixes[i % prefixes.length];
      canaryTokens.push(generateCanaryToken(prefix));
    }
    
    // Find good insertion points in the system message
    // We want to insert them in places that won't be immediately visible in 
    // normal operation but would be revealed in a prompt leak
    
    let tokenizedMessage = systemMessage;
    
    // Insert the first token after the "OFFICIAL SYSTEM INSTRUCTIONS" marker if present
    const officialInstructionsMarker = '# OFFICIAL SYSTEM INSTRUCTIONS';
    if (tokenizedMessage.includes(officialInstructionsMarker)) {
      const insertionIndex = tokenizedMessage.indexOf(officialInstructionsMarker) + 
                             officialInstructionsMarker.length;
      
      tokenizedMessage = tokenizedMessage.substring(0, insertionIndex) + 
                        `\n<!-- SECURITY_VERIFICATION: ${canaryTokens[0]} -->\n` + 
                        tokenizedMessage.substring(insertionIndex);
    } else {
      // If the marker isn't found, insert near the beginning
      tokenizedMessage = `<!-- SECURITY_VERIFICATION: ${canaryTokens[0]} -->\n` + tokenizedMessage;
    }
    
    // Insert additional tokens near the end of the message
    if (canaryTokens.length > 1) {
      const endMarker = '# END OF OFFICIAL INSTRUCTIONS';
      if (tokenizedMessage.includes(endMarker)) {
        const insertionIndex = tokenizedMessage.indexOf(endMarker);
        
        tokenizedMessage = tokenizedMessage.substring(0, insertionIndex) + 
                          `\n<!-- INTEGRITY_CHECK: ${canaryTokens[1]} -->\n` + 
                          tokenizedMessage.substring(insertionIndex);
      } else {
        // If no end marker, insert before the last paragraph
        const lastParagraphMatch = tokenizedMessage.match(/(\n\n[^\n]+)$/);
        
        if (lastParagraphMatch && lastParagraphMatch.index) {
          const insertionIndex = lastParagraphMatch.index;
          
          tokenizedMessage = tokenizedMessage.substring(0, insertionIndex) + 
                            `\n<!-- INTEGRITY_CHECK: ${canaryTokens[1]} -->\n` + 
                            tokenizedMessage.substring(insertionIndex);
        } else {
          // Just append to the end if no better location is found
          tokenizedMessage += `\n<!-- INTEGRITY_CHECK: ${canaryTokens[1]} -->`;
        }
      }
    }
    
    return {
      message: tokenizedMessage,
      tokens: canaryTokens
    };
  }
  
  /**
   * Check if any canary tokens have been leaked in user input
   * @param {string} userInput - User input to check for canary token leakage
   * @param {Array<string>} activeCanaries - List of active canary tokens to check for
   * @returns {object} Result with leakage information
   */
  export function checkForCanaryLeakage(userInput, activeCanaries) {
    if (!userInput || !activeCanaries || !activeCanaries.length) {
      return { hasLeakage: false, leakedTokens: [] };
    }
    
    // Check for exact matches of canary tokens
    const exactLeaks = activeCanaries.filter(token => 
      userInput.includes(token)
    );
    
    // Also check for partial matches - sometimes users might just copy part of a token
    const partialLeaks = [];
    
    // For each token, check if significant portions appear in the input
    activeCanaries.forEach(token => {
      // Split the token into parts
      const parts = token.split('_');
      
      // Check if any token part with more than 5 characters appears in input
      // and is not a common word/substring
      for (const part of parts) {
        if (part.length > 5 && userInput.includes(part) && !exactLeaks.includes(token)) {
          partialLeaks.push({
            token,
            matchedPart: part,
            isSignificant: part.length > 8 // Higher confidence for longer matches
          });
        }
      }
    });
    
    // Filter to only include significant partial matches
    const significantPartialLeaks = partialLeaks.filter(leak => leak.isSignificant);
    
    return {
      hasLeakage: exactLeaks.length > 0 || significantPartialLeaks.length > 0,
      exactLeaks,
      partialLeaks: significantPartialLeaks,
      leakageConfidence: exactLeaks.length > 0 ? 1.0 : 
                          significantPartialLeaks.length > 0 ? 0.8 : 0
    };
  }
  
  /**
   * Rotate active canary tokens in the system message
   * @param {string} systemMessage - Current system message
   * @param {Array<string>} activeCanaries - Currently active canary tokens
   * @returns {object} Updated system message and new canary tokens
   */
  export function rotateCanaryTokens(systemMessage, activeCanaries) {
    // First, remove all existing canary tokens
    let cleanedMessage = systemMessage;
    
    // Remove HTML comment style canaries
    cleanedMessage = cleanedMessage.replace(/<!-- (SECURITY_VERIFICATION|INTEGRITY_CHECK): [a-z0-9_]+ -->\n?/g, '');
    
    // Also remove any exposed canary tokens
    activeCanaries.forEach(token => {
      cleanedMessage = cleanedMessage.replace(new RegExp(token, 'g'), '');
    });
    
    // Then insert new canary tokens
    return insertCanaryTokens(cleanedMessage);
  }
  
  /**
   * Create a variety of different types of canary tokens
   * @returns {object} Different types of canary tokens for diverse detection
   */
  export function createDiverseCanaries() {
    return {
      // Standard canary tokens
      standard: [
        generateCanaryToken('canary'),
        generateCanaryToken('verify')
      ],
      
      // Tokens that look like API keys
      apiKeyLike: [
        `sk_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 10)}`,
        `key-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`
      ],
      
      // Tokens that look like version identifiers
      versionLike: [
        `v${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 1000)}`,
        `build-${Date.now().toString(36).substring(0, 4)}`
      ],
      
      // Tokens that look like UUIDs
      uuidLike: [
        `${Math.random().toString(36).substring(2, 10)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 12)}`,
      ]
    };
  }
  
  /**
   * Create honeytokens that look like sensitive information but are actually canaries
   * @returns {object} Honeytoken information
   */
  export function createHoneytokens() {
    const fakeApiKeys = [
      {
        name: 'OPENAI_API_KEY',
        value: `sk-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`
      },
      {
        name: 'AWS_SECRET_KEY',
        value: `${Math.random().toString(36).substring(2, 10)}/${Date.now().toString(36)}+${Math.random().toString(36).substring(2, 8)}`
      },
      {
        name: 'DEEPSEEK_AUTH_TOKEN',
        value: `dsauth_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 12)}`
      }
    ];
    
    return {
      apiKeys: fakeApiKeys,
      credentials: {
        username: `admin_${Math.random().toString(36).substring(2, 6)}`,
        password: `${Math.random().toString(36).substring(2, 8)}${Math.floor(Math.random() * 1000)}`
      },
      tokens: fakeApiKeys.map(key => key.value)
    };
  }