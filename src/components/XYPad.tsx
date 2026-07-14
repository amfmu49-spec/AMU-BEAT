import { useState, useRef, useEffect } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface XYPadProps {
  engine: AudioEngine | null;
  coverUrl: string;
  scratchMode?: boolean;
  isRotated?: boolean;
}

export default function XYPad({ engine, coverUrl, scratchMode = false, isRotated = false }: XYPadProps) {
  const [pos, setPos] = useState({ x: 0.5, y: 0 });
  const [active, setActive] = useState(false);
  const [rotation, setRotation] = useState(0);
  const padRef = useRef<HTMLDivElement>(null);
  
  const lastY = useRef<number | null>(null);
  const velocity = useRef<number>(0);
  const animationRef = useRef<number>(0);

  // Handle vinyl rotation and scratch physics
  useEffect(() => {
    if (!scratchMode) {
      if (engine) engine.setScratchDelta(0);
      return;
    }
    
    let lastTime = performance.now();
    
    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      // Apply friction to velocity if not actively touched
      if (!active) {
        velocity.current *= Math.pow(0.85, dt / 16); // Decay
        if (Math.abs(velocity.current) < 0.001) velocity.current = 0;
      }

      if (engine) {
        engine.setScratchDelta(velocity.current);
      }

      setRotation(prev => prev + velocity.current * 100);
      animationRef.current = requestAnimationFrame(loop);
    };
    
    animationRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [scratchMode, active, engine]);

  const updatePosition = (clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    
    if (scratchMode) {
      let y = (clientY - rect.top) / rect.height;
      if (isRotated) {
        y = (clientX - rect.left) / rect.width;
      }

      if (lastY.current !== null) {
        const delta = y - lastY.current;
        velocity.current = delta;
      }
      lastY.current = y;
      return;
    }

    // Normal XY Pad logic
    let rawX = (clientX - rect.left) / rect.width;
    let rawY = (clientY - rect.top) / rect.height;
    
    if (isRotated) {
      const tempX = 1 - rawY;
      const tempY = rawX;
      rawX = tempX;
      rawY = tempY;
    }

    const x = Math.max(0, Math.min(1, rawX));
    const y = Math.max(0, Math.min(1, rawY));
    
    const invertedY = 1 - y;
    setPos({ x, y: invertedY });
    
    if (engine) {
      engine.setXY(x, invertedY);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    padRef.current?.setPointerCapture(e.pointerId);
    setActive(true);
    if (scratchMode) {
      const rect = padRef.current?.getBoundingClientRect();
      if (rect) {
        let y = (e.clientY - rect.top) / rect.height;
        if (isRotated) {
          y = (e.clientX - rect.left) / rect.width;
        }
        lastY.current = y;
      }
    } else {
      updatePosition(e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active) return;
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    padRef.current?.releasePointerCapture(e.pointerId);
    setActive(false);
    lastY.current = null;
  };

  if (scratchMode) {
    return (
      <div 
        ref={padRef}
        className="xy-pad-container w-full aspect-square relative flex items-center justify-center bg-dark-900 border-2 border-accent-cyan shadow-[0_0_30px_rgba(0,240,255,0.3)_inset] overflow-hidden cursor-ns-resize"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div 
          className="w-[90%] h-[90%] rounded-full border border-dark-900 shadow-[0_15px_35px_rgba(0,0,0,0.8)] relative flex items-center justify-center overflow-hidden"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            background: `
              repeating-radial-gradient(
                circle at center,
                #111 0px,
                #1a1a1a 1px,
                #111 3px,
                #0a0a0a 4px
              )
            `
          }}
        >
           {/* Vinyl shine overlay */}
           <div 
             className="absolute inset-0 rounded-full mix-blend-screen pointer-events-none opacity-40"
             style={{
               background: `conic-gradient(
                 from 45deg, 
                 rgba(255,255,255,0) 0%, 
                 rgba(255,255,255,0.15) 15%, 
                 rgba(255,255,255,0) 30%,
                 rgba(255,255,255,0) 50%, 
                 rgba(255,255,255,0.15) 65%, 
                 rgba(255,255,255,0) 80%
               )`
             }}
           ></div>
           
           {/* Center Label (Cover Art) */}
           <div 
            className="w-1/3 h-1/3 rounded-full z-10 shadow-[0_0_10px_black]"
            style={{
              backgroundImage: `url(${coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
           >
             {/* Center Label Border/Details */}
             <div className="absolute inset-0 rounded-full border-[3px] border-dark-900/50"></div>
           </div>
           
           {/* Spindle hole */}
           <div className="absolute w-2 h-2 bg-dark-900 rounded-full z-20 shadow-[inset_0_2px_4px_black]"></div>
        </div>
        
        <div className="absolute top-2 left-2 text-[10px] font-bold text-accent-cyan animate-pulse bg-dark-900/80 px-2 py-1 rounded pointer-events-none">
          SCRATCH MODE
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={padRef}
      className="xy-pad-container w-full aspect-square relative border-2 border-dark-600 bg-dark-900 shadow-[0_0_20px_rgba(0,0,0,0.5)_inset]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        backgroundImage: `url(${coverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay for darkening the image slightly */}
      <div className="absolute inset-0 bg-dark-900/60 pointer-events-none mix-blend-multiply"></div>
      
      {/* XY Grid lines (Cyber aesthetic) */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[linear-gradient(rgba(0,240,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.1)_1px,transparent_1px)] bg-[size:10%_10%]"></div>

      {/* Crosshair indicator */}
      <div 
        className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border pointer-events-none transition-transform duration-75"
        style={{
          left: `${pos.x * 100}%`,
          top: `${(1 - pos.y) * 100}%`,
          borderColor: `hsl(${(184 + pos.x * 198) % 360}, 100%, 50%)`,
          boxShadow: `0 0 ${10 + pos.y * 15}px hsla(${(184 + pos.x * 198) % 360}, 100%, 50%, 0.7), inset 0 0 10px hsla(${(184 + pos.x * 198) % 360}, 100%, 50%, 0.3)`,
          transform: active ? 'scale(1.2)' : 'scale(1)',
          opacity: active ? 1 : 0.6,
          backgroundColor: active ? `hsla(${(184 + pos.x * 198) % 360}, 100%, 50%, 0.15)` : 'transparent'
        }}
      >
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full transition-colors duration-75"
          style={{
            backgroundColor: `hsl(${(184 + pos.x * 198) % 360}, 100%, 80%)`,
            boxShadow: `0 0 5px hsl(${(184 + pos.x * 198) % 360}, 100%, 80%)`
          }}
        ></div>
      </div>
      
      {/* Value indicators */}
      <div className="absolute bottom-2 left-2 text-[10px] font-mono text-accent-cyan bg-dark-900/90 border border-dark-600 px-1.5 py-0.5 rounded pointer-events-none uppercase">
        LPF: {Math.round(pos.x * 100)}%
      </div>
      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-accent-orange bg-dark-900/90 border border-dark-600 px-1.5 py-0.5 rounded pointer-events-none uppercase">
        DLY: {Math.round(pos.y * 100)}%
      </div>
    </div>
  );
}
