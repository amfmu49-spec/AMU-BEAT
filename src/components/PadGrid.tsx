import { useState, useEffect } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface PadGridProps {
  engine: AudioEngine | null;
}

export default function PadGrid({ engine }: PadGridProps) {
  const [activePads, setActivePads] = useState<Set<number>>(new Set());

  // Listen for keyboard mapping
  useEffect(() => {
    // A simple mapping for 4x4 using typical keyboard layout like Ableton
    const keyMap: Record<string, number> = {
      'z': 12, 'x': 13, 'c': 14, 'v': 15,
      'a': 8, 's': 9, 'd': 10, 'f': 11,
      'q': 4, 'w': 5, 'e': 6, 'r': 7,
      '1': 0, '2': 1, '3': 2, '4': 3,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = keyMap[e.key.toLowerCase()];
      if (idx !== undefined) {
        handlePadDown(idx);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const idx = keyMap[e.key.toLowerCase()];
      if (idx !== undefined) {
        handlePadUp(idx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine]);

  const handlePadDown = (index: number) => {
    setActivePads(prev => new Set(prev).add(index));
    if (engine) {
      engine.resume();
      engine.playSlice(index);
    }
  };

  const handlePadUp = (index: number) => {
    setActivePads(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    // In one-shot mode, we might not stop. But let's assume gate mode for now.
    // if (engine) {
    //   engine.stopSlice(index);
    // }
  };

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full aspect-square p-3 sm:p-4 bg-dark-900 rounded-xl border border-dark-600 shadow-[0_0_15px_rgba(0,0,0,0.8)_inset]">
      {Array.from({ length: 16 }).map((_, i) => (
        <button
          key={i}
          className={`pad-button ${activePads.has(i) ? 'active' : ''}`}
          onMouseDown={() => handlePadDown(i)}
          onMouseUp={() => handlePadUp(i)}
          onMouseLeave={() => handlePadUp(i)}
          onTouchStart={(e) => { e.preventDefault(); handlePadDown(i); }}
          onTouchEnd={() => handlePadUp(i)}
        >
          {activePads.has(i) && (
             <div className="absolute inset-0 bg-accent-cyan/10 animate-pulse"></div>
          )}
          <span className={`absolute bottom-1 right-2 text-[10px] font-mono font-bold transition-colors ${activePads.has(i) ? 'text-accent-cyan' : 'text-dark-500'}`}>
            {i + 1}
          </span>
        </button>
      ))}
    </div>
  );
}
