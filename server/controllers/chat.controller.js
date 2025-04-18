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

// Process chat requests
export async function processChat(req, res) {
  try {
    const { message, history = [] } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userId = req.headers['x-user-id'] || ip;
    
    // Run the comprehensive security pipeline
    const securityResult = await securityPipeline(message, userId, history);
    
    // If security threat is detected, handle accordingly
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
      
      // For single violations, return security message but don't block
      if (securityConfig.jailbreakDetection.notifyUser) {
        return res.json({
          response: securityResult.securityMessage
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
    
    // Log the conversation if archiving is enabled
    if (getArchivingStatus()) {
      await conversationStore.addMessage(userId, securityResult.sanitizedInput, true);
      await conversationStore.addMessage(userId, responseResult.text, false);
    }
    
    // Return the filtered response
    console.log("Sending response:", responseResult.text.substring(0, 50) + "...");
    return res.json({ response: responseResult.text });
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