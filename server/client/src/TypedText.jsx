// TypedText.jsx
import React, { useState, useEffect } from 'react';

const TypedText = ({ text, typingSpeed = 100, wordsPerChunk = 3, onComplete, isSoundOn = true }) => {
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
        setDisplayedText(prev => prev ? `${prev} ${chunks[currentIndex]}` : chunks[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    }, calculatedDelay);

    return () => clearInterval(typingInterval);
  }, [text, typingSpeed, wordsPerChunk, onComplete]);

  useEffect(() => {
    if (!text || !isSoundOn) return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pl-PL';
      utterance.pitch = 1;
      utterance.rate = 1;

      const voices = synth.getVoices();
      const polishVoice = voices.find(v => v.lang === 'pl-PL');
      if (polishVoice) utterance.voice = polishVoice;

      synth.cancel();
      synth.speak(utterance);
    };

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = speak;
    } else {
      speak();
    }
  }, [text, isSoundOn]);

  return (
    <div className="typed-text">
      {displayedText}
      {!isComplete && <span className="cursor">|</span>}
    </div>
  );
};

export default TypedText;
