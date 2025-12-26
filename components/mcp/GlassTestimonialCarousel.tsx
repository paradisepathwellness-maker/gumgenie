import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type Testimonial = {
  id: number;
  initials: string;
  name: string;
  role: string;
  quote: string;
};

export function GlassTestimonialCarousel(props: {
  testimonials: Testimonial[];
  className?: string;
  tone?: 'dark' | 'light';
}) {
  const { testimonials, className, tone = 'dark' } = props;

  const styles =
    tone === 'light'
      ? {
          card: 'rounded-3xl border border-slate-900/10 bg-white/60 premium-blur p-6',
          avatar: 'h-11 w-11 rounded-2xl border border-slate-900/10 bg-white/70 flex items-center justify-center font-black text-slate-900',
          name: 'font-black tracking-tight text-slate-900',
          role: 'text-xs font-bold text-slate-600',
          quote: 'mt-4 text-sm font-bold leading-relaxed text-slate-700',
          navBtn: 'h-9 w-9 rounded-xl border border-slate-900/10 bg-white/70 text-slate-900 hover:bg-white',
          footer: 'mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.25em] text-slate-500',
        }
      : {
          card: 'rounded-3xl border border-white/15 bg-white/10 premium-blur p-6',
          avatar: 'h-11 w-11 rounded-2xl border border-white/15 bg-black/30 flex items-center justify-center font-black text-white',
          name: 'font-black tracking-tight text-white',
          role: 'text-xs font-bold text-white/70',
          quote: 'mt-4 text-sm font-bold leading-relaxed text-white/85',
          navBtn: 'h-9 w-9 rounded-xl border border-white/15 bg-black/20 text-white hover:bg-black/30',
          footer: 'mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.25em] text-white/50',
        };
  const items = useMemo(() => (Array.isArray(testimonials) ? testimonials : []).slice(0, 8), [testimonials]);
  const [idx, setIdx] = useState(0);

  const current = items[idx] || items[0];
  const canNav = items.length > 1;

  if (!current) return null;

  return (
    <div className={className}>
      <div className={styles.card}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={styles.avatar}>
              {current.initials}
            </div>
            <div>
              <div className={styles.name}>{current.name}</div>
              <div className={styles.role}>{current.role}</div>
            </div>
          </div>

          {canNav ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
                className={styles.navBtn}
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-4 w-4 mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => setIdx((i) => (i + 1) % items.length)}
                className={styles.navBtn}
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-4 w-4 mx-auto" />
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.quote}>“{current.quote}”</div>

        {canNav ? (
          <div className={styles.footer}>
            <span>
              {idx + 1} / {items.length}
            </span>
            <span>Realistic examples (no fabricated metrics)</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
