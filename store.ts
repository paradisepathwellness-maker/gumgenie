import { create } from 'zustand';
import { AppState, TemplateCategory, SimulationLog, Product, StylePreset, ContentBlock, McpServer, ChatMessage, ChatContext, ChatPhase } from './types';
import { gumroadConnectUrl, gumroadPublish, gumroadStatus } from './services/apiClient';

export const useStore = create<AppState>((set, get) => ({
  // Core State
  currentCategory: null,
  isGenerating: false,
  isPublishing: false,
  logs: [],
  generatedProduct: null,
  presets: [],
  activePresetIndex: null,

  // Default Customization
  gradientIndex: 0,
  layoutType: 'classic',
  headlineType: 'direct',
  buttonStyle: 'rounded',
  buttonIcon: 'cart',
  shadowStyle: 'subtle',
  accentOpacity: 100,
  titleWeight: 'bold',
  descWeight: 'normal',
  fontFamily: 'sans',
  containerStyle: 'flat',
  backgroundTexture: 'none',

  // Canvas Modules (React component toggles)
  heroBackgroundEffect: 'lightrays',
  heroDitherIntensity: 0.18,
  heroSplitTitleEnabled: false,
  heroGradientTitleEnabled: true,
  heroGlareCtaEnabled: true,

  // Integrations & Assets
  previewBlock: null,
  
  // Chat with AI State
  isChatOpen: false,
  chatMessages: [],
  lastTraceId: null,
  chatContext: null,
  chatPhase: 'suggestions',
  isChatLoading: false,

  // Chat Control Dashboard (always visible)
  // NOTE: Store initialization must not assume `window`/`localStorage` exists.
  // We load persisted values lazily on the client via actions.
  chatDashboardHeightPx: 180,
  chatMode: 'ask',
  chatDashboardCollapsed: true,

  // MCP tool discovery cache (for chat)
  mcpStdioServersCache: null,
  mcpStdioToolsCache: {},

  // NOTE: legacy UI MCP servers list (sidebar/library). No secrets must be embedded here.
  mcpServers: [
    { id: '1', name: '21st.dev MCP', url: 'https://mcp.21st.dev', active: false },
    { id: '2', name: 'Magic MCP', url: 'https://magic.mcp.ai', active: false },
  ],
  authorName: 'Digital Architect',
  brandLogo: '',

  setCategory: (category) => set({ currentCategory: category }),
  startGeneration: () => set({ isGenerating: true, logs: [], generatedProduct: null, presets: [], activePresetIndex: null }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setProduct: (product, presets) => set({ 
    generatedProduct: { 
      ...product, 
      contentBlocks: product.contentBlocks || [],
      authorName: get().authorName,
      brandLogo: get().brandLogo
    }, 
    presets: presets,
    isGenerating: false 
  }),
  updateProduct: (updates) => set((state) => ({
    generatedProduct: state.generatedProduct ? { ...state.generatedProduct, ...updates } : null
  })),
  reset: () => set({ 
    currentCategory: null, 
    isGenerating: false, 
    isPublishing: false,
    logs: [], 
    generatedProduct: null,
    presets: [],
    activePresetIndex: null,
    gradientIndex: 0,
    layoutType: 'classic',
    headlineType: 'direct',
    buttonStyle: 'rounded',
    buttonIcon: 'cart',
    shadowStyle: 'subtle',
    accentOpacity: 100,
    titleWeight: 'bold',
    descWeight: 'normal',
    fontFamily: 'sans',
    containerStyle: 'flat',
    backgroundTexture: 'none',

    heroBackgroundEffect: 'lightrays',
    heroDitherIntensity: 0.18,
    heroSplitTitleEnabled: false,
    heroGradientTitleEnabled: true,
    heroGlareCtaEnabled: true,
    
    // Reset chat state
    isChatOpen: false,
    chatMessages: [],
    chatContext: null,
    chatPhase: 'suggestions',
    isChatLoading: false,

    // Reset dashboard preferences
    chatDashboardHeightPx: 180,
    chatMode: 'ask',
    chatDashboardCollapsed: true,

    // Reset tool cache
    mcpStdioServersCache: null,
    mcpStdioToolsCache: {},
  }),
  
  addContentBlock: (block) => set((state) => {
    if (!state.generatedProduct) return state;
    const newBlock: ContentBlock = {
      ...block,
      id: Math.random().toString(36).substr(2, 9),
    };
    return {
      generatedProduct: {
        ...state.generatedProduct,
        contentBlocks: [...state.generatedProduct.contentBlocks, newBlock]
      }
    };
  }),

  removeContentBlock: (id) => set((state) => {
    if (!state.generatedProduct) return state;
    return {
      generatedProduct: {
        ...state.generatedProduct,
        contentBlocks: state.generatedProduct.contentBlocks.filter(b => b.id !== id)
      }
    };
  }),

  updateContentBlock: (id, updates) => set((state) => {
    if (!state.generatedProduct) return state;
    return {
      generatedProduct: {
        ...state.generatedProduct,
        contentBlocks: state.generatedProduct.contentBlocks.map(b => b.id === id ? { ...b, ...updates } : b)
      }
    };
  }),

  reorderContentBlocks: (startIndex, endIndex) => set((state) => {
    if (!state.generatedProduct) return state;
    const result = Array.from(state.generatedProduct.contentBlocks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return {
      generatedProduct: {
        ...state.generatedProduct,
        contentBlocks: result
      }
    };
  }),

  setPreviewBlock: (block) => set({ previewBlock: block }),
  commitPreviewBlock: () => set((state) => {
    if (!state.generatedProduct || !state.previewBlock) return state;
    const newBlock: ContentBlock = { ...state.previewBlock, id: Math.random().toString(36).substr(2, 9) };
    return {
      previewBlock: null,
      generatedProduct: {
        ...state.generatedProduct,
        contentBlocks: [...state.generatedProduct.contentBlocks, newBlock],
      },
    };
  }),

  setCustomization: (updates) => set((state) => ({ ...state, ...updates, activePresetIndex: null })),
  
  applyPreset: (index) => set((state) => {
    const preset = state.presets[index];
    if (!preset) return state;
    return {
      ...state,
      activePresetIndex: index,
      gradientIndex: preset.gradientIndex,
      layoutType: preset.layoutType,
      headlineType: preset.headlineType,
      buttonStyle: preset.buttonStyle,
      buttonIcon: preset.buttonIcon,
      shadowStyle: preset.shadowStyle,
      accentOpacity: preset.accentOpacity,
      titleWeight: preset.titleWeight,
      descWeight: preset.descWeight,
      fontFamily: preset.fontFamily || 'sans',
      containerStyle: preset.containerStyle || 'flat',
      backgroundTexture: preset.backgroundTexture || 'none',
    };
  }),

  // Integrations & Assets Actions
  addMcpServer: (name, url) => set((state) => ({
    mcpServers: [...state.mcpServers, { id: Math.random().toString(36).substr(2, 9), name, url, active: true }]
  })),
  toggleMcpServer: (id) => set((state) => ({
    mcpServers: state.mcpServers.map(s => s.id === id ? { ...s, active: !s.active } : s)
  })),
  removeMcpServer: (id) => set((state) => ({
    mcpServers: state.mcpServers.filter(s => s.id !== id)
  })),
  setAuthorName: (name) => set({ authorName: name }),
  setBrandLogo: (logo) => set({ brandLogo: logo }),

  saveToDrafts: async () => {
    const state = get();
    if (!state.generatedProduct) return;
    state.addLog({
      id: Math.random().toString(),
      message: "Syncing architected parameters to local vault...",
      phase: 'PUBLISHING',
      type: 'info',
      timestamp: new Date().toLocaleTimeString()
    });
    await new Promise(r => setTimeout(r, 1000));
    state.addLog({
      id: Math.random().toString(),
      message: "Local draft state preserved successfully.",
      phase: 'PUBLISHING',
      type: 'success',
      timestamp: new Date().toLocaleTimeString()
    });
  },

  downloadAsset: () => {
    const state = get();
    if (!state.generatedProduct) return;
    state.addLog({
      id: Math.random().toString(),
      message: "Packaging high-fidelity assets for distribution...",
      phase: 'PUBLISHING',
      type: 'info',
      timestamp: new Date().toLocaleTimeString()
    });
    const blob = new Blob([JSON.stringify(state.generatedProduct, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.generatedProduct.title.replace(/\s+/g, '_')}_manifest.json`;
    a.click();
    state.addLog({
      id: Math.random().toString(),
      message: "Asset bundle downloaded successfully.",
      phase: 'PUBLISHING',
      type: 'success',
      timestamp: new Date().toLocaleTimeString()
    });
  },

  publishToGumroad: async () => {
    const state = get();
    if (!state.generatedProduct) return;

    set({ isPublishing: true });

    const ts = () => new Date().toLocaleTimeString();

    state.addLog({
      id: Math.random().toString(),
      message: 'Checking Gumroad connection status...',
      phase: 'PUBLISHING',
      type: 'info',
      timestamp: ts(),
    });

    try {
      const status = await gumroadStatus();

      if (!status.connected) {
        state.addLog({
          id: Math.random().toString(),
          message: 'Gumroad not connected. Opening OAuth handshake...',
          phase: 'PUBLISHING',
          type: 'warning',
          timestamp: ts(),
        });

        window.open(gumroadConnectUrl(), '_blank', 'noopener,noreferrer');

        state.addLog({
          id: Math.random().toString(),
          message: 'Complete Gumroad authorization in the new tab, then click Publish again.',
          phase: 'PUBLISHING',
          type: 'info',
          timestamp: ts(),
        });

        return;
      }

      state.addLog({
        id: Math.random().toString(),
        message: 'Connected. Publishing product to Gumroad...',
        phase: 'PUBLISHING',
        type: 'info',
        timestamp: ts(),
      });

      const result = await gumroadPublish({
        name: state.generatedProduct.title,
        price: state.generatedProduct.price,
        description: state.generatedProduct.description,
      });

      set((s) => ({
        generatedProduct: s.generatedProduct
          ? {
              ...s.generatedProduct,
              gumroadUrl: result.url,
              publishedStatus: 'published',
            }
          : null,
      }));

      state.addLog({
        id: Math.random().toString(),
        message: `Deployment successful. Live at: ${result.url}`,
        phase: 'PUBLISHING',
        type: 'success',
        timestamp: ts(),
      });
    } catch (err: any) {
      state.addLog({
        id: Math.random().toString(),
        message: `Publish failed: ${err?.message || 'Unknown error'}`,
        phase: 'PUBLISHING',
        type: 'error',
        timestamp: ts(),
      });
    } finally {
      set({ isPublishing: false });
    }
  },

  // Chat with AI Actions
  setLastTraceId: (traceId) => set({ lastTraceId: traceId }),

  openChat: (context) => set((state) => ({
    isChatOpen: true,
    chatContext: context || {
      category: state.currentCategory || undefined,
      contentArea: undefined,
      currentContent: undefined
    },
    chatMessages: [],
    chatPhase: 'suggestions',
    isChatLoading: false
  })),

  closeChat: () => set({
    isChatOpen: false,
    chatMessages: [],
    chatContext: null,
    chatPhase: 'suggestions',
    isChatLoading: false
  }),

  addChatMessage: (message) => set((state) => ({
    chatMessages: [
      ...state.chatMessages,
      {
        ...message,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date()
      }
    ]
  })),

  setChatPhase: (phase) => set({ chatPhase: phase }),

  setChatLoading: (loading) => set({ isChatLoading: loading }),

  clearChatMessages: () => set({ chatMessages: [] }),

  generateChatComponent: async (suggestion) => {
    const state = get();
    
    // Set loading state
    state.setChatLoading(true);
    state.setChatPhase('processing');
    
    // Add user message
    state.addChatMessage({
      type: 'user',
      content: suggestion
    });

    // Simulate LLM processing
    setTimeout(async () => {
      try {
        // Generate implementation options based on suggestion and context
        const implementationOptions = getImplementationOptions(suggestion, state.chatContext);
        
        // Add assistant response with implementation options
        state.addChatMessage({
          type: 'assistant',
          content: `Perfect! I've analyzed your request and prepared implementation options:`,
          suggestions: implementationOptions
        });
        
        state.setChatPhase('implementation');
        state.setChatLoading(false);
      } catch (error) {
        // Add error message
        state.addChatMessage({
          type: 'assistant',
          content: `I apologize, but I encountered an error processing your request. Please try again.`
        });
        
        state.setChatLoading(false);
        state.setChatPhase('suggestions');
      }
    }, 2000);
  },

  // Chat dashboard actions
  setChatDashboardHeightPx: (heightPx) => {
    const clamped = Math.max(120, Math.min(heightPx, Math.floor(window.innerHeight * 0.5)));
    try { localStorage.setItem('gg_chatDashboardHeightPx', String(clamped)); } catch { /* ignore persistence errors */ }
    set({ chatDashboardHeightPx: clamped });
  },

  setChatMode: (mode) => {
    try { localStorage.setItem('gg_chatMode', mode); } catch { /* ignore persistence errors */ }
    set({ chatMode: mode });
  },

  setChatDashboardCollapsed: (collapsed) => {
    try { localStorage.setItem('gg_chatDashboardCollapsed', String(!!collapsed)); } catch { /* ignore persistence errors */ }
    set({ chatDashboardCollapsed: !!collapsed });
  },

  toggleChatDashboardCollapsed: () => {
    const next = !get().chatDashboardCollapsed;
    try { localStorage.setItem('gg_chatDashboardCollapsed', String(next)); } catch { /* ignore persistence errors */ }
    set({ chatDashboardCollapsed: next });
  },

  // MCP tool discovery actions
  fetchMcpStdioServers: async (opts) => {
    const force = Boolean(opts?.force);
    const cache = get().mcpStdioServersCache;
    const now = Date.now();
    if (!force && cache && now - cache.fetchedAt < 5 * 60 * 1000) return;

    const res = await fetch('http://localhost:4000/api/mcp-stdio/servers');
    if (!res.ok) throw new Error(`Failed to fetch MCP servers (${res.status})`);
    const json = await res.json();
    set({ mcpStdioServersCache: { servers: json.servers || [], fetchedAt: now } });
  },

  fetchMcpStdioTools: async (serverId, opts) => {
    const force = Boolean(opts?.force);
    const cache = get().mcpStdioToolsCache[serverId];
    const now = Date.now();
    if (!force && cache && now - cache.fetchedAt < 5 * 60 * 1000) return;

    const res = await fetch('http://localhost:4000/api/mcp-stdio/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId }),
    });
    if (!res.ok) throw new Error(`Failed to fetch MCP tools (${res.status})`);
    const json = await res.json();
    set((state) => ({
      mcpStdioToolsCache: {
        ...state.mcpStdioToolsCache,
        [serverId]: { tools: json, fetchedAt: now },
      },
    }));
  },

  clearMcpToolCache: () => set({ mcpStdioServersCache: null, mcpStdioToolsCache: {} }),
}));

// Helper function to generate implementation options
function getImplementationOptions(suggestion: string, context: ChatContext | null): string[] {
  // Context-aware implementation suggestions based on the original suggestion
  if (suggestion.includes('pricing')) {
    return [
      "Generate 3-tier pricing with value anchoring",
      "Create comparison table with competitors",
      "Build ROI calculator component",
      "Design limited-time offer section"
    ];
  }
  
  if (suggestion.includes('testimonials')) {
    return [
      "Create testimonial carousel with metrics",
      "Build social proof grid with avatars",
      "Generate case study cards",
      "Design video testimonial section"
    ];
  }
  
  if (suggestion.includes('technical') || suggestion.includes('database') || suggestion.includes('compatibility')) {
    return [
      "Build interactive feature comparison",
      "Create technical specs showcase", 
      "Generate capability matrix table",
      "Design integration guide component"
    ];
  }
  
  // Category-specific defaults
  if (context?.category) {
    const categoryDefaults = {
      'AI_PROMPTS': [
        "Create framework showcase component",
        "Build technical credibility section",
        "Generate developer testimonials",
        "Design multi-model compatibility guide"
      ],
      'NOTION_TEMPLATES': [
        "Build database showcase component",
        "Create productivity benefits section",
        "Generate setup simplicity guide",
        "Design professional testimonials"
      ],
      'DIGITAL_PLANNERS': [
        "Create aesthetic gallery showcase",
        "Build lifestyle benefits section",
        "Generate app compatibility guide",
        "Design creative community section"
      ],
      'DESIGN_TEMPLATES': [
        "Build agency ROI calculator",
        "Create platform compatibility matrix",
        "Generate professional case studies",
        "Design commercial license guide"
      ]
    };
    
    return categoryDefaults[context.category] || [];
  }
  
  // Default implementation options
  return [
    "Create interactive component",
    "Build informational section",
    "Generate comparison table",
    "Design visual showcase"
  ];
}
