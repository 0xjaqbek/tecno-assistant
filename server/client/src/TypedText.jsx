import React, { useState, useEffect } from 'react';

const TypedText = ({ text, typingSpeed = 100, wordsPerChunk = 3, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Reset state when text changes
    setDisplayedText('');
    setIsComplete(false);
    
    if (!text) return;
    
    // Split the text into words
    const words = text.split(' ');
    const chunks = [];
    
    // Create chunks of 2-5 words (random within this range)
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      // Randomize words per chunk between 2-5 (or use the configured value)
      const actualChunkSize = typeof wordsPerChunk === 'number' 
        ? wordsPerChunk 
        : Math.floor(Math.random() * 4) + 2; // Random between 2-5
      
      chunks.push(words.slice(i, i + actualChunkSize).join(' '));
    }
    
    let currentIndex = 0;
    const totalChunks = chunks.length;
    
    // Calculate timing to make the full animation take about 5 seconds
    const calculatedDelay = Math.min(
      5000 / totalChunks, // Limit to 5 seconds total
      typingSpeed
    );

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

export default TypedText;