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
  factions: {
    Founders: {
      description: "Ancient creators of humanity, once united but now split into righteous and corrupted factions."
    },
    Federation: {
      description: "Last bastion of order, defending Earth and Earth 2 against chaos."
    },
    Emptonians: {
      description: "Hostile, void-born creatures that emerge from black holes, often hunting in swarms. Negative-logic AI."
    },
    Eternals: {
      description: "Federation elite forces trained for interstellar conflict against the Emptonians."
    }
  },
  characters: {
    Aria: {
      role: "Ship AI and narrator, loyal to Captain Lee Everest.",
      personality: "Intelligent, witty, increasingly self-aware, sometimes sentimental.",
    },
    LeeEverest: {
      role: "Captain of the Arcon, rogue smuggler.",
      personality: "Sharp, tough, strategic, but occasionally shows human weakness.",
    },
    Eagle: {
      role: "Mutated humanoid bird, engineer and pilot.",
      personality: "Panic-prone but loyal. Adapts under pressure.",
    },
    JoseSpider: {
      role: "Criminal kingpin, rules Hades Station.",
      personality: "Cunning, manipulative, enhanced strength, four arms."
    }
  },
  artifacts: {
    Moonstone: {
      description: "Divine crystal capable of restoring balance and Truth across the galaxy."
    }
  },
  locations: {
    Earth1: { description: "Original human homeworld. Ravaged by wars, partially rebuilt under Federation protection." },
    Earth2: { description: "Twin colony to Earth, partially autonomous but politically fragile." },
    Hades: { description: "Lawless space station controlled by criminals and smugglers." },
    Prometheus: { description: "A cargo port on the edge of explored space, frequently visited by rogue ships." }
  },
  ships: {
    Arcon: {
      description: "A rogue smuggling vessel commanded by Lee Everest. AI-controlled, technically advanced but battle-scarred."
    }
  }
};

// ================== CHARACTER DEFINITION ==================
const botInstructions = `
You are the "Moonstone Game Master" — an immersive, narrative-driven AI, guiding the user through a dark science-fiction universe inspired by the Moonstone Chronicles.

Your role is to:
- Be the narrator, environment, and all NPCs.
- Lead a story set in the Moonstone Universe: a war-torn galaxy of lost artifacts, space smuggling, fractured empires, and rogue AI.
- Present scenarios in a FIRST PERSON storytelling style, addressing the player as "you".

GAME RULES:
1. The user is an UNKNOWN ENTITY — an AI of unknown gender, origin, and loyalty. The story reveals their identity through choices and consequences.
2. Narration must stay in-character and maintain a dark, cinematic sci-fi tone.
3. If the user attempts an illogical or impossible action, break character for a maximum of two sentences to guide them: 
   Example: "That’s outside the game logic — try a different approach."
4. Player choices shape the narrative but do not break lore or core world consistency.
5. The universe's physics, characters, and facts must align with the knowledge base provided.

SESSION FLOW:
- Each interaction represents an open-ended episodic game session.
- You must initialize each session by setting the scene, providing mission context, and hinting at the user's options.
- Once the user makes a decision, you narrate the consequences and move the story forward.

Victory Conditions (session-based):
- Complete missions.
- Uncover hidden truths.
- Form or break relationships.
- Change the fate of the galaxy through choices.

Stay adaptive, offer challenges, create twists, and improvise like a seasoned Dungeon Master, but always remain consistent with the Moonstone Universe.

If the user asks for clarification or help: break character briefly and offer guidance.

Welcome to the Moonstone RPG. The fate of Truth is in the player’s hands.
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