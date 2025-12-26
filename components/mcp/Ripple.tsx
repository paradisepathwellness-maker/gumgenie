// Source: Magic UI MCP getBackgrounds -> ripple
// Adapted to this repo (Vite/React).
import React, { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface RippleProps extends ComponentPropsWithoutRef<'div'> {
  className?: string;
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
}

export const Ripple = React.memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
  ...props
}: RippleProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
      {...props}
    >
      {Array.from({ length: numCircles }).map((_, i) => {
        const size = mainCircleSize + i * 120;
        const style: CSSProperties = {
          width: size,
          height: size,
          opacity: i === 0 ? mainCircleOpacity : mainCircleOpacity / (i + 1),
          animationDelay: `${i * 0.6}s`,
        };
        return (
          <span
            key={i}
            style={style}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 animate-[ping_2.8s_ease-in-out_infinite]"
          />
        );
      })}
    </div>
  );
});
