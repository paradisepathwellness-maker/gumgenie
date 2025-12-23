import type { ContentBlock, Product, StylePreset, TemplateCategory } from '../../../types';
import type { AgentRunMeta, CopyContent, Monetization, Strategy, UnifiedBrief, Visuals } from '../definitions/schemas';

export function defaultProduct(category: TemplateCategory): Product {
  return {
    title: 'Untitled Product',
    description: 'Description unavailable (fallback).',
    price: 29,
    coverImage: 'https://picsum.photos/seed/fallback/1200/800',
    category,
    features: ['High-quality deliverables', 'Clear instructions', 'Fast results'],
    callToAction: 'Download instantly and get started today.',
    emojiSet: ['✨', '⚡', '✅'],
    extraComponents: [],
    contentBlocks: [],
  };
}

function supportsUnicodeProps(): boolean {
  try {
    // If the runtime doesn't support Unicode property escapes, this throws.
    // eslint-disable-next-line no-new
    new RegExp('\\p{Extended_Pictographic}', 'u');
    return true;
  } catch {
    return false;
  }
}

function isReasonableEmojiToken(s: string): boolean {
  const v = s.trim();
  if (!v) return false;

  // Filter obvious placeholder-ish outputs.
  if (/emoji|string|placeholder|\{\{|\}\}|\[|\]|:/i.test(v)) return false;
  // Filter placeholder / replacement characters.
  if (/[?\uFFFD]/.test(v)) return false;

  if (supportsUnicodeProps()) {
    // Strict path: require a real emoji/pictograph.
    return /\p{Extended_Pictographic}/u.test(v);
  }

  // Conservative fallback for older runtimes: accept only short strings and common surrogate-pair emoji.
  // This is intentionally strict to avoid placeholders.
  return v.length <= 4;
}

function sanitizeEmojiSet(input: unknown): string[] {
  const fallback = ['✨', '⚡', '✅'];
  if (!Array.isArray(input)) return fallback;

  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    if (!isReasonableEmojiToken(raw)) continue;
    const token = raw.trim();
    if (!out.includes(token)) out.push(token);
    if (out.length >= 5) break;
  }

  return out.length ? out.slice(0, 3) : fallback;
}

function stableBlockId(prefix: string, idx: number) {
  return `${prefix}-${idx}`;
}

function buildInitialContentBlocks(args: {
  content: CopyContent | null;
  monetization: Monetization | null;
}): ContentBlock[] {
  const { content, monetization } = args;
  const blocks: ContentBlock[] = [];

  if (content) {
    // 1) Hero / overview text (uses hook + description)
    blocks.push({
      id: stableBlockId('overview', 0),
      type: 'text',
      title: content.hookHeadline || 'Overview',
      content: content.descriptionMarkdown || '',
    });

    // 2) Features grid
    if (content.features?.length) {
      blocks.push({
        id: stableBlockId('features', 0),
        type: 'feature-grid',
        title: "What's Inside",
        items: content.features.slice(0, 12),
      });
    }

    // 3) FAQ
    if (content.faq?.length) {
      blocks.push({
        id: stableBlockId('faq', 0),
        type: 'faq',
        title: 'FAQ',
        items: content.faq.slice(0, 10).map((f) => `${f.question} — ${f.answer}`),
      });
    }
  }

  if (monetization?.tiers?.length) {
    // 4) Pricing (represented as a list for now; the canvas pricing section is rendered separately in UI)
    blocks.push({
      id: stableBlockId('pricing', 0),
      type: 'pricing',
      title: 'Pricing Options',
      items: monetization.tiers.slice(0, 3).map((t) => {
        const price = typeof t.price === 'number' && !Number.isNaN(t.price) ? `$${t.price}` : '';
        const feats = Array.isArray(t.features) ? t.features.slice(0, 4).join('; ') : '';
        return `${t.name}${price ? ` — ${price}` : ''}${feats ? `: ${feats}` : ''}`;
      }),
    });

    // Bonuses / guarantee (nice-to-have)
    if (monetization.bonuses?.length) {
      blocks.push({
        id: stableBlockId('bonuses', 0),
        type: 'checklist',
        title: 'Fast-Action Bonuses',
        items: monetization.bonuses.slice(0, 6).map((b) => `${b.title} (${b.value})`),
      });
    }
    if (monetization.guaranteePolicy) {
      blocks.push({
        id: stableBlockId('guarantee', 0),
        type: 'text',
        title: 'Guarantee',
        content: monetization.guaranteePolicy,
      });
    }
  }

  return blocks;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hashToIndex(s: string, modulo: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return modulo ? h % modulo : 0;
}

function derivePresetFromVisuals(visuals: Visuals | null): StylePreset {
  const themeName = visuals?.stylePreset?.themeName || 'Default';
  const primary = visuals?.stylePreset?.colors?.primary || '';
  const fontPairing = visuals?.stylePreset?.fontPairing || '';
  const effect = visuals?.canvasSettings?.heroBackgroundEffect;

  const fontFamily: StylePreset['fontFamily'] = /mono/i.test(fontPairing)
    ? 'mono'
    : /serif/i.test(fontPairing)
      ? 'serif'
      : 'sans';

  const backgroundTexture: StylePreset['backgroundTexture'] = effect === 'dither' ? 'dots' : effect === 'lightrays' ? 'mesh' : 'none';

  return {
    name: themeName,
    gradientIndex: hashToIndex(`${themeName}|${primary}`, 4),
    layoutType: 'classic',
    headlineType: 'benefit',
    buttonStyle: 'rounded',
    buttonIcon: 'download',
    shadowStyle: 'subtle',
    accentOpacity: clamp(70, 30, 100),
    titleWeight: 'black',
    descWeight: 'normal',
    fontFamily,
    containerStyle: 'glass',
    backgroundTexture,
  };
}

export function mergeToProduct(args: {
  category: TemplateCategory;
  brief: UnifiedBrief | null;
  strategy: Strategy | null;
  monetization: Monetization | null;
  content: CopyContent | null;
  visuals: Visuals | null;
  agents: AgentRunMeta[];
}): { product: Product; preset: StylePreset } {
  const { category, content, visuals, monetization } = args;

  const product = defaultProduct(category);
  if (content) {
    product.title = content.productTitle || product.title;
    product.description = content.descriptionMarkdown || product.description;
    product.features = content.features?.length ? content.features : product.features;
    product.callToAction = content.callToAction || product.callToAction;
  }

  product.emojiSet = sanitizeEmojiSet(visuals?.emojiSet);

  // If monetization provided, use the mid tier as the displayed price (decoy pricing).
  const mid = monetization?.tiers?.[1];
  if (mid && typeof mid.price === 'number' && !Number.isNaN(mid.price)) product.price = mid.price;

  // Populate initial content blocks
  product.contentBlocks = buildInitialContentBlocks({ content, monetization });

  const preset = derivePresetFromVisuals(visuals);

  // NOTE: Canvas module settings (heroBackgroundEffect, heroDitherIntensity, etc.)
  // live in frontend AppState today, not in Product/StylePreset payloads.

  return { product, preset };
}
