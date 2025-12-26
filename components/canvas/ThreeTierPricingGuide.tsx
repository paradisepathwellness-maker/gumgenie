import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';

export type PricingTier = {
  name: string;
  price: number;
  features: string[];
  badge?: string;
};

export type ThreeTierPricingGuideProps = {
  title?: string;
  subtitle?: string;
  tiers: [PricingTier, PricingTier, PricingTier];
  highlightTierIndex?: 0 | 1 | 2;
  ctaText?: string;
  gradientClass?: string;
};

function formatPrice(price: number) {
  // Keep it simple and deterministic (no locale surprises)
  const n = Number(price);
  if (!Number.isFinite(n)) return '$0';
  if (Math.floor(n) !== n) return `$${n.toFixed(2)}`;
  return `$${n}`;
}

export function ThreeTierPricingGuide(props: ThreeTierPricingGuideProps) {
  const {
    title = 'Pricing',
    subtitle = 'Choose the package that fits your goals.',
    tiers,
    highlightTierIndex = 1,
    ctaText = 'Get Instant Access',
    gradientClass = 'from-slate-200 via-slate-400 to-slate-200',
  } = props;

  const normalized = useMemo(() => {
    return tiers.map((t, idx) => ({
      ...t,
      features: Array.isArray(t.features) ? t.features.filter(Boolean).slice(0, 8) : [],
      isHighlight: idx === highlightTierIndex,
    }));
  }, [tiers, highlightTierIndex]);

  return (
    <section className="w-full max-w-none">
      <style>{`
        @keyframes gg-tier-float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -6px, 0); }
        }
        @keyframes gg-tier-glow {
          0%, 100% { filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
          50% { filter: drop-shadow(0 18px 26px rgba(167, 139, 250, 0.22)); }
        }
        .gg-tier-highlight-anim {
          animation: gg-tier-float 3.6s ease-in-out infinite, gg-tier-glow 3.6s ease-in-out infinite;
          will-change: transform, filter;
        }
        @media (prefers-reduced-motion: reduce) {
          .gg-tier-highlight-anim { animation: none !important; }
        }
      `}</style>
      <div className="mb-6">
        <h3 className="text-2xl font-black tracking-tighter">{title}</h3>
        {subtitle ? <p className="text-sm font-bold italic text-slate-600 mt-1">{subtitle}</p> : null}
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
        {normalized.map((tier, idx) => (
          <div
            key={idx}
            className={
              "relative rounded-[2rem] border-2 border-black bg-white p-6 transition-all transform-gpu " +
              (tier.isHighlight
                ? `shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] gg-tier-highlight-anim`
                : `hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`)
            }
          >
            {tier.isHighlight ? (
              <div className={`absolute -top-3 left-6 px-3 py-1 rounded-full border-2 border-black bg-gradient-to-r ${gradientClass} text-white text-[10px] font-black uppercase tracking-widest`}>
                {tier.badge || 'Best Value'}
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-500">Tier {idx + 1}</div>
                <div className="text-lg font-black tracking-tight mt-1">{tier.name}</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tracking-tighter">{formatPrice(tier.price)}</div>
                <div className="text-[10px] font-bold italic text-slate-500">one-time</div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {tier.features.map((f, i) => (
                <div key={i} className="flex gap-3 text-sm font-bold italic text-slate-700">
                  <span className={`w-5 h-5 rounded-full border-2 border-black bg-gradient-to-r ${gradientClass} shrink-0`} />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <Button
              type="button"
              className={
                "mt-6 w-full px-4 py-3 rounded-2xl border-2 border-black font-black uppercase tracking-widest text-xs transition-all " +
                (tier.isHighlight
                  ? `bg-gradient-to-r ${gradientClass} text-slate-900 hover:opacity-95`
                  : `bg-white hover:bg-slate-50 text-slate-900`)
              }
            >
              {ctaText}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ThreeTierPricingGuide;
