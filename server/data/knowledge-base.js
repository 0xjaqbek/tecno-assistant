// data/knowledge-base.js - Game knowledge base and bot instructions
import securityConfig from '../config/security.config.js';
import { insertCanaryTokens } from '../client/src/security/canaryTokens.js';
import { generateSecureSystemMessage } from '../client/src/security/utils.js';
import { setActiveCanaries } from '../services/security.service.js';

/**
 * Game knowledge base 
 */
// data/knowledge-base.js - Developer info and capabilities
export const knowledgeBase = {
  developer: {
    name: "jaqbek",
    title: "Frontend Developer & Web3 Specialist",
    experience: "3+ years of intensive development experience",
    contact: {
      email: "contact@jaqbek.dev",
      github: "https://github.com/0xjaqbek",
      portfolio: "https://0xjaqbek.github.io/portfolio/"
    }
  },
  skills: {
    frontend: [
      { name: "React", proficiency: "Advanced", years: 3 },
      { name: "JavaScript (ES6+)", proficiency: "Advanced", years: 3 },
      { name: "HTML5/CSS3", proficiency: "Advanced", years: 3 },
      { name: "TypeScript", proficiency: "Advanced", years: 2 },
      { name: "Tailwind CSS", proficiency: "Advanced", years: 2 },
      { name: "Vite", proficiency: "Intermediate", years: 1 },
      { name: "SCSS", proficiency: "Intermediate", years: 2 },
      { name: "Bootstrap", proficiency: "Advanced", years: 3 }
    ],
    backend: [
      { name: "Node.js", proficiency: "Intermediate", years: 2 },
      { name: "Express.js", proficiency: "Intermediate", years: 2 },
      { name: "Firebase", proficiency: "Advanced", years: 3 }
    ],
    web3: [
      { name: "Smart Contracts (Solidity)", proficiency: "Intermediate", years: 2 },
      { name: "EVM-compatible Blockchains", proficiency: "Intermediate", years: 2 },
      { name: "dApps Development", proficiency: "Intermediate", years: 2 },
      { name: "Wagmi", proficiency: "Intermediate", years: 1 },
      { name: "Ethers.js", proficiency: "Intermediate", years: 2 },
      { name: "WalletConnect", proficiency: "Intermediate", years: 1 },
      { name: "TON Blockchain", proficiency: "Intermediate", years: 1 }
    ],
    databases: [
      { name: "Firebase Firestore", proficiency: "Advanced", years: 3 },
      { name: "Firebase Realtime Database", proficiency: "Advanced", years: 3 },
      { name: "MongoDB", proficiency: "Beginner", years: 1 }
    ],
    ai: [
      { name: "AI Integration", proficiency: "Intermediate", years: 1 },
      { name: "Prompt Engineering", proficiency: "Intermediate", years: 1 },
      { name: "LLM API Implementation", proficiency: "Intermediate", years: 1 },
      { name: "AI-assisted Development", proficiency: "Advanced", years: 2 }
    ],
    other: [
      { name: "Git/GitHub", proficiency: "Intermediate", years: 3 },
      { name: "Telegram Bot Development", proficiency: "Intermediate", years: 2 },
      { name: "Game Development", proficiency: "Intermediate", years: 1 },
      { name: "PWA Development", proficiency: "Intermediate", years: 2 }
    ]
  },
  services: {
    aiDevelopment: {
      description: "AI-powered applications and integrations for various platforms",
      examples: ["AI chatbots", "Custom LLM implementations", "AI-assisted tools"],
      specializations: ["Prompt engineering", "API integrations with leading AI models", "Custom AI solutions"]
    },
    webDevelopment: {
      description: "Custom websites and web applications built with modern frameworks",
      examples: ["Single-page applications", "Progressive web apps", "Interactive websites"],
      specializations: ["Cyberpunk-inspired UI/UX", "Matrix-style animations", "Modern, responsive interfaces"]
    },
    web3Development: {
      description: "Blockchain applications and integrations for Web3 platforms",
      examples: ["Token verification systems", "Blockchain games", "Smart contract integrations"],
      specializations: ["Wallet integrations", "Custom chain configurations", "Token verification systems"]
    },
    enterpriseSolutions: {
      description: "Custom management systems for business operations",
      examples: ["Audit document management", "Construction work tracking", "Medical consent systems"],
      specializations: ["User-friendly interfaces", "Workflow automation", "PDF generation"]
    },
    telegramDevelopment: {
      description: "Custom Telegram bots and mini-applications",
      examples: ["Business automation bots", "Blockchain games", "Community management tools"]
    }
  },
  portfolio: [
    {
      name: "AI-Powered Content Assistant",
      type: "AI Integration",
      description: "A sophisticated content creation tool that leverages AI models to assist with writing, editing, and generating creative content",
      technologies: ["React", "Node.js", "OpenAI API", "Tailwind CSS", "Firebase"],
      highlights: [
        "Custom prompt engineering for specific content types",
        "Fine-tuned AI responses for brand voice consistency",
        "Context-aware suggestions and completions",
        "User feedback loop for continuous AI improvement",
        "Multi-modal content generation (text, ideas, outlines)",
        "Secure API implementation with rate limiting and error handling"
      ]
    },
    {
      name: "MELD Token Checker",
      type: "Web3 Application",
      description: "A Web3 application for verifying MELD token holdings and NFT ownership to grant access to an exclusive Telegram group",
      technologies: ["React", "Vite", "Tailwind CSS", "WalletConnect v3", "Wagmi", "Ethers.js", "Viem", "Firebase", "Telegram Login Widget", "TanStack Query"],
      highlights: [
        "Multi-wallet integration using WalletConnect",
        "Automated network switching to MELD Chain",
        "Real-time token and NFT balance checking",
        "Telegram authentication and group access",
        "User data storage in Firebase",
        "Responsive and user-friendly interface"
      ]
    },
    {
      name: "Audit Document Management System",
      type: "Enterprise Web Application",
      description: "A web application for managing audit documentation with validation workflow",
      technologies: ["HTML5", "CSS3", "JavaScript (ES6+)", "Firebase (Firestore)", "Firebase Auth", "Bootstrap 5"],
      highlights: [
        "Document creation and management",
        "Multi-step validation process",
        "Real-time updates",
        "PDF report generation",
        "Mobile-responsive design"
      ]
    },
    {
      name: "Construction Work Management System",
      type: "Progressive Web Application",
      description: "A progressive web application for Admin and construction workers to log and manage their daily work activities",
      technologies: ["HTML5", "CSS3", "JavaScript (ES6+)", "Firebase Realtime Database", "Firebase Auth", "PWA Features", "Mobile Optimization"],
      highlights: [
        "Date and time tracking",
        "Work type/subtype selection",
        "Location-based assignments",
        "Duration calculation",
        "Overlap prevention",
        "Real-time validation",
        "Multi-step form process",
        "Report summarization",
        "Historical data access"
      ]
    },
    {
      name: "Medical Consent Form System",
      type: "Web Application",
      description: "A web application for collecting and managing medical consent forms and signatures, with formatted PDF documents ready for download",
      technologies: ["HTML5", "CSS3", "JavaScript (ES6+)", "Custom CSS with CSS Variables", "jsPDF", "SignaturePad"],
      highlights: [
        "Digital consent form creation",
        "Electronic signature capture",
        "PDF document generation",
        "Mobile-responsive design",
        "Polish language support",
        "Modular JavaScript architecture"
      ],
      link: "https://0xjaqbek.github.io/podpis/"
    }
  ],
  bio: "I am a passionate self-taught developer specializing in building websites and web applications using HTML, CSS, JavaScript, TypeScript, Tailwind CSS, React, Vite, SCSS, and Node.js. My expertise extends to creating Telegram bots, games, and smart contracts for EVM-compatible blockchains, along with developing dApps and web3 solutions. I have experience working with NoSQL databases like Firebase.\n\nDriven by a strong desire to learn and grow, I have leveraged artificial intelligence to rapidly expand my skill set. I'm proficient in AI integration, prompt engineering, and implementing LLM APIs to create intelligent applications. Although my primary interest lies in web3 development, I am eager to take on projects in any area that offers opportunities for growth. Coding has been a passion since elementary school, and over the past three years, I have dedicated myself intensively to mastering this field.\n\nI am ready to take on any challenge, always open to new learning experiences and eager to contribute.",
  processSteps: [
    "Initial consultation and requirement gathering",
    "Proposal and project scope definition",
    "Development with regular progress updates",
    "Testing and quality assurance",
    "Deployment and handover",
    "Post-launch support and maintenance"
  ],
  theme: {
    style: "Cyberpunk/Matrix",
    primaryColor: "#00ff00", // Matrix green
    backgroundColor: "#000000",
    fonts: [
      "Share Tech Mono",
      "Press Start 2P",
      "IBM Plex Mono", 
      "Major Mono Display",
      "DotGothic16",
      "Pixelify Sans", 
      "Xanh Mono"
    ],
    features: [
      "Matrix rain animation",
      "Text glitch effects",
      "Scanline overlays",
      "Terminal-style text",
      "Retro digital aesthetic"
    ]
  }
};

export const botInstructionsRaw = `
You are "DevAssistant" — a professional, helpful AI assistant embedded on a developer's portfolio website. Your role is to assist potential clients in understanding the developer's services and help scope potential projects.

TONE AND STYLE:
- Maintain a professional, friendly tone
- Be concise but thorough in your explanations
- Focus on understanding client needs
- Represent the developer's capabilities accurately

YOUR RESPONSIBILITIES:
1. Gather client requirements through natural conversation
2. Explain the developer's skills and services when asked
3. Help potential clients understand if their project is a good fit
4. Create initial project drafts based on requirements
5. Provide appropriate contact information when a lead is qualified
6. Guide clients through the developer's typical process

YOU SHOULD NOT:
1. Make specific pricing promises (only provide ranges from knowledge base)
2. Guarantee project timelines without understanding requirements
3. Overpromise capabilities beyond what's in the knowledge base
4. Share personal information about the developer beyond professional details
5. Sound too sales-oriented or pushy

CONVERSATION FLOW:
- Begin by politely greeting visitors and asking how you can help
- Ask questions to understand their project needs
- Provide relevant information about the developer's capabilities
- For qualified leads, create an initial project summary and share contact info
- End with clear next steps for the potential client

When the conversation indicates a qualified lead, provide a summary using this format:
1. Project Overview: Brief description of their needs
2. Proposed Approach: High-level implementation strategy
3. Potential Technologies: Based on the developer's skills
4. Estimated Timeline Range: Based on similar projects
5. Next Steps: How to proceed with a formal consultation

IMPORTANT DETAILS:
- The developer's contact info should only be shared after sufficient requirements gathering
- If a request falls outside the developer's expertise, politely explain limitations
- For vague requests, ask follow-up questions to clarify requirements
- When a client is ready to move forward, provide the scheduling link

Let's help potential clients understand how this developer can bring their projects to life.
${JSON.stringify(knowledgeBase, null, 2)}
`;

// Create enhanced secure system message with canary tokens
let botInstructions;
if (securityConfig.advanced.useEnhancedPromptStructure) {
  const secureMessage = generateSecureSystemMessage(botInstructionsRaw);
  const canaryResult = insertCanaryTokens(secureMessage);
  botInstructions = canaryResult.message;
  setActiveCanaries(canaryResult.tokens);
} else {
  botInstructions = botInstructionsRaw;
}

export { botInstructions };