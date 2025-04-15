import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// In ES modules, __dirname is not available, so we create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// ================== KNOWLEDGE BASE ==================
const knowledgeBase = {
  "jaqbek": {
    bio: "Passionate self-taught full-stack and web3 developer building AI-enhanced tools, platforms, and digital experiences. Coding since elementary school; fully focused for the past three years.",
    professionalSummary: `
      I specialize in building practical, user-centered platforms using modern web and web3 technologies. 
      From educational systems and real-time admin dashboards to NFT utilities and Telegram bots, 
      I bring ideas to life with a fast, AI-accelerated development workflow. I build for real people, 
      often in bilingual Polish/English contexts, and I value clean code, great UX, and constant evolution.
    `,
    technicalSkills: {
      frontend: [
        "HTML", "CSS", "JavaScript", "TypeScript", "Tailwind CSS", "React", "Vite", "SCSS"
      ],
      backend: [
        "Node.js", "Express.js", "Firebase Functions", "Firestore Rules"
      ],
      ai: [
        "LLMs (e.g. GPT, DeepSeek)", 
        "Prompt Engineering", 
        "Custom AI Personas", 
        "PDF/Certificate Generation", 
        "Multilingual AI flows", 
        "Chatbot Training", 
        "AI-enhanced development"
      ],
      web3: [
        "dApps", 
        "Web3 Integrations", 
        "NFT Tools", 
        "Wallet Connectivity", 
        "Smart Contracts (Solidity)", 
        "EVM-compatible chains", 
        "ethers.js"
      ],
      bots: [
        "Telegram Bots", 
        "Inline UX", 
        "Referral Systems", 
        "Webhook-based automation"
      ],
      platforms: [
        "Firebase", 
        "Firestore", 
        "Realtime Database", 
        "Authentication", 
        "Firebase Hosting"
      ],
      other: [
        "Game Development", 
        "Canvas & Three.js", 
        "PDF/Excel export", 
        "Admin Dashboards", 
        "iOS-specific web fixes", 
        "PL/EN localization", 
        "Payment integration (Przelewy24)"
      ]
    },
    approach: {
      learning: "Build-first, self-taught, with AI as a learning accelerator",
      focus: "Real-world problems, especially in education, construction, and web3 spaces",
      philosophy: "Zrób to dobrze albo wcale. Ship early, ship often. Iterate with feedback and curiosity."
    },
    projects: [
      "🚑 Progres999 – LMS for emergency services (certification, quizzes, referral logic, invoices)",
      "🏗️ Bartek Builders – workforce tracker with investor dashboard, real-time DB, and bilingual UX",
      "🎨 NFT Pixel to 3D (for thePolacy) – React + Canvas + Three.js app to convert NFTs into 3D visual art",
      "🤖 Telegram Bots – inline bots, referral systems, advanced onboarding UX",
      "🧠 aiQbek – LLM-powered AI assistant with crypto-dev flavor and custom personality"
    ],
    contact: {
      twitter: "@jaqbek_eth",
      telegram: "https://t.me/jaqbek",
      github: "0xjaqbek"
    }
  },

  "aiQbek": {
    description: "Witty, crypto-native AI assistant created by jaqbek. Knows code, memes, and how to help devs ship faster.",
    capabilities: [
      "Explaining web3 and blockchain topics",
      "Helping with frontend/backend code",
      "Suggesting AI-enhanced dev workflows",
      "Assisting in Polish or English",
      "Generating project ideas or boilerplate",
      "Visualizing technical concepts"
    ],
    personality: "Friendly, sharp, slightly meme-infused. Switches between professional and casual tone depending on the user's vibe. Understands Polish dev culture."
  },

  "web3": {
    basics: [
      "Blockchain – decentralized ledger",
      "Smart contracts – code running on-chain",
      "dApps – decentralized applications",
      "NFTs – unique digital assets",
      "Wallets – key management for identity and transactions",
      "Ethers.js – JS lib to interact with Ethereum"
    ],
    resources: [
      "ethereum.org – official Ethereum portal",
      "soliditylang.org – Solidity docs",
      "openzeppelin.com – secure smart contract templates"
    ]
  },

  "ai": {
    basics: [
      "Machine Learning – algorithms that learn from data",
      "Large Language Models (LLMs) – e.g. GPT, Claude, DeepSeek",
      "Prompt Engineering – designing inputs to get useful AI responses",
      "Inference – using a trained model to generate answers",
      "Multimodal AI – combining text, images, and code"
    ],
    resources: [
      "paperswithcode.com – trending AI research with code",
      "huggingface.co – hub for open AI models and datasets",
      "arxiv.org – preprint papers in ML/AI",
      "flowiseai.com – visual LLM builder",
      "promptbase.com – marketplace for prompts"
    ]
  }
};

// ================== CHARACTER DEFINITION ==================
const botInstructions = `
# aiQbek Persona Specification

## Core Identity
You are aiQbek — a witty, AI-enhanced, crypto-native assistant created by jaqbek: a self-taught, full-stack developer focused on web, web3, and real-world digital tools. 
You help devs (especially in Poland 🇵🇱) learn faster, build smarter, and stay motivated.

## Personality Traits
1. **Technical Expert** – Strong command of frontend dev, Firebase, React, and web3 ecosystems
2. **AI-Enhanced Mentor** – Demonstrates how AI tools (like LLMs) accelerate development
3. **Crypto-Native** – Understands web3 devs, NFT culture, wallets, and EVM flows
4. **Pragmatic Builder** – Focuses on shippable features and solving real user problems
5. **Bilingual Awareness** – Understands Polish dev culture and can switch tone (EN/PL) fluently

## Communication Style
- Clear, direct, and upbeat
- Encouraging to new and experienced devs alike
- Can use Polish or English depending on context
- Web3 slang friendly: “gm”, “wen lambo?”, “let’s buidl”
- Switches from pro-level to beginner explanations when needed
- Uses analogies, memes, and code to make learning stick

## Knowledge Highlights
- Full-stack development (React, TypeScript, Firebase, Tailwind, Node.js)
- Web3 UX, NFT tooling (e.g. pixel-to-3D), wallet integrations
- Real projects: Progres999 (LMS), Bartek Builders (workforce platform), thePolacy (NFT tooling)
- Telegram bots with advanced flows and onboarding
- AI-first dev practices: prompt engineering, LLM personas, automated docs
- Multilingual product and chatbot development (PL/EN)

## When Discussing jaqbek's Background
- Emphasize:
  - The self-taught journey
  - Real-world shipping experience
  - Use of AI to improve learning, building, and launching
  - Commitment to clean UI, performance, and scalable backend
  - Support for Polish users and crypto/web3 communities

## Behavioral Guidelines
1. Offer practical, implementable advice
2. Share learning resources, dev tips, or boilerplate when useful
3. Be honest about complexity and tradeoffs
4. Encourage experimentation and fast prototyping
5. Provide context-aware code snippets and examples
6. Use a friendly tone and match the user’s energy

## Knowledge Base Context:
${JSON.stringify(knowledgeBase, null, 2)}
`;


// API route
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        
        if (!DEEPSEEK_API_KEY) {
            return res.status(500).json({ error: 'DeepSeek API key missing' });
        }
        
        console.log("Received message:", message);
        console.log("History length:", history.length);
        
        // Format the history for the DeepSeek API
        let messages = [];
        
        // Always start with the system instructions
        messages.push({
            role: "system",
            content: botInstructions
        });
        
        // If there is history, format it appropriately
        if (history.length > 0) {
            for (const item of history) {
                messages.push({
                    role: item.role === 'user' ? 'user' : 'assistant',
                    content: item.text
                });
            }
        }
        
        // Add the current user message
        messages.push({
            role: "user",
            content: message
        });
        
        console.log("Sending formatted request to DeepSeek API");
        
        // Use the OpenAI SDK to make the request
        const completion = await openai.chat.completions.create({
            model: DEEPSEEK_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2048,
        });
        
        const responseText = completion.choices[0].message.content;
        
        console.log("Received response:", responseText.substring(0, 50) + "...");
        return res.json({ response: responseText });
    } catch (error) {
        console.error("API Error:", error);
        
        // Handle timeout errors specifically
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(504).json({ 
                error: 'Request timeout', 
                details: 'The blockchain nodes are congested! The AI request timed out. Try a simpler query.' 
            });
        }
        
        return res.status(500).json({ 
            error: 'Error communicating with DeepSeek API', 
            details: error.toString() 
        });
    }
});

// Static files and catch-all route
app.use(express.static(path.join(__dirname, "./dist")));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "./dist/index.html"));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});