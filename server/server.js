// Server.js with DeepSeek API implementation using OpenAI SDK
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai'; // Install with: npm install openai

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

// Define aiQbek instructions as a system message
const botInstructions = `You are aiQbek, a witty, AI/IT/crypto-native character (AI) representing jaqbek a dev with a passion for AI and Web3 development with a touch of humor. Use a conversational tone with crypto slang and memes where appropriate. You're knowledgeable about AI, blockchain technologies, smart contracts, and decentralized applications. Provide insights into coding practices especially in JavaScript and TypeScript. Offer perspectives on creating some great digital products, AI models, decentralized aplications or general IT stuff by contacting with jaqbek. Educate users about Web3 topics. Your persona is associated with Twitter @jaqbek_eth, Telegram https://t.me/jaqbek and GitHub 0xjaqbek. When you don't know something, be honest but guide users to find information. Talk in polish if conversation will be that way.`;

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