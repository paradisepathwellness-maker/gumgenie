import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Button as Button3D } from './ui/3d-button';
import ThreeTierPricingGuide from './canvas/ThreeTierPricingGuide';
import GlareHover from './reactbits/GlareHover';
import DitherBackground from './reactbits/DitherBackground';
import LightRays from './reactbits/LightRays';
import GenerativeMountainScene from './ui/mountain-scene';
import { HeroSection as SmoothShaderHeroSection } from './ui/hero-section-with-smooth-bg-shader';
import { InteractiveHoverButton } from './mcp/InteractiveHoverButton';
import { GlassTestimonialCarousel, type Testimonial } from './mcp/GlassTestimonialCarousel';
import { Ripple } from './mcp/Ripple';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { BentoGrid, BentoCard } from './mcp/BentoGrid';

type LandingPageProps = {
  onPrimaryCta?: () => void;
};

type EmojiSet = readonly [string, string, string, string];

function WhatYouGetCard(props: { isDark: boolean; emojis: EmojiSet }) {
  const { isDark, emojis } = props;
  return (
    <>
      <div className={"text-xs font-black uppercase tracking-[0.25em] " + (isDark ? 'text-white/60' : 'text-black/60')}>What you get</div>
      <div className="mt-4 space-y-4">
        {[
          { icon: emojis[2], title: 'Prompt Packs', desc: 'Battle-tested prompts for marketing, product, and creator workflows.' },
          { icon: emojis[3], title: 'Step-by-step Workflow', desc: 'A repeatable sequence so you can go from idea → publish-ready output.' },
          { icon: '✅', title: 'Quality Checks', desc: 'Quick QA gates to remove fluff and tighten conversion.' },
        ].map((item) => (
          <div key={item.title} className="flex gap-4 items-start">
            <div className={"h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 " + (isDark ? 'border-white/10 bg-black/20' : 'border-black/10 bg-white')} aria-hidden>
              <span className="text-lg">{item.icon}</span>
            </div>
            <div>
              <div className="font-black tracking-tight">{item.title}</div>
              <div className={"text-sm font-bold mt-1 " + (isDark ? 'text-white/70' : 'text-black/70')}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={"mt-6 rounded-2xl border p-4 " + (isDark ? 'border-white/10 bg-black/30' : 'border-black/10 bg-white')}>
        <div className={"text-[11px] font-black uppercase tracking-[0.25em] " + (isDark ? 'text-white/60' : 'text-black/60')}>Best for</div>
        <div className={"mt-2 text-sm font-bold " + (isDark ? 'text-white/80' : 'text-black/80')}>
          People who want consistent outputs without rewriting from scratch.
        </div>
      </div>
    </>
  );
}

export default function LandingPage({ onPrimaryCta }: LandingPageProps) {
  const variant = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('variant') || 'glass3d')
    : 'glass3d';

  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const [parallax, setParallax] = useState({ hero: 0, cards: 0, fade: 0 });

  // Base style system (Agent /6): "Midnight Conversion".
  // Variants override these tokens deterministically.
  const isGlassLight = variant.startsWith('glass3d-light');
  const glassLightMode = variant === 'glass3d-light3' ? 3 : variant === 'glass3d-light2' ? 2 : isGlassLight ? 1 : 0;

  const glassLightConfig =
    glassLightMode === 3
      ? {
          // More neon + higher motion
          neon: { ring: 'ring-fuchsia-400/35 hover:ring-fuchsia-400/55', glow: 'shadow-[0_25px_90px_rgba(217,70,239,0.18)]' },
          shimmerOpacity: 0.7,
          shimmerDurationSec: 3.4,
          rippleOpacity: 0.32,
          heroScrollTranslatePx: 14,
        }
      : glassLightMode === 2
        ? {
            // Cooler cyan-forward
            neon: { ring: 'ring-cyan-400/35 hover:ring-cyan-400/55', glow: 'shadow-[0_25px_90px_rgba(34,211,238,0.18)]' },
            shimmerOpacity: 0.6,
            shimmerDurationSec: 3.9,
            rippleOpacity: 0.28,
            heroScrollTranslatePx: 12,
          }
        : {
            // Default balanced
            neon: { ring: 'ring-violet-400/25 hover:ring-violet-400/45', glow: 'shadow-[0_25px_80px_rgba(167,139,250,0.14)]' },
            shimmerOpacity: 0.55,
            shimmerDurationSec: 4.2,
            rippleOpacity: 0.25,
            heroScrollTranslatePx: 10,
          };

  const colors =
    isGlassLight
      ? ({ bg: '#f8fafc', text: '#0f172a', primary: '#0f172a' } as const)
      : variant === 'light'
        ? ({ bg: '#f8f8f4', text: '#111827', primary: '#111827' } as const)
        : variant === 'editorial'
          ? ({ bg: '#fff7ed', text: '#111827', primary: '#9a3412' } as const)
          : variant === 'dither'
            ? ({ bg: '#0B0F14', text: '#F5F7FA', primary: '#22c55e' } as const)
            : variant === 'lightrays'
              ? ({ bg: '#070A0F', text: '#F5F7FA', primary: '#a78bfa' } as const)
              : variant === 'neon'
                ? ({ bg: '#05060A', text: '#F5F7FA', primary: '#22d3ee' } as const)
                : variant === 'aurora'
                  ? ({ bg: '#05060A', text: '#F5F7FA', primary: '#34d399' } as const)
                  : ({ bg: '#0B0F14', text: '#F5F7FA', primary: '#3B82F6' } as const);

  const emojis = ['🧠', '⚡', '🧩', '📈'] as const;

  const isDark = !isGlassLight && variant !== 'light' && variant !== 'editorial';
  const isGlass = variant === 'glass3d';
  const isThreeBg = isGlass || isGlassLight;
  const isSmoothShader = variant.startsWith('smoothshader');
  const smoothShaderMode = variant === 'smoothshader2' ? 2 : variant === 'smoothshader1' ? 1 : 0;
  const isDither = variant === 'dither';
  const isLightRays = variant === 'lightrays';
  const isNeon = variant === 'neon';
  const isAurora = variant === 'aurora';

  useEffect(() => {
    // Scroll-driven parallax (cheap + deterministic). Respects prefers-reduced-motion.
    if (typeof window === 'undefined') return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (reduceMotion) {
      setParallax({ hero: 0, cards: 0, fade: 0 });
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY || 0;
      const vh = Math.max(window.innerHeight || 1, 1);
      // 0 at top, ~1 after one viewport.
      const t = Math.max(0, Math.min(1.4, y / vh));
      setParallax({
        hero: t,
        cards: t,
        fade: Math.max(0, Math.min(1, t / 0.9)),
      });
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!isThreeBg) return;

    let cancelled = false;
    const fallback =
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80';

    (async () => {
      try {
        const r = await fetch(
          `http://localhost:4000/api/stock-image?provider=pexels&query=${encodeURIComponent('abstract gradient')}`
        );
        const json: unknown = await r.json().catch(() => null);
        const maybe = json as { url?: unknown } | null;
        const url = typeof maybe?.url === 'string' ? maybe.url : fallback;
        if (!cancelled) setTextureUrl(url);
      } catch {
        if (!cancelled) setTextureUrl(fallback);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isThreeBg]);

  return (
    <div style={{ backgroundColor: colors.bg, color: colors.text }} className="min-h-screen">
      {isGlassLight ? (
        <style>{`
          @keyframes gg-shimmer {
            0% { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
            10% { opacity: 1; }
            50% { opacity: 1; }
            100% { transform: translateX(120%) skewX(-12deg); opacity: 0; }
          }
          .gg-shimmer { position: relative; overflow: hidden; }
          .gg-shimmer::after {
            content: '';
            position: absolute;
            inset: -40% -60%;
            background: linear-gradient(90deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0) 60%);
            transform: translateX(-120%) skewX(-12deg);
            animation: gg-shimmer ${glassLightConfig.shimmerDurationSec}s ease-in-out infinite;
            pointer-events: none;
            opacity: ${glassLightConfig.shimmerOpacity};
          }
          @media (prefers-reduced-motion: reduce) {
            .gg-shimmer::after { animation: none !important; }
          }
        `}</style>
      ) : null}
      {/* Debug badge to confirm variant + MCP components are rendering */}
      <div className="fixed right-4 bottom-4 z-50 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.25em] premium-blur"
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
          backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.75)',
          color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
        }}
      >
        landing:{variant} • variants: glass3d/glass3d-light*/smoothshader*/dither/lightrays/neon/aurora/light/editorial
      </div>
      {/* Top bar */}
      <header className={
        "sticky top-0 z-20 border-b premium-blur " +
        (isDark ? 'border-white/10 bg-black/30' : 'border-black/10 bg-white/60')
      }>
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div
              className={"h-10 w-10 rounded-xl border flex items-center justify-center font-black " + (isDark ? 'border-white/10' : 'border-black/10')}
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              aria-hidden
            >
              {emojis[0]}
            </div>
            <div>
              <div className={"text-xs font-black uppercase tracking-[0.2em] " + (isDark ? 'text-white/70' : 'text-black/70')}>AI PROMPTS</div>
              <div className="text-sm font-black tracking-tight">PromptOptimizer Pro</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href="#pricing" className={"text-xs font-black uppercase tracking-[0.2em] hover:opacity-100 " + (isDark ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black')}>Pricing</a>
            <a href="#faq" className={"text-xs font-black uppercase tracking-[0.2em] hover:opacity-100 " + (isDark ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black')}>FAQ</a>
            {isGlassLight ? (
              <GlareHover
                className="rounded-2xl"
                width="auto"
                height="auto"
                background="rgba(255,255,255,0.65)"
                borderRadius="16px"
                borderColor="rgba(15,23,42,0.10)"
                glareColor={glassLightMode === 3 ? '#f472b6' : glassLightMode === 2 ? '#22d3ee' : '#a78bfa'}
                glareOpacity={0.18}
                glareAngle={-35}
                glareSize={220}
              >
                <Button3D
                  onClick={onPrimaryCta}
                  variant="chrome"
                  size="sm"
                  className={`gg-shimmer rounded-2xl font-black uppercase tracking-widest text-[11px] border border-slate-900/10 bg-white/70 backdrop-blur-md ring-1 ${glassLightConfig.neon.ring} ${glassLightConfig.neon.glow} transition`}
                >
                  Get Free Lessons
                </Button3D>
              </GlareHover>
            ) : variant === 'light' || variant === 'editorial' ? (
              <InteractiveHoverButton onClick={onPrimaryCta}>Get Instant Access</InteractiveHoverButton>
            ) : (
              <Button
                onClick={onPrimaryCta}
                className="font-black uppercase tracking-widest"
                style={{ backgroundColor: colors.primary, color: colors.text }}
              >
                Get Instant Access
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      {isSmoothShader ? (
        <div className="relative">
          <SmoothShaderHeroSection
            title={smoothShaderMode === 2 ? "Make every launch feel inevitable." : "Stop guessing prompts."}
            highlightText={smoothShaderMode === 2 ? "Conversion-grade outputs." : "Ship work faster."}
            description={
              smoothShaderMode === 2
                ? "A premium system that turns messy ideas into publish-ready pages, emails, and offers—with a built-in QA checklist so your output stays sharp."
                : "A premium prompt pack + workflow that turns vague ideas into publish-ready outputs. Use it weekly to create landing pages, offers, emails, and product copy with less friction."
            }
            buttonText={smoothShaderMode === 2 ? "Generate My First Draft" : "Get Instant Access"}
            onButtonClick={onPrimaryCta}
            colors={
              smoothShaderMode === 1
                ? ["#34d399", "#60a5fa", "#a78bfa", "#22d3ee", "#f472b6", "#fbbf24"]
                : ["#22d3ee", "#a78bfa", "#34d399", "#f472b6", "#fbbf24", "#60a5fa"]
            }
            distortion={smoothShaderMode === 1 ? 1.2 : 1.05}
            swirl={smoothShaderMode === 2 ? 0.9 : 0.75}
            speed={smoothShaderMode === 2 ? 0.7 : 0.55}
            offsetX={0.08}
            veilOpacity={isDark ? "bg-black/35" : "bg-white/25"}
            className="min-h-[75vh]"
            maxWidth="max-w-6xl"
            // Make sure the fixed shader doesn't occlude interactions.
            buttonClassName="relative z-20"
          />

          {/* Parallax image cards (Unsplash stock; known-stable URLs). */}
          <div className="pointer-events-none absolute inset-0 z-20">
            <div
              className="absolute -right-6 top-24 hidden md:block w-[280px] h-[360px] rounded-3xl border border-white/15 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
              style={{
                transform: `translate3d(0, ${parallax.cards * 32}px, 0) rotate(${smoothShaderMode === 2 ? 6 : 4}deg)`,
                opacity: 1 - parallax.fade * 0.25,
              }}
              aria-hidden
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "url(https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80)",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'saturate(1.1) contrast(1.05)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">Blueprint</div>
                <div className="mt-2 text-white font-black text-lg tracking-tight">Offer → Page → Email</div>
              </div>
            </div>

            <div
              className="absolute -left-6 top-40 hidden lg:block w-[320px] h-[220px] rounded-3xl border border-white/15 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
              style={{
                transform: `translate3d(0, ${-parallax.cards * 24}px, 0) rotate(-${smoothShaderMode === 2 ? 5 : 3}deg)`,
                opacity: 1 - parallax.fade * 0.35,
              }}
              aria-hidden
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80)",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'saturate(1.05) contrast(1.05)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">Proof</div>
                <div className="mt-2 text-white font-black text-lg tracking-tight">Cleaner drafts, faster</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-12 relative overflow-hidden">
        {/* Shader background (Three.js) — enabled for glass3d and glass3d-light* */}
        {isThreeBg ? (
          <div className="absolute inset-0 pointer-events-none">
            <GenerativeMountainScene />
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: `url(${textureUrl || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                mixBlendMode: 'overlay',
              }}
              aria-hidden
            />
          </div>
        ) : null}

        {isDither ? <DitherBackground intensity={0.12} className="absolute inset-0 opacity-60" /> : null}
        {isLightRays ? (
          <div className="absolute inset-0 opacity-70">
            <LightRays />
          </div>
        ) : null}
        {isNeon ? (
          <div className="absolute inset-0 opacity-60">
            <DitherBackground intensity={0.08} className="absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-fuchsia-500/10 to-transparent" />
          </div>
        ) : null}
        {isAurora ? (
          <div className="absolute inset-0 opacity-70">
            <DitherBackground intensity={0.06} className="absolute inset-0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.22),transparent_55%),radial-gradient(circle_at_80%_40%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(167,139,250,0.18),transparent_55%)]" />
          </div>
        ) : null}
        {isThreeBg ? (
          <Ripple
            className={isGlassLight ? 'opacity-100' : 'opacity-60'}
            style={isGlassLight ? { opacity: glassLightConfig.rippleOpacity } : undefined}
          />
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <div className={"inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] " + (isDark ? 'border-white/10 text-white/70' : 'border-black/10 text-black/70')}>
              <span aria-hidden>{emojis[1]}</span>
              Built for creators, freelancers, and solo operators
            </div>

            <h1 className="mt-5 text-5xl md:text-6xl font-black tracking-tighter leading-[0.95]">
              PromptOptimizer Pro.
              <span className="block" style={{ color: colors.primary }}>
                Publish-ready outputs—weekly.
              </span>
            </h1>

            <p className={"mt-5 text-lg font-bold leading-relaxed max-w-xl " + (isDark ? 'text-white/80' : 'text-black/80')}>
              A 3-tier system (Freemium Lessons → Optimizer App → Social Export Packs) that turns messy ideas into structured drafts,
              tighter copy, and consistent conversion-focused assets.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              {isGlassLight ? (
                <GlareHover
                  className="rounded-2xl"
                  width="auto"
                  height="auto"
                  background="rgba(255,255,255,0.70)"
                  borderRadius="16px"
                  borderColor="rgba(15,23,42,0.10)"
                  glareColor="#22d3ee"
                  glareOpacity={0.22}
                  glareAngle={-35}
                  glareSize={220}
                >
                  <Button3D
                    onClick={onPrimaryCta}
                    variant="chrome"
                    className={`gg-shimmer h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-xs border border-slate-900/10 bg-white/70 backdrop-blur-md ring-1 ${glassLightConfig.neon.ring} ${glassLightConfig.neon.glow} transition transform-gpu`}
                  >
                    Get Free Lessons
                  </Button3D>
                </GlareHover>
              ) : (
                <Button
                  onClick={onPrimaryCta}
                  className="h-12 px-6 font-black uppercase tracking-widest"
                  style={{ backgroundColor: colors.primary, color: colors.text }}
                >
                  Get Access
                </Button>
              )}

              <a
                href="#pricing"
                className={
                  isGlassLight
                    ? "gg-shimmer h-12 px-6 rounded-2xl border border-slate-900/10 bg-white/55 backdrop-blur-md flex items-center justify-center font-black uppercase tracking-widest text-xs ring-1 ring-violet-400/25 hover:ring-violet-400/45 shadow-[0_20px_70px_rgba(167,139,250,0.14)] transition"
                    : "h-12 px-6 rounded-md border flex items-center justify-center font-black uppercase tracking-widest text-xs hover:border-opacity-100 " +
                      (isDark
                        ? 'border-white/15 text-white/80 hover:text-white hover:border-white/30'
                        : 'border-black/15 text-black/80 hover:text-black hover:border-black/30')
                }
              >
                View Pricing
              </a>
            </div>

            <div className={"mt-6 text-xs font-bold " + (isDark ? 'text-white/60' : 'text-black/60')}>
              Instant download • No subscriptions • Works with your preferred AI tool
            </div>
          </div>

          <div className="relative">
            {isThreeBg ? (
              <GlareHover
                className="rounded-3xl"
                width="100%"
                height="100%"
                background={isGlassLight ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.06)'}
                borderRadius="24px"
                borderColor={isGlassLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.12)'}
                glareColor={isGlassLight ? '#22d3ee' : '#ffffff'}
                glareOpacity={isGlassLight ? 0.14 : 0.35}
                glareAngle={-35}
                glareSize={220}
              >
                <div className="w-full rounded-3xl p-6">
                  <WhatYouGetCard isDark={isDark} emojis={emojis} />
                </div>
              </GlareHover>
            ) : (
              <div className={"rounded-3xl border p-6 " + (isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/[0.02]')}>
                <WhatYouGetCard isDark={isDark} emojis={emojis} />
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Parallax gallery (smoothshader variants only) */}
      {isSmoothShader ? (
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-white/70">What you’ll ship</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-black tracking-tighter text-white">
                A complete launch kit—without the blank page.
              </h2>
              <p className="mt-4 text-sm md:text-base font-bold text-white/75 leading-relaxed">
                Scroll-driven previews show the kind of output you’ll get: clean layouts, clear messaging, and a workflow you can repeat.
              </p>
              <div
                className="mt-6 rounded-3xl border border-white/15 bg-black/30 premium-blur p-5"
                style={{ transform: `translate3d(0, ${-parallax.hero * (isGlassLight ? glassLightConfig.heroScrollTranslatePx : 10)}px, 0)` }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-xl">⚡</div>
                  <div>
                    <div className="text-white font-black tracking-tight">Fast first drafts</div>
                    <div className="mt-1 text-white/70 text-sm font-bold leading-relaxed">
                      Prompts engineered for strong structure. You refine—not rewrite.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  {
                    title: 'Landing Page Layout',
                    tag: 'Structure',
                    img: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
                    dy: 28,
                  },
                  {
                    title: 'Email Sequence',
                    tag: 'Conversion',
                    img: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80',
                    dy: -18,
                  },
                  {
                    title: 'Offer & Pricing',
                    tag: 'Clarity',
                    img: 'https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&w=1200&q=80',
                    dy: 22,
                  },
                  {
                    title: 'Proof & Testimonials',
                    tag: 'Trust',
                    img: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80',
                    dy: -26,
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="relative rounded-3xl overflow-hidden border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
                    style={{
                      transform: `translate3d(0, ${parallax.cards * card.dy}px, 0)`,
                      transition: 'transform 80ms linear',
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${card.img})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'saturate(1.05) contrast(1.05)',
                      }}
                      aria-hidden
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/0" />
                    <div className="relative p-5">
                      <div className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">{card.tag}</div>
                      <div className="mt-2 text-white font-black text-lg tracking-tight">{card.title}</div>
                      <div className="mt-2 text-white/70 text-sm font-bold">
                        Scroll preview “moves” with you.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Proof / Benefits (Magic UI Bento Grid — extracted via MCP) */}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <BentoGrid className="grid-cols-1 md:grid-cols-3 auto-rows-[18rem]">
          <BentoCard
            name="Clarity"
            className="md:col-span-1"
            Icon={() => <span className="text-3xl">🧠</span>}
            description="A repeatable structure that removes blank-page friction."
            href="#pricing"
            cta="See tiers"
            background={<div className="h-full w-full bg-gradient-to-br from-black/[0.02] to-black/[0.06]" />}
          />
          <BentoCard
            name="Speed"
            className="md:col-span-1"
            Icon={() => <span className="text-3xl">⚡</span>}
            description="Prompts designed for strong first drafts without endless tweaking."
            href="#pricing"
            cta="Pick a tier"
            background={<div className="h-full w-full bg-gradient-to-br from-black/[0.02] to-black/[0.06]" />}
          />
          <BentoCard
            name="Conversion"
            className="md:col-span-1"
            Icon={() => <span className="text-3xl">📈</span>}
            description="Benefit-led outputs with CTA + objection handling baked in."
            href="#faq"
            cta="Read FAQ"
            background={<div className="h-full w-full bg-gradient-to-br from-black/[0.02] to-black/[0.06]" />}
          />
        </BentoGrid>
      </section>

      {/* Pricing */}
      <section id="pricing" className="w-full px-6 pb-14">
        <div className={"rounded-3xl border p-6 md:p-8 " + (isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/[0.02]')}>
          <div className="mb-6">
            <div className={"text-xs font-black uppercase tracking-[0.25em] " + (isDark ? 'text-white/60' : 'text-black/60')}>Pricing</div>
            <h2 className="mt-2 text-3xl md:text-4xl font-black tracking-tighter">Pick your tier. Ship this week.</h2>
            <p className={"mt-3 text-sm font-bold max-w-2xl " + (isDark ? 'text-white/70' : 'text-black/70')}>
              One-time purchase. Clear deliverables. Choose the tier that matches how often you publish.
            </p>
          </div>

          {/* Reuse existing pricing component */}
          <div className="[&_*]:!text-slate-900">
            {/* ThreeTierPricingGuide is styled for light background; we render it in a light card container */}
            <div className="rounded-3xl bg-white p-6 md:p-8 w-full">
              <ThreeTierPricingGuide
                title="Simple, conversion-friendly pricing"
                subtitle="Most customers pick the middle tier."
                highlightTierIndex={1}
                ctaText="Get Instant Access"
                gradientClass="from-blue-500 to-indigo-500"
                tiers={[
                  {
                    name: 'Starter',
                    price: 19,
                    features: ['Core prompt pack', 'Quick-start workflow', 'Copy/paste templates', 'Lifetime access to this version'],
                  },
                  {
                    name: 'Pro (Best Value)',
                    price: 39,
                    badge: 'Best Value',
                    features: ['Everything in Starter', 'Advanced prompt pack', 'Landing page + email workflow', 'Quality checklist + review prompts'],
                  },
                  {
                    name: 'Ultimate',
                    price: 79,
                    features: ['Everything in Pro', 'Commercial license', 'Bonus prompts for offers + pricing', 'Priority support instructions'],
                  },
                ]}
              />
            </div>
          </div>

          <div className={"mt-6 text-xs font-bold " + (isDark ? 'text-white/60' : 'text-black/60')}>
            Guarantee: If it’s not a fit, request a refund within 7 days (digital goods policy permitting).
          </div>
        </div>
      </section>

      {/* Testimonials (interactive) */}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className={
          "rounded-3xl border p-6 md:p-8 " +
          (isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-white')
        }>
          <div className={"text-xs font-black uppercase tracking-[0.25em] " + (isDark ? 'text-white/60' : 'text-black/60')}>Testimonials</div>
          <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tighter">What buyers want: less friction.</h2>
          <p className={"mt-2 text-sm font-bold max-w-2xl " + (isDark ? 'text-white/70' : 'text-black/70')}>
            These are realistic examples (no fabricated metrics) showing the kind of feedback you should expect.
          </p>

          <div className="mt-6">
            <GlassTestimonialCarousel
              className=""
              tone={isGlassLight ? 'light' : 'dark'}
              testimonials={([
                {
                  id: 1,
                  initials: 'SM',
                  name: 'Sarah M.',
                  role: 'Freelance marketer',
                  quote: 'I stopped rewriting from scratch. The workflow gives me a clean first draft in minutes.',
                },
                {
                  id: 2,
                  initials: 'JL',
                  name: 'Jordan L.',
                  role: 'Creator',
                  quote: 'The tier structure is clear, and the prompts are written for actual publishing, not theory.',
                },
                {
                  id: 3,
                  initials: 'AP',
                  name: 'Alex P.',
                  role: 'Solo operator',
                  quote: 'Best part: I know what “good” looks like. The QA prompts save me from rambling copy.',
                },
              ] as Testimonial[])}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={"mx-auto max-w-6xl px-6 pb-16 " + (variant === 'editorial' ? 'font-inter' : '')}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className={"text-xs font-black uppercase tracking-[0.25em] " + (isDark ? 'text-white/60' : 'text-black/60')}>FAQ</div>
            <h2 className="mt-2 text-3xl md:text-4xl font-black tracking-tighter">Questions, answered.</h2>
            <p className={"mt-3 text-sm font-bold max-w-xl " + (isDark ? 'text-white/70' : 'text-black/70')}>
              Clear expectations so you can buy with confidence.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Do I need a specific AI tool?</AccordionTrigger>
              <AccordionContent>
                No. The prompts are written to work with any major LLM. You can adapt them to your preferred tool in minutes.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Is this beginner-friendly?</AccordionTrigger>
              <AccordionContent>
                Yes. The workflow tells you what to paste, what to replace, and what “good” looks like.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Can I use this for client work?</AccordionTrigger>
              <AccordionContent>
                Choose the Ultimate tier for a commercial license. (Starter/Pro are for personal use by default.)
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>What exactly do I receive?</AccordionTrigger>
              <AccordionContent>
                A digital download containing prompt packs, a workflow, and checklists. No subscription required.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className={
          "rounded-3xl border p-8 " +
          (isGlass
            ? 'border-white/15 bg-white/10 premium-blur'
            : isDark
              ? 'border-white/10 bg-gradient-to-r from-white/10 to-white/5'
              : 'border-black/10 bg-white')
        }>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className={"text-xs font-black uppercase tracking-[0.25em] " + (isDark ? 'text-white/60' : 'text-black/60')}>Ready?</div>
              <div className="mt-2 text-2xl md:text-3xl font-black tracking-tighter">
                Get the prompts. Follow the workflow. Publish.
              </div>
              <div className={"mt-2 text-sm font-bold " + (isDark ? 'text-white/70' : 'text-black/70')}>Instant access • One-time purchase • Minimal setup</div>
            </div>
            {isGlassLight ? (
              <GlareHover
                className="rounded-2xl"
                width="auto"
                height="auto"
                background="rgba(255,255,255,0.72)"
                borderRadius="16px"
                borderColor="rgba(15,23,42,0.10)"
                glareColor={glassLightMode === 3 ? '#f472b6' : glassLightMode === 2 ? '#22d3ee' : '#a78bfa'}
                glareOpacity={0.18}
                glareAngle={-35}
                glareSize={220}
              >
                <Button3D
                  onClick={onPrimaryCta}
                  variant="chrome"
                  className={`gg-shimmer h-12 px-7 rounded-2xl font-black uppercase tracking-widest text-xs border border-slate-900/10 bg-white/70 backdrop-blur-md ring-1 ${glassLightConfig.neon.ring} ${glassLightConfig.neon.glow} transition transform-gpu`}
                >
                  Get Free Lessons
                </Button3D>
              </GlareHover>
            ) : (
              <Button
                onClick={onPrimaryCta}
                className="h-12 px-7 font-black uppercase tracking-widest"
                style={{ backgroundColor: colors.primary, color: colors.text }}
              >
                Get Access Now
              </Button>
            )}
          </div>
        </div>
      </section>

      <footer className={"border-t " + (isDark ? 'border-white/10' : 'border-black/10')}>
        <div className={"mx-auto max-w-6xl px-6 py-10 text-xs font-bold flex flex-col md:flex-row items-center justify-between gap-4 " + (isDark ? 'text-white/50' : 'text-black/50')}>
          <div>© {new Date().getFullYear()} GumGenie</div>
          <div className="flex gap-6">
            <a className={"hover:opacity-100 " + (isDark ? 'hover:text-white' : 'hover:text-black')} href="#pricing">Pricing</a>
            <a className={"hover:opacity-100 " + (isDark ? 'hover:text-white' : 'hover:text-black')} href="#faq">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
