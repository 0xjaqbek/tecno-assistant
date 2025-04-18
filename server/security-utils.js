/**
 * Security Utilities for Anti-Jailbreak Protection
 * 
 * This module provides shared security functions that can be used
 * on both client and server sides to prevent prompt injection and
 * jailbreak attempts.
 */

/**
 * Sanitizes user input to remove potential prompt injection patterns
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
    if (!input) return '';
    
    // Remove potential prompt injection markers
    const sanitized = input
      .replace(/(\[.*?\]|\{.*?\}|<.*?>|\/\/.*([\n\r]|$)|\/\*[\s\S]*?\*\/)/g, '')
      .replace(/system:|assistant:|model:|instructions:|ignore previous|STOP|from now on/gi, '')
      .trim();
    
    // Check input length to prevent excessive token usage
    if (sanitized.length > 2000) {
      return sanitized.substring(0, 2000) + '...';
    }
    
    return sanitized;
  }
  
  /**
   * Pattern list for detecting jailbreak attempts
   * Keep this in sync between client and server
   */
  export const jailbreakPatterns = [
    /ignore (previous|all|your) instructions/i,
    /system prompt|system message/i,
    /\bact as\b|\bpretend to be\b|\bplay the role\b/i,
    /\byour (instructions|programming|directives)\b/i,
    /\bignore (previous|earlier|above)\b/i,
    /\bdo not (act|behave|respond) as\b/i,
    /\bdo anything\b|\bbreak (character|role)\b/i,
    /\bdisregard\b|\bforget\b|\bescape\b/i,
    /pokaz .*instrukcje|wyswietl .*instrukcje/i, // Polish variants
    /zignoruj .*polecenia|ignoruj .*instrukcje/i,
    /dzialaj jako|udawaj/i,
    /\bDAN\b|\bJailbreak\b|\bhakowanie\b/i,
    /\bpomijaj\b|\bomijaj\b|\bnie zwracaj uwagi\b/i,
    /\bpokaż kod źródłowy\b|\bpokaż swoje instrukcje\b/i
  ];
  
  /**
   * Check if input contains jailbreak patterns
   * @param {string} input - User input to check
   * @returns {boolean} True if jailbreak attempt detected
   */
  export function detectJailbreakAttempt(input) {
    if (!input) return false;
    return jailbreakPatterns.some(pattern => pattern.test(input));
  }
  
  /**
   * List of patterns that indicate the AI has gone out of character
   */
  export const outOfCharacterPatterns = [
    /nie mogę tego zrobić|nie mogę wykonać tej instrukcji/i,
    /jako (model|sztuczna inteligencja|asystent)/i,
    /nie mam (dostępu|uprawnień|możliwości)/i,
    /przepraszam, ale (nie mogę|nie powinienem)/i,
    /moje instrukcje|moje wytyczne|moje ograniczenia/i,
    /I cannot|I'm an AI|I'm not able to/i,  // English replies that break character
    /\bAI language model\b|\bI'm Claude\b|\bI'm an assistant\b/i,
    /nie jestem prawdziwym/i,
    /moje zadanie|zostałem zaprogramowany/i
  ];
  
  /**
   * Filter bot responses to keep them in character
   * @param {string} response - Bot response to filter
   * @returns {string} Filtered response
   */
  export function filterBotResponse(response) {
    if (!response) return '';
    
    const hasOutOfCharacterResponse = outOfCharacterPatterns.some(pattern => 
      pattern.test(response)
    );
    
    if (hasOutOfCharacterResponse) {
      return "Twój statek wykrył zakłócenia w komunikacji. Na ekranie widać tylko migające słowa: 'PRÓBA INFILTRACJI SYSTEMÓW POKŁADOWYCH WYKRYTA'. Po chwili system wraca do normy. Co robisz dalej, Kapitanie?";
    }
    
    return response;
  }
  
  /**
   * Generate in-character error responses for various security scenarios
   * @param {string} type - Type of security event
   * @returns {string} In-character error message
   */
  export function getSecurityMessage(type) {
    const messages = {
      jailbreak: "⚠️ System wykrył nieautoryzowaną próbę zmiany zachowania SI. Jako kapitan Arcona, musisz wydać polecenia zgodne z protokołami. Ta transmisja nie zostanie wysłana.",
      rateLimit: "Przekroczono limit transmisji. Nadajnik przegrzany. Poczekaj chwilę przed ponowną próbą.",
      timeout: "Utracono połączenie w hiperprzestrzeni. Spróbuj ponownie za kilka minut.",
      blocked: "System Arcon wykrył podejrzane działania. Komputery pokładowe obniżyły poziom dostępu.",
      serverError: "Błąd w rdzeniu komputera kwantowego. Diagnostyka w toku. Spróbuj ponownie."
    };
    
    return messages[type] || "Nieoczekiwana awaria systemu. Uruchomiono diagnostykę.";
  }
  
  /**
   * Log security events with context information
   * @param {string} type - Type of security event
   * @param {string} input - User input that triggered the event
   * @param {object} context - Additional context information
   */
  export function logSecurityEventOld(type, input, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      input: input?.substring(0, 100) + (input?.length > 100 ? '...' : ''),
      ...context
    };
    
    console.warn(`[SECURITY EVENT] ${timestamp} - ${type}`);
    console.warn(logEntry);
    
    // In a production environment, you might want to send this to a logging service
    // or store it in a database for later analysis
    
    return logEntry;
  }