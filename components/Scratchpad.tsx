
import React, { useRef, useEffect, useState } from 'react';

interface ScratchpadProps {
  onClose: () => void;
}

export const Scratchpad: React.FC<ScratchpadProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#2563eb');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on window
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    ctx?.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.strokeStyle = color;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-amber-50 w-full max-w-4xl h-[80vh] rounded-[2rem] shadow-2xl flex flex-col border-8 border-amber-100 relative">
        <div className="absolute top-4 right-4 flex gap-2">
           <button onClick={clear} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-md border-none cursor-pointer">
              <i className="fa-solid fa-eraser"></i>
           </button>
           <button onClick={onClose} className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white transition-all shadow-md border-none cursor-pointer">
              <i className="fa-solid fa-xmark"></i>
           </button>
        </div>

        <div className="p-6 flex items-center gap-6 border-b border-amber-200/50">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                 <i className="fa-solid fa-pen-fancy"></i>
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Mijn Kladblad</h3>
           </div>
           <div className="flex gap-2">
              {['#2563eb', '#10b981', '#f43f5e', '#1e293b'].map(c => (
                <button 
                  key={c} 
                  onClick={() => setColor(c)} 
                  className={`w-8 h-8 rounded-full border-4 transition-all cursor-pointer ${color === c ? 'border-amber-400 scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
           </div>
        </div>

        <div className="flex-1 relative cursor-crosshair touch-none overflow-hidden">
          <canvas 
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseMove={draw}
            onTouchStart={startDrawing}
            onTouchEnd={stopDrawing}
            onTouchMove={draw}
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        </div>

        <div className="p-4 text-center">
           <p className="text-[10px] font-black text-amber-300 uppercase tracking-[0.3em]">Krabbel hier je tussenberekeningen</p>
        </div>
      </div>
    </div>
  );
};
