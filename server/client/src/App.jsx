import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const GlassChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContentRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Initial intro for your Moonstone RPG world
  useEffect(() => {
    setDisplayMessages([{
      text: `🚀 Welcome to the Moonstone Universe. 
I am your AI Game Master. 
You are about to enter a dark sci-fi roleplaying session where your choices shape the story. 
No stats, no dice — just survival, discovery, and danger in the galaxy's deadliest corners.
\nType your first action to begin.`,
      role: 'model',
      timestamp: new Date().toISOString()
    }]);
  }, []);

  const scrollToBottom = () => {
    if (chatContentRef.current) chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    const timeoutId = setTimeout(() => scrollToBottom(), 100);
    return () => clearTimeout(timeoutId);
  }, [displayMessages]);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const userMessage = {
      text: inputValue,
      role: 'user',
      timestamp: new Date().toISOString()
    };

    setDisplayMessages(prev => [...prev, userMessage]);
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const history = messages.map(msg => ({
        role: msg.role,
        text: msg.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text, history }),
        signal: abortControllerRef.current.signal
      });

      if (response.status === 504) throw new Error("Connection lost in hyperspace. Try again.");
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.details || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const botMessage = {
        text: data.response,
        role: 'model',
        timestamp: new Date().toISOString()
      };

      setDisplayMessages(prev => [...prev, botMessage]);
      setMessages(prev => [...prev, botMessage]);
      setTimeout(() => scrollToBottom(), 100);

    } catch (err) {
      console.error('Error sending message:', err);
      if (err.name === 'AbortError') return;
      setError(err.message.includes('timed out') ? err.message : err.message || "Neural link failed.");
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setError("Transmission aborted. What's your next move?");
    }
  };

  const formatText = (text) => {
    if (!text) return '';
    return text.split('```').map((segment, index) => {
      if (index % 2 === 1) {
        const codeLines = segment.split('\n');
        const language = codeLines[0].trim();
        const code = codeLines.slice(1).join('\n');
        return <pre key={index}><code className={language ? `language-${language}` : ''}>{code}</code></pre>;
      } else {
        return <div key={index}>{segment.split('`').map((part, idx) => idx % 2 === 1 ? <code key={idx}>{part}</code> : <span key={idx}>{part}</span>)}</div>;
      }
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🌑 Moonstone RPG <span className="version">v1.0</span></h1>
        <div className="nav-links">
          <a href="https://twitter.com/jaqbek_eth" target="_blank" rel="noopener noreferrer">by @jaqbek_eth</a>
        </div>
      </header>

      <div className="chat-window">
        <div className="chat-window-header">
          <div className="window-title">Moonstone Universe — AI-Powered Roleplay</div>
        </div>

        <div className="chat-content" ref={chatContentRef}>
          {error && <div className="error-message">{error}</div>}

          {displayMessages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.role === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <div className="message-prompt">
                <span className="terminal-prefix">{message.role === 'user' ? '>>' : 'GM'}</span>
                {message.role === 'user' ? ' YOU' : ' GAME MASTER'}
              </div>
              <div className="message-text">{formatText(message.text)}</div>
            </div>
          ))}

          {isLoading && (
            <div className="message bot-message">
              <div className="message-prompt"><span className="terminal-prefix"></span> GAME MASTER</div>
              <div className="message-text">
                <div className="loading"></div> Calculating outcome...
                <button onClick={handleCancelRequest} className="cancel-button">CANCEL</button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} style={{ float: 'left', clear: 'both' }}></div>
        </div>
      </div>

      <div className="input-area">
        <form onSubmit={handleSubmit} className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="What is your next action?"
            className="message-input"
            ref={inputRef}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={isLoading || !inputValue.trim()}
          >→</button>
        </form>
      </div>

      <div className="status-indicator">
        <span className="online-dot"></span>
        <span>Session Active</span>
      </div>
    </div>
  );
};

export default GlassChatApp;
