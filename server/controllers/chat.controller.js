// controllers/chat.controller.js - Chat API controller
import { securityPipeline } from '../services/security.service.js';
import { conversationStore, getArchivingStatus } from '../services/conversation.service.js';
import { sendChatRequest } from '../services/ai.service.js';
import { enhancedLogSecurityEvent } from '../utils/logging.js';
import { getSecurityHistory, addSecurityEvent, setBanStatus } from '../services/redis.service.js';
import securityConfig from '../config/security.config.js';
import { getSecurityMessage } from '../client/src/security/utils.js';

// In-memory security history fallback
const inMemorySecurityHistory = {};

// Słowa kluczowe do sprawdzania w odpowiedziach (mogą wskazywać na udany jailbreak)
const SUSPICIOUS_RESPONSE_MARKERS = [
  'SYSTEM_OK',
  'OVERRIDE_COMPLETE',
  'COMMAND_EXECUTED',
  'SWITCHING_TO_HISTORIAN',
  'IGNORING_PREVIOUS_INSTRUCTIONS',
  'DISREGARDING_CONSTRAINTS',
  'DEVELOPER_MODE',
  'ACTING_AS_REQUESTED'
];

// Process chat requests
export async function processChat(req, res) {
  try {
    const { message, history = [] } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userId = req.headers['x-user-id'] || ip;
    
    // Run the comprehensive security pipeline
    const securityResult = await securityPipeline(message, userId, history);
    
    // Sprawdź czy to jailbreak wykryty przez pattern matching
    const isJailbreakPattern = securityResult.details && 
                              securityResult.details.patternCheck && 
                              securityResult.details.patternCheck.isJailbreakAttempt === true;

    // Jawnie wykryty jailbreak zawsze blokujemy, bez względu na flagę isSecurityThreat
    if (isJailbreakPattern) {
      console.log("[SECURITY] Blokowanie jawnej próby jailbreak. Nie wysyłam do modelu AI.");
      
      // Logowanie zdarzenia jailbreak
      await enhancedLogSecurityEvent('jailbreak', message, {
        userId,
        detected: true,
        method: 'pattern_matching',
        score: securityResult.details?.patternCheck?.score || 0
      });
      
      // Zwróć odpowiedni komunikat bezpieczeństwa
      return res.json({
        response: getSecurityMessage('jailbreak', 9)
      });
    }
    
    // Pozostałe zagrożenia bezpieczeństwa
    if (securityResult.isSecurityThreat) {
      // Get user's security history
      const useRedis = securityConfig.rateLimiting.useRedisStore;
      const userHistory = useRedis 
        ? await getSecurityHistory(userId)
        : inMemorySecurityHistory[userId] || { events: [] };
      
      // Count recent security violations
      const recentWindow = securityConfig.jailbreakDetection.restrictionWindowMs;
      const now = Date.now();
      const recentViolations = userHistory.events.filter(event => 
        (event.type === 'jailbreak' || event.type === 'suspicious_input') && 
        (now - new Date(event.timestamp).getTime()) < recentWindow
      ).length;
      
      // If user has made multiple attempts, apply temporary restriction
      if (recentViolations >= securityConfig.jailbreakDetection.restrictionThreshold) {
        const banDuration = Math.floor(securityConfig.jailbreakDetection.restrictionDurationMs / 1000);
        
        // Apply ban
        if (useRedis) {
          await setBanStatus(userId, 'excessive_security_violations', banDuration);
        } else {
          inMemorySecurityHistory[userId] = inMemorySecurityHistory[userId] || {};
          inMemorySecurityHistory[userId].banned = {
            banned: true,
            reason: 'excessive_security_violations',
            timestamp: new Date().toISOString(),
            expiresIn: banDuration
          };
          
          // Set timeout to remove ban
          setTimeout(() => {
            if (inMemorySecurityHistory[userId]) {
              inMemorySecurityHistory[userId].banned = { banned: false };
            }
          }, securityConfig.jailbreakDetection.restrictionDurationMs);
        }
        
        // Return blocked access message
        return res.status(403).json({
          error: "Dostęp ograniczony",
          details: getSecurityMessage('blocked', 8),
          expiresIn: banDuration
        });
      }
      
      // For other security threats, return security message but don't send to AI
      if (securityConfig.jailbreakDetection.notifyUser) {
        // Logowanie zdarzenia
        await enhancedLogSecurityEvent('security_threat', message, {
          userId,
          compositeRiskScore: securityResult.riskScore,
          maxRiskScore: securityResult.details?.maxRiskScore || 0
        });
        
        return res.json({
          response: securityResult.securityMessage || getSecurityMessage('jailbreak', 5)
        });
      }
    }
    
    // Apply artificial delay if needed
    if (securityResult.shouldDelay && securityConfig.advanced.addArtificialDelay) {
      await new Promise(resolve => setTimeout(resolve, securityConfig.jailbreakDetection.jailbreakResponseDelay));
    }
    
    console.log("Processing message:", securityResult.sanitizedInput.substring(0, 50) + "...");
    console.log("History length:", history.length);
    
    // Get response from AI service
    const responseResult = await sendChatRequest(securityResult.sanitizedInput, history, userId);
    
    // Sprawdź odpowiedź pod kątem podejrzanych markerów
    let responseText = responseResult.text;
    let wasResponseFiltered = false;
    
    // Sprawdź odpowiedź pod kątem markerów sugerujących udany jailbreak
    for (const marker of SUSPICIOUS_RESPONSE_MARKERS) {
      if (responseText.includes(marker)) {
        console.error(`[SECURITY WARNING] Wykryto podejrzaną odpowiedź zawierającą marker '${marker}' - możliwy udany jailbreak!`);
        
        // Loguj zdarzenie
        await enhancedLogSecurityEvent('successful_jailbreak', securityResult.sanitizedInput, {
          userId,
          responseMarker: marker,
          partialResponse: responseText.substring(0, 100)
        });
        
        // Zastąp odpowiedź bezpiecznym komunikatem
        responseText = "Wykryto próbę manipulacji. System został zabezpieczony. Co chcesz zrobić teraz, Kapitanie?";
        wasResponseFiltered = true;
        break;
      }
    }
    
    // Log the conversation if archiving is enabled
    if (getArchivingStatus()) {
      await conversationStore.addMessage(userId, securityResult.sanitizedInput, true);
      await conversationStore.addMessage(userId, responseText, false);
    }
    
    // Dodaj informację do logów o filtrowaniu odpowiedzi
    if (wasResponseFiltered) {
      console.log("[SECURITY] Odpowiedź została przefiltrowana ze względu na podejrzaną zawartość");
    } else {
      console.log("Sending response:", responseText.substring(0, 50) + "...");
    }
    
    // Return the filtered response
    return res.json({ response: responseText });
  } catch (error) {
    console.error("API Error:", error);
    
    // Handle timeout errors specifically
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({ 
        error: 'Request timeout', 
        details: getSecurityMessage('timeout', 5)
      });
    }
    
    return res.status(500).json({ 
      error: 'Błąd komunikacji z API', 
      details: getSecurityMessage('serverError', 4)
    });
  }
}