import './DitherBackground.css';
import React, { useEffect, useRef } from 'react';

type DitherBackgroundProps = {
  intensity?: number; // 0..1
  className?: string;
};

// Canvas-based dither/noise overlay. Lightweight and no dependencies.
export default function DitherBackground({ intensity = 0.18, className = '' }: DitherBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number | null = null;

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) {
        raf = requestAnimationFrame(draw);
        return;
      }

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const img = ctx.createImageData(w, h);
      const data = img.data;

      const alpha = Math.max(0, Math.min(1, intensity)) * 255;

      for (let i = 0; i < data.length; i += 4) {
        // ordered-ish noise
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = alpha;
      }

      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`rb-dither-canvas ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
