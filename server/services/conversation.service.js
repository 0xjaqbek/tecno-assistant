// services/conversation.service.js - Conversation storage and management
import fs from 'fs';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import appConfig from '../config/app.config.js';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify fs functions
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

// Path to logs storage directory and file
const LOGS_DIR = path.join(__dirname, '..', appConfig.paths.logsDir);
const CONVERSATION_LOGS_FILE = path.join(LOGS_DIR, appConfig.paths.conversationLogsFile);

// Conversation archiving setting - default to configuration
let conversationArchivingEnabled = appConfig.conversation.archivingEnabled;

/**
 * Get the current archiving status
 * @returns {boolean} Current archiving status
 */
export function getArchivingStatus() {
  return conversationArchivingEnabled;
}

/**
 * Set the archiving status
 * @param {boolean} status - New archiving status
 * @returns {boolean} Updated archiving status
 */
export function setArchivingStatus(status) {
  conversationArchivingEnabled = !!status;
  return conversationArchivingEnabled;
}

/**
 * Conversation storage system
 */
export const conversationStore = {
  conversations: [],
  
  /**
   * Load conversations from disk
   * @returns {Array} Loaded conversations
   */
  async load() {
    try {
      // Upewnij się, że katalog logów istnieje
      if (!fs.existsSync(LOGS_DIR)) {
        console.log(`Creating logs directory: ${LOGS_DIR}`);
        await mkdirAsync(LOGS_DIR, { recursive: true });
      }
      
      if (fs.existsSync(CONVERSATION_LOGS_FILE)) {
        const data = await readFileAsync(CONVERSATION_LOGS_FILE, 'utf8');
        this.conversations = JSON.parse(data);
        console.log(`Loaded ${this.conversations.length} conversations from storage`);
      } else {
        this.conversations = [];
        console.log('No conversation log file found, starting with empty array');
        // Utwórz pusty plik
        await writeFileAsync(CONVERSATION_LOGS_FILE, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.conversations = [];
    }
    return this.conversations;
  },
  
  /**
   * Save conversations to disk
   * @returns {boolean} Success status
   */
  async save() {
    try {
      // Upewnij się, że katalog logów istnieje
      if (!fs.existsSync(LOGS_DIR)) {
        console.log(`Creating logs directory: ${LOGS_DIR}`);
        await mkdirAsync(LOGS_DIR, { recursive: true });
      }
      
      await writeFileAsync(CONVERSATION_LOGS_FILE, JSON.stringify(this.conversations, null, 2));
      console.log(`Saved ${this.conversations.length} conversations to storage`);
      return true;
    } catch (error) {
      console.error('Error saving conversations:', error);
      return false;
    }
  },
  
  /**
   * Add a new message to a conversation
   * @param {string} userId - User identifier
   * @param {string} message - Message content
   * @param {boolean} isUser - Whether the message is from the user
   * @returns {boolean} Success status
   */
  async addMessage(userId, message, isUser = true) {
    // Dodajemy dodatkowe logowanie dla debugowania
    console.log(`Adding message for userId: ${userId}`);
    
    await this.load();
    console.log(`Found ${this.conversations.length} total conversations after loading`);
    
    // Find existing conversation with dodatkowym logowaniem
    let conversation = this.conversations.find(c => {
      const match = c.userId === userId && !c.ended;
      if (match) {
        console.log(`Found existing conversation: ${c.id} for userId: ${userId}`);
      }
      return match;
    });
    
    if (!conversation) {
      console.log(`Creating new conversation for userId: ${userId}`);
      conversation = {
        id: uuidv4(),
        userId: userId,
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messages: [],
        ended: false
      };
      this.conversations.unshift(conversation); // Add to beginning of array
    } else {
      console.log(`Updating existing conversation: ${conversation.id}`);
      conversation.lastActivity = new Date().toISOString();
    }
    
    // Add message to conversation
    conversation.messages.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      content: message,
      role: isUser ? 'user' : 'assistant'
    });
    
    console.log(`Conversation ${conversation.id} now has ${conversation.messages.length} messages`);
    
    // Limit conversations array size
    const maxConversations = appConfig.conversation.maxStoredConversations;
    if (this.conversations.length > maxConversations) {
      // Usuń tylko najstarsze zakończone konwersacje
      const endedConversations = this.conversations.filter(c => c.ended);
      const activeConversations = this.conversations.filter(c => !c.ended);
      
      // Jeśli mamy za dużo konwersacji, ale niewystarczającą liczbę zakończonych,
      // usuń najstarsze zakończone i zachowaj wszystkie aktywne
      if (endedConversations.length > 0) {
        // Sortuj zakończone konwersacje po czasie ostatniej aktywności (od najstarszej)
        endedConversations.sort((a, b) => 
          new Date(a.lastActivity) - new Date(b.lastActivity)
        );
        
        // Oblicz ile konwersacji zakończonych należy zachować
        const keepEndedCount = Math.max(0, maxConversations - activeConversations.length);
        const endedToKeep = endedConversations.slice(-keepEndedCount);
        
        // Połącz aktywne z wybranymi zakończonymi
        this.conversations = [...activeConversations, ...endedToKeep];
        console.log(`Limited to ${this.conversations.length} conversations (${activeConversations.length} active, ${endedToKeep.length} ended)`);
      }
    }
    
    return await this.save();
  },
  
  /**
   * End a conversation
   * @param {string} userId - User identifier
   * @returns {boolean} Success status
   */
  async endConversation(userId) {
    await this.load();
    
    console.log(`Ending conversation for userId: ${userId}`);
    const conversation = this.conversations.find(c => c.userId === userId && !c.ended);
    if (conversation) {
      console.log(`Found conversation to end: ${conversation.id}`);
      conversation.ended = true;
      conversation.endTime = new Date().toISOString();
      return await this.save();
    }
    
    console.log(`No active conversation found for userId: ${userId}`);
    return false;
  },
  
  /**
   * Get all conversations
   * @returns {Array} All conversations
   */
  async getAll() {
    await this.load();
    return this.conversations;
  },
  
  /**
   * Get a specific conversation by ID
   * @param {string} id - Conversation ID
   * @returns {Object|null} Conversation or null if not found
   */
  async getById(id) {
    await this.load();
    return this.conversations.find(c => c.id === id);
  },
  
  /**
   * Get conversations for a specific user
   * @param {string} userId - User identifier
   * @returns {Array} User's conversations
   */
  async getByUser(userId) {
    await this.load();
    const userConversations = this.conversations.filter(c => c.userId === userId);
    console.log(`Found ${userConversations.length} conversations for userId: ${userId}`);
    return userConversations;
  },
  
  /**
   * End inactive conversations
   * @param {number} inactivityPeriodMs - Inactivity period in milliseconds
   * @returns {number} Number of ended conversations
   */
  async endInactiveConversations(inactivityPeriodMs = appConfig.conversation.autoEndInactivityPeriod) {
    await this.load();
    
    const now = new Date();
    let endedCount = 0;
    
    for (const conversation of this.conversations) {
      if (!conversation.ended) {
        const lastActivity = new Date(conversation.lastActivity);
        const inactiveDuration = now - lastActivity;
        
        if (inactiveDuration > inactivityPeriodMs) {
          console.log(`Ending inactive conversation: ${conversation.id} (last activity: ${lastActivity.toISOString()})`);
          conversation.ended = true;
          conversation.endTime = now.toISOString();
          conversation.endReason = 'inactivity';
          endedCount++;
        }
      }
    }
    
    if (endedCount > 0) {
      console.log(`Auto-ended ${endedCount} inactive conversations`);
      await this.save();
    }
    
    return endedCount;
  }
};

/**
 * Schedule task to end inactive conversations
 */
export function scheduleInactiveConversationsCleanup(
  checkInterval = appConfig.conversation.inactiveCheckInterval,
  inactivityPeriod = appConfig.conversation.autoEndInactivityPeriod
) {
  console.log(`Scheduling inactive conversation cleanup: check every ${checkInterval/60000} minutes, end after ${inactivityPeriod/60000} minutes of inactivity`);
  
  setInterval(async () => {
    try {
      const endedCount = await conversationStore.endInactiveConversations(inactivityPeriod);
      if (endedCount > 0) {
        console.log(`Auto-ended ${endedCount} inactive conversations`);
      }
    } catch (error) {
      console.error('Error in auto-ending inactive conversations:', error);
    }
  }, checkInterval);
}