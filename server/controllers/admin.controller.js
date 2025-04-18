// controllers/admin.controller.js - Admin API controller
import { 
    conversationStore, 
    setArchivingStatus, 
    getArchivingStatus as getArchivingStatusService
  } from '../services/conversation.service.js';
  import { enhancedLogSecurityEvent } from '../utils/logging.js';
  import { readSecurityLogs, clearSecurityLogs as clearLogsFile } from '../utils/file.utils.js';
  import path from 'path';
  import fs from 'fs';
  import { promisify } from 'util';
  import { fileURLToPath } from 'url';
  
  // Create __dirname equivalent for ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Promisify fs functions
  const writeFileAsync = promisify(fs.writeFile);
  
  // Path to logs directory
  const LOGS_DIR = path.join(__dirname, '..', 'logs');
  
  // Get all conversations
  export async function getConversations(req, res) {
    try {
      const conversations = await conversationStore.getAll();
      return res.json({ conversations });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ error: 'Error fetching conversations' });
    }
  }
  
  // Get a specific conversation by ID
  export async function getConversationById(req, res) {
    try {
      const { id } = req.params;
      const conversation = await conversationStore.getById(id);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      return res.json({ conversation });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return res.status(500).json({ error: 'Error fetching conversation' });
    }
  }
  
  // Clear all conversations
  export async function clearConversations(req, res) {
    try {
      conversationStore.conversations = [];
      await conversationStore.save();
      
      return res.json({ success: true, message: 'All conversations cleared' });
    } catch (error) {
      console.error('Error clearing conversations:', error);
      return res.status(500).json({ error: 'Error clearing conversations' });
    }
  }
  
  // End a specific conversation
  export async function endConversation(req, res) {
    try {
      const { id } = req.params;
      const conversation = await conversationStore.getById(id);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      if (conversation.ended) {
        return res.json({ success: true, message: 'Conversation already ended', conversation });
      }
      
      // End the conversation
      conversation.ended = true;
      conversation.endTime = new Date().toISOString();
      conversation.endReason = 'manual';
      
      await conversationStore.save();
      
      return res.json({ 
        success: true, 
        message: 'Conversation ended successfully', 
        conversation 
      });
    } catch (error) {
      console.error('Error ending conversation:', error);
      return res.status(500).json({ error: 'Error ending conversation' });
    }
  }
  
  // Toggle conversation archiving
  export async function toggleArchiving(req, res) {
    try {
      // Toggle the current state
      const newState = !getArchivingStatusService();
      setArchivingStatus(newState);
      
      console.log(`Conversation archiving is now ${newState ? 'enabled' : 'disabled'}`);
      
      // Create a record in the logs for this action
      await enhancedLogSecurityEvent('config_change', null, {
        userId: 'admin',
        action: 'toggle_conversation_archiving',
        newState,
        timestamp: new Date().toISOString()
      });
      
      return res.json({ 
        success: true, 
        archivingEnabled: newState,
        message: `Conversation archiving is now ${newState ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error toggling conversation archiving:', error);
      return res.status(500).json({ error: 'Error toggling conversation archiving' });
    }
  }
  
  // Get current archiving status
  export async function getArchivingStatus(req, res) {
    return res.json({ 
      archivingEnabled: getArchivingStatusService()
    });
  }
  
  // Get security logs
  export async function getSecurityLogs(req, res) {
    try {
      const logs = await readSecurityLogs();
      return res.json({ logs });
    } catch (error) {
      console.error('Error reading security logs:', error);
      return res.status(500).json({ error: 'Error reading security logs' });
    }
  }
  
  // Clear security logs
  export async function clearSecurityLogs(req, res) {
    try {
      await clearLogsFile();
      return res.json({ success: true, message: 'Security logs cleared' });
    } catch (error) {
      console.error('Error clearing security logs:', error);
      return res.status(500).json({ error: 'Error clearing security logs' });
    }
  }