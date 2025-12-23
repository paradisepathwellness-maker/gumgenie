import './SplitText.css';
import React from 'react';

type SplitTextProps = {
  text: string;
  className?: string;
  staggerMs?: number;
};

// Lightweight word-based split text animation.
export default function SplitText({ text, className = '', staggerMs = 40 }: SplitTextProps) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={`rb-split-text ${className}`.trim()}>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="rb-split-word"
          style={{ animationDelay: `${i * staggerMs}ms` }}
        >
          {w}{i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  );
}
