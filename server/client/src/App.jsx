import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const GlassChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ambientPlaying, setAmbientPlaying] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);

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
      "🌌 Budzisz się na pokładzie statku kosmicznego Arcon. Silniki milczą. Migające czerwone światło pulsuje na konsoli.",
      "🛰️ Dryfujesz. Ciemność. Jedynym dźwiękiem jest szum recyklowanego tlenu. System nawigacyjny pokazuje: 'Nieznany Sektor'.",
      "⚠️ Wykryto transmisję ze Stacji Hades: 'Autoryzacja dokowania wygasła. Wrogowie nadciągają. Przygotuj się.'",
      "🚀 Poziom paliwa krytyczny. Otacza cię głęboka pustka. Coś zbliża się na radarze.",
      "💀 Twoja pamięć jest fragmentaryczna. Twoja misja jest niejasna. Ale jedno słowo pozostaje: Moonstone."
    ];
    const randomIntro = openingScenes[Math.floor(Math.random() * openingScenes.length)];
    setDisplayMessages([{
      text: randomIntro + "\nWpisz swoją pierwszą akcję, aby rozpocząć.",
      role: 'model',
      timestamp: new Date().toISOString()
    }]);
  }, []);

  // Inicjalizacja dźwięku
  useEffect(() => {
    ambientAudioRef.current = new Audio('/ambience.mp3');
    ambientAudioRef.current.loop = true;
    ambientAudioRef.current.volume = 0.7; // Zmniejszona głośność z 0.9
    setAudioInitialized(true);
  }, []);

  // Dodatkowy useEffect do obsługi autostartu dźwięku
  useEffect(() => {
    // Uruchamiaj dźwięk tylko po pełnej inicjalizacji obiektu Audio
    if (audioInitialized && ambientPlaying && ambientAudioRef.current) {
      const playPromise = ambientAudioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Automatyczne odtwarzanie dźwięku zostało zablokowane:", err);
          // NIE zmieniamy stanu ambientPlaying, aby interfejs nadal pokazywał, że dźwięk jest włączony
        });
      }
    }
  }, [audioInitialized, ambientPlaying]);

  // Dodaj obsługę interakcji użytkownika do uruchomienia dźwięku
  useEffect(() => {
    const handleUserInteraction = () => {
      if (ambientPlaying && ambientAudioRef.current && ambientAudioRef.current.paused) {
        ambientAudioRef.current.play().catch(err => 
          console.warn("Odtwarzanie dźwięku po interakcji zablokowane:", err)
        );
      }
      // Usuwamy nasłuchiwanie po pierwszej interakcji
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

      if (response.status === 504) throw new Error("Utracono połączenie w hiperprzestrzeni. Spróbuj ponownie.");
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.details || `Błąd serwera: ${response.status}`);
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
      randomSound.volume = 0.2; // Zmniejszona głośność na 0.2
      randomSound.play().catch(err => console.warn("Dźwięk transmisji zablokowany:", err));

      setTimeout(() => scrollToBottom(), 100);
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
            {ambientPlaying ? "🔊 Dźwięki: Wł." : "🔇 Dźwięki: Wył."}
          </button>
        </div>
      </header>

      <div className="chat-window">
        <div className="chat-window-header">
          <div className="window-title">Uniwersum Moonstone — Roleplay napędzany SI</div>
        </div>

        <div className="chat-content" ref={chatContentRef}>
          {error && <div className="error-message">{error}</div>}
          {displayMessages.map((message, index) => (
            <div key={index} className={`message ${message.role === 'user' ? 'user-message' : 'bot-message'}`}>
              <div className="message-prompt">
                <span className="terminal-prefix">{message.role === 'user' ? '>>' : 'MG'}</span>
                {message.role === 'user' ? ' TY' : ' MISTRZ GRY'}
              </div>
              <div className="message-text">{formatText(message.text)}</div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot-message">
              <div className="message-prompt"><span className="terminal-prefix"></span> MISTRZ GRY</div>
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
          />
          <button type="submit" className="send-button" disabled={isLoading || !inputValue.trim()}>→</button>
        </form>
      </div>

      <div className="status-indicator">
        <span className="online-dot"></span>
        <span>Sesja aktywna</span>
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