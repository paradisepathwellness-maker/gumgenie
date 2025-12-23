
import React from 'react';
import { useStore } from './store';
import { agentsGenerate } from './services/apiClient';
import { SimulationLog } from './types';
import Sidebar from './components/Sidebar';
import TerminalWindow from './components/TerminalWindow';
import ProductPreview from './components/ProductPreview';
import { ChatWithAI, ChatControlDashboard } from './components/ui/chat-with-ai';
import { Rocket, Trash2, Github, ExternalLink, Zap, MessageCircle } from 'lucide-react';

const App: React.FC = () => {
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
    chatContext,
    chatDashboardHeightPx
  } = useStore();

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
      
    } catch (error: any) {
      console.error(error);
      addLog({ 
        id: 'err', 
        message: `Architectural failure in synthesis layer: ${error?.message || 'Unknown error'}`,
        timestamp: timestamp(), 
        phase: 'FINALIZING', 
        type: 'error' 
      });
    }
  };

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
                  <Zap className="w-3 h-3 text-[#ff90e8] fill-current" />
                  Neural Architect v3.5
                </div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                  Gum<span className="text-[#ff90e8]">Genie</span>
                </h1>
              </div>
              <p className="hidden md:block text-sm text-slate-400 font-bold max-w-sm leading-tight italic tracking-tight border-l-2 border-slate-200 pl-6">
                Synthesize industrial-grade <span className="text-black not-italic">digital assets.</span> Optimized for peak conversion.
              </p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => openChat({
                  category: currentCategory,
                  contentArea: 'general',
                  currentContent: generatedProduct?.title || ''
                })}
                title="Chat with AI"
                className="p-3 border-2 border-purple-300 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all shadow-[3px_3px_0px_0px_rgba(147,51,234,0.3)] active:translate-y-0.5 active:shadow-none"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button 
                onClick={reset}
                title="Reset Workspace"
                className="p-3 border-2 border-black rounded-xl hover:bg-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none bg-slate-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button 
                onClick={handleGenerate}
                disabled={!currentCategory || isGenerating}
                className={`px-8 py-3 bg-black text-white rounded-xl font-black text-lg flex items-center gap-4 transition-all group ${
                  !currentCategory || isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 shadow-[6px_6px_0px_0px_rgba(255,144,232,1)] active:translate-y-0.5 active:shadow-none'
                }`}
              >
                <Rocket className={`w-5 h-5 group-hover:rotate-12 transition-transform ${isGenerating ? 'animate-bounce' : ''}`} />
                {isGenerating ? 'SYNTHESIZING...' : 'ARCHITECT'}
              </button>
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
                    <span className="text-[#ff90e8]">{isGenerating ? '45%' : '100%'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className={`bg-[#ff90e8] h-full transition-all duration-1000 ${isGenerating ? 'w-[45%]' : 'w-full'}`} />
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
                  <div className="w-32 h-32 bg-white rounded-3xl border-2 border-slate-50 flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform group-hover:border-black group-hover:shadow-[10px_10px_0px_0px_rgba(255,144,232,0.5)]">
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
              <a href="#" className="hover:text-[#ff90e8] transition-colors">Neural Assets</a>
              <a href="#" className="hover:text-[#ff90e8] transition-colors">Agent Security</a>
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
