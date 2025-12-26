import React, { useId, useState } from 'react';

export type FaqItem = {
  id?: string;
  question: string;
  answer: string;
};

export function FaqAccordion(props: {
  items: FaqItem[];
  className?: string;
  defaultOpenIndex?: number;
}) {
  const { items, className, defaultOpenIndex = 0 } = props;
  const baseId = useId();
  const safeItems = Array.isArray(items) ? items.slice(0, 8) : [];
  const [openIndex, setOpenIndex] = useState<number | null>(safeItems.length ? defaultOpenIndex : null);

  return (
    <div className={className}>
      {safeItems.map((it, idx) => {
        const id = it.id || `${baseId}-${idx}`;
        const isOpen = openIndex === idx;
        return (
          <div key={id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIndex((cur) => (cur === idx ? null : idx))}
              className="w-full text-left p-5 font-black tracking-tight flex items-center justify-between gap-4"
              aria-expanded={isOpen}
              aria-controls={`${id}-panel`}
              id={`${id}-button`}
            >
              <span>{it.question}</span>
              <span className="text-white/60">{isOpen ? '−' : '+'}</span>
            </button>
            <div
              id={`${id}-panel`}
              role="region"
              aria-labelledby={`${id}-button`}
              className={isOpen ? 'px-5 pb-5 text-sm font-bold text-white/70 leading-relaxed' : 'hidden'}
            >
              {it.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
