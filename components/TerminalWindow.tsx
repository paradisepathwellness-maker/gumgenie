
import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Terminal } from 'lucide-react';

const TerminalWindow: React.FC = () => {
  const { logs, isGenerating } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full h-[300px] bg-slate-900 rounded-xl overflow-hidden flex flex-col border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] font-mono text-[10px]">
      <div className="bg-slate-800 px-3 py-1.5 flex items-center gap-2 border-b-2 border-black">
        <Terminal className="w-3 h-3 text-slate-400" />
        <span className="text-slate-300 font-bold uppercase tracking-widest text-[9px]">Neural Agent</span>
        <div className="ml-auto flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-amber-500/50" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto space-y-1.5 scroll-smooth text-slate-300 scrollbar-hide"
      >
        {logs.length === 0 && !isGenerating ? (
          <div className="text-slate-600 italic">Awaiting neural parameters...</div>
        ) : null}
        
        {logs.map((log) => (
          <div 
            key={log.id} 
            className="flex gap-2 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
            <span className={`shrink-0 uppercase font-black text-[8px] pt-0.5 tracking-tighter ${
              log.phase === 'INITIALIZING' ? 'text-blue-500' :
              log.phase === 'SYNTHESIZING' ? 'text-amber-500' :
              log.phase === 'OPTIMIZING' ? 'text-purple-500' :
              'text-emerald-500'
            }`}>
              {log.phase}
            </span>
            <span className={
              log.type === 'success' ? 'text-emerald-400' :
              log.type === 'error' ? 'text-red-400' :
              log.type === 'warning' ? 'text-amber-400' :
              'text-slate-300'
            }>
              {log.message}
            </span>
          </div>
        ))}
        
        {isGenerating && (
          <div className="flex gap-2 items-center text-slate-500 mt-2">
            <span className="w-1 h-2 bg-emerald-500 cursor-blink" />
            <span className="italic">Processing layers...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalWindow;
