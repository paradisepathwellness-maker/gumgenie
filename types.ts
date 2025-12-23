
export enum TemplateCategory {
  AI_PROMPTS = 'AI_PROMPTS',
  NOTION_TEMPLATES = 'NOTION_TEMPLATES',
  DIGITAL_PLANNERS = 'DIGITAL_PLANNERS',
  DESIGN_TEMPLATES = 'DESIGN_TEMPLATES'
}

export type LayoutType = 'classic' | 'centered' | 'split' | 'minimal';
export type HeadlineType = 'benefit' | 'problem' | 'scarcity' | 'direct';
export type ButtonStyle = 'rounded' | 'square' | 'pill' | 'outline';
export type ShadowStyle = 'subtle' | 'deep' | 'neumorphic';
export type FontWeight = 'normal' | 'bold' | 'black';
export type ButtonIconType = 'download' | 'unlock' | 'cart' | 'zap';
export type FontFamily = 'sans' | 'serif' | 'mono';
export type ContainerStyle = 'glass' | 'flat' | 'brutalist';
export type BackgroundTexture = 'none' | 'dots' | 'grid' | 'mesh';

export interface StylePreset {
  name: string;
  gradientIndex: number;
  layoutType: LayoutType;
  headlineType: HeadlineType;
  buttonStyle: ButtonStyle;
  buttonIcon: ButtonIconType;
  shadowStyle: ShadowStyle;
  accentOpacity: number;
  titleWeight: FontWeight;
  descWeight: FontWeight;
  fontFamily: FontFamily;
  containerStyle: ContainerStyle;
  backgroundTexture: BackgroundTexture;
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'feature-grid' | 'faq' | 'checklist' | 'stat-highlight' | 'emoji-row' | 'testimonial' | 'pricing' | 'gallery';
  title?: string;
  content?: string;
  items?: string[];
}

export type AiSuggestion = {
  title: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  action: string;
};

export type AiFormatResult = {
  formattedBlock: Omit<ContentBlock, 'id'>;
  suggestions: AiSuggestion[];
};

export interface ProductComponent {
  type: 'feature-grid' | 'faq' | 'checklist' | 'stat-highlight';
  title: string;
  items: string[];
}

export interface McpServer {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

export type ChatMode = 'ask' | 'turbo';

export interface ChatOption {
  label: string;
  value: string;
}

export interface ChatToolPreview {
  serverId?: string;
  serverLabel?: string;
  toolName?: string;
  args?: unknown;
  mode?: ChatMode;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  /** Legacy simple suggestions (rendered as buttons) */
  suggestions?: string[];
  /** Structured follow-up options (rendered as buttons) */
  options?: ChatOption[];
  /** Optional tool transparency payload (what the assistant is about to run / ran) */
  toolPreview?: ChatToolPreview;
  componentData?: any;
}

export interface ChatContext {
  category?: TemplateCategory;
  contentArea?: string;
  currentContent?: string;
}

export type ChatPhase = 'suggestions' | 'processing' | 'implementation' | 'completed';

export interface Product {
  id?: string;
  title: string;
  description: string;
  price: number;
  coverImage: string;
  category: TemplateCategory;
  features: string[];
  callToAction: string;
  emojiSet: string[];
  extraComponents: ProductComponent[];
  contentBlocks: ContentBlock[];
  gumroadUrl?: string;
  publishedStatus?: 'draft' | 'published';
  authorName?: string;
  brandLogo?: string;
}

export interface SimulationLog {
  id: string;
  message: string;
  timestamp: string;
  phase: 'INITIALIZING' | 'SYNTHESIZING' | 'OPTIMIZING' | 'FINALIZING' | 'PUBLISHING' | 'GENERATING';
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface AppState {
  // Core State
  currentCategory: TemplateCategory | null;
  isGenerating: boolean;
  isPublishing: boolean;
  logs: SimulationLog[];
  generatedProduct: Product | null;
  presets: StylePreset[];
  activePresetIndex: number | null;
  
  // Customization State
  gradientIndex: number;
  layoutType: LayoutType;
  headlineType: HeadlineType;
  buttonStyle: ButtonStyle;
  buttonIcon: ButtonIconType;
  shadowStyle: ShadowStyle;
  accentOpacity: number;
  titleWeight: FontWeight;
  descWeight: FontWeight;
  fontFamily: FontFamily;
  containerStyle: ContainerStyle;
  backgroundTexture: BackgroundTexture;

  // Canvas Modules (React component toggles)
  heroBackgroundEffect: 'none' | 'lightrays' | 'dither';
  heroDitherIntensity: number;
  heroSplitTitleEnabled: boolean;
  heroGradientTitleEnabled: boolean;
  heroGlareCtaEnabled: boolean;

  // Integrations & Assets
  mcpServers: McpServer[];
  authorName: string;
  brandLogo: string;

  // Preview (transient canvas block)
  previewBlock: Omit<ContentBlock, 'id'> | null;

  // Chat with AI State
  isChatOpen: boolean;
  chatMessages: ChatMessage[];
  lastTraceId: string | null;
  chatContext: ChatContext | null;
  chatPhase: ChatPhase;
  isChatLoading: boolean;

  // Chat Control Dashboard (always visible)
  chatDashboardHeightPx: number;
  chatMode: ChatMode;
  chatDashboardCollapsed: boolean;

  // MCP tool discovery cache (for chat)
  mcpStdioServersCache: { servers: { id: string; label: string }[]; fetchedAt: number } | null;
  mcpStdioToolsCache: Record<string, { tools: unknown; fetchedAt: number }>;

  // Actions
  setCategory: (category: TemplateCategory) => void;
  startGeneration: () => void;
  addLog: (log: SimulationLog) => void;
  setProduct: (product: Product, presets: StylePreset[]) => void;
  updateProduct: (updates: Partial<Product>) => void;
  reset: () => void;
  
  // Content Builder Actions
  addContentBlock: (block: Omit<ContentBlock, 'id'>) => void;
  removeContentBlock: (id: string) => void;
  updateContentBlock: (id: string, updates: Partial<ContentBlock>) => void;
  reorderContentBlocks: (startIndex: number, endIndex: number) => void;

  // Preview Actions
  setPreviewBlock: (block: Omit<ContentBlock, 'id'> | null) => void;
  commitPreviewBlock: () => void;
  
  // Customization Actions
  setCustomization: (updates: Partial<AppState>) => void;
  applyPreset: (index: number) => void;

  // Integrations & Assets Actions
  addMcpServer: (name: string, url: string) => void;
  toggleMcpServer: (id: string) => void;
  removeMcpServer: (id: string) => void;
  setAuthorName: (name: string) => void;
  setBrandLogo: (logo: string) => void;

  // Publishing Actions
  saveToDrafts: () => Promise<void>;
  downloadAsset: () => void;
  publishToGumroad: () => Promise<void>;

  // Chat with AI Actions
  setLastTraceId: (traceId: string | null) => void;
  openChat: (context?: ChatContext) => void;
  closeChat: () => void;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setChatPhase: (phase: ChatPhase) => void;
  setChatLoading: (loading: boolean) => void;
  clearChatMessages: () => void;
  generateChatComponent: (suggestion: string) => Promise<void>;

  // Chat dashboard actions
  setChatDashboardHeightPx: (heightPx: number) => void;
  setChatMode: (mode: ChatMode) => void;
  setChatDashboardCollapsed: (collapsed: boolean) => void;
  toggleChatDashboardCollapsed: () => void;

  // MCP tool discovery actions
  fetchMcpStdioServers: (opts?: { force?: boolean }) => Promise<void>;
  fetchMcpStdioTools: (serverId: string, opts?: { force?: boolean }) => Promise<void>;
  clearMcpToolCache: () => void;
}
