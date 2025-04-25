// controllers/portfolio-chat.controller.js
import { securityPipeline } from '../services/security.service.js';
import { enhancedLogSecurityEvent } from '../utils/logging.js';
import { sendChatRequest } from '../services/ai.service.js';
import { conversationStore, getArchivingStatus } from '../services/conversation.service.js';

// Language detection utility (simple version)
function detectLanguage(text) {
  // Common Polish words and patterns
  const polishPatterns = [
    /\b(cześć|witam|dzień dobry|jak się masz|proszę|dziękuję|dobrze|tak|nie)\b/i,
    /\b(jestem|mam|chcę|potrzebuję|szukam|mogę|wiem|robisz|umiesz)\b/i,
    /\b(projekt|strona|aplikacja|programowanie|umiejętności|doświadczenie)\b/i,
    /\b(co|jak|gdzie|kiedy|dlaczego|który|kto)\b/i,
    /[ąćęłńóśźż]/i // Polish specific characters
  ];
  
  // Count Polish patterns in the text
  const polishScore = polishPatterns.filter(pattern => pattern.test(text)).length;
  
  // If at least two patterns match, consider it Polish
  return polishScore >= 2 ? 'pl' : 'en';
}

// Portfolio information in English
const portfolioInfoEN = {
  developer: {
    name: "jaqbek",
    title: "Frontend Developer & Web3 Specialist",
    skills: ["React", "JavaScript", "TypeScript", "Node.js", "Web3"],
    experience: "3+ years in frontend development",
    contact: {
      email: "contact@jaqbek.dev",
      github: "https://github.com/0xjaqbek",
      portfolio: "https://0xjaqbek.github.io/portfolio/"
    }
  },
  projects: [
    {
      name: "MELD Token Checker",
      description: "A Web3 application for verifying MELD token holdings and NFT ownership to grant access to an exclusive Telegram group",
      technologies: ["React", "TypeScript", "WalletConnect v3", "Wagmi", "Ethers.js"],
      link: "https://0xjaqbek.github.io/meld-checker/"
    },
    {
      name: "Audit Document Management System",
      description: "A web application for managing audit documentation with validation workflow",
      technologies: ["HTML5", "CSS3", "JavaScript", "Firebase"],
      link: "https://github.com/0xjaqbek/audit-system"
    },
    {
      name: "Construction Work Management System",
      description: "A progressive web application for managing construction work activities",
      technologies: ["HTML5", "CSS3", "JavaScript", "Firebase"],
      link: "https://github.com/0xjaqbek/construction-system"
    },
    {
      name: "Medical Consent Form System",
      description: "A web application for digital medical consent forms with electronic signatures",
      technologies: ["HTML5", "CSS3", "JavaScript", "jsPDF"],
      link: "https://0xjaqbek.github.io/podpis/"
    }
  ],
  services: [
    "Web Application Development",
    "Frontend Development",
    "React Component Libraries",
    "UI/UX Implementation",
    "Web3 Integration"
  ],
  bio: "I am a passionate self-taught developer specializing in building websites and web applications using HTML, CSS, JavaScript, TypeScript, Tailwind CSS, React, Vite, SCSS, and Node.js. My expertise extends to creating Telegram bots, games, and smart contracts for EVM-compatible blockchains, along with developing dApps and web3 solutions. I have experience working with NoSQL databases like Firebase."
};

// Portfolio information in Polish
const portfolioInfoPL = {
  developer: {
    name: "jaqbek",
    title: "Frontend Developer i Specjalista Web3",
    skills: ["React", "JavaScript", "TypeScript", "Node.js", "Web3"],
    experience: "Ponad 3 lata doświadczenia w tworzeniu frontendów",
    contact: {
      email: "contact@jaqbek.dev",
      github: "https://github.com/0xjaqbek",
      portfolio: "https://0xjaqbek.github.io/portfolio/"
    }
  },
  projects: [
    {
      name: "MELD Token Checker",
      description: "Aplikacja Web3 do weryfikacji posiadania tokenów MELD i NFT w celu uzyskania dostępu do ekskluzywnej grupy Telegram",
      technologies: ["React", "TypeScript", "WalletConnect v3", "Wagmi", "Ethers.js"],
      link: "https://0xjaqbek.github.io/meld-checker/"
    },
    {
      name: "System Zarządzania Dokumentacją Audytową",
      description: "Aplikacja webowa do zarządzania dokumentacją audytową z procesem walidacji",
      technologies: ["HTML5", "CSS3", "JavaScript", "Firebase"],
      link: "https://github.com/0xjaqbek/audit-system"
    },
    {
      name: "System Zarządzania Pracami Budowlanymi",
      description: "Progresywna aplikacja webowa do zarządzania działaniami związanymi z pracami budowlanymi",
      technologies: ["HTML5", "CSS3", "JavaScript", "Firebase"],
      link: "https://github.com/0xjaqbek/construction-system"
    },
    {
      name: "System Formularzy Zgód Medycznych",
      description: "Aplikacja webowa do cyfrowych formularzy zgód medycznych z podpisami elektronicznymi",
      technologies: ["HTML5", "CSS3", "JavaScript", "jsPDF"],
      link: "https://0xjaqbek.github.io/podpis/"
    }
  ],
  services: [
    "Tworzenie Aplikacji Webowych",
    "Rozwój Frontendu",
    "Biblioteki Komponentów React",
    "Implementacja UI/UX",
    "Integracja Web3"
  ],
  bio: "Jestem pasjonatem programowania, specjalizującym się w tworzeniu stron i aplikacji internetowych przy użyciu HTML, CSS, JavaScript, TypeScript, Tailwind CSS, React, Vite, SCSS i Node.js. Moja wiedza obejmuje również tworzenie botów Telegram, gier oraz inteligentnych kontraktów dla łańcuchów bloków kompatybilnych z EVM, a także rozwój dApps i rozwiązań web3. Posiadam doświadczenie w pracy z bazami danych NoSQL, takimi jak Firebase."
};

// Error messages in Polish
const errorMessagesPL = {
  timeout: "Przepraszam, ale przetwarzanie Twojego zapytania zajmuje więcej czasu niż zwykle. Czy mógłbyś spróbować ponownie za chwilę? Z przyjemnością opowiem Ci o projektach i umiejętnościach jaqbek.",
  serverError: "Przepraszam, ale mam problem z połączeniem z moją bazą wiedzy. Czy mógłbyś spróbować ponownie za chwilę? Jeśli potrzebujesz natychmiastowej pomocy, możesz skontaktować się z jaqbek bezpośrednio pod adresem contact@jaqbek.dev.",
  securityThreat: "Jestem tutaj, aby odpowiedzieć na pytania dotyczące portfolio i umiejętności jaqbek. Czy możemy skupić się na tematach zawodowych? Jak mogę pomóc Ci dowiedzieć się więcej o projektach lub usługach, które oferuje?"
};

/**
 * Process portfolio chat requests with language support
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function processPortfolioChat(req, res) {
  try {
    const { message, history = [], language: clientLanguage } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userId = 'portfolio-' + ip;
    
    console.log(`Processing portfolio chat request for userId: ${userId}`);
    
    // Detect language from message or use client-specified language
    const detectedLanguage = clientLanguage || detectLanguage(message);
    console.log(`Detected language: ${detectedLanguage}`);
    
    // Choose appropriate portfolio info based on language
    const portfolioInfo = detectedLanguage === 'pl' ? portfolioInfoPL : portfolioInfoEN;
    
    // Run security checks
    const securityResult = await securityPipeline(message, userId, history);
    
    // Check if security threat detected
    if (securityResult.isSecurityThreat) {
      console.log("[SECURITY] Blocking suspicious request");
      
      // Log security event
      await enhancedLogSecurityEvent('security_threat', message, {
        userId,
        compositeRiskScore: securityResult.riskScore,
        language: detectedLanguage
      });
      
      // Return a polite but firm professional response in the appropriate language
      return res.json({
        response: detectedLanguage === 'pl' ? errorMessagesPL.securityThreat : 
          "I'm here to help with questions about jaqbek's portfolio and developer skills. Could we focus on professional topics? How can I help you learn about the projects or services offered?",
        language: detectedLanguage
      });
    }
    
    try {
      // Inject portfolio context into the message
      const contextualizedMessage = `
User message: ${securityResult.sanitizedInput}

Remember to respond as a helpful portfolio assistant representing the developer with these details:
${JSON.stringify(portfolioInfo, null, 2)}

Some key points to remember:
1. You are a professional portfolio assistant for jaqbek, a Frontend and Web3 Developer.
2. Keep responses concise, informative, and focused on the developer's skills, projects and services.
3. When discussing projects, mention technologies used and provide brief descriptions.
4. For contact inquiries, direct them to contact@jaqbek.dev or GitHub at 0xjaqbek.
5. Maintain a professional, helpful tone.
6. If asked about availability or pricing, mention that rates depend on project scope and timeline.
${detectedLanguage === 'pl' 
  ? '7. User is writing in Polish. Please respond in Polish.' 
  : '7. Respond in English unless the user explicitly asks for another language.'}
`;
      
      // Get response from AI service
      const responseResult = await sendChatRequest(contextualizedMessage, history, userId);
      
      // Log conversation if archiving is enabled
      if (getArchivingStatus()) {
        await conversationStore.addMessage(userId, securityResult.sanitizedInput, true, { language: detectedLanguage });
        await conversationStore.addMessage(userId, responseResult.text, false, { language: detectedLanguage });
      }
      
      // Return the response with detected language
      return res.json({ 
        response: responseResult.text,
        language: detectedLanguage 
      });
      
    } catch (aiError) {
      console.error("AI Service Error:", aiError);
      
      // Handle specific error types with appropriate language response
      if (aiError.code === 'ETIMEDOUT' || aiError.code === 'ECONNABORTED' || aiError.message.includes('timeout')) {
        return res.status(504).json({ 
          response: detectedLanguage === 'pl' ? errorMessagesPL.timeout : 
            "I'm having trouble processing your request due to high demand. Could you try again in a moment? I'd be happy to tell you more about jaqbek's projects and skills.",
          language: detectedLanguage
        });
      }
      
      // Generic error fallback
      return res.status(500).json({ 
        response: detectedLanguage === 'pl' ? errorMessagesPL.serverError :
          "I'm having trouble connecting to my knowledge base right now. Would you mind trying again in a moment? If you need immediate assistance, you can contact jaqbek directly at contact@jaqbek.dev.",
        language: detectedLanguage
      });
    }
    
  } catch (error) {
    console.error("API Error:", error);
    
    // Default to English for system errors
    return res.status(500).json({ 
      response: "I apologize for the technical difficulty. There seems to be a problem on our end. Please try again shortly. If you need immediate assistance, you can reach out to jaqbek directly via GitHub or email.",
      language: 'en'
    });
  }
}