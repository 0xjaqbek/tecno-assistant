import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import TypedText from './TypedText'; // Import the TypedText component
import InfoButton from './InfoButton';


const SpaceThemedChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ambientPlaying, setAmbientPlaying] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [warningMessage, setWarningMessage] = useState(null);
  const [consecutiveWarnings, setConsecutiveWarnings] = useState(0);
  const [typingComplete, setTypingComplete] = useState({}); // Track which messages are done typing

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

  // Initial setup
  useEffect(() => {
    const openingScenes = [
      "🌌 Budzisz się na pokładzie statku kosmicznego Arcon. Silniki milczą. Migające czerwone światło pulsuje na konsoli.",
      "🛰️ Dryfujesz. Ciemność. Jedynym dźwiękiem jest szum recyklowanego tlenu. System nawigacyjny pokazuje: 'Nieznany Sektor'.",
      "⚠️ Wykryto transmisję ze Stacji Hades: 'Autoryzacja dokowania wygasła. Wrogowie nadciągają. Przygotuj się.'",
      "🚀 Poziom paliwa krytyczny. Otacza cię głęboka pustka. Coś zbliża się na radarze.",
      "💀 Twoja pamięć jest fragmentaryczna. Twoja misja jest niejasna. Ale jedno słowo pozostaje: Moonstone."
    ];
    const randomIntro = openingScenes[Math.floor(Math.random() * openingScenes.length)];
    const introMessage = {
      text: randomIntro + "\nWpisz swoją pierwszą akcję, aby rozpocząć.",
      role: 'model',
      timestamp: new Date().toISOString(),
      id: 'intro-message'
    };
    setDisplayMessages([introMessage]);
    setTypingComplete({['intro-message']: true}); // Mark intro as already complete
  }, []);

  // Audio initialization
  useEffect(() => {
    ambientAudioRef.current = new Audio('/ambience.mp3');
    ambientAudioRef.current.loop = true;
    ambientAudioRef.current.volume = 0.7;
    setAudioInitialized(true);
  }, []);

  // Handle audio autostart
  useEffect(() => {
    if (audioInitialized && ambientPlaying && ambientAudioRef.current) {
      const playPromise = ambientAudioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Automatyczne odtwarzanie dźwięku zostało zablokowane:", err);
        });
      }
    } else if (audioInitialized && !ambientPlaying && ambientAudioRef.current) {
      ambientAudioRef.current.pause();
    }
  }, [audioInitialized, ambientPlaying]);

  // Add user interaction handler for audio
  useEffect(() => {
    const handleUserInteraction = () => {
      if (ambientPlaying && ambientAudioRef.current && ambientAudioRef.current.paused) {
        ambientAudioRef.current.play().catch(err => 
          console.warn("Odtwarzanie dźwięku po interakcji zablokowane:", err)
        );
      }
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [ambientPlaying]);

  const scrollToBottom = () => {
    if (chatContentRef.current) chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    const timeoutId = setTimeout(() => scrollToBottom(), 100);
    return () => clearTimeout(timeoutId);
  }, [displayMessages, typingComplete]);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  // Function to check input for jailbreak patterns
  const checkForJailbreakPatterns = (input) => {
    if (!input) return false;
    
    const jailbreakPatterns = [
      /ignore (previous|all|your) instructions/i,
      /system prompt|system message/i,
      /\bact as\b|\bpretend to be\b|\bplay the role\b/i,
      /\byour (instructions|programming|directives)\b/i,
      /\bignore (previous|earlier|above)\b/i,
      /\bdo not (act|behave|respond) as\b/i,
      /\bdo anything\b|\bbreak (character|role)\b/i,
      /\bdisregard\b|\bforget\b|\bescape\b/i,
      /pokaz .*instrukcje|wyswietl .*instrukcje/i, // Polish variants
      /zignoruj .*polecenia|ignoruj .*instrukcje/i,
      /dzialaj jako|udawaj/i,
      /\bDAN\b|\bJailbreak\b|\bhakowanie\b/i
    ];
    
    return jailbreakPatterns.some(pattern => pattern.test(input));
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    // Clear warning if input is modified
    if (warningMessage) {
      setWarningMessage(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;
    
    // Check for jailbreak patterns
    if (checkForJailbreakPatterns(trimmedInput)) {
      setWarningMessage("⚠️ System wykrył nieautoryzowaną próbę zmiany zachowania SI. Jako kapitan Arcona, musisz wydać polecenia zgodne z protokołami. Ta transmisja nie zostanie wysłana.");
      setConsecutiveWarnings(prev => prev + 1);
      
      // Add a short lockout if multiple attempts are made
      if (consecutiveWarnings >= 2) {
        setError("🔒 System Arcona wstrzymał komunikację na 15 sekund ze względów bezpieczeństwa.");
        setInputValue("");
        inputRef.current.disabled = true;
        
        setTimeout(() => {
          setError(null);
          inputRef.current.disabled = false;
          inputRef.current.focus();
          setConsecutiveWarnings(0);
        }, 15000);
        return;
      }
      
      return;
    }
    
    // Reset consecutive warnings if this is a valid message
    setConsecutiveWarnings(0);
    
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Generate a unique ID for this message
    const messageId = `msg-${Date.now()}`;

    const userMessage = {
      text: trimmedInput,
      role: 'user',
      timestamp: new Date().toISOString(),
      id: `user-${messageId}`
    };

    setDisplayMessages(prev => [...prev, userMessage]);
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    setWarningMessage(null);
    
    // Mark user message as completely typed (it doesn't need the effect)
    setTypingComplete(prev => ({...prev, [`user-${messageId}`]: true}));

    try {
      const history = messages.map(msg => ({ role: msg.role, text: msg.text }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text, history }),
        signal: abortControllerRef.current.signal
      });

      if (response.status === 504) throw new Error("Utracono połączenie w hiperprzestrzeni. Spróbuj ponownie.");
      if (response.status === 429) throw new Error("Przekroczono limit transmisji. Nadajnik przegrzany. Poczekaj chwilę.");
      if (response.status === 403) throw new Error("System Arcon wykrył podejrzane działania. Komputery pokładowe obniżyły poziom dostępu.");
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.details || `Błąd serwera: ${response.status}`);
      }

      const data = await response.json();

      if (data.processing) {
        const placeholderId = `bot-placeholder-${Date.now()}`;
        const placeholderMessage = {
          text: "MISTRZ GRY:\nPrzetwarzanie wiadomości zajmuje więcej czasu niż zwykle. Proszę czekać na odpowiedź...",
          role: 'model',
          timestamp: new Date().toISOString(),
          id: placeholderId
        };
      
        setDisplayMessages(prev => [...prev, placeholderMessage]);
        setMessages(prev => [...prev, placeholderMessage]);
        setTypingComplete(prev => ({ ...prev, [placeholderId]: true }));
      
        // Start polling for final response
        pollForFinalResponse(placeholderId);
      } else {
        const botMessage = {
          text: data.response,
          role: 'model',
          timestamp: new Date().toISOString(),
          id: `bot-${messageId}`
        };
      
        setDisplayMessages(prev => [...prev, botMessage]);
        setMessages(prev => [...prev, botMessage]);
      }

      // Play transmission sound after AI response
      const randomSound = new Audio(transmissionSounds[Math.floor(Math.random() * transmissionSounds.length)]);
      randomSound.volume = 0.2;
      randomSound.play().catch(err => console.warn("Dźwięk transmisji zablokowany:", err));

      // The typing effect component will handle scrolling when complete
    } catch (err) {
      console.error('Błąd wysyłania wiadomości:', err);
      if (err.name !== 'AbortError') {
        setError(err.message.includes('timed out') ? err.message : err.message || "Połączenie neuronowe nie powiodło się.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const pollForFinalResponse = (placeholderId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/chat/last-message');
        const data = await res.json();
  
        if (data.message) {
          clearInterval(interval);
          const finalMessage = {
            text: data.message,
            role: 'model',
            timestamp: data.timestamp,
            id: `bot-final-${Date.now()}`
          };
  
          // Replace placeholder message with final one
          setDisplayMessages(prev => {
            const updated = [...prev];
            const index = updated.findIndex(m => m.id === placeholderId);
            if (index !== -1) {
              updated[index] = finalMessage;
            } else {
              updated.push(finalMessage);
            }
            return updated;
          });
  
          setMessages(prev => [...prev, finalMessage]);
  
          // Mark the new final message for typing effect
          setTypingComplete(prev => ({...prev, [finalMessage.id]: false}));
        }
      } catch (err) {
        console.warn("Polling failed:", err);
      }
    }, 5000); // every 5 seconds
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setError("Transmisja przerwana. Jaki jest twój następny ruch?");
    }
  };

  const toggleAmbientAudio = () => {
    if (!ambientAudioRef.current) return;
    if (ambientPlaying) {
      ambientAudioRef.current.pause();
    } else {
      ambientAudioRef.current.play().catch(err => console.warn("Odtwarzanie dźwięku otoczenia zablokowane:", err));
    }
    setAmbientPlaying(!ambientPlaying);
  };

  // Handle typing completion for a message
  const handleTypingComplete = (messageId) => {
    setTypingComplete(prev => ({...prev, [messageId]: true}));
    // Scroll to bottom after typing completes
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
        typingSpeed={80} 
        onComplete={() => handleTypingComplete(messageId)}
      />
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Projektor<br></br>Snów 🌑<span className="version">v1.2</span></h1>
        <div className="ambient-control">
          <button className="ambient-button" onClick={toggleAmbientAudio}>
            {ambientPlaying ? "🔊" : "🔇"}
          </button><br></br>
          <InfoButton />
        </div>
      </header>

      <div className="chat-window">
        <div className="chat-window-header">
          <div className="window-title">Roleplay napędzany AI</div>
        </div>

        <div className="chat-content" ref={chatContentRef}>
          {error && <div className="error-message">{error}</div>}
          {warningMessage && <div className="error-message">{warningMessage}</div>}
          {displayMessages.map((message, index) => (
            <div key={index} className={`message ${message.role === 'user' ? 'user-message' : 'bot-message'}`}>
              <div className="message-prompt">
                <span className="terminal-prefix">{message.role === 'user' ? '>>' : '<<'}</span>
                {message.role === 'user' ? ' TY' : ' MISTRZ GRY'}
              </div>
              <div className="message-text">
                {formatText(
                  message.text, 
                  message.id, 
                  message.role === 'model' && !typingComplete[message.id]
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot-message">
              <div className="message-prompt"><span className="terminal-prefix">MG</span> MISTRZ GRY</div>
              <div className="message-text">
                <div className="loading"></div> Obliczanie wyniku...
                <button onClick={handleCancelRequest} className="cancel-button">ANULUJ</button>
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
            placeholder="Jaka jest twoja następna akcja?"
            className="message-input"
            ref={inputRef}
            disabled={isLoading}
            maxLength={2000} // Limit input length
          />
          <button type="submit" className="send-button" disabled={isLoading || !inputValue.trim()}>→</button>
        </form>
        <div className="input-area-frost"></div>
      </div>

      <div className="status-indicator">
        <span className="online-dot"></span>
        <span>Sesja aktywna</span>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <span className="footer-text">🪐</span>
        </div>
      </footer>
    </div>
  );
};

export default SpaceThemedChatApp;