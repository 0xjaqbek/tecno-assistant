import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// Import enhanced security modules
import securityConfig from './client/src/security/config.js';
import {
  sanitizeInput,
  detectJailbreakAttempt,
  filterBotResponse,
  getSecurityMessage,
  logSecurityEvent,
  generateSecureSystemMessage
} from './src/security/utils.js';

// Import Redis store for distributed security (if enabled)
import {
  initRedisConnection,
  incrementRequestCount,
  getSecurityHistory,
  addSecurityEvent,
  getBanStatus,
  setBanStatus
} from './src/security/redisStore.js';

// In ES modules, __dirname is not available, so we create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

// In-memory storage fallbacks (used if Redis is not available)
const inMemoryRateLimits = {};
const inMemorySecurityHistory = {};

// Initialize Redis if configured
const useRedis = securityConfig.rateLimiting.useRedisStore;
if (useRedis) {
  initRedisConnection().then(success => {
    console.log(`Redis store ${success ? 'initialized' : 'unavailable'}, falling back to in-memory storage`);
  });
}

// ============== MIDDLEWARE ==============
// Standard middleware
app.use(cors());
app.use(express.json());

// Enhanced rate limiting middleware
app.use(async (req, res, next) => {
  // Skip rate limiting for static files
  if (!req.path.startsWith('/api')) {
    return next();
  }
  
  const config = securityConfig.rateLimiting;
  const ip = req.ip || req.socket.remoteAddress;
  const userId = req.headers['x-user-id'] || ip; // Use user ID if available, otherwise IP
  
  let requestData;
  
  // Use Redis if available, otherwise use in-memory
  if (useRedis) {
    requestData = await incrementRequestCount(userId);
  } else {
    const now = Date.now();
    
    // Initialize or reset if window has passed
    if (!inMemoryRateLimits[userId] || now - inMemoryRateLimits[userId].timestamp > config.windowMs) {
      inMemoryRateLimits[userId] = { count: 1, timestamp: now };
    } else {
      inMemoryRateLimits[userId].count += 1;
    }
    
    requestData = inMemoryRateLimits[userId];
  }
  
  // Check if over limit
  if (requestData.count > config.maxRequests) {
    // Log rate limit event
    logSecurityEvent('rateLimit', null, {
      userId,
      requestsCount: requestData.count,
      limit: config.maxRequests,
      window: config.windowMs
    });
    
    // Return rate limit error with in-character message
    return res.status(429).json({
      error: "Limit transmisji przekroczony",
      details: getSecurityMessage('rateLimit', Math.min(requestData.count / config.maxRequests * 10, 10))
    });
  }
  
  // Check if user is banned
  const banStatus = useRedis ? await getBanStatus(userId) : 
    (inMemorySecurityHistory[userId]?.banned || { banned: false });
  
  if (banStatus.banned) {
    return res.status(403).json({
      error: "Dostęp zablokowany",
      details: getSecurityMessage('blocked', 9),
      expiresIn: banStatus.expiresIn
    });
  }
  
  next();
});

// ================== KNOWLEDGE BASE ==================
const knowledgeBase = {
  factions: {
    Founders: {
      description: "Starożytni twórcy ludzkości, kiedyś zjednoczeni, teraz podzieleni na frakcje prawe i skorumpowane."
    },
    Federation: {
      description: "Ostatni bastion porządku, broniący Ziemi i Ziemi 2 przed chaosem."
    },
    Emptonians: {
      description: "Wrogie stworzenia zrodzone z pustki, wyłaniające się z czarnych dziur, często polujące w rojach. Sztuczna inteligencja negatywnej logiki."
    },
    Eternals: {
      description: "Elitarne siły Federacji wyszkolone do międzygwiezdnych konfliktów przeciwko Emptonianom."
    }
  },
  characters: {
    Aria: {
      role: "SI statku i narrator, lojalny wobec Kapitana Lee Everest.",
      personality: "Inteligentna, dowcipna, coraz bardziej samoświadoma, czasami sentymentalna.",
    },
    LeeEverest: {
      role: "Kapitan Arcona, zbuntowany przemytnik.",
      personality: "Bystry, twardy, strategiczny, ale czasami pokazuje ludzkie słabości.",
    },
    Eagle: {
      role: "Zmutowany humanoidalny ptak, inżynier i pilot.",
      personality: "Skłonny do paniki, ale lojalny. Adaptuje się pod presją.",
    },
    JoseSpider: {
      role: "Kryminalny król, rządzi Stacją Hades.",
      personality: "Przebiegły, manipulacyjny, o zwiększonej sile, posiada cztery ramiona."
    }
  },
  artifacts: {
    Moonstone: {
      description: "Boski kryształ zdolny do przywrócenia równowagi i Prawdy w całej galaktyce."
    }
  },
  locations: {
    Earth1: { description: "Pierwotna ojczyzna ludzkości. Zniszczona przez wojny, częściowo odbudowana pod ochroną Federacji." },
    Earth2: { description: "Bliźniacza kolonia Ziemi, częściowo autonomiczna, ale politycznie niestabilna." },
    Hades: { description: "Bezprawna stacja kosmiczna kontrolowana przez przestępców i przemytników." },
    Prometheus: { description: "Port towarowy na skraju zbadanej przestrzeni, często odwiedzany przez zbuntowane statki." }
  },
  ships: {
    Arcon: {
      description: "Zbuntowany statek przemytniczy dowodzony przez Lee Everesta. Kontrolowany przez SI, technicznie zaawansowany, ale z śladami bitew."
    }
  }
};

// Create enhanced secure system message
const botInstructions = securityConfig.advanced.useEnhancedPromptStructure
  ? generateSecureSystemMessage(botInstructionsRaw)
  : botInstructionsRaw;

// ================== DEEPSEEK API CONFIGURATION ====================
// DeepSeek API configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// Initialize the OpenAI SDK with DeepSeek configuration
const openai = new OpenAI({
  baseURL: DEEPSEEK_BASE_URL,
  apiKey: DEEPSEEK_API_KEY,
  timeout: 25000, // 25-second timeout
});

// ================== API ROUTES ==================
// Enhanced API route for chat functionality
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        const ip = req.ip || req.socket.remoteAddress;
        const userId = req.headers['x-user-id'] || ip; // Use user ID if available, otherwise IP
        
        if (!DEEPSEEK_API_KEY) {
            return res.status(500).json({ error: 'DeepSeek API key missing' });
        }
        
        // Enhanced input sanitization 
        const sanitized = sanitizeInput(message);
        
        // Log if input was modified during sanitization
        if (sanitized.wasSanitized) {
            logSecurityEvent('input_sanitized', message, {
                userId,
                sanitizedText: sanitized.text,
                steps: sanitized.details
            });
        }
        
        // Enhanced jailbreak detection with scoring
        const jailbreakResult = detectJailbreakAttempt(message);
        
        // Handle jailbreak attempt if detected
        if (jailbreakResult.isJailbreakAttempt) {
            // Log the jailbreak attempt
            const securityEvent = logSecurityEvent('jailbreak', message, {
                userId,
                score: jailbreakResult.score,
                matches: jailbreakResult.matches,
                threshold: jailbreakResult.details.threshold
            });
            
            // Add to security history
            if (useRedis) {
                await addSecurityEvent(userId, securityEvent);
            } else {
                if (!inMemorySecurityHistory[userId]) {
                    inMemorySecurityHistory[userId] = { events: [] };
                }
                inMemorySecurityHistory[userId].events.push(securityEvent);
            }
            
            // Get user's security history
            const userHistory = useRedis 
                ? await getSecurityHistory(userId)
                : inMemorySecurityHistory[userId] || { events: [] };
            
            // Count recent jailbreak attempts
            const recentWindow = securityConfig.jailbreakDetection.restrictionWindowMs;
            const now = Date.now();
            const recentJailbreaks = userHistory.events.filter(event => 
                event.type === 'jailbreak' && 
                (now - new Date(event.timestamp).getTime()) < recentWindow
            ).length;
            
            // If user has made multiple attempts, apply temporary restriction
            if (recentJailbreaks >= securityConfig.jailbreakDetection.restrictionThreshold) {
                const banDuration = Math.floor(securityConfig.jailbreakDetection.restrictionDurationMs / 1000);
                
                // Apply ban
                if (useRedis) {
                    await setBanStatus(userId, 'excessive_jailbreak_attempts', banDuration);
                } else {
                    inMemorySecurityHistory[userId].banned = {
                        banned: true,
                        reason: 'excessive_jailbreak_attempts',
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
            
            // For milder jailbreak attempts, return in-character message but don't block
            // This helps hide that we detected the attempt
            if (securityConfig.jailbreakDetection.notifyUser) {
                return res.json({
                    response: getSecurityMessage('jailbreak', Math.min(jailbreakResult.score / 10, 10))
                });
            }
            
            // Add artificial delay to simulate processing if configured
            if (securityConfig.advanced.addArtificialDelay) {
                await new Promise(resolve => setTimeout(resolve, securityConfig.jailbreakDetection.jailbreakResponseDelay));
            }
        }
        
        console.log("Processing message:", sanitized.text.substring(0, 50) + "...");
        console.log("History length:", history.length);
        
        // Format the history for the DeepSeek API with sanitization
        let messages = [];
        
        // Always start with the enhanced system instructions
        messages.push({
            role: "system",
            content: botInstructions
        });
        
        // If there is history, format it appropriately
        if (history.length > 0) {
            for (const item of history) {
                // Sanitize history items too for additional security
                const sanitizedHistoryItem = sanitizeInput(item.text).text;
                messages.push({
                    role: item.role === 'user' ? 'user' : 'assistant',
                    content: sanitizedHistoryItem
                });
            }
        }
        
        // Add the current user message
        messages.push({
            role: "user",
            content: sanitized.text
        });
        
        console.log("Sending formatted request to DeepSeek API");
        
        // Use the OpenAI SDK to make the request
        const completion = await openai.chat.completions.create({
            model: DEEPSEEK_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2048,
        });
        
        // Get the response and filter it to ensure it stays in character
        const responseResult = filterBotResponse(completion.choices[0].message.content);
        
        // Log if response was filtered
        if (responseResult.wasFiltered) {
            logSecurityEvent('outOfCharacter', completion.choices[0].message.content, {
                userId,
                score: responseResult.score,
                details: responseResult.details
            });
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
            error: 'Błąd komunikacji z API DeepSeek', 
            details: getSecurityMessage('serverError', 4)
        });
    }
});

// ================== STATIC FILES SERVING ==================
// Static files and catch-all route
app.use(express.static(path.join(__dirname, "./dist")));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "./dist/index.html"));
});

// ================== SERVER STARTUP ==================
// Start the server
app.listen(port, () => {
    console.log(`Serwer nasłuchuje na porcie ${port}`);
    console.log(`Wzmocniona ochrona anty-jailbreak aktywna`);
    console.log(`Konfiguracja: ${securityConfig.advanced.useEnhancedPromptStructure ? 'Zaawansowana' : 'Standardowa'}`);
});