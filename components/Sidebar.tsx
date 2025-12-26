/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store';
import { TemplateCategory, LayoutType, HeadlineType, ButtonStyle, ShadowStyle, FontWeight, ButtonIconType, FontFamily, ContainerStyle, BackgroundTexture, StylePreset, ContentBlock } from '../types';
import { Brain, FileText, Calendar, Layout, Sparkles, HelpCircle, Layers, Type, Palette, MousePointer2, Box, Sun, Wand2, Plus, Smile, Package, Save, Download, Rocket, Zap, Check, Monitor, Grid, CircleDot, ShoppingCart, LockOpen, DownloadCloud, Globe, Code2, Link, Image as ImageIcon, User, Trash2, ExternalLink, Sliders, Component, Terminal, Type as FontIcon, Droplets, Target } from 'lucide-react';
import { agentsResearch, aiFormatMcpOutputServer, gumroadConnectUrl, gumroadStatus, mcpSseListTools, mcpSseServers, mcpStdioCall, mcpStdioListTools, mcpStdioServers } from '../services/apiClient';
import { Button as Button3D } from '@/components/ui/3d-button';

const STATIC_PRESETS: StylePreset[] = [
  { name: "Midnight Cyber", gradientIndex: 3, layoutType: 'split', headlineType: 'problem', buttonStyle: 'square', buttonIcon: 'zap', shadowStyle: 'deep', accentOpacity: 100, titleWeight: 'black', descWeight: 'bold', fontFamily: 'mono', containerStyle: 'brutalist', backgroundTexture: 'grid' },
  { name: "Cloud Minimal", gradientIndex: 0, layoutType: 'minimal', headlineType: 'direct', buttonStyle: 'pill', buttonIcon: 'download', shadowStyle: 'subtle', accentOpacity: 30, titleWeight: 'bold', descWeight: 'normal', fontFamily: 'sans', containerStyle: 'glass', backgroundTexture: 'none' },
  { name: "Vintage Serif", gradientIndex: 1, layoutType: 'centered', headlineType: 'benefit', buttonStyle: 'rounded', buttonIcon: 'unlock', shadowStyle: 'neumorphic', accentOpacity: 80, titleWeight: 'bold', descWeight: 'normal', fontFamily: 'serif', containerStyle: 'flat', backgroundTexture: 'mesh' },
  { name: "Industrial Pro", gradientIndex: 2, layoutType: 'classic', headlineType: 'scarcity', buttonStyle: 'rounded', buttonIcon: 'cart', shadowStyle: 'deep', accentOpacity: 100, titleWeight: 'black', descWeight: 'bold', fontFamily: 'sans', containerStyle: 'flat', backgroundTexture: 'dots' },
  { name: "React Emerald", gradientIndex: 2, layoutType: 'classic', headlineType: 'benefit', buttonStyle: 'rounded', buttonIcon: 'zap', shadowStyle: 'subtle', accentOpacity: 90, titleWeight: 'black', descWeight: 'normal', fontFamily: 'sans', containerStyle: 'flat', backgroundTexture: 'none' },
  { name: "Slate Enterprise", gradientIndex: 0, layoutType: 'split', headlineType: 'direct', buttonStyle: 'rounded', buttonIcon: 'unlock', shadowStyle: 'deep', accentOpacity: 100, titleWeight: 'bold', descWeight: 'normal', fontFamily: 'sans', containerStyle: 'flat', backgroundTexture: 'grid' },
  { name: "Futuristic Glass", gradientIndex: 3, layoutType: 'centered', headlineType: 'benefit', buttonStyle: 'pill', buttonIcon: 'cart', shadowStyle: 'deep', accentOpacity: 60, titleWeight: 'black', descWeight: 'bold', fontFamily: 'sans', containerStyle: 'glass', backgroundTexture: 'mesh' },
  { name: "Developer Mono", gradientIndex: 3, layoutType: 'minimal', headlineType: 'problem', buttonStyle: 'square', buttonIcon: 'zap', shadowStyle: 'subtle', accentOpacity: 100, titleWeight: 'bold', descWeight: 'normal', fontFamily: 'mono', containerStyle: 'brutalist', backgroundTexture: 'grid' }
];

const Sidebar: React.FC = () => {
  const { 
    currentCategory, setCategory, isGenerating, isPublishing,
    gradientIndex, layoutType, headlineType, buttonStyle, buttonIcon, shadowStyle, accentOpacity, titleWeight, descWeight,
    fontFamily, containerStyle, backgroundTexture,
    presets, activePresetIndex, applyPreset, generatedProduct, updateProduct,
    setCustomization, saveToDrafts, downloadAsset, publishToGumroad,
    mcpServers, addMcpServer, toggleMcpServer, removeMcpServer,
    authorName, setAuthorName, brandLogo, setBrandLogo,
    heroBackgroundEffect,
    heroDitherIntensity,
    heroSplitTitleEnabled,
    heroGradientTitleEnabled,
    heroGlareCtaEnabled,
    addLog,
    setPreviewBlock
  } = useStore();

  type TabId = 'presets' | 'identity' | 'theme' | 'components' | 'library' | 'forge';
  const [activeTab, setActiveTab] = useState<TabId>('theme');
  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpUrl, setNewMcpUrl] = useState('');

  const [gumroadConnected, setGumroadConnected] = useState<boolean>(false);
  const [gumroadStatusLoading, setGumroadStatusLoading] = useState<boolean>(false);

  // V2.3 Agent Squad snapshot status (best-effort)
  const [marketSnapshotStatus, setMarketSnapshotStatus] = useState<'unknown' | 'missing' | 'cached' | 'updated' | 'error'>('unknown');
  const [marketSnapshotBusy, setMarketSnapshotBusy] = useState(false);
  const [marketSnapshotPath, setMarketSnapshotPath] = useState<string>('');

  // Forge: backend-configured MCP servers (stdio + sse)
  const [forgeServers, setForgeServers] = useState<{ id: string; label: string; kind: 'stdio' | 'sse' }[]>([]);
  const [forgeStatusById, setForgeStatusById] = useState<Record<string, 'unknown' | 'testing' | 'ready' | 'failed'>>({});
  const [forgeErrorById, setForgeErrorById] = useState<Record<string, string>>({});

  // MCP preview generator (Library tab)
  const [mcpPreviewServerId, setMcpPreviewServerId] = useState<'magicui' | 'magic' | 'shadcn'>('magicui');
  const [mcpPreviewTools, setMcpPreviewTools] = useState<{ name: string; description?: string }[]>([]);
  const [mcpPreviewTool, setMcpPreviewTool] = useState<string>('');
  const [mcpPreviewPrompt, setMcpPreviewPrompt] = useState<string>('');
  const [mcpPreviewBlockType, setMcpPreviewBlockType] = useState<ContentBlock['type']>('feature-grid');
  const [mcpPreviewBusy, setMcpPreviewBusy] = useState(false);

  // Component library cards (availability/status)
  const [availableStdioServers, setAvailableStdioServers] = useState<string[]>([]);
  const [availableSseServers, setAvailableSseServers] = useState<string[]>([]);

  useEffect(() => {
    if (activeTab !== 'library') return;

    (async () => {
      try {
        const stdio = await mcpStdioServers();
        setAvailableStdioServers((stdio.servers || []).map((s) => s.id));
      } catch {
        setAvailableStdioServers([]);
      }

      try {
        const sse = await mcpSseServers();
        setAvailableSseServers((sse.servers || []).map((s) => s.id));
      } catch {
        setAvailableSseServers([]);
      }
    })();
  }, [activeTab]);

  const loadMcpPreviewTools = async () => {
    setMcpPreviewBusy(true);
    try {
      const res = await mcpStdioListTools({ serverId: mcpPreviewServerId });
      const tools = (res?.tools || []) as { name: string; description?: string }[];
      setMcpPreviewTools(tools);
      if (!mcpPreviewTool && tools[0]?.name) setMcpPreviewTool(tools[0].name);
    } catch (e) {
      // best-effort; UI will stay empty
      setMcpPreviewTools([]);
    } finally {
      setMcpPreviewBusy(false);
    }
  };

  const generateMcpPreview = async () => {
    if (!mcpPreviewTool || !mcpPreviewPrompt.trim()) return;

    setMcpPreviewBusy(true);
    try {
      // 1) Call MCP tool
      const args =
        mcpPreviewServerId === 'magicui'
          ? {}
          : mcpPreviewServerId === 'shadcn'
            ? // shadcn registry search expects registries + query.
              { registries: ['@shadcn'], query: mcpPreviewPrompt, limit: 10 }
            : // 21st.dev magic tools expect { prompt, blockType } for our usage.
              { prompt: mcpPreviewPrompt, blockType: mcpPreviewBlockType };

      const result = await mcpStdioCall({
        serverId: mcpPreviewServerId,
        toolName: mcpPreviewTool,
        args,
      });

      const text = (result?.content || [])
        .filter((p: any) => p?.type === 'text')
        .map((p: any) => p.text)
        .join('\n')
        .trim();

      if (!generatedProduct) {
        setPreviewBlock({
          type: 'text',
          title: 'No product context',
          content: 'Generate a product first so we can format this preview for your page.',
        });
        return;
      }

      // 2) Convert MCP output into a marketing block for the canvas.
      const presetForFormat: StylePreset = {
        name: 'Current',
        gradientIndex,
        layoutType,
        headlineType,
        buttonStyle,
        buttonIcon,
        shadowStyle,
        accentOpacity,
        titleWeight,
        descWeight,
        fontFamily,
        containerStyle,
        backgroundTexture,
      };

      // Step logs
      addLog({
        id: Math.random().toString(36).slice(2),
        timestamp: new Date().toLocaleTimeString(),
        phase: 'OPTIMIZING',
        type: 'info',
        message: `AI: Formatting MCP output into ${mcpPreviewBlockType}…`,
      });

      let formattedBlock: Omit<ContentBlock, 'id'> | null = null;

      try {
        const formatted = await aiFormatMcpOutputServer({
          text: `USER GOAL: ${mcpPreviewPrompt}\n\nMCP OUTPUT:\n${text}`,
          targetBlockType: mcpPreviewBlockType,
          product: generatedProduct,
          preset: presetForFormat,
        });

        formattedBlock = {
          ...formatted.formattedBlock,
          type: (formatted.formattedBlock.type as any) || mcpPreviewBlockType,
        };
      } catch (e: any) {
        addLog({
          id: Math.random().toString(36).slice(2),
          timestamp: new Date().toLocaleTimeString(),
          phase: 'OPTIMIZING',
          type: 'warning',
          message: `AI formatting failed: ${e?.message || 'Unknown error'}. Using fallback block.`,
        });

        // Fallback: safe pricing block if user asked for pricing (or block type implies pricing)
        const isPricing = /pricing|tiers|3 tiers|price/i.test(mcpPreviewPrompt) || mcpPreviewBlockType === 'feature-grid';
        if (isPricing) {
          formattedBlock = {
            type: 'feature-grid',
            title: 'Choose Your Plan',
            items: [
              'Starter — best for beginners (core template + quickstart)',
              'Pro — most popular (everything in Starter + bonuses + updates)',
              'Studio — for teams (everything in Pro + license + priority support)',
            ],
          };
        } else {
          formattedBlock = {
            type: 'text',
            title: 'Generated Section (Fallback)',
            content: text || 'No output returned.',
          };
        }
      }

      if (formattedBlock) {
        setPreviewBlock(formattedBlock);
        addLog({
          id: Math.random().toString(36).slice(2),
          timestamp: new Date().toLocaleTimeString(),
          phase: 'OPTIMIZING',
          type: 'success',
          message: 'Canvas preview ready. Click Insert to apply.',
        });
      }
    } catch (e: any) {
      setPreviewBlock({
        type: 'text',
        title: 'MCP Preview Error',
        content: `Failed to generate preview: ${e?.message || 'Unknown error'}`,
      });
    } finally {
      setMcpPreviewBusy(false);
    }
  };

  

  const refreshGumroadStatus = async () => {
    setGumroadStatusLoading(true);
    try {
      const status = await gumroadStatus();
      setGumroadConnected(status.connected);
    } catch {
      setGumroadConnected(false);
    } finally {
      setGumroadStatusLoading(false);
    }
  };

  useEffect(() => {
    // Best-effort refresh on mount.
    refreshGumroadStatus();
  }, []);

  const refreshMarketSnapshot = useCallback(async (opts?: { force?: boolean }) => {
    if (!currentCategory) return;
    setMarketSnapshotBusy(true);
    try {
      const res = await agentsResearch(currentCategory, { force: !!opts?.force });
      const status = String((res as any)?.status || 'unknown') as any;
      setMarketSnapshotStatus(status);
      setMarketSnapshotPath(String((res as any)?.snapshotPath || ''));
    } catch {
      setMarketSnapshotStatus('error');
      setMarketSnapshotPath('');
    } finally {
      setMarketSnapshotBusy(false);
    }
  }, [currentCategory]);

  useEffect(() => {
    // Refresh snapshot status when category changes.
    if (!currentCategory) {
      setMarketSnapshotStatus('unknown');
      setMarketSnapshotPath('');
      return;
    }
    refreshMarketSnapshot({ force: false });
  }, [currentCategory]);

  useEffect(() => {
    if (activeTab !== 'forge') return;

    (async () => {
      try {
        const stdio = await mcpStdioServers();
        const sse = await mcpSseServers();
        const merged = [
          ...(stdio.servers || []).map((s) => ({ id: s.id, label: s.label, kind: 'stdio' as const })),
          ...(sse.servers || []).map((s) => ({ id: s.id, label: s.label, kind: 'sse' as const })),
        ];
        setForgeServers(merged);

        // optimistic: mark as unknown until tested
        setForgeStatusById((prev) => {
          const next = { ...prev };
          for (const s of merged) {
            if (!next[s.id]) next[s.id] = 'unknown';
          }
          return next;
        });
      } catch {
        setForgeServers([]);
      }
    })();
  }, [activeTab]);

  const testForgeServer = async (serverId: string, kind: 'stdio' | 'sse') => {
    setForgeStatusById((s) => ({ ...s, [serverId]: 'testing' }));
    setForgeErrorById((s) => ({ ...s, [serverId]: '' }));

    try {
      if (kind === 'stdio') {
        await mcpStdioListTools({ serverId });
      } else {
        await mcpSseListTools({ serverId });
      }
      setForgeStatusById((s) => ({ ...s, [serverId]: 'ready' }));
    } catch (e: any) {
      setForgeStatusById((s) => ({ ...s, [serverId]: 'failed' }));
      setForgeErrorById((s) => ({ ...s, [serverId]: e?.message || 'Failed' }));
    }
  };


  type McpStatus = 'unknown' | 'testing' | 'connected' | 'failed';
  const [mcpStatusById, setMcpStatusById] = useState<Record<string, McpStatus>>({});
  const [mcpErrorById, setMcpErrorById] = useState<Record<string, string>>({});

  const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

  const testMcpServer = async (id: string, url: string): Promise<boolean> => {
    setMcpStatusById((s) => ({ ...s, [id]: 'testing' }));
    setMcpErrorById((s) => ({ ...s, [id]: '' }));

    const base = normalizeBaseUrl(url);
    const endpoints = [
      `${base}/health`,
      `${base}/healthz`,
      `${base}/`,
    ];

    // Browsers can’t always call random servers due to CORS. We still try.
    // If all attempts fail, we mark as failed and show the last error.
    let lastErr = 'Unknown error';

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-store',
        });

        if (res.ok) {
          setMcpStatusById((s) => ({ ...s, [id]: 'connected' }));
          return true;
        }
        lastErr = `HTTP ${res.status} at ${endpoint}`;
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        lastErr = errorMessage;
      }
    }

    setMcpStatusById((s) => ({ ...s, [id]: 'failed' }));
    setMcpErrorById((s) => ({ ...s, [id]: lastErr }));
    return false;
  };

  const handleToggleMcp = async (id: string, url: string, currentlyActive: boolean) => {
    // If turning on: attempt handshake test first.
    if (!currentlyActive) {
      const ok = await testMcpServer(id, url);
      if (!ok) return;
    }
    toggleMcpServer(id);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBrandLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddMcp = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMcpName && newMcpUrl) {
      // We can't get the generated id from the store action, so we optimistically add and
      // let the user hit Test if needed.
      addMcpServer(newMcpName, newMcpUrl);
      setNewMcpName('');
      setNewMcpUrl('');
    }
  };

  const Tooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-1">
      <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-32 p-2 bg-slate-900 text-white text-[8px] rounded-lg shadow-xl z-50 leading-tight">
        {text}
      </div>
    </div>
  );

  const ComponentButton = ({ title, description, icon, onClick }: {
    title: string;
    description: string;
    icon: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="w-full p-3 text-left rounded-xl border-2 border-slate-100 bg-white hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="text-lg shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-900 group-hover:text-black">
            {title}
          </div>
          <div className="text-[9px] font-medium text-slate-500 mt-1 leading-tight">
            {description}
          </div>
        </div>
      </div>
    </button>
  );

  const handleComponentGeneration = async (componentType: string, blockType: ContentBlock['type']) => {
    if (!currentCategory || !generatedProduct) return;
    
    addLog({
      id: Math.random().toString(36).slice(2),
      timestamp: new Date().toLocaleTimeString(),
      phase: 'GENERATING',
      type: 'info',
      message: `Generating ${componentType} component...`,
    });

    // Use MCP integration based on category and component type
    const categoryMappings = {
      'AI_PROMPTS': {
        server: 'magicui',
        prompts: {
          'framework-showcase': 'Create a feature grid showcasing AI prompt framework capabilities: Chain-of-Thought reasoning, Few-shot learning, Role-based prompting, Output formatting, Error handling, Model optimization. Use technical but accessible language.',
          'technical-credibility': 'Build feature grid highlighting technical competencies: Multi-model testing (GPT-4, Claude 3.5, Gemini), Framework engineering, Quality metrics (85%+ improvement), Professional usage by developers.',
          'developer-testimonials': 'Generate testimonial section for AI prompt users showing specific results: "Increased content quality by 85%", "Saved 12 hours per week", "Generated $5K additional revenue". Include developer avatars and credentials.',
          'framework-pricing': 'Design 3-tier pricing for AI prompt frameworks: "Framework Essentials" ($19), "Pro Toolkit" ($49), "Master Collection" ($89) with clear feature differentiation and "Most Popular" badge on Pro tier.'
        }
      },
      'NOTION_TEMPLATES': {
        server: 'shadcn',
        prompts: {
          'database-showcase': 'Showcase Notion database capabilities: Task management with 15+ properties, Project tracking with timeline views, Goal tracking with progress formulas, Knowledge base with relations, Habit tracking with automation.',
          'productivity-benefits': 'Highlight productivity transformation: "Capture everything in one place", "Connect related information automatically", "Track progress with visual dashboards", "Collaborate seamlessly with teams", "Scale systems as you grow".',
          'setup-simplicity': 'Create step-by-step setup guide: "1. Duplicate template to your workspace", "2. Customize databases for your needs", "3. Set up automation formulas", "4. Import existing data", "5. Start organizing immediately".',
          'professional-testimonials': 'Create testimonials for Notion productivity users: business professionals, project managers, small business owners showing specific productivity improvements and time savings.'
        }
      }
      // Add other categories as needed
    };

    const mapping = categoryMappings[currentCategory as keyof typeof categoryMappings];
    if (!mapping) return;

    const prompt = mapping.prompts[componentType as keyof typeof mapping.prompts];
    if (!prompt) return;

    // Call the MCP preview generation with the appropriate prompt
    setMcpPreviewServerId(mapping.server as any);
    setMcpPreviewBlockType(blockType);
    setMcpPreviewPrompt(prompt);
    setMcpPreviewTool('create_pricing_component'); // Default tool, can be made dynamic
    
    // Trigger the generation
    await generateMcpPreview();
  };

  const libraryEmojis = ['✨', '🔥', '🚀', '💎', '🎉', '💡', '✅', '⚡️', '📦', '💻', '🛠️', '📊', '🧠', '🌈', '💰', '📅', '📝', '🔒', '🏆', '⭐'];
  const libraryComponents = [
    { type: 'feature-grid', label: 'Feature Grid', icon: Layout },
    { type: 'checklist', label: 'Checklist', icon: Package },
    { type: 'faq', label: 'FAQ Block', icon: HelpCircle },
    { type: 'stat-highlight', label: 'Stats Block', icon: Sparkles },
    { type: 'emoji-row', label: 'Emoji Banner', icon: Smile },
  ];

  const handleDragStart = (e: React.DragEvent, type: string, data?: any) => {
    e.dataTransfer.setData('type', type);
    if (data) e.dataTransfer.setData('data', JSON.stringify(data));
  };

  return (
    <aside className="w-80 h-screen fixed left-0 top-0 bg-white border-r-2 border-black overflow-y-auto z-40 flex flex-col scrollbar-hide">
      <div className="p-6 border-b-2 border-black bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="gg-platinum-shimmer bg-white/75 backdrop-blur-xl border border-slate-900/10 rounded-xl shadow-[0_18px_50px_rgba(2,6,23,0.14)] w-10 h-10 flex items-center justify-center overflow-hidden">
            {/* Brand logo (preferred). Place file at: public/brand_logo/brand-logo.png */}
            {brandLogo ? (
              <img src={brandLogo} alt="Brand logo" className="w-full h-full object-contain p-1" />
            ) : (
              <img src="/brand_logo/brand-logo.png" alt="Brand logo" className="w-full h-full object-contain p-1" />
            )}
          </div>
          <h2 className="font-black text-xl tracking-tight uppercase">Architect Panel</h2>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          {[
            { id: 'presets', icon: Wand2, label: 'Styles' },
            { id: 'identity', icon: User, label: 'Brand' },
            { id: 'theme', icon: Palette, label: 'Theme' },
            { id: 'components', icon: Package, label: 'Blocks' },
            { id: 'library', icon: Component, label: 'Assets' },
            { id: 'forge', icon: Link, label: 'Forge' }
          ].map((tab) => (
            <Button3D
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              title={tab.label}
              size="xs"
              variant={activeTab === tab.id ? 'chrome' : 'outline'}
              className={
                "flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all border-black/20 " +
                (activeTab === tab.id ? '' : 'text-slate-600')
              }
              aria-pressed={activeTab === tab.id}
            >
              <tab.icon className="w-4 h-4 mb-0.5" />
              <span className="text-[7px] font-black uppercase tracking-tighter">{tab.label}</span>
            </Button3D>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8 pb-32">
        {/* START HERE (always visible, top of sidebar content) */}
        <section className="space-y-4 gg-platinum-shimmer bg-white/70 backdrop-blur-xl border border-slate-900/10 rounded-2xl p-4 shadow-[0_18px_50px_rgba(2,6,23,0.14)]">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">START HERE!</h3>
          <div className="grid grid-cols-2 gap-2">
            {[TemplateCategory.AI_PROMPTS, TemplateCategory.NOTION_TEMPLATES, TemplateCategory.DIGITAL_PLANNERS, TemplateCategory.DESIGN_TEMPLATES].map((cat) => (
              <Button3D
                key={cat}
                onClick={() => setCategory(cat)}
                variant={currentCategory === cat ? 'chrome' : 'outline'}
                size="default"
                className={
                  "p-3 rounded-xl border-2 text-[9px] font-black uppercase tracking-widest w-full " +
                  (currentCategory === cat ? 'border-black' : 'border-black/20 bg-white')
                }
                aria-pressed={currentCategory === cat}
              >
                {cat.replace('_', ' ')}
              </Button3D>
            ))}
          </div>
        </section>

        {/* Advanced (collapsed by default): market snapshots and system operations */}
        <details className="rounded-2xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <summary className="cursor-pointer select-none p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-700">Advanced</div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Market Data</span>
          </summary>
          <div className="p-4 pt-0 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-700">Market Data</div>
              </div>
              <Button3D
                onClick={() => refreshMarketSnapshot({ force: true })}
                disabled={!currentCategory || marketSnapshotBusy}
                variant="outline"
                size="xs"
                className="border-black/20"
                title="Refresh snapshot status"
              >
                {marketSnapshotBusy ? 'Refreshing…' : 'Refresh'}
              </Button3D>
            </div>

          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-slate-500">Status</span>
            <span
              className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${
                marketSnapshotStatus === 'cached'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : marketSnapshotStatus === 'updated'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : marketSnapshotStatus === 'missing'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : marketSnapshotStatus === 'error'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {marketSnapshotStatus}
            </span>
          </div>

          {marketSnapshotPath ? (
            <div className="text-[9px] text-slate-500 font-mono truncate" title={marketSnapshotPath}>
              {marketSnapshotPath}
            </div>
          ) : null}

          <div className="text-[9px] text-slate-500 leading-snug">
            Snapshots power the V2.3 Agent Squad (when available). Missing means no snapshot file exists yet.
          </div>
          </div>
        </details>

        {/* PANEL 1: PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Globe className="w-3 h-3" /> Design Systems
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {STATIC_PRESETS.map((preset, i) => (
                  <button
                    key={preset.name}
                    onClick={() => setCustomization({ ...preset, activePresetIndex: -1 })}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      activePresetIndex === -1 && gradientIndex === preset.gradientIndex && layoutType === preset.layoutType ? 'border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'border-slate-100 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-[9px] font-black uppercase leading-tight line-clamp-1">{preset.name}</div>
                  </button>
                ))}
              </div>
            </section>
            
            {presets.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Neural Presets
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => applyPreset(i)}
                      className={`text-left p-3 rounded-xl border-2 transition-all group ${
                        activePresetIndex === i ? 'border-slate-400 bg-slate-200/40 text-slate-800' : 'border-slate-100 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="text-[9px] font-black uppercase leading-tight line-clamp-1">{preset.name}</div>
                    </button>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

        {/* PANEL 2: IDENTITY */}
        {activeTab === 'identity' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="space-y-6">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Brand DNA</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
                    <User className="w-3 h-3" /> Architect Name
                  </label>
                  <input 
                    type="text" 
                    value={authorName} 
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-black font-bold text-xs"
                    placeholder="e.g. Digital Studio"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Brand Asset
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {brandLogo ? <img src={brandLogo} className="w-full h-full object-cover" /> : <Plus className="w-4 h-4 text-slate-200" />}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <div className="w-full py-3 bg-white border-2 border-black rounded-xl text-[9px] font-black uppercase text-center hover:bg-slate-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        Inject Logo
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {generatedProduct && (
              <section className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Node Specs</h3>
                <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[8px] text-slate-400 space-y-2">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span>Title</span>
                    <span className="text-slate-200 truncate ml-4">{generatedProduct.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span>Price</span>
                    <span className="text-emerald-400">${generatedProduct.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="text-blue-400 uppercase">{generatedProduct.publishedStatus || 'draft'}</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* PANEL 3: THEME (TYPOGRAPHY & COLOR) */}
        {activeTab === 'theme' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="space-y-6">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <FontIcon className="w-3 h-3" /> Typography
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase text-slate-500">Font System</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['sans', 'serif', 'mono'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setCustomization({ fontFamily: f })}
                        className={`py-2 text-[9px] font-black uppercase rounded-lg border-2 transition-all ${fontFamily === f ? 'bg-black text-white border-black' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-slate-500">Title Weight</label>
                    <select 
                      value={titleWeight}
                      onChange={(e) => setCustomization({ titleWeight: e.target.value as FontWeight })}
                      className="w-full p-2 text-[10px] font-bold bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-black"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="black">Black</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-slate-500">Desc Weight</label>
                    <select 
                      value={descWeight}
                      onChange={(e) => setCustomization({ descWeight: e.target.value as FontWeight })}
                      className="w-full p-2 text-[10px] font-bold bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-black"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Canvas Modules (live preview on the canvas) */}
            <section className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Component className="w-3 h-3" /> Canvas Modules
              </h3>

              <div className="p-4 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-3">
                <div className="text-[9px] font-bold text-slate-500">
                  Toggle premium React components on the hero for instant visual differentiation.
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest">Hero Background</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{heroBackgroundEffect}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['none', 'lightrays', 'dither'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCustomization({ heroBackgroundEffect: opt })}
                        className={`py-2 text-[9px] font-black uppercase rounded-lg border-2 transition-all ${
                          heroBackgroundEffect === opt ? 'bg-black text-white border-black' : 'bg-white border-slate-200 hover:border-black'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {heroBackgroundEffect === 'dither' && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold uppercase text-slate-500">Dither Intensity</span>
                        <span className="text-[9px] font-black">{Math.round(heroDitherIntensity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={Math.round(heroDitherIntensity * 100)}
                        onChange={(e) => setCustomization({ heroDitherIntensity: parseInt(e.target.value, 10) / 100 })}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCustomization({ heroGradientTitleEnabled: !heroGradientTitleEnabled })}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${heroGradientTitleEnabled ? 'border-black bg-black text-white' : 'border-slate-200 bg-white text-slate-900 hover:border-black'}`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">Gradient Title</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${heroGradientTitleEnabled ? 'text-slate-200' : 'text-slate-400'}`}>{heroGradientTitleEnabled ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomization({ heroSplitTitleEnabled: !heroSplitTitleEnabled })}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${heroSplitTitleEnabled ? 'border-black bg-black text-white' : 'border-slate-200 bg-white text-slate-900 hover:border-black'}`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">Split Title (animation)</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${heroSplitTitleEnabled ? 'text-slate-200' : 'text-slate-400'}`}>{heroSplitTitleEnabled ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomization({ heroGlareCtaEnabled: !heroGlareCtaEnabled })}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${heroGlareCtaEnabled ? 'border-black bg-black text-white' : 'border-slate-200 bg-white text-slate-900 hover:border-black'}`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">CTA Glare Hover</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${heroGlareCtaEnabled ? 'text-slate-200' : 'text-slate-400'}`}>{heroGlareCtaEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </section>

            <section className="space-y-6 pt-4 border-t border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Target className="w-3 h-3" /> CTA Engine
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase text-slate-500">Button Label</label>
                  <input 
                    type="text" 
                    value={generatedProduct?.callToAction || ''}
                    onChange={(e) => updateProduct({ callToAction: e.target.value })}
                    className="w-full p-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase outline-none focus:border-black"
                    placeholder="e.g. I WANT THIS!"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase text-slate-500">Button Shape</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['rounded', 'square', 'pill', 'outline'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setCustomization({ buttonStyle: s })}
                        className={`py-2 text-[9px] font-black uppercase rounded-lg border-2 transition-all ${buttonStyle === s ? 'bg-black text-white border-black shadow-md' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6 pt-4 border-t border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Droplets className="w-3 h-3" /> Color & Effects
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase text-slate-500">Accent Spectrum</label>
                  <div className="flex gap-2">
                    {[
                      'from-slate-200 via-slate-400 to-slate-200',
                      'from-slate-200 via-slate-400 to-slate-200',
                      'from-emerald-400 to-teal-600',
                      'from-indigo-600 to-violet-700'
                    ].map((grad, i) => (
                      <button
                        key={i}
                        onClick={() => setCustomization({ gradientIndex: i })}
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${grad} border-2 transition-all ${
                          gradientIndex === i ? 'border-black scale-110 shadow-lg' : 'border-transparent opacity-60'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold uppercase text-slate-500">Accent Opacity</label>
                    <span className="text-[9px] font-black">{accentOpacity}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={accentOpacity} 
                    onChange={(e) => setCustomization({ accentOpacity: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase text-slate-500">Shadow Profile</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['subtle', 'deep', 'neumorphic'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setCustomization({ shadowStyle: s })}
                        className={`py-2 text-[9px] font-bold rounded-lg border-2 transition-all ${
                          shadowStyle === s ? 'bg-black text-white border-black' : 'bg-white border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase text-slate-500">Node Texture</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['none', 'dots', 'grid', 'mesh'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setCustomization({ backgroundTexture: t })}
                        className={`py-2 text-[8px] font-black uppercase rounded-lg border-2 transition-all ${
                          backgroundTexture === t ? 'bg-black text-white border-black' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* PANEL 4: COMPONENTS */}
        {activeTab === 'components' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-lg font-bold text-slate-900">Curated Components</h3>
            <p className="text-sm text-slate-600">
              Category-specific components that enhance your product with proven conversion elements.
            </p>
            
            {/* Category-Specific Component Buttons */}
            {currentCategory === 'AI_PROMPTS' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">AI Prompts Components</h4>
                <div className="grid gap-2">
                  <ComponentButton
                    title="Framework Showcase"
                    description="Display prompt frameworks with before/after examples"
                    icon="⚡"
                    onClick={() => handleComponentGeneration('framework-showcase', 'feature-grid')}
                  />
                  <ComponentButton
                    title="Technical Credibility"
                    description="Multi-model compatibility and testing proof"
                    icon="🔧"
                    onClick={() => handleComponentGeneration('technical-credibility', 'feature-grid')}
                  />
                  <ComponentButton
                    title="Developer Testimonials"
                    description="Technical user success stories and results"
                    icon="👥"
                    onClick={() => handleComponentGeneration('developer-testimonials', 'testimonial')}
                  />
                  <ComponentButton
                    title="3-Tier Framework Pricing"
                    description="Essential → Pro → Master collection pricing"
                    icon="💎"
                    onClick={() => handleComponentGeneration('framework-pricing', 'pricing')}
                  />
                </div>
              </div>
            )}

            {currentCategory === 'NOTION_TEMPLATES' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Notion Templates Components</h4>
                <div className="grid gap-2">
                  <ComponentButton
                    title="Database Showcase"
                    description="Display Notion database capabilities and views"
                    icon="📊"
                    onClick={() => handleComponentGeneration('database-showcase', 'feature-grid')}
                  />
                  <ComponentButton
                    title="Productivity Benefits"
                    description="Workflow transformation and time savings"
                    icon="⚡"
                    onClick={() => handleComponentGeneration('productivity-benefits', 'feature-grid')}
                  />
                  <ComponentButton
                    title="Setup Simplicity"
                    description="5-minute setup process demonstration"
                    icon="🚀"
                    onClick={() => handleComponentGeneration('setup-simplicity', 'checklist')}
                  />
                  <ComponentButton
                    title="Professional Testimonials"
                    description="Business user success stories and metrics"
                    icon="⭐"
                    onClick={() => handleComponentGeneration('professional-testimonials', 'testimonial')}
                  />
                </div>
              </div>
            )}

            {currentCategory === 'DIGITAL_PLANNERS' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Digital Planners Components</h4>
                <div className="grid gap-2">
                  <ComponentButton
                    title="Aesthetic Gallery"
                    description="Beautiful planner layouts and style variations"
                    icon="🎨"
                    onClick={() => handleComponentGeneration('aesthetic-gallery', 'gallery')}
                  />
                  <ComponentButton
                    title="Lifestyle Benefits"
                    description="Daily inspiration and planning motivation"
                    icon="✨"
                    onClick={() => handleComponentGeneration('lifestyle-benefits', 'feature-grid')}
                  />
                  <ComponentButton
                    title="App Compatibility"
                    description="GoodNotes, Notability, and iPad optimization"
                    icon="📱"
                    onClick={() => handleComponentGeneration('app-compatibility', 'feature-grid')}
                  />
                  <ComponentButton
                    title="Creative Community"
                    description="User-generated content and inspiration"
                    icon="💝"
                    onClick={() => handleComponentGeneration('creative-community', 'testimonial')}
                  />
                </div>
              </div>
            )}

            {currentCategory === 'DESIGN_TEMPLATES' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Design Templates Components</h4>
                <div className="grid gap-2">
                  <ComponentButton
                    title="Agency ROI Calculator"
                    description="Time savings and revenue impact demonstration"
                    icon="📈"
                    onClick={() => handleComponentGeneration('agency-roi', 'stat-highlight')}
                  />
                  <ComponentButton
                    title="Platform Compatibility"
                    description="Figma, Adobe, Canva, PowerPoint support"
                    icon="🔗"
                    onClick={() => handleComponentGeneration('platform-compatibility', 'feature-grid')}
                  />
                  <ComponentButton
                    title="Professional Testimonials"
                    description="Agency success stories and case studies"
                    icon="🏆"
                    onClick={() => handleComponentGeneration('professional-testimonials', 'testimonial')}
                  />
                  <ComponentButton
                    title="Commercial License"
                    description="Client project rights and usage clarity"
                    icon="⚖️"
                    onClick={() => handleComponentGeneration('commercial-license', 'feature-grid')}
                  />
                </div>
              </div>
            )}

            {!currentCategory && (
              <div className="text-center py-8 text-slate-500">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a product category to see curated components</p>
              </div>
            )}
          </div>
        )}

        {/* PANEL 5: LIBRARY (ASSETS & COMPONENTS) */}
        {activeTab === 'library' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Component className="w-3 h-3" /> Component Libraries
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {/* Magic UI */}
                <div className="p-4 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest">Magic UI</div>
                      <div className="text-[9px] font-bold text-slate-500 mt-1">Layout-focused components via local MCP (stdio).</div>
                      <div className="mt-2 text-[8px] font-mono text-slate-400">
                        Server: <span className="font-black">magicui</span>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${availableStdioServers.includes('magicui') ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {availableStdioServers.includes('magicui') ? 'READY' : 'UNAVAILABLE'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMcpPreviewServerId('magicui')}
                      className="px-3 py-2 rounded-xl border-2 border-black text-[9px] font-black uppercase tracking-widest"
                    >
                      Select
                    </button>
                    <button
                      type="button"
                      onClick={loadMcpPreviewTools}
                      disabled={mcpPreviewBusy || !availableStdioServers.includes('magicui')}
                      className="px-3 py-2 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      Load tools
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[{
                      label: 'Pricing',
                      type: 'feature-grid' as ContentBlock['type'],
                      prompt: 'Create a premium pricing section with 3 tiers, strong value bullets, and a risk reversal.',
                    }, {
                      label: 'Testimonials',
                      type: 'stat-highlight' as ContentBlock['type'],
                      prompt: 'Create a testimonials/proof section with 3 short customer quotes and a credibility headline.',
                    }].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setMcpPreviewServerId('magicui');
                          setMcpPreviewBlockType(p.type);
                          setMcpPreviewPrompt(p.prompt);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[9px] font-black uppercase tracking-widest hover:border-black"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 21st.dev Magic */}
                <div className="p-4 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest">21st.dev Magic</div>
                      <div className="text-[9px] font-bold text-slate-500 mt-1">Premium sections via local MCP (stdio). Requires <span className="font-mono">MAGIC_API_KEY</span>.</div>
                      <div className="mt-2 text-[8px] font-mono text-slate-400">
                        Server: <span className="font-black">magic</span>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${availableStdioServers.includes('magic') ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 border-amber-500/20'}`}>
                      {availableStdioServers.includes('magic') ? 'READY' : 'NEEDS KEY'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMcpPreviewServerId('magic')}
                      className="px-3 py-2 rounded-xl border-2 border-black text-[9px] font-black uppercase tracking-widest"
                    >
                      Select
                    </button>
                    <button
                      type="button"
                      onClick={loadMcpPreviewTools}
                      disabled={mcpPreviewBusy || !availableStdioServers.includes('magic')}
                      className="px-3 py-2 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      Load tools
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[{
                      label: 'Hero',
                      type: 'text' as ContentBlock['type'],
                      prompt: 'Write a brutally high-converting hero section: headline, subheadline, bullets, and CTA. Keep it punchy and premium.',
                    }, {
                      label: 'FAQ',
                      type: 'faq' as ContentBlock['type'],
                      prompt: 'Generate an FAQ block that handles objections: time, skill level, refunds/guarantee, and what is included.',
                    }].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setMcpPreviewServerId('magic');
                          setMcpPreviewBlockType(p.type);
                          setMcpPreviewPrompt(p.prompt);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[9px] font-black uppercase tracking-widest hover:border-black"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* shadcn / React Bits */}
                <div className="p-4 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest">shadcn MCP / React Bits</div>
                      <div className="text-[9px] font-bold text-slate-500 mt-1">Browse/install components from registries (configure <span className="font-mono">components.json</span>).</div>
                      <div className="mt-2 text-[8px] font-mono text-slate-400">
                        Server: <span className="font-black">shadcn</span>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${availableStdioServers.includes('shadcn') ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {availableStdioServers.includes('shadcn') ? 'READY' : 'UNAVAILABLE'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMcpPreviewServerId('shadcn')}
                      className="px-3 py-2 rounded-xl border-2 border-black text-[9px] font-black uppercase tracking-widest"
                    >
                      Select
                    </button>
                    <button
                      type="button"
                      onClick={loadMcpPreviewTools}
                      disabled={mcpPreviewBusy || !availableStdioServers.includes('shadcn')}
                      className="px-3 py-2 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      Load tools
                    </button>
                  </div>

                  <div className="mt-3 text-[9px] font-bold text-slate-500">
                    Tip: add the React Bits registry to <span className="font-mono">components.json</span> then use shadcn MCP tools to install components into the repo.
                  </div>
                </div>

                {/* Unframer */}
                <div className="p-4 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] opacity-80">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest">Unframer (SSE)</div>
                      <div className="text-[9px] font-bold text-slate-500 mt-1">Hosted MCP. Requires <span className="font-mono">MCP_UNFRAMER_SSE_URL</span>.</div>
                      <div className="mt-2 text-[8px] font-mono text-slate-400">
                        Server: <span className="font-black">unframer</span>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${availableSseServers.includes('unframer') ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 border-amber-500/20'}`}>
                      {availableSseServers.includes('unframer') ? 'AVAILABLE' : 'NEEDS URL'}
                    </span>
                  </div>

                  <div className="mt-3 text-[9px] font-bold text-slate-500">
                    SSE tool browsing is available via backend endpoints. If tools fail to load, check backend env and Unframer URL.
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Component className="w-3 h-3" /> MCP Component Preview
              </h3>

              <div className="p-4 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <div className="text-[9px] font-bold text-slate-500">
                  Generate a section via MCP and preview it on the canvas. Use the canvas preview Insert button to commit it.
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Server (stdio)</div>
                  <select
                    value={mcpPreviewServerId}
                    onChange={(e) => {
                      setMcpPreviewServerId(e.target.value as any);
                      setMcpPreviewTools([]);
                      setMcpPreviewTool('');
                    }}
                    className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                  >
                    <option value="magicui">magicui</option>
                    <option value="magic">@21st-dev/magic</option>
                    <option value="shadcn">shadcn</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Tool</div>
                    <button
                      type="button"
                      onClick={loadMcpPreviewTools}
                      disabled={mcpPreviewBusy}
                      className="px-3 py-2 rounded-xl border-2 border-black text-[9px] font-black uppercase tracking-widest"
                    >
                      Load tools
                    </button>
                  </div>

                  <select
                    value={mcpPreviewTool}
                    onChange={(e) => setMcpPreviewTool(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                  >
                    <option value="">Select a tool…</option>
                    {mcpPreviewTools.map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Block type</div>
                  <select
                    value={mcpPreviewBlockType}
                    onChange={(e) => setMcpPreviewBlockType(e.target.value as any)}
                    className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                  >
                    {['text','feature-grid','faq','checklist','stat-highlight','emoji-row'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Prompt</div>
                  <textarea
                    value={mcpPreviewPrompt}
                    onChange={(e) => setMcpPreviewPrompt(e.target.value)}
                    rows={4}
                    placeholder="e.g., Create a premium pricing section with 3 tiers, strong value bullets, and a risk reversal"
                    className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewBlock(null)}
                    className="px-3 py-2 rounded-xl border-2 border-black text-[9px] font-black uppercase tracking-widest"
                  >
                    Clear preview
                  </button>
                  <button
                    type="button"
                    onClick={generateMcpPreview}
                    disabled={mcpPreviewBusy || !mcpPreviewTool || !mcpPreviewPrompt.trim()}
                    className="px-3 py-2 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {mcpPreviewBusy ? 'Working…' : 'Generate preview'}
                  </button>
                </div>

                <div className="text-[9px] text-slate-500 font-bold">
                  Tip: For best results use Magic UI for layout blocks and 21st-dev/magic for premium copy/sections.
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Grid className="w-3 h-3" /> CTA Icons
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cart', icon: ShoppingCart },
                  { id: 'download', icon: DownloadCloud },
                  { id: 'unlock', icon: LockOpen },
                  { id: 'zap', icon: Zap }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCustomization({ buttonIcon: item.id as ButtonIconType })}
                    className={`p-3 flex items-center justify-center rounded-xl border-2 transition-all ${
                      buttonIcon === item.id ? 'bg-black text-white border-black shadow-lg scale-105' : 'bg-slate-50 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* PANEL 5: FORGE (MCP & INTEGRATIONS) */}
        {activeTab === 'forge' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="space-y-6">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Connect External Nodes
              </h3>

              {/* Gumroad connection */}
              <div className="p-4 bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest">Gumroad</div>
                    <div className="text-[9px] font-bold text-slate-500 mt-1">
                      Status: {gumroadStatusLoading ? 'Checking…' : gumroadConnected ? 'Connected' : 'Not connected'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={refreshGumroadStatus}
                      className="px-3 py-2 rounded-xl border-2 border-black bg-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-50"
                      disabled={gumroadStatusLoading}
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(gumroadConnectUrl(), '_blank', 'noopener,noreferrer')}
                      className="px-3 py-2 rounded-xl bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-800"
                    >
                      {gumroadConnected ? 'Reconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-[9px] text-slate-500 font-bold leading-snug">
                  Tip: if Publish says not connected, hit Connect, finish OAuth, then click Refresh.
                </div>
              </div>
              
              {/* Configured MCP servers (from backend env). These are the real integrations. */}
              <div className="space-y-3">
                {forgeServers.map((s) => {
                  const st = forgeStatusById[s.id] || 'unknown';
                  const err = forgeErrorById[s.id];

                  const pill =
                    st === 'ready' ? 'READY' :
                    st === 'testing' ? 'TESTING' :
                    st === 'failed' ? 'FAILED' :
                    'UNKNOWN';

                  const pillClass =
                    st === 'ready' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                    st === 'testing' ? 'bg-slate-200/30 text-slate-200 border-slate-400/30' :
                    st === 'failed' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
                    'bg-slate-700/40 text-slate-300 border-slate-600/40';

                  return (
                    <div key={s.id} className="p-4 bg-slate-900 text-white rounded-2xl border-2 border-transparent hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                              {s.label}
                            </span>
                            <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${pillClass}`}>
                              {pill}
                            </span>
                            <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-black/30 border-white/10 text-slate-300">
                              {s.kind}
                            </span>
                          </div>
                          {st === 'failed' && err ? (
                            <div className="mt-1 text-[8px] text-red-300/80 font-mono truncate" title={err}>
                              {err}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => testForgeServer(s.id, s.kind)}
                            disabled={st === 'testing'}
                            className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all disabled:opacity-50 text-[9px] font-black uppercase tracking-widest"
                          >
                            Test
                          </button>
                        </div>
                      </div>

                      <div className="text-[7px] text-slate-500 font-mono bg-black/30 p-1.5 rounded-md truncate">
                        Source: backend env ({s.kind})
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom/remote MCP modules (browser-tested; may fail due to CORS). */}
              <div className="space-y-3 pt-4 border-t border-slate-800/40">
                <div className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Custom MCP URLs (advanced)</div>
                {mcpServers.map((mcp) => {
                  const status = mcpStatusById[mcp.id] || 'unknown';
                  const error = mcpErrorById[mcp.id];

                  const statusLabel =
                    status === 'connected' ? 'CONNECTED' :
                    status === 'testing' ? 'TESTING' :
                    status === 'failed' ? 'FAILED' :
                    'UNKNOWN';

                  const statusClass =
                    status === 'connected' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                    status === 'testing' ? 'bg-slate-200/30 text-slate-200 border-slate-400/30' :
                    status === 'failed' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
                    'bg-slate-700/40 text-slate-300 border-slate-600/40';

                  return (
                    <div key={mcp.id} className="p-4 bg-slate-900 text-white rounded-2xl border-2 border-transparent hover:border-slate-400 transition-all group">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                              {mcp.name} {mcp.active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            </span>
                            <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          {status === 'failed' && error ? (
                            <div className="mt-1 text-[8px] text-red-300/80 font-mono truncate" title={error}>
                              {error}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => testMcpServer(mcp.id, mcp.url)}
                            disabled={status === 'testing'}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all disabled:opacity-50"
                            title="Test connection"
                          >
                            <Zap className={`w-3 h-3 ${status === 'testing' ? 'animate-spin text-slate-300' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleMcp(mcp.id, mcp.url, mcp.active)}
                            className={`p-1.5 rounded-lg transition-all ${mcp.active ? 'bg-emerald-500' : 'bg-slate-800 text-slate-500'}`}
                            title={mcp.active ? 'Disconnect' : 'Connect'}
                          >
                            <Link className="w-3 h-3" />
                          </button>

                          <button onClick={() => removeMcpServer(mcp.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <span className="text-[7px] text-slate-500 truncate block font-mono bg-black/30 p-1.5 rounded-md">{mcp.url}</span>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleAddMcp} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-3">
                <h4 className="text-[8px] font-black uppercase text-slate-400">Sync New Module</h4>
                <input 
                  value={newMcpName} 
                  onChange={(e) => setNewMcpName(e.target.value)}
                  placeholder="Module Name" 
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[9px] font-bold outline-none focus:border-black" 
                />
                <input 
                  value={newMcpUrl} 
                  onChange={(e) => setNewMcpUrl(e.target.value)}
                  placeholder="https://example-mcp-server" 
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[9px] font-mono outline-none focus:border-black" 
                />
                <button type="submit" className="w-full py-2 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5">Initialize Handshake</button>
              </form>
            </section>
          </div>
        )}
      </div>

      {/* Persistence Controls */}
      <div className="p-6 bg-slate-50 border-t-2 border-black sticky bottom-0 z-20 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button3D
            onClick={saveToDrafts}
            disabled={!generatedProduct || isPublishing}
            variant="outline"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-black/20 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </Button3D>
          <Button3D
            onClick={downloadAsset}
            disabled={!generatedProduct || isPublishing}
            variant="outline"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-black/20 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> Manifest
          </Button3D>
        </div>
        <Button3D
          onClick={publishToGumroad}
          disabled={!generatedProduct || isPublishing}
          variant="chrome"
          stretch
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {isPublishing ? <Zap className="w-4 h-4 animate-spin text-slate-300" /> : <Rocket className="w-4 h-4 group-hover:scale-110 group-hover:text-slate-700 transition-all" />}
          {generatedProduct?.publishedStatus === 'published' ? 'Update Gumroad' : 'Publish Product'}
        </Button3D>
      </div>
    </aside>
  );
};

export default Sidebar;
