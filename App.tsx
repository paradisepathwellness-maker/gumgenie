
import React from 'react';
import { cn } from '@/lib/utils';
import { useStore } from './store';
import { agentsGenerate } from './services/apiClient';
import { SimulationLog } from './types';
import Sidebar from './components/Sidebar';
import TerminalWindow from './components/TerminalWindow';
import ProductPreview from './components/ProductPreview';
import LandingPage from './components/LandingPage';
import { ChatWithAI, ChatControlDashboard } from './components/ui/chat-with-ai';
import { OrchestratorCliConsole } from './components/OrchestratorCliConsole';
import { Rocket, Trash2, Github, ExternalLink, Zap, MessageCircle } from 'lucide-react';
import { Button as Button3D } from '@/components/ui/3d-button';

const App: React.FC = () => {
  const showLanding = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('landing');
  const { 
    currentCategory, 
    isGenerating, 
    startGeneration, 
    addLog, 
    setProduct, 
    applyPreset,
    generatedProduct, 
    reset,
    // Chat integration
    isChatOpen,
    openChat,
    closeChat,
    chatContext
  } = useStore();

  if (showLanding) {
    return <LandingPage onPrimaryCta={() => window.location.assign('#pricing')} />;
  }

  const handleGenerate = async () => {
    if (!currentCategory) return;
    
    startGeneration();
    
    const timestamp = () => new Date().toLocaleTimeString([], { hour12: false });
    const log = (msg: string, phase: SimulationLog['phase'], type: SimulationLog['type'] = 'info') => {
      addLog({ id: Math.random().toString(), message: msg, timestamp: timestamp(), phase, type });
    };

    try {
      log("Neural bridge established. Fetching training data...", "INITIALIZING");
      await new Promise(r => setTimeout(r, 600));
      log(`Context set to: ${currentCategory}`, "INITIALIZING");
      
      log("Performing deep synthesis of product metadata...", "SYNTHESIZING");
      const { product, preset } = await agentsGenerate(currentCategory);
      const presets = [preset];
      await new Promise(r => setTimeout(r, 800));
      
      log(`Creative engine produced: "${product.title}"`, "SYNTHESIZING", "success");
      log("Synthesizing diverse visual directions...", "SYNTHESIZING");
      
      log("Running price elasticity simulation...", "OPTIMIZING");
      await new Promise(r => setTimeout(r, 800));
      log(`Price point finalized at $${product.price}`, "OPTIMIZING", "success");
      
      log("Calculating style matrix parameters...", "OPTIMIZING");
      await new Promise(r => setTimeout(r, 800));
      
      log("Finalizing high-fidelity rendering...", "FINALIZING");
      await new Promise(r => setTimeout(r, 1000));
      
      setProduct(product, presets);
      
      if (presets && presets.length > 0) {
        applyPreset(0);
        log(`Applying default preset: "${presets[0].name}"`, "FINALIZING", "success");
      }
      
      log("Synthesis complete. Deployment ready.", "FINALIZING", "success");
      
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(err);
      addLog({ 
        id: 'err', 
        message: `Architectural failure in synthesis layer: ${err.message || 'Unknown error'}`,
        timestamp: timestamp(), 
        phase: 'FINALIZING', 
        type: 'error' 
      });
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const showOrchestratorCli = urlParams.has('orchestratorCli');

  if (showOrchestratorCli) {
    return <OrchestratorCliConsole />;
  }

  return (
    <div className="flex bg-[#f8f8f4] text-[#1a1a1a] min-h-screen">
      <Sidebar />
      
      <main
        className="flex-1 ml-80 p-6 md:p-10"
        // Reserve minimal space for the compact sticky chatbar; expanded mode intentionally overlays content.
        style={{ paddingBottom: `96px` }}
      >
        <div className="max-w-[1600px] mx-auto space-y-8">
          {/* Compact Header Area */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b-2 border-black pb-6">
            <div className="flex items-center gap-8">
              <div>
                <div className="inline-flex items-center gap-2 bg-black text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.3em] mb-2">
                  <Zap className="w-3 h-3 text-slate-300 fill-current" />
                  Neural Architect v3.5
                </div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                  Gum<span className="bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200 bg-clip-text text-transparent gg-platinum-shimmer">Genie</span>
                </h1>
              </div>
              <p className="hidden md:block text-sm text-slate-400 font-bold max-w-sm leading-tight italic tracking-tight border-l-2 border-slate-200 pl-6">
                Synthesize industrial-grade <span className="text-black not-italic">digital assets.</span> Optimized for peak conversion.
              </p>
            </div>
            
            <div className="flex gap-4">
              <Button3D
                variant="chrome"
                size="icon"
                onClick={() =>
                  openChat({
                    category: currentCategory,
                    contentArea: 'general',
                    currentContent: generatedProduct?.title || '',
                  })
                }
                title="Chat with AI"
                aria-label="Chat with AI"
              >
                <MessageCircle className="w-5 h-5 text-slate-900" />
              </Button3D>
              <Button3D
                variant="outline"
                size="icon"
                onClick={reset}
                title="Reset Workspace"
                aria-label="Reset Workspace"
                className="border-black/20"
              >
                <Trash2 className="w-5 h-5" />
              </Button3D>
              <Button3D
                variant="chrome"
                size="lg"
                onClick={handleGenerate}
                disabled={!currentCategory || isGenerating}
                className={cn(
                  "px-8 py-3 font-black text-lg flex items-center gap-4 transition-all group",
                  !currentCategory || isGenerating
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-95 active:translate-y-0.5"
                )}
              >
                <Rocket
                  className={`w-5 h-5 group-hover:rotate-12 transition-transform ${isGenerating ? 'animate-bounce' : ''}`}
                />
                {isGenerating ? 'SYNTHESIZING...' : 'ARCHITECT'}
              </Button3D>
            </div>
          </div>

          {/* Side-by-Side Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Terminal Column */}
            <div className="xl:col-span-3 sticky top-10">
              <TerminalWindow />
              <div className="mt-6 bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 italic">System Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Cores Active</span>
                    <span className="text-emerald-500">100%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-full" />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Sync Progress</span>
                    <span className="text-slate-600">{isGenerating ? '45%' : '100%'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className={`bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200 h-full transition-all duration-1000 ${isGenerating ? 'w-[45%]' : 'w-full'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Column */}
            <div className="xl:col-span-9">
              {generatedProduct ? (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                  <ProductPreview product={generatedProduct} />
                  {/* Chat expansion sentinel: when this scrolls out of view above, chat dashboard expands */}
                  <div id="chat-preview-sentinel" className="h-px w-full" />
                </div>
              ) : (
                <div className="h-[700px] border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-400 p-12 text-center bg-white/40 group hover:border-black/20 transition-all">
                  <div className="w-32 h-32 bg-white rounded-3xl border-2 border-slate-50 flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform group-hover:border-black group-hover:shadow-[10px_10px_0px_0px_rgba(148,163,184,0.35)]">
                    <ExternalLink className="w-12 h-12 text-slate-100 group-hover:text-black transition-colors" />
                  </div>
                  <h3 className="text-3xl font-black text-black uppercase mb-4 tracking-tighter italic">Awaiting Architecture</h3>
                  <p className="max-w-md font-bold text-slate-400 text-lg leading-relaxed italic tracking-tight">
                    Select a product foundation in the Architect Panel to begin synthesis.
                  </p>
                </div>
              )}
            </div>
          </div>

          <footer className="pt-12 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 hover:opacity-100 transition-opacity pb-10">
            <div className="flex items-center gap-4">
               <Github className="w-5 h-5" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Synthesis Node v2.4.9</span>
            </div>
            <div className="flex gap-10 text-[9px] font-black uppercase tracking-[0.2em] italic">
              <a href="#" className="hover:text-slate-700 transition-colors">Neural Assets</a>
              <a href="#" className="hover:text-slate-700 transition-colors">Agent Security</a>
            </div>
          </footer>
        </div>
      </main>

      {/* Chat Control Dashboard (always visible) */}
      <ChatControlDashboard />

      {/* Chat with AI Modal (existing) */}
      <ChatWithAI 
        isOpen={isChatOpen}
        onClose={closeChat}
        context={chatContext}
      />
    </div>
  );
};

export default App;
