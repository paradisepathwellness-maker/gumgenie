import React, { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';

type Tier = {
  name: string;
  price: number;
  anchorText?: string;
  badge?: string;
  highlight?: boolean;
  description: string;
  bullets: string[];
};

function formatUsd(n: number) {
  // Gumroad often uses whole-number pricing.
  if (Number.isNaN(n)) return '$0';
  return `$${Math.round(n)}`;
}

export type PricingTiersSectionProps = {
  basePrice: number;
  gradientClass: string; // e.g. "from-[#0066FF] via-[#7B61FF] to-[#FF33CC]"
  ctaText: string;
  onCtaClick?: (tierName: string) => void;
};

export default function PricingTiersSection({
  basePrice,
  gradientClass,
  ctaText,
  onCtaClick,
}: PricingTiersSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const tiers: Tier[] = useMemo(() => {
    const starter = Math.max(9, Math.round(basePrice));
    const pro = Math.max(starter + 10, Math.round(starter * 2.2));
    const ultimate = Math.max(pro + 20, Math.round(starter * 3.8));

    return [
      {
        name: 'Starter',
        price: starter,
        anchorText: 'For solo creators',
        description: 'Ship a polished product fast with the essentials.',
        bullets: [
          'Core templates + prompts',
          'Quick-start checklist',
          'Lifetime updates (minor)',
          'Personal use license',
        ],
      },
      {
        name: 'Pro',
        price: pro,
        badge: 'Best Value',
        highlight: true,
        anchorText: 'For serious sellers',
        description: 'The full conversion stack + launch assets. Most people buy this.',
        bullets: [
          'Everything in Starter',
          'Offer stack + bonus vault',
          'Launch copy kit (7-day)',
          'Swipe file: headlines + CTAs',
          'Commercial license',
        ],
      },
      {
        name: 'Ultimate',
        price: ultimate,
        anchorText: 'For teams & agencies',
        description: 'Maximum leverage: templates, assets, and scale-ready licensing.',
        bullets: [
          'Everything in Pro',
          'Team license (up to 10)',
          'Priority updates',
          'Advanced pack: upsells + bundles',
        ],
      },
    ];
  }, [basePrice]);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-pt="kicker"], [data-pt="title"], [data-pt="sub"], [data-pt="card"]',
        { y: 20, opacity: 0, filter: 'blur(8px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.08,
        }
      );

      // subtle floating highlight pulse
      gsap.to('[data-pt="highlightGlow"]', {
        opacity: 0.85,
        duration: 1.8,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const container = cardsRef.current;
    if (!container) return;

    const cards: HTMLElement[] = Array.from(
      container.querySelectorAll('[data-pt="card"]')
    ) as HTMLElement[];
    const cleanups: Array<() => void> = [];

    for (const card of cards) {
      const onMove = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (py - 0.5) * -6;
        const ry = (px - 0.5) * 8;

        gsap.to(card, {
          rotateX: rx,
          rotateY: ry,
          transformPerspective: 900,
          transformOrigin: 'center',
          duration: 0.25,
          ease: 'power2.out',
        });
      };

      const onLeave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.35,
          ease: 'power2.out',
        });
      };

      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <section ref={rootRef} className="relative border-t-4 border-black bg-white">
      <div className="max-w-5xl mx-auto px-8 md:px-16 py-16 md:py-20">
        <div className="flex flex-col items-center text-center gap-4 mb-12">
          <div
            data-pt="kicker"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black bg-slate-50 text-[9px] font-black uppercase tracking-[0.35em]"
          >
            Monetization Layer
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff90e8]" />
          </div>

          <h3 data-pt="title" className="text-3xl md:text-5xl font-black uppercase tracking-tighter">
            Pick your tier. Ship faster.
          </h3>
          <p data-pt="sub" className="max-w-2xl text-sm md:text-base font-bold text-slate-500 italic">
            Don’t leave money on the table. Pro is engineered for conversion: better offer stack, better launch assets,
            better upsells.
          </p>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {tiers.map((t) => (
            <div
              key={t.name}
              data-pt="card"
              className={
                `relative rounded-[2rem] border-2 border-black bg-white p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ` +
                `transition-all will-change-transform ` +
                (t.highlight ? 'md:-translate-y-2' : '')
              }
            >
              {t.highlight && (
                <>
                  <div
                    data-pt="highlightGlow"
                    className={
                      `absolute -inset-2 rounded-[2.2rem] opacity-60 blur-[18px] bg-gradient-to-r ${gradientClass}`
                    }
                  />
                  <div className="absolute -top-4 left-6 z-10 bg-black text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {t.badge}
                  </div>
                </>
              )}

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.anchorText}</div>
                    <div className="text-2xl font-black uppercase tracking-tight mt-1">{t.name}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-4xl font-black tracking-tighter">{formatUsd(t.price)}</div>
                    <div className="text-[10px] font-bold text-slate-500 italic">one-time</div>
                  </div>
                </div>

                <div className="mt-4 text-sm font-bold text-slate-600 italic leading-snug">
                  {t.description}
                </div>

                <div className="mt-6 space-y-3">
                  {t.bullets.map((b) => (
                    <div key={b} className="flex gap-3 items-start">
                      <div className={`w-5 h-5 rounded-md border-2 border-black bg-gradient-to-r ${gradientClass}`} />
                      <div className="text-[12px] font-bold text-slate-600 italic">{b}</div>
                    </div>
                  ))}
                </div>

                {t.highlight && (
                  <div className="mt-6 p-4 rounded-2xl border-2 border-black bg-slate-50">
                    <div className="text-[10px] font-black uppercase tracking-widest">Includes bonuses</div>
                    <div className="mt-1 text-[12px] font-bold text-slate-600 italic">
                      + Swipe file, launch checklist, and upsell ideas to increase AOV.
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onCtaClick?.(t.name)}
                  className={
                    `mt-8 w-full py-4 rounded-2xl font-black uppercase tracking-widest border-2 border-black ` +
                    (t.highlight
                      ? `bg-gradient-to-r ${gradientClass} text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`
                      : `bg-white hover:bg-slate-50 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`)
                  }
                >
                  {ctaText}
                </button>

                {t.highlight && (
                  <div className="mt-4 text-[10px] font-bold text-slate-400 italic">
                    Risk reversal: 7-day “love it or refund” guarantee.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
