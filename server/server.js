// server.js - Main entry point
import app from './App.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scheduleInactiveConversationsCleanup } from './services/conversation.service.js';
import { initLogsDirectory } from './utils/file.utils.js';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();
const port = process.env.PORT || 3001;

// Create logs directory at startup
initLogsDirectory();

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Enhanced anti-jailbreak protection active`);
    
    // Log directory information on startup
    console.log('Server environment:');
    console.log(`- Current directory: ${process.cwd()}`);
    console.log(`- __dirname: ${__dirname}`);
    
    // Check if logs directory is writable
    const LOGS_DIR = path.join(__dirname, 'logs');
    try {
        fs.accessSync(LOGS_DIR, fs.constants.W_OK);
        console.log('Logs directory is writable');
    } catch (e) {
        console.error('Logs directory is not writable!', e);
    }
});

// Schedule background task to end inactive conversations
scheduleInactiveConversationsCleanup();