import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Source: Magic UI MCP (interactive-hover-button). Adapted for this Vite/React repo.
export function InteractiveHoverButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'group relative w-auto cursor-pointer overflow-hidden rounded-full border border-black/15 bg-white px-5 py-3 text-center font-black uppercase tracking-widest text-xs text-black transition-colors hover:bg-black hover:text-white',
        className
      )}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center gap-2">
        <span>{children}</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
      <span
        aria-hidden
        className="absolute inset-0 -z-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-300 group-hover:translate-x-[120%]"
      />
    </button>
  );
}
