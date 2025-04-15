import React, { useState, useEffect, useRef } from 'react';
import './App.css'

const TerminalChat = () => {
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Add initial welcome message from aiQbek - for display only, not sent to API
  useEffect(() => {
    setDisplayMessages([{
      text: "GM! I'm aiQbek0.1 First LLM (gemini2.0 Flash) delivered by jaqbek. Ready to dive into AI, Web3, smart contracts, or anything blockchain? WAGMI! 🚀",
      role: 'model',
      timestamp: new Date().toISOString()
    }]);
  }, []);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clean up any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Add user message
    const userMessage = {
      text: inputValue,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Add to display messages
    setDisplayMessages(prev => [...prev, userMessage]);
    
    // Add to actual message history for the API
    setMessages(prev => [...prev, userMessage]);
    
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Get chat history for the API - only include actual conversation, not welcome message
      const history = messages.map(msg => ({
        role: msg.role,
        text: msg.text
      }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          history: history
        }),
        signal: abortControllerRef.current.signal,
        // Client timeout as backup to server timeout
        timeout: 28000
      });
      
      if (response.status === 504) {
        throw new Error("The blockchain nodes are congested! The AI request timed out. Try a simpler query.");
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || 
          errorData?.details || 
          `Server responded with ${response.status}`
        );
      }
      
      const data = await response.json();
      
      // Create bot response message
      const botMessage = {
        text: data.response,
        role: 'model',
        timestamp: new Date().toISOString()
      };
      
      // Add bot message to display messages
      setDisplayMessages(prev => [...prev, botMessage]);
      
      // Add bot message to actual history for API
      setMessages(prev => [...prev, botMessage]);
      
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Ignore abort errors (user canceled or component unmounted)
      if (err.name === 'AbortError') {
        return;
      }
      
      // Format error message based on type
      let errorMessage = 'Connection failed. The blockchain must be congested! Try again later.';
      
      if (err.message.includes('timed out')) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Allow user to cancel request
  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setError("Query canceled. What else would you like to explore?");
    }
  };

  // Enhanced terminal prompt character for crypto theme
  const renderPrompt = (role) => {
    return role === 'user' ? '>' : 'Ξ>';
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>aiQbek <span className="version">v0.1.0</span></h1>
        <div className="header-links">
          <a href="https://twitter.com/jaqbek_eth" target="_blank" rel="noopener noreferrer">@jaqbek_eth</a> | 
          <a href="https://github.com/0xjaqbek" target="_blank" rel="noopener noreferrer">0xjaqbek</a> | 
          <a href="https://t.me/jaqbek" target="_blank" rel="noopener noreferrer">telegram</a>
        </div>
      </header>
      
      <div className="chat-container">
        {error && <div className="error-message">{error}</div>}
        
        {displayMessages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.role === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-prompt">
              <span className="terminal-prefix">{renderPrompt(message.role)}</span>
              {message.role === 'user' ? 'You' : 'aiQbek'}:
            </div>
            <div className="message-text">{message.text}</div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message bot-message">
            <div className="message-prompt">
              <span className="terminal-prefix"></span> aiQbek:
            </div>
            <div className="message-text">
              <div className="loading"></div> Mining response...
              <button onClick={handleCancelRequest} className="cancel-button">Cancel</button>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="input-container">
        <span className="terminal-prefix"></span>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Ask about Web3, DeFi, or dev..."
          className="message-input"
          ref={inputRef}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isLoading || !inputValue.trim()}
        >
          SEND
        </button>
      </form>
      
      <footer className="app-footer">
        <div className="network-status">
          <span className="network-indicator"></span> Connected
        </div>
      </footer>
    </div>
  );
};

export default TerminalChat;