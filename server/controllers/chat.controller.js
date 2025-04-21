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
    
    // Używamy stałego identyfikatora sesji lub ID z sesji, aby utrzymać spójność konwersacji
    // Jeśli nie ma sesji, używamy IP z dodatkowym stałym prefiksem

    const userId = 'user-' + ip;
    
    console.log(`Processing chat request for userId: ${userId}`);
    
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
    
    // Obsługa nieoczekiwanych timeoutów - implementacja asynchronicznego mechanizmu odpowiedzi
    let timeoutOccurred = false;
    let aiResponse = null;
    
    // Ustawiamy flagę, która określi czy mieliśmy timeout czy nie
    const timeoutHandler = setTimeout(() => {
      timeoutOccurred = true;
      // Zwróć tymczasową odpowiedź informującą o przetwarzaniu
      res.json({ 
        response: "Przetwarzanie wiadomości zajmuje więcej czasu niż zwykle. Proszę czekać na odpowiedź...",
        processing: true
      });
    }, 25000); // Ustaw na nieco poniżej limitu 30s Heroku
    
    try {
      // Get response from AI service
      const responseResult = await sendChatRequest(securityResult.sanitizedInput, history, userId);
      aiResponse = responseResult;
      
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
      
      // Wyczyść timeout - odpowiedź została pomyślnie otrzymana
      clearTimeout(timeoutHandler);
      
      // Log the conversation if archiving is enabled
      if (getArchivingStatus()) {
        // Najpierw zawsze archiwizujemy wiadomość użytkownika
        await conversationStore.addMessage(userId, securityResult.sanitizedInput, true);
        
        // Następnie zapisujemy odpowiedź od AI
        await conversationStore.addMessage(userId, responseText, false);
      }
      
      // Dodaj informację do logów o filtrowaniu odpowiedzi
      if (wasResponseFiltered) {
        console.log("[SECURITY] Odpowiedź została przefiltrowana ze względu na podejrzaną zawartość");
      } else {
        console.log("Sending response:", responseText.substring(0, 50) + "...");
      }
      
      // Jeśli timeout już wystąpił, nie wysyłaj odpowiedzi ponownie
      if (!timeoutOccurred) {
        // Return the filtered response
        return res.json({ response: responseText });
      }
    } catch (error) {
      // Wyczyść timeout
      clearTimeout(timeoutHandler);
      
      // Rzuć błąd ponownie, aby został obsłużony przez główny blok catch
      throw error;
    }
    
    // Ten kod zostanie wykonany tylko, jeśli wystąpił timeout, ale odpowiedź od AI ostatecznie przyszła
    if (timeoutOccurred && aiResponse) {
      // Odpowiedź została już wysłana do klienta, teraz tylko zapisujemy ostateczną odpowiedź
      console.log("Odpowiedź od AI przyszła po timeoucie, zapisuję ją do bazy danych");
      return;
    }
    
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

// Dodatkowy endpoint do pobierania ostatniej wiadomości dla użytkownika
export async function getLastMessage(req, res) {
  try {
    const ip = req.ip || req.socket.remoteAddress;
    const userId = 'user-' + ip;
    
    // Pobierz aktywne konwersacje dla tego użytkownika
    const conversations = await conversationStore.getByUser(userId);
    
    // Znajdź aktywną konwersację
    const activeConversation = conversations.find(c => !c.ended);
    
    if (!activeConversation || !activeConversation.messages || activeConversation.messages.length === 0) {
      return res.status(404).json({ 
        error: 'Nie znaleziono aktywnej konwersacji lub wiadomości dla tego użytkownika'
      });
    }
    
    // Pobierz ostatnią wiadomość od asystenta
    const assistantMessages = activeConversation.messages.filter(m => m.role === 'assistant');
    
    if (assistantMessages.length === 0) {
      return res.status(404).json({ 
        error: 'Nie znaleziono wiadomości od asystenta w tej konwersacji'
      });
    }
    
    const lastMessage = assistantMessages[assistantMessages.length - 1];
    
    return res.json({
      message: lastMessage.content,
      timestamp: lastMessage.timestamp,
      conversationId: activeConversation.id
    });
    
  } catch (error) {
    console.error("Błąd pobierania ostatniej wiadomości:", error);
    return res.status(500).json({ 
      error: 'Błąd pobierania ostatniej wiadomości',
      details: error.message 
    });
  }
}