import { useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface PitchSliderProps {
  engine: AudioEngine | null;
}

export default function PitchSlider({ engine }: PitchSliderProps) {
  const [pitch, setPitch] = useState(1.0);

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = parseFloat(e.target.value);
    setPitch(newPitch);
    if (engine) engine.setPitch(newPitch);
  };

  const pitchPercent = Math.round((pitch - 1) * 100);

  return (
    <div className="w-full flex items-center gap-3 bg-dark-800 p-2 rounded-lg border border-dark-700 shadow-md">
      <button 
        className="flex flex-col items-center justify-center min-w-[40px] hover:bg-dark-700 rounded p-1 transition-colors active:bg-dark-600"
        onClick={() => {
          setPitch(1.0);
          if (engine) engine.setPitch(1.0);
        }}
        title="Reset Pitch"
      >
        <span className="text-[10px] text-dark-400 font-bold tracking-widest uppercase cursor-pointer">PITCH</span>
        <span className={`text-xs font-mono font-bold ${pitchPercent === 0 ? 'text-dark-300' : 'text-accent-orange'}`}>
          {pitchPercent > 0 ? '+' : ''}{pitchPercent}%
        </span>
      </button>
      
      <div className="flex-1 relative flex items-center h-8">
        <input
          type="range"
          min="0.8"
          max="1.2"
          step="0.01"
          value={pitch}
          onChange={handlePitchChange}
          onDoubleClick={() => {
            setPitch(1.0);
            if (engine) engine.setPitch(1.0);
          }}
          className="w-full h-2 bg-dark-900 rounded-full appearance-none cursor-ew-resize outline-none accent-accent-orange relative z-10"
        />
        {/* Center detent marker */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-4 bg-dark-400 pointer-events-none rounded-full z-0"></div>
      </div>
    </div>
  );
}
