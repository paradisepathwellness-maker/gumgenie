import React, { useMemo, useRef, useState } from 'react';
import { Check, Star, ShoppingCart, Download, LockOpen, Zap, ChevronDown, HelpCircle, Trophy, ListChecks, Trash2, GripVertical, Plus, ExternalLink, Info, Layers, Layout, Package, Smile, Sparkles, DownloadCloud, Wand2, RefreshCw } from 'lucide-react';
import { AiSuggestion, Product, HeadlineType, ButtonIconType, ContentBlock, ShadowStyle, ButtonStyle, StylePreset } from '../types';
import { useStore } from '../store';
import { enhanceContent, regenerateSection } from '../services/geminiService';
import { aiFormatBlockServer, mcpGenerateBlock, mcpListTools, mcpSseCall, mcpSseListTools, mcpSseServers, mcpStdioCall, mcpStdioListTools, mcpStdioServers } from '../services/apiClient';
import { formatBlockForLayoutClient } from '../services/aiLayoutAssistant';
import DynamicIcon from './DynamicIcon';
import GradientText from './reactbits/GradientText';
import GlareHover from './reactbits/GlareHover';
import LightRays from './reactbits/LightRays';
import SplitText from './reactbits/SplitText';
import DitherBackground from './reactbits/DitherBackground';
import PricingTiersSection from './canvas/PricingTiersSection';
import ThreeTierPricingGuide from './canvas/ThreeTierPricingGuide';

interface Props {
  product: Product;
}

const ProductPreview: React.FC<Props> = ({ product }) => {
  const { 
    gradientIndex, layoutType, headlineType, buttonStyle, buttonIcon, shadowStyle, accentOpacity, titleWeight, descWeight,
    fontFamily, containerStyle, backgroundTexture,
    mcpServers,
    previewBlock,
    commitPreviewBlock,
    setPreviewBlock,
    heroBackgroundEffect,
    heroDitherIntensity,
    heroSplitTitleEnabled,
    heroGradientTitleEnabled,
    heroGlareCtaEnabled,
    addContentBlock, removeContentBlock, updateContentBlock, updateProduct, addLog
  } = useStore();
  
  const descRef = useRef<HTMLDivElement>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  // MCP → Canvas generator
  const activeMcpServers = useMemo(() => mcpServers.filter((s) => s.active), [mcpServers]);

  const [showMcpModal, setShowMcpModal] = useState(false);
  const [mcpMode, setMcpMode] = useState<'ws' | 'stdio' | 'sse'>('stdio');
  const [stdioServers, setStdioServers] = useState<{ id: string; label: string }[]>([]);
  const [stdioSelectedServerId, setStdioSelectedServerId] = useState<string>('shadcn');
  const [sseServers, setSseServers] = useState<{ id: string; label: string }[]>([]);
  const [sseSelectedServerId, setSseSelectedServerId] = useState<string>('unframer');

  const [mcpSelectedServerUrl, setMcpSelectedServerUrl] = useState<string>('');
  const [mcpTools, setMcpTools] = useState<{ name: string; description?: string }[]>([]);
  const [mcpSelectedTool, setMcpSelectedTool] = useState<string>('');
  const [mcpPrompt, setMcpPrompt] = useState<string>('');
  const [mcpBlockType, setMcpBlockType] = useState<ContentBlock['type']>('text');
  const [mcpBusy, setMcpBusy] = useState(false);

  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [showRecommendations, setShowRecommendations] = useState<string | null>(null);

  const currentPresetForAi: StylePreset = useMemo(() => ({
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
  }), [
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
  ]);

  const openMcpModal = async () => {
    setShowMcpModal(true);

    // Default: stdio mode with shadcn.
    try {
      const res = await mcpStdioServers();
      setStdioServers(res.servers || []);
      if (res.servers?.[0]?.id && !stdioSelectedServerId) setStdioSelectedServerId(res.servers[0].id);
    } catch {
      // ignore
    }

    // Load SSE servers (Unframer)
    try {
      const res = await mcpSseServers();
      setSseServers(res.servers || []);
      if (res.servers?.[0]?.id && !sseSelectedServerId) setSseSelectedServerId(res.servers[0].id);
    } catch {
      // ignore
    }

    // default server selection for ws mode
    if (!mcpSelectedServerUrl && activeMcpServers.length > 0) {
      setMcpSelectedServerUrl(activeMcpServers[0].url);
    }
  };

  const loadMcpTools = async () => {
    setMcpBusy(true);
    addLog({ id: Math.random().toString(), message: 'MCP: Listing tools…', timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'info' });
    try {
      if (mcpMode === 'stdio') {
        const res = await mcpStdioListTools({ serverId: stdioSelectedServerId });
        setMcpTools(res.tools || []);
        if (!mcpSelectedTool && res.tools?.[0]?.name) setMcpSelectedTool(res.tools[0].name);
        addLog({ id: Math.random().toString(), message: `MCP(stdio): Found ${res.tools?.length || 0} tools.`, timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'success' });
      } else if (mcpMode === 'sse') {
        const res = await mcpSseListTools({ serverId: sseSelectedServerId });
        setMcpTools(res.tools || []);
        if (!mcpSelectedTool && res.tools?.[0]?.name) setMcpSelectedTool(res.tools[0].name);
        addLog({ id: Math.random().toString(), message: `MCP(sse): Found ${res.tools?.length || 0} tools.`, timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'success' });
      } else {
        if (!mcpSelectedServerUrl) throw new Error('No MCP server URL selected');
        const res = await mcpListTools({ serverUrl: mcpSelectedServerUrl });
        setMcpTools(res.tools || []);
        if (!mcpSelectedTool && res.tools?.[0]?.name) setMcpSelectedTool(res.tools[0].name);
        addLog({ id: Math.random().toString(), message: `MCP(ws): Found ${res.tools?.length || 0} tools.`, timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'success' });
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      addLog({ id: Math.random().toString(), message: `MCP tools failed: ${errorMessage}`, timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'error' });
    } finally {
      setMcpBusy(false);
    }
  };

  const generateBlockViaMcp = async () => {
    if (!mcpSelectedTool || !mcpPrompt.trim()) return;
    if (mcpMode === 'ws' && !mcpSelectedServerUrl) return;

    setMcpBusy(true);
    addLog({ id: Math.random().toString(), message: 'MCP: Generating section…', timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'info' });

    try {
      let block: Omit<ContentBlock, 'id'>;

      if (mcpMode === 'stdio') {
        const result = await mcpStdioCall({
          serverId: stdioSelectedServerId,
          toolName: mcpSelectedTool,
          args: { prompt: mcpPrompt, blockType: mcpBlockType },
        });

        const text = (result?.content || [])
          .filter((p: any) => p?.type === 'text')
          .map((p: any) => p.text)
          .join('\\n')
          .trim();

        block = {
          type: mcpBlockType,
          title: mcpBlockType !== 'text' ? 'Generated Section' : undefined,
          content: text || 'Generated content (empty response).',
        };
      } else if (mcpMode === 'sse') {
        const result = await mcpSseCall({
          serverId: sseSelectedServerId,
          toolName: mcpSelectedTool,
          args: { prompt: mcpPrompt, blockType: mcpBlockType },
        });

        const text = (result?.content || [])
          .filter((p: any) => p?.type === 'text')
          .map((p: any) => p.text)
          .join('\\n')
          .trim();

        block = {
          type: mcpBlockType,
          title: mcpBlockType !== 'text' ? 'Generated Section' : undefined,
          content: text || 'Generated content (empty response).',
        };
      } else {
        const result = await mcpGenerateBlock({
          serverUrl: mcpSelectedServerUrl,
          toolName: mcpSelectedTool,
          prompt: mcpPrompt,
          blockType: mcpBlockType,
        });
        block = result.block;
      }

      addLog({ id: Math.random().toString(), message: 'AI: Formatting block for layout (client)…', timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'info' });

      let formatted = block;
      let suggestionsCombined: AiSuggestion[] = [];

      try {
        const clientResult = await formatBlockForLayoutClient({
          product,
          preset: currentPresetForAi,
          block,
        });
        formatted = clientResult.formattedBlock;
        suggestionsCombined = [...suggestionsCombined, ...(clientResult.suggestions || [])];
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        addLog({ id: Math.random().toString(), message: `AI client format failed: ${errorMessage}`, timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'warning' });
      }

      addLog({ id: Math.random().toString(), message: 'AI: Formatting block for layout (server)…', timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'info' });

      try {
        const serverResult = await aiFormatBlockServer({
          product,
          preset: currentPresetForAi,
          block: formatted,
        });
        formatted = serverResult.formattedBlock;
        suggestionsCombined = [...suggestionsCombined, ...(serverResult.suggestions || [])];
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        addLog({ id: Math.random().toString(), message: `AI server format failed: ${errorMessage}`, timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'warning' });
      }

      addContentBlock(formatted);
      setAiSuggestions(suggestionsCombined.slice(0, 12));

      addLog({ id: Math.random().toString(), message: 'Canvas: Block inserted + formatted.', timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'success' });

      setShowMcpModal(false);
      setMcpPrompt('');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      addLog({ id: Math.random().toString(), message: `MCP generate failed: ${errorMessage}`, timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'error' });
    } finally {
      setMcpBusy(false);
    }
  };

  const gradients = [
    'from-[#0066FF] via-[#7B61FF] to-[#FF33CC]',
    'from-[#FF1F7D] via-[#FF4D4D] to-[#FF8C00]',
    'from-[#00D4FF] via-[#00FFA3] to-[#00E5FF]',
    'from-[#6366F1] via-[#A855F7] to-[#EC4899]'
  ];

  const borderGradients = [
    'border-[#7B61FF]',
    'border-[#FF4D4D]',
    'border-[#00FFA3]',
    'border-[#A855F7]'
  ];

  const shadowClasses = { subtle: 'shadow-[0_4px_12px_rgba(0,0,0,0.05)]', deep: 'shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)]', neumorphic: 'shadow-[10px_10px_20px_#d1d1d1,-10px_-10px_20px_#ffffff]' };
  const weightClasses = { normal: 'font-normal', bold: 'font-bold', black: 'font-black' };

  const buttonShapeClasses: Record<ButtonStyle, string> = {
    rounded: 'rounded-xl',
    square: 'rounded-none',
    pill: 'rounded-full',
    outline: 'rounded-xl border-2 bg-transparent'
  };

  const currentGradient = gradients[gradientIndex];
  const currentBorder = borderGradients[gradientIndex];
  const opacityStyle = { opacity: accentOpacity / 100 };

  const SelectedIcon = ({ className }: { className?: string }) => {
    const Icon = { cart: ShoppingCart, download: DownloadCloud, unlock: LockOpen, zap: Zap }[buttonIcon] || ShoppingCart;
    return <Icon className={className} />;
  };

  const handleEnhance = async (target: string, id?: string) => {
    setAiLoading(id || target);
    addLog({ id: Math.random().toString(), message: `AI Agent: Polishing ${target}...`, timestamp: new Date().toLocaleTimeString(), phase: 'OPTIMIZING', type: 'info' });
    try {
      if (target === 'title') {
        const result = await enhanceContent(product.title, `Product Title for ${product.category}`);
        updateProduct({ title: result });
      } else if (target === 'description') {
        const result = await enhanceContent(product.description, `Description for ${product.title}`);
        updateProduct({ description: result });
      } else if (id) {
        const block = product.contentBlocks.find(b => b.id === id);
        if (block) {
          const result = await enhanceContent(block.content || '', `Content Block: ${block.title}`);
          updateContentBlock(id, { content: result });
        }
      }
    } finally {
      setAiLoading(null);
    }
  };

  const handleRegenerate = async (id: string) => {
    setAiLoading(id);
    const block = product.contentBlocks.find(b => b.id === id);
    if (!block) return;
    try {
      const result = await regenerateSection(block.type, `Section: ${block.title} for ${product.title}`);
      updateContentBlock(id, { ...result });
    } finally {
      setAiLoading(null);
    }
  };

  const getSmartRecommendations = (target: string, currentContent: string): string[] => {
    const category = product.category;
    
    const recommendations = {
      AI_PROMPTS: {
        title: [
          "AI Framework Mastery Collection: 200+ Enterprise-Grade Prompts for $89",
          "Professional Prompt Engineering Toolkit: Systematic AI Workflows",
          "ChatGPT Master Collection: Framework-Based Prompt Systems"
        ],
        description: [
          "Transform from trial-and-error prompting to systematic, professional-grade AI interactions that guarantee 85%+ better output quality across GPT-4, Claude 3.5, and Gemini Pro.",
          "Join 5,000+ developers and content creators who use our framework-based approach to generate consistent, high-quality AI outputs in minutes instead of hours.",
          "Professional prompt engineering systems tested across 10,000+ interactions. Each framework includes multi-model optimization, chain-of-thought reasoning, and quality guarantees."
        ]
      },
      NOTION_TEMPLATES: {
        title: [
          "Professional Notion Workspace Collection: 5-Minute Setup, Lifetime Organization",
          "Notion Productivity Mastery: Complete Database Systems for Professionals",
          "Ultimate Notion Template Bundle: From Chaos to Organized Excellence"
        ],
        description: [
          "Transform your scattered information into a beautifully organized, automated productivity system that saves 5+ hours weekly and impresses colleagues with professional polish.",
          "Join 10,000+ professionals using our 5-minute setup system. Includes advanced databases, automated workflows, and visual dashboards for teams and individuals.",
          "Complete productivity transformation with proven systems used by top agencies. Features sophisticated databases, automation formulas, and collaborative workflows."
        ]
      },
      DIGITAL_PLANNERS: {
        title: [
          "Aesthetic Digital Planner Collection: Studio-Quality Design for iPad Enthusiasts",
          "Beautiful Planning System: Instagram-Worthy Templates for GoodNotes",
          "Premium Digital Planner Bundle: Aesthetic Layouts That Inspire Daily Use"
        ],
        description: [
          "Transform your chaotic planning into an inspiring, beautiful digital workspace with studio-quality designs that motivate you to plan consistently every single day.",
          "Join 25,000+ digital planning enthusiasts who love our aesthetic approach. Multiple style variations, infinite pages, and instant iPad optimization.",
          "Professional designer-created planners featuring minimalist, boho, modern, and vintage aesthetics. Compatible with GoodNotes, Notability, and all major iPad apps."
        ]
      },
      DESIGN_TEMPLATES: {
        title: [
          "Agency-Grade Design System Collection: Professional Templates for Client Work",
          "Complete Design Toolkit: Multi-Platform Templates with Commercial License",
          "Professional Design Bundle: Agency-Quality Systems for Figma, Adobe & Canva"
        ],
        description: [
          "Transform from time-consuming custom design to professional, systematic delivery that scales your business. Save 30+ hours per project while impressing clients.",
          "Join 500+ agencies using our professional design systems. Complete collections with commercial licensing for unlimited client projects across all platforms.",
          "Professional design systems optimized for agencies and freelancers. Includes Figma, Adobe, Canva, and PowerPoint formats with full commercial licensing."
        ]
      }
    };

    const cat = recommendations[category as keyof typeof recommendations];
    const arr = (cat as any)?.[target] as string[] | undefined;
    return arr || [
      "Enhance this content with AI-powered optimization",
      "Generate professional, conversion-focused copy",
      "Create compelling, audience-specific messaging"
    ];
  };

  const RecommendationPanel = ({ target, currentContent, onSelect }: { 
    target: string, 
    currentContent: string, 
    onSelect: (recommendation: string) => void 
  }) => (
    <div className="absolute top-12 right-0 w-80 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 z-30">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">AI Recommendations</div>
      <div className="space-y-2">
        {getSmartRecommendations(target, currentContent).map((rec, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(rec)}
            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-black hover:shadow-sm transition-all text-sm font-medium leading-relaxed"
          >
            {rec}
          </button>
        ))}
      </div>
      <button 
        onClick={() => setShowRecommendations(null)}
        className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-black"
      >
        Close
      </button>
    </div>
  );

  const SectionControls = ({ target, id }: { target: string, id?: string }) => (
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-20">
      <button 
        onClick={() => setShowRecommendations(showRecommendations === (id || target) ? null : (id || target))}
        className="p-2 bg-white/90 premium-blur border border-slate-200 rounded-lg shadow-sm hover:border-black transition-all flex items-center gap-2"
        title="AI Recommendations"
      >
        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
        <span className="text-[8px] font-black uppercase">Ideas</span>
      </button>
      <button 
        onClick={() => handleEnhance(target, id)}
        disabled={aiLoading === (id || target)}
        className="p-2 bg-white/90 premium-blur border border-slate-200 rounded-lg shadow-sm hover:border-black transition-all flex items-center gap-2"
        title="Enhance with AI"
      >
        <Wand2 className={`w-3.5 h-3.5 ${aiLoading === (id || target) ? 'animate-pulse text-[#ff90e8]' : 'text-slate-600'}`} />
        <span className="text-[8px] font-black uppercase">Enhance</span>
      </button>
      {id && (
        <button 
          onClick={() => handleRegenerate(id)}
          disabled={aiLoading === id}
          className="p-2 bg-white/90 premium-blur border border-slate-200 rounded-lg shadow-sm hover:border-black transition-all flex items-center gap-2"
          title="Regenerate Section"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${aiLoading === id ? 'animate-spin text-amber-500' : 'text-slate-600'}`} />
        </button>
      )}
      {showRecommendations === (id || target) && (
        <RecommendationPanel 
          target={target}
          currentContent={target === 'title' ? product.title : target === 'description' ? product.description : ''}
          onSelect={(rec) => {
            if (target === 'title') {
              updateProduct({ title: rec });
            } else if (target === 'description') {
              updateProduct({ description: rec });
            } else if (id) {
              const block = product.contentBlocks.find(b => b.id === id);
              if (block) {
                updateContentBlock(id, { content: rec });
              }
            }
            setShowRecommendations(null);
          }}
        />
      )}
    </div>
  );

  const renderContentBlock = (block: ContentBlock) => {
    if (block.type === 'pricing') {
      return (
        <div
          key={block.id}
          className="p-8 rounded-[2rem] border-2 border-black relative group transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white"
        >
          <SectionControls target="block" id={block.id} />
          <h4 className="font-black text-lg mb-4 uppercase tracking-tighter flex items-center gap-3">
            <DynamicIcon iconName={'💰'} size={32} gradient={currentGradient} />
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateContentBlock(block.id, { title: e.currentTarget.textContent || '' })}
              className="outline-none border-b border-transparent hover:border-slate-200 focus:border-black"
            >
              {block.title}
            </span>
          </h4>

          {(() => {
            const base = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 29;
            // Simple decoy pricing (anchor low, target mid, high anchor)
            const low = Math.max(0, Math.round(base * 0.6));
            const mid = Math.max(0, Math.round(base));
            const high = Math.max(0, Math.round(base * 2.0));

            const f = Array.isArray(product.features) ? product.features : [];
            const t1 = f.slice(0, 3);
            const t2 = f.slice(0, 5);
            const t3 = f.slice(0, 7);

            return (
              <ThreeTierPricingGuide
                title={block.title || 'Pricing Options'}
                tiers={[
                  { name: 'Essentials', price: low, features: t1 },
                  { name: 'Complete', price: mid, features: t2, badge: 'Best Value' },
                  { name: 'Ultimate', price: high, features: t3 },
                ]}
                highlightTierIndex={1}
                ctaText={product.callToAction || 'Get Access'}
                gradientClass={currentGradient}
              />
            );
          })()}

          <button
            onClick={() => removeContentBlock(block.id)}
            className="absolute bottom-4 right-4 p-1.5 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div key={block.id} className="p-8 rounded-[2rem] border-2 border-black relative group transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
        <SectionControls target="block" id={block.id} />
        <h4 className="font-black text-lg mb-4 uppercase tracking-tighter flex items-center gap-3">
          <DynamicIcon iconName={block.type === 'checklist' ? '✅' : '💡'} size={32} gradient={currentGradient} /> 
          <span contentEditable suppressContentEditableWarning onBlur={(e) => updateContentBlock(block.id, { title: e.currentTarget.textContent || '' })} className="outline-none border-b border-transparent hover:border-slate-200 focus:border-black">{block.title}</span>
        </h4>
        {block.items ? (
          <div className="space-y-3">
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-3 text-sm font-bold italic text-slate-600">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={3} /> {item}
              </div>
            ))}
          </div>
        ) : (
          <p contentEditable suppressContentEditableWarning onBlur={(e) => updateContentBlock(block.id, { content: e.currentTarget.textContent || '' })} className="text-sm font-bold italic text-slate-500 outline-none">
            {block.content}
          </p>
        )}
        <button onClick={() => removeContentBlock(block.id)} className="absolute bottom-4 right-4 p-1.5 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    );
  };

  const isOutline = buttonStyle === 'outline';
  const ctaClasses = `w-full py-4 font-black uppercase tracking-widest text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${buttonShapeClasses[buttonStyle]} ${isOutline ? `border-black text-black hover:bg-slate-50` : `bg-gradient-to-r ${currentGradient} text-white hover:scale-[1.02] hover:shadow-xl`}`;

  return (
    <div className={`rounded-[2.5rem] border-[4px] border-black overflow-hidden bg-white ${shadowClasses[shadowStyle as ShadowStyle] || shadowClasses.subtle} transition-all ${fontFamily === 'mono' ? 'font-mono' : fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}>
      {/* Brand Header */}
      {product.brandLogo && (
        <div className="p-6 bg-slate-50 border-b-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={product.brandLogo} className="w-10 h-10 rounded-lg object-cover border-2 border-black" />
            <span className="font-inter font-black uppercase text-xs tracking-widest">{product.authorName}</span>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className={`p-10 md:p-16 relative group ${layoutType === 'centered' ? 'text-center flex flex-col items-center' : 'grid grid-cols-1 lg:grid-cols-2 gap-10 items-center'}`}>
        {/* Hero background effect (mutually exclusive) */}
        {heroBackgroundEffect === 'lightrays' && (
          <div className="absolute inset-0 pointer-events-none">
            <LightRays
              raysOrigin="top-center"
              raysColor="#00ffff"
              raysSpeed={1.2}
              lightSpread={0.8}
              rayLength={1.2}
              followMouse={true}
              mouseInfluence={0.08}
              noiseAmount={0.08}
              distortion={0.04}
              className="opacity-70"
            />
          </div>
        )}
        {heroBackgroundEffect === 'dither' && (
          <div className="absolute inset-0 pointer-events-none opacity-80">
            <DitherBackground intensity={heroDitherIntensity} />
          </div>
        )}

        <SectionControls target="title" />
        <div>
          <h1 
            contentEditable 
            suppressContentEditableWarning
            onBlur={(e) => updateProduct({ title: e.currentTarget.textContent || '' })}
            className={`text-4xl md:text-6xl uppercase tracking-tighter leading-[0.85] mb-6 outline-none hover:bg-slate-50/50 focus:bg-white rounded transition-all ${weightClasses[titleWeight]}`}
          >
            {heroGradientTitleEnabled ? (
              <GradientText
                animationSpeed={6}
                showBorder={false}
                className="!m-0"
                colors={["#40ffaa", "#4079ff", "#40ffaa", "#ff90e8", "#40ffaa"]}
              >
                {heroSplitTitleEnabled ? (
                  <SplitText text={product.title} />
                ) : (
                  <>{product.title}</>
                )}
              </GradientText>
            ) : heroSplitTitleEnabled ? (
              <SplitText text={product.title} />
            ) : (
              <>{product.title}</>
            )}
          </h1>
          <p 
            contentEditable 
            suppressContentEditableWarning
            onBlur={(e) => updateProduct({ description: e.currentTarget.textContent || '' })}
            className={`text-xl italic leading-snug mb-8 max-w-xl text-slate-500 outline-none hover:bg-slate-50/50 p-2 rounded ${weightClasses[descWeight]}`}
          >
            {product.description}
          </p>
          <div className="flex items-center gap-4 mb-10">
            <div className="text-6xl font-black italic tracking-tighter">${product.price}</div>
            <div className="bg-[#ff90e8] text-black px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 border-black">Early Bird Access</div>
          </div>
          <div className="flex flex-col gap-3 max-w-sm">
            {heroGlareCtaEnabled ? (
              <GlareHover
                width="100%"
                height="auto"
                background="transparent"
                borderRadius="18px"
                borderColor="#000"
                glareColor="#ffffff"
                glareOpacity={0.22}
                glareAngle={-30}
                glareSize={260}
                transitionDuration={800}
                playOnce={false}
                className="p-0"
                style={{ border: 'none' }}
              >
                <button style={opacityStyle} className={ctaClasses}>
                  <SelectedIcon className="w-6 h-6" /> {product.callToAction || 'I Want This!'}
                </button>
              </GlareHover>
            ) : (
              <button style={opacityStyle} className={ctaClasses}>
                <SelectedIcon className="w-6 h-6" /> {product.callToAction || 'I Want This!'}
              </button>
            )}
            <button onClick={() => descRef.current?.scrollIntoView({ behavior: 'smooth' })} className="w-full py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-black transition-colors italic flex items-center justify-center gap-2">
              <ChevronDown className="w-4 h-4" /> Architectural Specifications
            </button>
          </div>
        </div>
        <div className="relative">
          <div className={`absolute -inset-10 bg-gradient-to-br ${currentGradient} opacity-20 blur-[80px] rounded-full animate-pulse`} />
          <div className="relative p-2 bg-black rounded-[2.5rem] shadow-2xl">
            <img src={product.coverImage} className="w-full rounded-[2rem] border-2 border-white/20" />
          </div>
        </div>
      </div>

      {/* Pricing / Tiers (GSAP) */}
      {/* NOTE: This is a canvas-level monetization section (distinct visuals + motion). */}
      {/* Rendered before the editable content blocks. */}
      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      {null}

      {/* Pricing / Tiers Section (only if not provided as a content block) */}
      {!product.contentBlocks.some((b) => b.type === 'pricing') && (
        <PricingTiersSection
          basePrice={product.price}
          gradientClass={currentGradient}
          ctaText={product.callToAction || 'Get Access'}
        />
      )}

      {/* Content Blocks Builder */}
      <div ref={descRef} className="p-10 md:p-16 border-t-4 border-black bg-[#fafafa]">
        {/* MCP modal */}
        {showMcpModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-white border-4 border-black rounded-[2rem] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-black uppercase tracking-widest">Add Section (MCP)</div>
                <button onClick={() => setShowMcpModal(false)} className="p-2 border-2 border-black rounded-xl font-black">X</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mode</div>
                  <select
                    value={mcpMode}
                    onChange={(e) => {
                      setMcpMode(e.target.value as any);
                      setMcpTools([]);
                      setMcpSelectedTool('');
                    }}
                    className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                  >
                    <option value="stdio">Local MCP (stdio)</option>
                    <option value="sse">Hosted MCP (SSE)</option>
                    <option value="ws">Remote MCP (ws)</option>
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Server</div>
                  {mcpMode === 'stdio' ? (
                    <select
                      value={stdioSelectedServerId}
                      onChange={(e) => {
                        setStdioSelectedServerId(e.target.value);
                        setMcpTools([]);
                        setMcpSelectedTool('');
                      }}
                      className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                    >
                      {stdioServers.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  ) : mcpMode === 'sse' ? (
                    <select
                      value={sseSelectedServerId}
                      onChange={(e) => {
                        setSseSelectedServerId(e.target.value);
                        setMcpTools([]);
                        setMcpSelectedTool('');
                      }}
                      className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                    >
                      {sseServers.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={mcpSelectedServerUrl}
                      onChange={(e) => {
                        setMcpSelectedServerUrl(e.target.value);
                        setMcpTools([]);
                        setMcpSelectedTool('');
                      }}
                      className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                    >
                      {activeMcpServers.map((s) => (
                        <option key={s.id} value={s.url}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {(mcpMode === 'ws' && activeMcpServers.length === 0) ? (
                <div className="text-sm font-bold text-slate-500">
                  No active remote MCP servers. Enable one in the Forge tab first.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Server</div>
                      <select
                        value={mcpSelectedServerUrl}
                        onChange={(e) => {
                          setMcpSelectedServerUrl(e.target.value);
                          setMcpTools([]);
                          setMcpSelectedTool('');
                        }}
                        className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                      >
                        {activeMcpServers.map((s) => (
                          <option key={s.id} value={s.url}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Block type</div>
                      <select
                        value={mcpBlockType}
                        onChange={(e) => setMcpBlockType(e.target.value as ContentBlock['type'])}
                        className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                      >
                        {['text','feature-grid','faq','checklist','stat-highlight','emoji-row'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tool</div>
                      <button
                        type="button"
                        onClick={loadMcpTools}
                        disabled={mcpBusy || !mcpSelectedServerUrl}
                        className="px-3 py-2 rounded-xl border-2 border-black text-[10px] font-black uppercase tracking-widest"
                      >
                        Load tools
                      </button>
                    </div>

                    <select
                      value={mcpSelectedTool}
                      onChange={(e) => setMcpSelectedTool(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                    >
                      <option value="">Select a tool…</option>
                      {mcpTools.map((t) => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                    {mcpSelectedTool && (
                      <div className="mt-2 text-[11px] text-slate-500 font-bold">
                        {mcpTools.find((t) => t.name === mcpSelectedTool)?.description}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Prompt</div>
                    <textarea
                      value={mcpPrompt}
                      onChange={(e) => setMcpPrompt(e.target.value)}
                      rows={4}
                      placeholder="Describe the section you want inserted (tone, goal, bullets, etc.)"
                      className="w-full p-3 rounded-xl border-2 border-black text-sm font-bold"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowMcpModal(false)}
                      className="px-4 py-3 rounded-xl border-2 border-black text-[10px] font-black uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={generateBlockViaMcp}
                      disabled={mcpBusy || !mcpSelectedTool || !mcpPrompt.trim()}
                      className="px-4 py-3 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      {mcpBusy ? 'Working…' : 'Generate + Insert'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-4 text-slate-300">
              <Layers className="w-8 h-8" /> Content Topology
            </h3>
            <div className="flex gap-4">
              <div className="bg-white border-2 border-black p-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">Asset Node v4.1</div>
            </div>
          </div>

          {/* AI Suggestions (from last MCP insert) */}
          {aiSuggestions.length > 0 && (
            <div className="p-6 bg-white border-2 border-black rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">AI Suggestions</div>
              <div className="space-y-3">
                {aiSuggestions.map((sug, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black">{sug.title}</div>
                      <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                        sug.impact === 'high'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : sug.impact === 'medium'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>{sug.impact}</div>
                    </div>
                    <div className="mt-2 text-[12px] font-bold text-slate-500">{sug.reason}</div>
                    <div className="mt-2 text-[11px] font-mono text-slate-400">Action: {sug.action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewBlock && (
            <div className="p-6 bg-white border-2 border-black rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Canvas Preview</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={commitPreviewBlock}
                    className="px-3 py-2 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    Insert
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewBlock(null)}
                    className="px-3 py-2 rounded-xl border-2 border-black text-[10px] font-black uppercase tracking-widest"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              {renderContentBlock({ ...previewBlock, id: 'preview' })}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {product.contentBlocks.map(renderContentBlock)}
            <div onClick={openMcpModal} className="border-4 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center opacity-40 hover:opacity-100 hover:border-black transition-all cursor-pointer bg-white group">
              <Plus className="w-12 h-12 mb-4 text-slate-200 group-hover:text-black transition-colors" />
              <div className="text-[12px] font-black uppercase tracking-[0.4em] italic text-slate-400 group-hover:text-black">Inject Content Module</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPreview;
