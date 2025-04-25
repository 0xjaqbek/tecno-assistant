// controllers/portfolio-chat.controller.js
import { securityPipeline } from '../services/security.service.js';
import { enhancedLogSecurityEvent } from '../utils/logging.js';
import { sendChatRequest } from '../services/ai.service.js';
import { conversationStore, getArchivingStatus } from '../services/conversation.service.js';

// Portfolio information to inject into the context
const portfolioInfo = {
  developer: {
    name: "Your Name",
    title: "Frontend Developer & Web3 Specialist",
    skills: ["React", "JavaScript", "TypeScript", "Node.js", "Web3"],
    experience: "3+ years in frontend development",
    contact: {
      email: "your.email@example.com",
      github: "https://github.com/yourusername",
      linkedin: "https://linkedin.com/in/yourprofile"
    }
  },
  projects: [
    {
      name: "Project 1",
      description: "A brief description of your first featured project",
      technologies: ["React", "TypeScript", "Tailwind CSS"],
      link: "https://project1.example.com"
    },
    {
      name: "Project 2",
      description: "A brief description of your second featured project",
      technologies: ["React", "Node.js", "MongoDB"],
      link: "https://project2.example.com"
    }
  ],
  services: [
    "Web Application Development",
    "Frontend Development",
    "React Component Libraries",
    "UI/UX Implementation",
    "Web3 Integration"
  ]
};

/**
 * Process portfolio chat requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function processPortfolioChat(req, res) {
  try {
    const { message, history = [] } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userId = 'user-' + ip;
    
    console.log(`Processing portfolio chat request for userId: ${userId}`);
    
    // Run security checks
    const securityResult = await securityPipeline(message, userId, history);
    
    // Check if security threat detected
    if (securityResult.isSecurityThreat) {
      console.log("[SECURITY] Blocking suspicious request");
      
      // Log security event
      await enhancedLogSecurityEvent('security_threat', message, {
        userId,
        compositeRiskScore: securityResult.riskScore
      });
      
      // Return a polite but firm professional response
      return res.json({
        response: "I'm here to help with questions about the portfolio and developer skills. Could we focus on professional topics? How can I help you learn about the projects or services offered?"
      });
    }
    
    try {
      // Inject portfolio context into the message
      const contextualizedMessage = `
User message: ${securityResult.sanitizedInput}

Remember to respond as a helpful portfolio assistant representing the developer with these details:
${JSON.stringify(portfolioInfo, null, 2)}
`;
      
      // Get response from AI service
      const responseResult = await sendChatRequest(contextualizedMessage, history, userId);
      
      // Log conversation if archiving is enabled
      if (getArchivingStatus()) {
        await conversationStore.addMessage(userId, securityResult.sanitizedInput, true);
        await conversationStore.addMessage(userId, responseResult.text, false);
      }
      
      // Return the response
      return res.json({ response: responseResult.text });
      
    } catch (aiError) {
      console.error("AI Service Error:", aiError);
      
      return res.status(500).json({ 
        response: "I'm having trouble connecting to my knowledge base right now. Would you mind trying again in a moment?"
      });
    }
    
  } catch (error) {
    console.error("API Error:", error);
    
    return res.status(500).json({ 
      response: "I apologize for the technical difficulty. There seems to be a problem on our end. Please try again shortly."
    });
  }
}