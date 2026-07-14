import { Play, Square, Settings, Volume2 } from 'lucide-react';

interface ControlsProps {
  bpm: number;
  setBpm: (bpm: number) => void;
  onPlayFull: () => void;
  onStopFull: () => void;
}

export default function Controls({ bpm, setBpm, onPlayFull, onStopFull }: ControlsProps) {
  return (
    <div className="flex items-center space-x-2 bg-dark-800 p-2 rounded-lg border border-dark-600">
      
      {/* Play / Stop */}
      <div className="flex space-x-1 border-r border-dark-600 pr-2">
        <button 
          className="p-2 text-gray-400 hover:text-accent-cyan hover:bg-dark-700 rounded transition-colors" 
          title="Play Track from start"
          onClick={onPlayFull}
        >
          <Play size={18} className="fill-current" />
        </button>
        <button 
          className="p-2 text-gray-400 hover:text-accent-red hover:bg-dark-700 rounded transition-colors" 
          title="Stop Track"
          onClick={onStopFull}
        >
          <Square size={18} className="fill-current" />
        </button>
      </div>

      {/* BPM */}
      <div className="flex items-center space-x-1 px-2 border-r border-dark-600">
        <span className="text-xs text-gray-500 font-mono">BPM</span>
        <input 
          type="number" 
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-16 bg-dark-900 border border-dark-600 rounded px-1 py-0.5 text-accent-cyan font-mono text-center text-sm focus:outline-none focus:border-accent-cyan"
        />
      </div>

      {/* Settings / Volume */}
      <div className="flex space-x-1 pl-2">
        <button className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded transition-colors">
          <Volume2 size={18} />
        </button>
        <button className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded transition-colors">
          <Settings size={18} />
        </button>
      </div>
      
    </div>
  );
}
