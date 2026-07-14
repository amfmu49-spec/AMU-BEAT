import { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface SpectrumBarProps {
  engine: AudioEngine | null;
}

export default function SpectrumBar({ engine }: SpectrumBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let animationId: number;

    const renderLoop = () => {
      if (engine && engine.analyser && barRef.current) {
        if (!dataArrayRef.current) {
          dataArrayRef.current = new Uint8Array(engine.analyser.frequencyBinCount);
        }
        engine.getSpectrumData(dataArrayRef.current);
        
        // Calculate average volume or pick a specific frequency bin
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
        }
        const average = sum / dataArrayRef.current.length;
        
        // Scale to a width percentage, e.g., 5% to 40% based on average volume
        const minWidth = 5;
        const targetWidth = minWidth + (average / 255) * 35;
        
        barRef.current.style.width = `${targetWidth}%`;
      }
      animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => cancelAnimationFrame(animationId);
  }, [engine]);

  return (
    <div 
      ref={barRef}
      className="absolute top-0 left-4 h-1 bg-accent-orange shadow-[0_0_10px_rgba(255,92,0,0.8)] transition-all duration-75 ease-linear"
      style={{ width: '5%' }}
    />
  );
}
