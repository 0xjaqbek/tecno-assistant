import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const PortfolioAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [typingComplete, setTypingComplete] = useState({});

  const messagesEndRef = useRef(null);
  const chatContentRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Initial setup
  useEffect(() => {
    const openingMessage = {
      text: "👋 Hi there! I'm the portfolio assistant. I can tell you about the developer's skills, projects, and services. How can I help you today?",
      role: 'assistant',
      timestamp: new Date().toISOString(),
      id: 'intro-message'
    };
    setMessages([openingMessage]);
    setTypingComplete({ 'intro-message': true });
  }, []);

  const scrollToBottom = () => {
    if (chatContentRef.current) chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    const timeoutId = setTimeout(() => scrollToBottom(), 100);
    return () => clearTimeout(timeoutId);
  }, [messages, typingComplete]);

  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatOpen]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const messageId = `msg-${Date.now()}`;
    const userMessage = {
      text: trimmedInput,
      role: 'user',
      timestamp: new Date().toISOString(),
      id: `user-${messageId}`
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    setTypingComplete(prev => ({ ...prev, [`user-${messageId}`]: true }));

    try {
      const history = messages.map(msg => ({ role: msg.role, text: msg.text }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text, history }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      const botMessage = {
        text: data.response,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        id: `assistant-${messageId}`
      };

      setMessages(prev => [...prev, botMessage]);
      setTypingComplete(prev => ({ ...prev, [`assistant-${messageId}`]: false }));
    } catch (err) {
      console.error('Error sending message:', err);
      if (err.name !== 'AbortError') {
        setError('Sorry, I encountered an error. Please try again.');
      }
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
      setError('Request canceled. How can I help you?');
    }
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleTypingComplete = (messageId) => {
    setTypingComplete(prev => ({ ...prev, [messageId]: true }));
    setTimeout(scrollToBottom, 100);
  };

  const formatText = (text, messageId, isTyping) => {
    if (!text) return '';
    
    // For user messages or completed bot messages, render normally
    if (!isTyping) {
      return text.split('```').map((segment, index) => {
        if (index % 2 === 1) {
          const codeLines = segment.split('\n');
          const language = codeLines[0].trim();
          const code = codeLines.slice(1).join('\n');
          return <pre key={index}><code className={language ? `language-${language}` : ''}>{code}</code></pre>;
        } else {
          return <div key={index}>{segment.split('`').map((part, idx) => 
            idx % 2 === 1 ? <code key={idx}>{part}</code> : <span key={idx}>{part}</span>
          )}</div>;
        }
      });
    }
    
    // For bot messages that need typing animation
    return (
      <TypedText 
        text={text} 
        wordsPerChunk={Math.floor(Math.random() * 4) + 2} // Random 2-5 words per chunk
        typingSpeed={40} 
        onComplete={() => handleTypingComplete(messageId)}
      />
    );
  };

  // TypedText component embedded for simplicity
  const TypedText = ({ text, typingSpeed = 40, wordsPerChunk = 3, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
      setDisplayedText('');
      setIsComplete(false);
      
      if (!text) return;
      
      const words = text.split(' ');
      const chunks = [];
      
      for (let i = 0; i < words.length; i += wordsPerChunk) {
        const actualChunkSize = typeof wordsPerChunk === 'number' 
          ? wordsPerChunk 
          : Math.floor(Math.random() * 4) + 2;
        
        chunks.push(words.slice(i, i + actualChunkSize).join(' '));
      }
      
      let currentIndex = 0;
      const totalChunks = chunks.length;
      
      const calculatedDelay = Math.min(5000 / totalChunks, typingSpeed);

      const typingInterval = setInterval(() => {
        if (currentIndex < totalChunks) {
          setDisplayedText(prev => {
            const newText = prev ? prev + ' ' + chunks[currentIndex] : chunks[currentIndex];
            return newText.trim();
          });
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsComplete(true);
          if (onComplete) onComplete();
        }
      }, calculatedDelay);

      return () => clearInterval(typingInterval);
    }, [text, typingSpeed, wordsPerChunk, onComplete]);

    return (
      <div className="typed-text">
        {displayedText}
        {!isComplete && <span className="cursor">|</span>}
      </div>
    );
  };

  const chatContainerClass = `chat-container ${isChatOpen ? 'open' : ''} ${isFullScreen ? 'fullscreen' : ''}`;

  return (
    <div className={chatContainerClass}>
      {!isChatOpen ? (
        <button className="chat-button" onClick={toggleChat}>
          <span className="chat-icon">💬</span>
          <span className="chat-label">Ask me</span>
        </button>
      ) : (
        <div className="chat-box">
          <div className="chat-header">
            <h3>Portfolio Assistant</h3>
            <div className="header-controls">
              <button className="control-button" onClick={toggleFullScreen}>
                {isFullScreen ? '↙' : '↗'}
              </button>
              <button className="control-button" onClick={toggleChat}>×</button>
            </div>
          </div>
          
          <div className="chat-content" ref={chatContentRef}>
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-content">
                  {formatText(
                    message.text, 
                    message.id, 
                    message.role === 'assistant' && !typingComplete[message.id]
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message assistant-message">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <button onClick={handleCancelRequest} className="cancel-button">Cancel</button>
                </div>
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <div ref={messagesEndRef}></div>
          </div>
          
          <form onSubmit={handleSubmit} className="input-area">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Ask something about my portfolio..."
              className="message-input"
              ref={inputRef}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="send-button" 
              disabled={isLoading || !inputValue.trim()}
            >
              Send
            </button>
          </form>
          
          <div className="chat-footer">
            <p>Portfolio Assistant v1.0</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioAssistant;