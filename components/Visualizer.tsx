
import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  isModelSpeaking: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, isModelSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let offset = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      
      const bars = 20;
      const spacing = 4;
      const barWidth = (width - (bars - 1) * spacing) / bars;

      for (let i = 0; i < bars; i++) {
        const magnitude = isModelSpeaking 
          ? Math.sin(offset + i * 0.5) * 20 + 25
          : Math.sin(offset + i * 0.2) * 5 + 10;
        
        const x = i * (barWidth + spacing);
        const y = (height - magnitude) / 2;
        
        ctx.fillStyle = isModelSpeaking ? '#A855F7' : '#3B82F6';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, magnitude, 4);
        ctx.fill();
      }

      offset += 0.15;
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, isModelSpeaking]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={60} 
        className="w-full max-w-xs"
      />
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-2">
        {isModelSpeaking ? "Friend is talking..." : isActive ? "Listening to you..." : "Ready"}
      </p>
    </div>
  );
};
