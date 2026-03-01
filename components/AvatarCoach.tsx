
import React, { memo, useState, useEffect } from 'react';
import { ErrorType } from '../types';

interface AvatarCoachProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'thinking';
  title?: string;
  onAskHelp?: () => void;
  identifiedErrors?: ErrorType[]; // Nieuwe prop voor meervoudige fouten
}

export const AvatarCoach: React.FC<AvatarCoachProps> = memo(({ message, type = 'info', title, onAskHelp, identifiedErrors = [] }) => {
  const [visibleMessage, setVisibleMessage] = useState('');
  
  const cleanMessage = (msg: string) => {
    if (!msg) return "";
    return msg
      .replace(/\$(.*?)\$/g, '$1')
      .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '$1/$2')
      .replace(/\\cdot/g, '·')
      .replace(/\\div/g, ':')
      .replace(/\\times/g, '·')
      .replace(/\\ast/g, '·')
      .replace(/\\pm/g, '±')
      .replace(/\\sqrt/g, '√')
      .replace(/\\left/g, '')
      .replace(/\\right/g, '')
      .replace(/\{/g, '')
      .replace(/\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  useEffect(() => {
    setVisibleMessage('');
    const cleaned = cleanMessage(message);
    let i = 0;
    const interval = setInterval(() => {
      setVisibleMessage(cleaned.slice(0, i));
      i++;
      if (i > cleaned.length) clearInterval(interval);
    }, 12);

    return () => clearInterval(interval);
  }, [message, type]);

  const bubbleStyles = {
    success: 'bg-emerald-100/80 border-emerald-200 text-emerald-900 shadow-[0_8px_32px_rgba(16,185,129,0.15)]',
    error: 'bg-rose-100/80 border-rose-200 text-rose-900 shadow-[0_8px_32px_rgba(244,63,94,0.15)]',
    info: 'bg-white/80 border-white/50 text-slate-800 shadow-[0_8px_32px_rgba(30,41,59,0.1)]',
    thinking: 'bg-amber-100/80 border-amber-200 text-amber-900 shadow-[0_8px_32px_rgba(245,158,11,0.15)]'
  };

  const tailFill = {
    success: 'fill-emerald-100/80',
    error: 'fill-rose-100/80',
    info: 'fill-white/80',
    thinking: 'fill-amber-100/80'
  };

  const showHelpButton = onAskHelp && type !== 'success' && type !== 'thinking';

  return (
    <div className="fixed bottom-4 right-4 z-[40] flex flex-col items-end pointer-events-none max-w-[260px] md:max-w-[340px]">
      
      {message && (
        <div className={`
            mb-2 mr-4 p-5 rounded-2xl border backdrop-blur-md pointer-events-auto 
            animate-in slide-in-from-bottom-4 fade-in duration-300 relative
            ${bubbleStyles[type]}
          `}>
          
          {title && (
            <span className="text-[9px] font-black uppercase tracking-widest opacity-50 block mb-1">
              {title}
            </span>
          )}
          
          <div className="space-y-3">
            <p className="text-sm font-bold leading-relaxed font-sans pr-2">
              {visibleMessage}
            </p>

            {/* MEERVOUDIGE FOUTEN DASHBOARD */}
            {type === 'error' && identifiedErrors.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-rose-200/50">
                {identifiedErrors.map((err, idx) => (
                  <span key={idx} className="bg-rose-500/10 text-rose-600 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-rose-500/20">
                    <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                    {err}
                  </span>
                ))}
              </div>
            )}
          </div>

          {showHelpButton && (
            <div className="absolute -top-3 -right-3 animate-in zoom-in duration-300 delay-500">
               <button 
                 onClick={onAskHelp}
                 className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all cursor-pointer border-2 border-white"
                 title="Ik heb meer hulp nodig"
               >
                 <i className="fa-solid fa-question text-sm"></i>
               </button>
            </div>
          )}

          <svg 
            className="absolute -bottom-3 right-6 w-6 h-4 overflow-visible" 
            viewBox="0 0 20 20"
          >
             <path d="M 0 0 L 20 0 L 20 20 Q 10 10 0 0 Z" className={tailFill[type]} />
          </svg>
        </div>
      )}

      <div className="relative w-28 h-28 md:w-36 md:h-36 pointer-events-auto transition-transform hover:-translate-y-1 duration-300 -mr-2">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl overflow-visible">
          <defs>
            <linearGradient id="piBodyGrad" x1="0" y1="0" x2="1" y2="1">
               <stop offset="0%" stopColor="#4f46e5"/>
               <stop offset="100%" stopColor="#3730a3"/>
            </linearGradient>
          </defs>

          <circle cx="100" cy="110" r="70" 
            className={`transition-colors duration-500 ${
              type === 'error' ? 'fill-rose-200/40' : 
              type === 'success' ? 'fill-emerald-200/40' : 
              type === 'thinking' ? 'fill-amber-200/40' : 'fill-blue-200/40'
            }`} 
          />

          <g className="animate-[breathe_4s_infinite_ease-in-out]">
             <path 
               d="M 65 75 Q 65 45 100 45 Q 135 45 135 75 L 135 150 Q 135 160 145 160 L 120 160 L 120 85 Q 120 80 115 80 L 85 80 Q 80 80 80 85 L 80 150 Q 80 160 65 160 L 65 150 L 65 75 Z"
               fill="url(#piBodyGrad)"
               stroke="#312e81" strokeWidth="2"
             />
             <path d="M 50 55 Q 100 45 150 55 L 150 70 Q 100 60 50 70 Z" fill="url(#piBodyGrad)" stroke="#312e81" strokeWidth="2" />
             <g transform="translate(65, 150)"><path d="M -8 0 L 15 0 Q 18 0 18 8 L -8 8 Z" fill="#f8fafc" stroke="#334155" strokeWidth="1.5"/><path d="M -8 8 L 18 8 L 18 11 L -8 11 Z" fill="#94a3b8" /></g>
             <g transform="translate(120, 150)"><path d="M -3 0 L 20 0 Q 23 0 23 8 L -3 8 Z" fill="#f8fafc" stroke="#334155" strokeWidth="1.5"/><path d="M -3 8 L 23 8 L 23 11 L -3 11 Z" fill="#94a3b8" /></g>
             <g transform="translate(100, 85)"><path d="M -12 -6 L -12 6 L 0 2 L 12 6 L 12 -6 L 0 -2 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="1"/><rect x="-3" y="-3" width="6" height="6" rx="1" fill="#d97706" /></g>
             <g transform="translate(100, 65)">
                <g stroke="#f8fafc" strokeWidth="2.5" fill="rgba(255,255,255,0.2)"><circle cx="-16" cy="0" r="11" /><circle cx="16" cy="0" r="11" /><path d="M -5 0 L 5 0" strokeWidth="2" /></g>
                <g className="animate-[blink_5s_infinite]"><circle cx="-16" cy="0" r="3" fill="white" /><circle cx="16" cy="0" r="3" fill="white" /></g>
                <g stroke="#312e81" strokeWidth="2" strokeLinecap="round" fill="none">
                   {type === 'error' ? (<><path d="M -24 -16 L -10 -13" /><path d="M 24 -16 L 10 -13" /></>) : type === 'thinking' ? (<><path d="M -24 -15 Q -18 -20 -12 -15" /><path d="M 12 -18 L 24 -18" /></>) : (<><path d="M -24 -15 Q -18 -19 -12 -15" /><path d="M 12 -15 Q 18 -19 24 -15" /></>)}
                </g>
                <g transform="translate(0, 20)">
                   {type === 'success' ? (<path d="M -8 -4 Q 0 6 8 -4" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />) : type === 'error' ? (<path d="M -6 2 Q 0 -3 6 2" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />) : type === 'thinking' ? (<circle cx="0" cy="0" r="2.5" fill="white" />) : (<path d="M -6 -2 Q 0 3 6 -2" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />)}
                </g>
             </g>
             <g transform="translate(140, 55) rotate(-20)"><rect x="0" y="0" width="5" height="25" fill="#fcd34d" stroke="#d97706" strokeWidth="0.5" rx="1"/><rect x="0" y="20" width="5" height="4" fill="#fca5a5" /><path d="M 0 0 L 2.5 -6 L 5 0 Z" fill="#fcd34d" /><path d="M 1.5 -2.5 L 2.5 -6 L 3.5 -2.5 Z" fill="#1e293b" /></g>
          </g>
        </svg>
      </div>

      <style>{`
        @keyframes breathe { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-2px) scale(1.02); } }
        @keyframes blink { 0%, 96%, 100% { transform: scaleY(1); } 98% { transform: scaleY(0.1); } }
      `}</style>
    </div>
  );
});
