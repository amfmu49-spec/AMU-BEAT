import { useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface EffectsPanelProps {
  engine: AudioEngine | null;
}

const EFFECTS = ['FLANGER', 'PHASER', 'DELAY', 'REVERB', 'LOOP'];

export default function EffectsPanel({ engine }: EffectsPanelProps) {
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());

  const toggleEffect = (effect: string) => {
    setActiveEffects(prev => {
      const next = new Set(prev);
      if (next.has(effect)) {
        next.delete(effect);
        if (engine) engine.toggleEffect(effect, false);
      } else {
        next.add(effect);
        if (engine) engine.toggleEffect(effect, true);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full justify-between gap-1 bg-dark-900 border border-dark-600 rounded p-1 shadow-lg relative z-10 w-full min-h-0">
      {EFFECTS.map(fx => {
        const isActive = activeEffects.has(fx);
        return (
          <button
            key={fx}
            onClick={() => toggleEffect(fx)}
            className={`
              flex-1 py-1 px-1 rounded text-[9px] sm:text-[10px] font-bold tracking-wider transition-all duration-150 border
              ${isActive 
                ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan shadow-[0_0_15px_rgba(0,240,255,0.4)]' 
                : 'bg-dark-800 text-dark-400 border-dark-600 hover:border-dark-500 hover:text-dark-300'}
            `}
          >
            {fx}
          </button>
        );
      })}
    </div>
  );
}

