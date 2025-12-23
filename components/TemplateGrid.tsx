
import React from 'react';
import { useStore } from '../store';
import { TemplateCategory } from '../types';
import { Brain, FileText, Calendar, Layout, Sparkles } from 'lucide-react';

const TemplateGrid: React.FC = () => {
  const { currentCategory, setCategory, isGenerating } = useStore();

  const templates = [
    {
      id: TemplateCategory.AI_PROMPTS,
      title: 'AI Prompt Packs',
      icon: Brain,
      color: 'bg-blue-100 text-blue-600',
      borderColor: 'border-blue-200',
      description: 'Engineered prompts for LLMs and Image generators.'
    },
    {
      id: TemplateCategory.NOTION_TEMPLATES,
      title: 'Notion Dashboards',
      icon: FileText,
      color: 'bg-slate-100 text-slate-600',
      borderColor: 'border-slate-200',
      description: 'Second brains, CRMs, and project trackers.'
    },
    {
      id: TemplateCategory.DIGITAL_PLANNERS,
      title: 'Digital Planners',
      icon: Calendar,
      color: 'bg-amber-100 text-amber-600',
      borderColor: 'border-amber-200',
      description: 'Annotated PDFs for iPad and productivity apps.'
    },
    {
      id: TemplateCategory.DESIGN_TEMPLATES,
      title: 'Design Systems',
      icon: Layout,
      color: 'bg-emerald-100 text-emerald-600',
      borderColor: 'border-emerald-200',
      description: 'Figma kits, UI sets, and branding resources.'
    }
  ];

  const handleRandomize = () => {
    const random = templates[Math.floor(Math.random() * templates.length)].id;
    setCategory(random);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Select Foundation</h2>
        <button 
          onClick={handleRandomize}
          disabled={isGenerating}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-black transition-colors"
        >
          <Sparkles className="w-4 h-4" /> I&apos;m feeling lucky
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map((template) => {
          const Icon = template.icon;
          const isSelected = currentCategory === template.id;
          
          return (
            <button
              key={template.id}
              onClick={() => setCategory(template.id)}
              disabled={isGenerating}
              className={`text-left p-6 rounded-2xl border-2 transition-all duration-300 ease-in-out group relative overflow-hidden ${
                isSelected 
                  ? 'border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-400'
              }`}
            >
              <div className={`${template.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-1">{template.title}</h3>
              <p className="text-sm text-slate-500">{template.description}</p>
              
              {isSelected && (
                <div className="absolute top-4 right-4 bg-black text-white p-1 rounded-full">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateGrid;
