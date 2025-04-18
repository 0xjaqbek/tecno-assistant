// services/ai.service.js - AI/DeepSeek API interaction service
import OpenAI from 'openai';
import { filterBotResponse } from '../client/src/security/utils.js';
import { enhancedLogSecurityEvent } from '../utils/logging.js';
import { botInstructions } from '../data/knowledge-base.js';
import appConfig from '../config/app.config.js';

// Initialize OpenAI client with DeepSeek configuration
const openai = new OpenAI({
  baseURL: appConfig.deepseek.baseUrl,
  apiKey: appConfig.deepseek.apiKey,
  timeout: appConfig.deepseek.timeout,
});

/**
 * Send a chat request to the DeepSeek API
 * @param {string} message - Sanitized user message
 * @param {Array} history - Chat history
 * @param {string} userId - User ID for logging
 * @returns {Object} Response result with filtered text
 */
export async function sendChatRequest(message, history = [], userId = 'unknown') {
  if (!appConfig.deepseek.apiKey) {
    throw new Error('DeepSeek API key missing');
  }
  
  // Format messages for API
  let messages = [];
  
  // Add system instructions
  messages.push({
    role: "system",
    content: botInstructions
  });
  
  // Add conversation history
  if (history.length > 0) {
    for (const item of history) {
      messages.push({
        role: item.role === 'user' ? 'user' : 'assistant',
        content: item.text
      });
    }
  }
  
  // Add current user message
  messages.push({
    role: "user",
    content: message
  });
  
  // Call the API
  const completion = await openai.chat.completions.create({
    model: appConfig.deepseek.model,
    messages: messages,
    temperature: 0.7,
    max_tokens: 2048,
  });
  
  // Get the response content
  const responseContent = completion.choices[0].message.content;
  
  // Filter the response to ensure it stays in character
  const responseResult = filterBotResponse(responseContent);
  
  // Log if response was filtered
  if (responseResult.wasFiltered) {
    enhancedLogSecurityEvent('outOfCharacter', responseContent, {
      userId,
      score: responseResult.score,
      details: responseResult.details
    });
  }
  
  return responseResult;
}