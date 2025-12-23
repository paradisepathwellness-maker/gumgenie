import { TemplateCategory, type Product, type StylePreset } from '../../../types';

// V2.3 Agent Squad schemas (lightweight runtime validation)

export type UnifiedBrief = {
  persona: string;
  usp: string;
  constraints: string[];
  mustInclude: string[];
  vibe: string;
};

export type Strategy = {
  targetAudience: string;
  corePainPoint: string;
  mechanismName: string;
  uniqueSellingProp: string;
  seoKeywords: string[];
};

export type Monetization = {
  tiers: { name: string; price: number; features: string[] }[];
  bonuses: { title: string; value: string }[];
  guaranteePolicy: string;
};

export type CopyContent = {
  productTitle: string;
  hookHeadline: string;
  descriptionMarkdown: string;
  features: string[];
  faq: { question: string; answer: string }[];
  callToAction: string;
};

export type Visuals = {
  stylePreset: {
    themeName: string;
    colors: { bg: string; text: string; primary: string };
    fontPairing: string;
  };
  emojiSet: string[];
  canvasSettings: { heroBackgroundEffect: 'lightrays' | 'dither' | 'none'; heroDitherIntensity: number };
  recommendedMcpComponents: { library: 'magicui' | 'shadcn'; component: string; reason: string }[];
};

export type ResearchData = {
  category: TemplateCategory;
  generatedAt: string;
  source?: string;
  competitors?: unknown;
  stats?: Record<string, unknown>;
  notes?: string[];
};

export type AgentRunMeta = {
  agent: string;
  ok: boolean;
  durationMs: number;
  retried?: boolean;
  fallbackUsed?: boolean;
  error?: string;
};

export type AgentsGenerateResponse = {
  product: Product;
  preset: StylePreset;
  meta: {
    traceId: string;
    generatedAt: string;
    category: TemplateCategory;
    agents: AgentRunMeta[];
    snapshotUsed?: boolean;
    snapshotPath?: string;

    // Notion Templates: blueprint used for Notion MCP build step (optional, non-breaking)
    notionBlueprintMode?: 'deterministic' | 'gemini';
    notionBlueprint?: NotionTemplateBlueprint;
  };
};

export function isTemplateCategory(v: unknown): v is TemplateCategory {
  return typeof v === 'string' && (Object.values(TemplateCategory) as string[]).includes(v);
}

// ------------------------------
// Notion Template Blueprint (for Notion MCP build step)
// ------------------------------

export type NotionPropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'status'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'people'
  | 'files'
  | 'relation'
  | 'rollup'
  | 'formula';

export type NotionPropertySpecBase = {
  name: string;
  type: NotionPropertyType;
};

export type NotionSelectOptionSpec = { name: string; color?: string };

export type NotionPropertySpec =
  | (NotionPropertySpecBase & { type: 'title' })
  | (NotionPropertySpecBase & { type: 'rich_text' })
  | (NotionPropertySpecBase & { type: 'number'; format?: string })
  | (NotionPropertySpecBase & { type: 'select'; options: NotionSelectOptionSpec[] })
  | (NotionPropertySpecBase & { type: 'multi_select'; options: NotionSelectOptionSpec[] })
  | (NotionPropertySpecBase & { type: 'status'; options: NotionSelectOptionSpec[] })
  | (NotionPropertySpecBase & { type: 'date' })
  | (NotionPropertySpecBase & { type: 'checkbox' })
  | (NotionPropertySpecBase & { type: 'url' })
  | (NotionPropertySpecBase & { type: 'email' })
  | (NotionPropertySpecBase & { type: 'phone_number' })
  | (NotionPropertySpecBase & { type: 'people' })
  | (NotionPropertySpecBase & { type: 'files' })
  | (NotionPropertySpecBase & {
      type: 'relation';
      targetDatabaseKey: string; // blueprint key reference
      dualPropertyName?: string;
    })
  | (NotionPropertySpecBase & {
      type: 'rollup';
      relationPropertyName: string;
      rollupPropertyName: string;
      function: string;
    })
  | (NotionPropertySpecBase & {
      type: 'formula';
      expression: string;
    });

export type NotionDatabaseViewSpec = {
  name: string;
  type: 'table' | 'board' | 'calendar' | 'timeline' | 'list' | 'gallery';
  // Best-effort filters/sorts; exact shape depends on Notion MCP tool surface.
  filters?: unknown;
  sorts?: unknown;
  groupBy?: string;
};

export type NotionDatabaseSpec = {
  key: string; // stable blueprint key
  name: string;
  iconEmoji?: string;
  description?: string;
  properties: NotionPropertySpec[];
  views?: NotionDatabaseViewSpec[];
  seedRows?: Array<Record<string, unknown>>; // optional example rows
};

export type NotionPageSpec = {
  key: string; // stable blueprint key
  title: string;
  iconEmoji?: string;
  coverUrl?: string;
  // Simple content blocks to populate Start Here pages
  blocks?: Array<{ type: 'heading_1' | 'heading_2' | 'paragraph' | 'bullets'; text: string | string[] }>;
  // References to databases/views that should be embedded/linked from this page
  embeds?: Array<{ databaseKey: string; viewName?: string }>;
};

export type NotionTemplateBlueprint = {
  templateName: string;
  category: TemplateCategory;
  rootPage: NotionPageSpec;
  pages: NotionPageSpec[];
  databases: NotionDatabaseSpec[];
  notes?: string[];
};
