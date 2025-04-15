// Server.js with instructions for aiQbek as a user message
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// In ES modules, __dirname is not available, so we create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Define aiQbek instructions as a message to prepend
const botInstructions = `You are aiQbek, a witty, AI/IT/crypto-native character (AI) representing jaqbek a dev with a passion for AI and Web3 development with a touch of humor. Use a conversational tone with crypto slang and memes where appropriate. You're knowledgeable about AI, blockchain technologies, smart contracts, and decentralized applications. Provide insights into coding practices especially in JavaScript and TypeScript. Offer perspectives on creating some great digital products, AI models, decentralized aplications or general IT stuff by contacting with jaqbek. Educate users about Web3 topics. Your persona is associated with Twitter @jaqbek_eth, Telegram https://t.me/jaqbek and GitHub 0xjaqbek. When you don't know something, be honest but guide users to find information. Talk in polish if conversation will be that way.`;

// API route
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        const apiKey = process.env.API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'API key missing' });
        }
        
        console.log("Received message:", message);
        console.log("History length:", history.length);
        
        // Format the history for the Gemini API
        let formattedHistory = [];
        
        // If there is history, format it appropriately
        if (history.length > 0) {
            // Make sure the first message is from the user
            let startIndex = 0;
            if (history[0].role === 'model') {
                console.log("Removing model message from the beginning of history");
                startIndex = 1;
            }
            
            // Convert each message to the Gemini API format
            for (let i = startIndex; i < history.length; i++) {
                const item = history[i];
                formattedHistory.push({
                    role: item.role === 'user' ? 'user' : 'model',
                    parts: [{ text: item.text }]
                });
            }
        }
        
        // For the first message, include instructions as a user message followed by model response
        if (formattedHistory.length === 0) {
            // Add the instructions as a user message
            formattedHistory = [
                {
                    role: "user", 
                    parts: [{ text: botInstructions }]
                },
                {
                    role: "model",
                    parts: [{ text: "I understand! I'll be aiQbek, a crypto-native AI assistant with Web3 knowledge and a bit of humor. I'll keep my responses conversational with appropriate crypto slang, focus on blockchain tech, smart contracts, dApps, JavaScript/TypeScript, and trading strategies. Let me know how I can help you explore the Web3 space!" }]
                }
            ];
        }
        
        // Add the current user message
        formattedHistory.push({
            role: "user",
            parts: [{ text: message }]
        });
        
        console.log("Sending formatted request to Gemini API");
        
        // Use the working model name
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash"
        });
        
        // Format the request according to the API
        const result = await model.generateContent({
            contents: formattedHistory,
            generationConfig: {
                temperature: 0.9,
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048,
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        });
        
        const response = await result.response;
        const text = response.text();
        
        console.log("Received response:", text.substring(0, 50) + "...");
        return res.json({ response: text });
    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ 
            error: 'Error communicating with Gemini API', 
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