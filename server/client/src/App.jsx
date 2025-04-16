import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const GlassChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ambientPlaying, setAmbientPlaying] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContentRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const ambientAudioRef = useRef(null);

  const transmissionSounds = [
    '/signal1.mp3',
    '/signal2.mp3',
    '/signal3.mp3'
  ];

  useEffect(() => {
    const openingScenes = [
      "🌌 You awaken aboard the starship Arcon. The engines are silent. A blinking red light pulses from the console.",
      "🛰️ Drift. Darkness. The only sound is the hum of recycled oxygen. The navigation system shows: 'Unknown Sector'.",
      "⚠️ Hades Station broadcast detected: 'Docking authorization expired. Hostiles inbound. Prepare.'",
      "🚀 Fuel levels critical. Deep void surrounds you. Something is approaching on the radar.",
      "💀 Your memory is fragmented. Your mission is unclear. But one word remains: Moonstone."
    ];
    const randomIntro = openingScenes[Math.floor(Math.random() * openingScenes.length)];
    setDisplayMessages([{
      text: randomIntro + "\nType your first action to begin.",
      role: 'model',
      timestamp: new Date().toISOString()
    }]);
  }, []);

  useEffect(() => {
    ambientAudioRef.current = new Audio('/ambience.mp3');
    ambientAudioRef.current.loop = true;
    ambientAudioRef.current.volume = 0.2;
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
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    abortControllerRef.current?.abort();
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
      const history = messages.map(msg => ({ role: msg.role, text: msg.text }));
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

      // Play transmission sound after AI response
      const randomSound = new Audio(transmissionSounds[Math.floor(Math.random() * transmissionSounds.length)]);
      randomSound.volume = 0.5;
      randomSound.play().catch(err => console.warn("Transmission sound blocked:", err));

      setTimeout(() => scrollToBottom(), 100);
    } catch (err) {
      console.error('Error sending message:', err);
      if (err.name !== 'AbortError') {
        setError(err.message.includes('timed out') ? err.message : err.message || "Neural link failed.");
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
      setError("Transmission aborted. What's your next move?");
    }
  };

  const toggleAmbientAudio = () => {
    if (!ambientAudioRef.current) return;
    if (ambientPlaying) {
      ambientAudioRef.current.pause();
    } else {
      ambientAudioRef.current.play().catch(err => console.warn("Ambient audio play blocked:", err));
    }
    setAmbientPlaying(!ambientPlaying);
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
        <div className="ambient-control">
          <button className="ambient-button" onClick={toggleAmbientAudio}>
            {ambientPlaying ? "🔊 Ambient: On" : "🔇 Ambient: Off"}
          </button>
        </div>
      </header>

      <div className="chat-window">
        <div className="chat-window-header">
          <div className="window-title">Moonstone Universe — AI-Powered Roleplay</div>
        </div>

        <div className="chat-content" ref={chatContentRef}>
          {error && <div className="error-message">{error}</div>}
          {displayMessages.map((message, index) => (
            <div key={index} className={`message ${message.role === 'user' ? 'user-message' : 'bot-message'}`}>
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
          <button type="submit" className="send-button" disabled={isLoading || !inputValue.trim()}>→</button>
        </form>
      </div>

      <div className="status-indicator">
        <span className="online-dot"></span>
        <span>Session Active</span>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <span className="footer-text">🪐 Moonstone RPG</span>
          <div className="footer-links">
            <a href="https://twitter.com/jaqbek_eth" target="_blank" rel="noopener noreferrer">@jaqbek_eth</a>
            <a href="https://github.com/0xjaqbek" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://t.me/jaqbek" target="_blank" rel="noopener noreferrer">Telegram</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GlassChatApp;
