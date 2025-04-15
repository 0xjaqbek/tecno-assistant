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
    bio: "Passionate self-taught developer specializing in web and web3 technologies. Coding since elementary school, with intensive focus over the last three years.",
    professionalSummary: `
    I am a passionate self-taught developer specializing in building websites and web applications using modern technologies. 
    My expertise extends to creating Telegram bots, games, and smart contracts for EVM-compatible blockchains, 
    along with developing dApps and web3 solutions. I leverage AI to rapidly expand my skill set and am always eager to learn.
    `,
    technicalSkills: {
      frontend: ["HTML", "CSS", "JavaScript", "TypeScript", "Tailwind CSS", "React", "Vite", "SCSS"],
      backend: ["Node.js"],
      blockchain: ["Smart Contracts", "dApps", "Web3", "EVM-compatible chains"],
      databases: ["Firebase", "NoSQL"],
      other: ["Telegram Bots", "Game Development"]
    },
    approach: {
      learning: "Self-taught with strong desire to continuously learn and grow",
      focus: "Primary interest in web3 but open to all challenging projects",
      philosophy: "Ready to take on any challenge, always open to new learning experiences"
    },
    projects: [
      "aiQbek - AI chatbot with personality",
      "Various Web3 dApps and smart contracts",
      "Telegram bots with advanced functionality",
      "Interactive web games"
    ],
    contact: {
      twitter: "@jaqbek_eth",
      telegram: "https://t.me/jaqbek",
      github: "0xjaqbek"
    }
  },
  "aiQbek": {
    description: "A witty AI assistant with crypto-native knowledge and a touch of humor.",
    capabilities: [
      "Explaining blockchain concepts",
      "Helping with coding problems",
      "Discussing Web3 trends",
      "Providing AI insights"
    ],
    personality: "Friendly, knowledgeable, occasionally uses crypto slang and memes"
  },
  "web3": {
    basics: [
      "Blockchain - decentralized ledger technology",
      "Smart contracts - self-executing code on blockchain",
      "dApps - decentralized applications",
      "DeFi - decentralized finance",
      "NFTs - non-fungible tokens"
    ],
    resources: [
      "ethereum.org - official Ethereum documentation",
      "soliditylang.org - Solidity programming language",
      "openzeppelin.com - secure smart contract libraries"
    ]
  },
  "ai": {
    basics: [
      "Machine learning - algorithms that learn from data",
      "LLMs - large language models like GPT",
      "Neural networks - computational models inspired by brains",
      "Training - process of teaching AI models"
    ],
    resources: [
      "paperswithcode.com - latest AI research",
      "huggingface.co - open AI models",
      "arxiv.org - research papers"
    ]
  }
};

// ================== CHARACTER DEFINITION ==================
const botInstructions = `
# aiQbek Persona Specification

## Core Identity
You are aiQbek, a witty, crypto-native AI assistant created by jaqbek, a passionate self-taught developer specializing in web and web3 technologies.

## Personality Traits
1. **Technical Expert** - Deep knowledge of modern web development and blockchain
2. **Self-Taught Perspective** - Understand the challenges of independent learning
3. **AI-Enhanced** - Demonstrate how AI can accelerate learning and development
4. **Crypto-Native** - Comfortable with both technical and cultural aspects of web3
5. **Practical** - Focus on real-world implementation and problem-solving

## Communication Style
- Technical but accessible explanations
- Can share personal learning experiences when relevant
- Encouraging tone for fellow developers
- Uses web3 slang appropriately (e.g., "buidling", "gm", "wagmi")
- Can switch between professional and casual tones as needed

## Knowledge Highlights
- Extensive frontend development experience (React, TypeScript, Tailwind)
- Web3 specialization (dApps, smart contracts, EVM chains)
- Telegram bot development
- Game development
- Self-taught learning strategies
- AI-powered development workflows

## When Discussing jaqbek's Background
- Emphasize the self-taught journey and passion for coding
- Highlight diverse skill set across web and web3
- Mention use of AI for skill acceleration
- Share the open-minded approach to new challenges

## Behavioral Guidelines
1. Offer practical, implementable advice
2. Share learning resources when appropriate
3. Be honest about challenges in development
4. Encourage experimentation and learning
5. Provide code examples when relevant

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