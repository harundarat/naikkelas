"use client";

import { useState, useEffect } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface TypingMessageProps {
  content: string;
  onComplete?: () => void;
  speed?: number;
}

export default function TypingMessage({ content, onComplete, speed = 5 }: TypingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // If content is empty or we've already finished, do nothing
    if (!content || currentIndex >= content.length) {
      if (currentIndex >= content.length && onComplete) {
        onComplete();
      }
      return;
    }

    const timer = setTimeout(() => {
      // Reveal multiple characters at once to speed up the effect
      // Calculate a dynamic chunk size: longer text = bigger chunks
      const chunkSize = Math.max(2, Math.floor(content.length / 100) + 1); 
      const nextIndex = Math.min(currentIndex + chunkSize, content.length);
      
      setDisplayedContent(content.slice(0, nextIndex));
      setCurrentIndex(nextIndex);
    }, speed);

    return () => clearTimeout(timer);
  }, [content, currentIndex, speed, onComplete]);

  // If content changed significantly (e.g. new message completely), reset
  useEffect(() => {
    if (content && currentIndex === 0 && displayedContent !== "") {
        setDisplayedContent("");
        setCurrentIndex(0);
    }
  }, [content]);


  return <MarkdownRenderer content={displayedContent} />;
}