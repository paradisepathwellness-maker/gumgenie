
import React from 'react';
import * as LucideIcons from 'lucide-react';

interface Props {
  iconName: string;
  size?: number;
  className?: string;
  gradient?: string;
}

const emojiToIcon: Record<string, keyof typeof LucideIcons> = {
  '✨': 'Sparkles',
  '🔥': 'Flame',
  '🚀': 'Rocket',
  '💎': 'Gem',
  '🎉': 'PartyPopper',
  '💡': 'Lightbulb',
  '✅': 'CheckCircle2',
  '⚡️': 'Zap',
  '📦': 'Package',
  '💻': 'Monitor',
  '🛠️': 'Wrench',
  '📊': 'BarChart3',
  '🧠': 'Brain',
  '🌈': 'Palette',
  '💰': 'Coins',
  '📅': 'Calendar',
  '📝': 'FileEdit',
  '🔒': 'Lock',
  '🏆': 'Trophy',
  '⭐': 'Star',
};

const DynamicIcon: React.FC<Props> = ({ iconName, size = 48, className = '', gradient = 'from-indigo-500 to-purple-600' }) => {
  const mappedName = emojiToIcon[iconName] || iconName;
  const IconComponent = (LucideIcons[mappedName as keyof typeof LucideIcons] || LucideIcons.Box) as React.ElementType;

  return (
    <div 
      className={`relative group inline-flex items-center justify-center transition-all duration-300 ${className}`} 
      style={{ width: size, height: size }}
    >
      {/* 3D Deep Shadow */}
      <div className="absolute inset-2 bg-black/10 blur-lg rounded-2xl translate-y-2 group-hover:translate-y-4 group-hover:blur-xl transition-all" />
      
      {/* Main 3D Base Body */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl shadow-[inset_0_-4px_10px_rgba(0,0,0,0.3),inset_0_4px_10px_rgba(255,255,255,0.4),0_8px_16px_-4px_rgba(0,0,0,0.2)] group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`} />
      
      {/* Glass Top Layer */}
      <div className="absolute inset-1 border border-white/30 rounded-[1.25rem] bg-white/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Inner Icon with Drop Shadow */}
      <div className="relative z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.2)] group-hover:-translate-y-1 group-hover:scale-110 transition-all">
        <IconComponent 
          size={size * 0.5} 
          className="text-white" 
          strokeWidth={2.5}
        />
      </div>

      {/* Ground Reflection / Contact Shadow */}
      <div className="absolute -bottom-2 w-[70%] h-1 bg-black/10 blur-sm rounded-full scale-x-50 group-hover:scale-x-90 transition-transform" />
    </div>
  );
};

export default DynamicIcon;
