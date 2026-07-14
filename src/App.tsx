import { useState, useRef, useEffect } from 'react';
import PadGrid from './components/PadGrid';
import XYPad from './components/XYPad';
import Controls from './components/Controls';
import EffectsPanel from './components/EffectsPanel';
import PitchSlider from './components/PitchSlider';
import SpectrumBar from './components/SpectrumBar';
import { AudioEngine } from './audio/AudioEngine';

function App() {
  const [bpm, setBpm] = useState(120);
  const engineRef = useRef<AudioEngine | null>(null);
  const [status, setStatus] = useState<string>("Waiting for audio... (Use bookmarklet on Suno)");
  const [coverUrl, setCoverUrl] = useState("https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=500&auto=format&fit=crop");
  const [scratchMode, setScratchMode] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    engineRef.current?.setScratchMode(scratchMode);
  }, [scratchMode]);

  useEffect(() => {
    engineRef.current = new AudioEngine();
    
    const params = new URLSearchParams(window.location.search);
    const audioUrl = params.get('audio_url');
    const imageUrl = params.get('image_url');
    const paramBpm = params.get('bpm');

    if (imageUrl) {
      setCoverUrl(imageUrl);
    }
    if (paramBpm) {
      setBpm(Number(paramBpm));
      engineRef.current.setBpm(Number(paramBpm));
    }

    if (audioUrl) {
      setStatus("Loading Audio...");
      const targetUrl = audioUrl;
      
      engineRef.current.loadAudio(targetUrl)
        .then(() => {
          setStatus("Ready! Tap anywhere to start.");
        })
        .catch(async (e) => {
          console.error("Direct load failed, trying proxy...", e);
          setStatus("Loading Audio (Proxy)...");
          try {
            const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl);
            await engineRef.current?.loadAudio(proxyUrl);
            setStatus("Ready! Tap anywhere to start.");
          } catch(err: any) {
            console.error("Proxy load failed", err);
            setStatus("Error: Decoding failed. URL=" + targetUrl.substring(0, 30) + "... " + err.message);
          }
        });
    }

    return () => {
      engineRef.current?.ctx.close();
    }
  }, []);

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    engineRef.current?.setBpm(newBpm);
  };

  const handleResume = () => {
    engineRef.current?.resume();
    if (status === "Ready! Tap anywhere to start.") {
       setStatus("Playing");
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-900 font-mono overflow-hidden" onClick={handleResume} onTouchStart={handleResume}>
      
      <div 
        className={`absolute top-1/2 left-1/2 flex flex-col items-center justify-center p-1 sm:p-2 transition-transform duration-300 ease-in-out`}
        style={{
          width: isPortrait ? '100vh' : '100%',
          height: isPortrait ? '100vw' : '100%',
          transform: isPortrait ? 'translate(-50%, -50%) rotate(-90deg)' : 'translate(-50%, -50%)'
        }}
      >

      <div className={`w-full h-full max-w-6xl glass-panel p-2 flex flex-col relative overflow-hidden gap-2`}>
        
        <SpectrumBar engine={engineRef.current} />
        <div className="absolute top-0 right-4 w-2 h-1 bg-accent-cyan shadow-[0_0_10px_rgba(0,240,255,0.8)]"></div>
        <div className="absolute bottom-4 left-2 w-1 h-1 bg-dark-500 rounded-full"></div>
        <div className="absolute bottom-4 right-2 w-1 h-1 bg-dark-500 rounded-full"></div>
        
        {/* Header - Compact */}
        <header className="flex items-center justify-between border-b border-dark-600 pb-1 shrink-0 px-2 relative z-20">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-sm bg-dark-800 border-2 border-accent-cyan flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <span className="text-accent-cyan font-bold text-[8px]">ST</span>
            </div>
            <h1 className="text-xs font-bold tracking-widest text-gray-100 hidden sm:block">
              SUNO<span className="text-accent-cyan">TRACK</span>
            </h1>
          </div>
          
          <Controls 
            bpm={bpm} 
            setBpm={handleBpmChange} 
            onPlayFull={() => {
              engineRef.current?.resume();
              engineRef.current?.playFull();
              if (status === "Ready! Tap anywhere to start.") {
                setStatus("Playing");
              }
            }}
            onStopFull={() => {
              engineRef.current?.stopFull();
            }}
          />
        </header>

        {/* Status */}
        {status !== "Playing" && (
          <div className={`text-[10px] p-1 rounded border ${status.startsWith('Error') ? 'border-accent-red text-accent-red' : 'border-accent-cyan text-accent-cyan'} animate-pulse bg-dark-900/50 shrink-0 text-center relative z-20`}>
            {status}
          </div>
        )}

        {/* Main Content Area - 4 Columns */}
        <div className="flex flex-row flex-1 min-h-0 gap-2 w-full px-1 pt-1 pb-2">
          
          {/* Column 1: Vertical Scratch Button */}
          <div className="w-12 sm:w-16 flex-shrink-0 flex items-center justify-center relative z-20">
            <button 
              className={`h-full w-full rounded-xl select-none font-bold tracking-widest text-[10px] sm:text-xs transition-all duration-75 flex items-center justify-center border-2 overflow-hidden
                ${scratchMode 
                  ? 'bg-accent-cyan text-dark-900 border-accent-cyan shadow-[0_0_20px_rgba(0,240,255,0.6)]' 
                  : 'bg-dark-800 text-dark-300 border-dark-600 shadow-md'
              }`}
              onPointerDown={(e) => { e.preventDefault(); setScratchMode(true); }}
              onPointerUp={(e) => { e.preventDefault(); setScratchMode(false); }}
              onPointerLeave={(e) => { e.preventDefault(); setScratchMode(false); }}
              onPointerCancel={(e) => { e.preventDefault(); setScratchMode(false); }}
              onTouchStart={(e) => { e.preventDefault(); setScratchMode(true); }}
              onTouchEnd={(e) => { e.preventDefault(); setScratchMode(false); }}
            >
              <div className="-rotate-90 whitespace-nowrap pb-1">SCRATCH</div>
            </button>
          </div>

          {/* Column 2: XY Pad + Pitch Slider */}
          <div className="flex flex-col flex-1 max-w-[45vh] items-center justify-center gap-3">
            <div className="w-full flex-1 min-h-0 flex items-center justify-center relative bg-dark-800/30 rounded-lg p-2">
              <div className="h-full aspect-square max-h-full">
                <XYPad engine={engineRef.current} coverUrl={coverUrl} scratchMode={scratchMode} isRotated={isPortrait} />
              </div>
            </div>
            <div className="w-full shrink-0 relative z-20">
               <PitchSlider engine={engineRef.current} />
            </div>
          </div>

          {/* Column 3: Effects Panel */}
          <div className="w-16 sm:w-20 flex-shrink-0 flex items-center justify-center py-2 relative z-20">
            <EffectsPanel engine={engineRef.current} />
          </div>

          {/* Column 4: 16 Pads */}
          <div className="flex flex-col flex-1 items-center justify-center bg-dark-800/30 rounded-lg p-2 relative z-10">
            <div className="w-full h-full flex items-center justify-center">
              <div className="h-full aspect-square max-h-full">
                <PadGrid engine={engineRef.current} />
              </div>
            </div>
          </div>
          
        </div>
      </div>
      </div>
    </div>
  );
}

export default App;
