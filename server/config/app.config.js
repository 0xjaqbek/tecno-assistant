// config/app.config.js - Application configuration
import dotenv from 'dotenv';

dotenv.config();

export default {
  // Server configuration
  port: process.env.PORT || 3001,
  environment: process.env.NODE_ENV || 'development',
  
  // DeepSeek API configuration
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    timeout: 25000, // 25-second timeout
  },
  
  // Admin configuration
  admin: {
    adminApiKey: process.env.ADMIN_API_KEY,
  },
  
  // File paths
  paths: {
    logsDir: 'logs',
    securityLogsFile: 'security_logs.json',
    conversationLogsFile: 'conversation_logs.json',
    securityLogsHtml: 'security-logs.html',
    conversationsHtml: 'conversations.html',
  },
  
  // Conversation management
  conversation: {
    maxStoredConversations: 500,
    inactiveCheckInterval: 15 * 60 * 1000, // 15 minutes
    autoEndInactivityPeriod: 60 * 60 * 1000, // 1 hour
    archivingEnabled: true, // Default state
  },
  
  // Logging
  logging: {
    maxLogs: 1000,
  }
};