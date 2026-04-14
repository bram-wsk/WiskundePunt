
import React, { memo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ErrorType } from '../types';
import { useLowStimulus } from '../hooks/useLowStimulus';

interface AvatarCoachProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'thinking';
  title?: string;
  onAskHelp?: () => void;
  identifiedErrors?: ErrorType[]; // Nieuwe prop voor meervoudige fouten
  ttsEnabled?: boolean;
}

export const AvatarCoach: React.FC<AvatarCoachProps> = memo(({ message, type = 'info', title, onAskHelp, identifiedErrors = [], ttsEnabled = false }) => {
  const [visibleMessage, setVisibleMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { isLowStimulus } = useLowStimulus();
  
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
    
    if (isLowStimulus) {
      setVisibleMessage(cleaned);
      return;
    }

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

  const handleSpeak = () => {
    if (!ttsEnabled || !message) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleaned = cleanMessage(message);
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = 'nl-NL';
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking when unmounted
  useEffect(() => {
    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <motion.div 
      drag 
      dragMomentum={false}
      className="fixed bottom-4 right-4 z-[40] flex flex-col items-end pointer-events-none max-w-[260px] md:max-w-[340px]"
    >
      
      {message && (
        <div className={`
            mb-2 mr-4 p-5 rounded-2xl border backdrop-blur-md pointer-events-auto 
            ${isLowStimulus ? '' : 'animate-in slide-in-from-bottom-4 fade-in duration-300'} relative
            ${bubbleStyles[type]}
          `}>
          
          {title && (
            <span className="text-[9px] font-black uppercase tracking-widest opacity-50 block mb-1">
              {title}
            </span>
          )}
          
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold leading-relaxed font-sans pr-2">
                {visibleMessage}
              </p>
              {ttsEnabled && (
                <button 
                  onClick={handleSpeak}
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors border-none cursor-pointer ${isSpeaking ? 'bg-blue-500 text-white shadow-md' : 'bg-black/5 text-black/50 hover:bg-black/10'}`}
                  title={isSpeaking ? "Stop voorlezen" : "Lees voor"}
                >
                  <i className={`fa-solid ${isSpeaking ? 'fa-stop' : 'fa-volume-high'} text-xs`}></i>
                </button>
              )}
            </div>

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
            <div className={`absolute -top-3 -right-3 ${isLowStimulus ? '' : 'animate-in zoom-in duration-300 delay-500'}`}>
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

      <div className={`relative w-28 h-28 md:w-36 md:h-36 pointer-events-auto ${isLowStimulus ? '' : 'transition-transform hover:-translate-y-1 duration-300'} -mr-2 cursor-grab active:cursor-grabbing`}>
        <svg viewBox="0 0 200 200" className={`w-full h-full ${isLowStimulus ? '' : 'drop-shadow-xl'} overflow-visible`}>
          <defs>
            <clipPath id="circleClip">
              <circle cx="100" cy="100" r="95" />
            </clipPath>
          </defs>

          {/* Minimal Background Aura */}
          <circle cx="100" cy="100" r="95" 
            className={`${isLowStimulus ? '' : 'transition-colors duration-500'} ${
              type === 'error' ? 'fill-rose-50' : 
              type === 'success' ? 'fill-emerald-50' : 
              type === 'thinking' ? 'fill-amber-50' : 'fill-slate-50'
            }`} 
          />

          <g className={isLowStimulus ? '' : 'animate-[breathe_4s_infinite_ease-in-out]'} clipPath="url(#circleClip)">
            {/* Shoulders / Sweater Base */}
            <path d="M 25 200 C 25 135, 55 140, 100 140 C 145 140, 175 135, 175 200 Z" fill="#0f4c5c" />
            
            {/* Shirt Collar */}
            <path d="M 80 140 L 100 165 L 120 140 Z" fill="#f8fafc" />
            <path d="M 80 140 L 100 150 L 120 140 Z" fill="#e2e8f0" />

            {/* Subtle Prime Number Pin (Silver '7') */}
            <g transform="translate(125, 155)">
              <path d="M 0 0 L 4 0 L 1.5 5" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* Neck */}
            <rect x="88" y="110" width="24" height="35" fill="#f5d0b5" />
            {/* Neck shadow */}
            <path d="M 88 110 Q 100 120 112 110 L 112 125 Q 100 135 88 125 Z" fill="#d4a383" opacity="0.4" />

            {/* Head (Young adult, clean jawline) */}
            <path d="M 65 65 C 65 25, 135 25, 135 65 C 135 105, 118 120, 100 120 C 82 120, 65 105, 65 65 Z" fill="#f5d0b5" />

            {/* Ears */}
            <path d="M 65 82 C 57 82, 57 70, 65 70 Z" fill="#f5d0b5" />
            <path d="M 135 82 C 143 82, 143 70, 135 70 Z" fill="#f5d0b5" />

            {/* Hair (Short, neat, modern, slight natural variation) */}
            {/* Base hair */}
            <path d="M 63 62 C 63 25, 137 25, 137 62 C 137 50, 115 42, 100 44 C 85 46, 70 55, 63 62 Z" fill="#3b2818" />
            {/* Top texture/volume (neat but natural) */}
            <path d="M 100 28 C 125 28, 137 42, 137 62 C 125 45, 110 42, 100 44 C 85 46, 75 52, 68 60 C 72 40, 85 28, 100 28 Z" fill="#4a3320" />
            {/* Slight natural variation on top */}
            <path d="M 85 29 Q 90 25 95 29 Q 92 32 85 29 Z" fill="#4a3320" />
            <path d="M 110 30 Q 115 27 120 32 Q 115 34 110 30 Z" fill="#3b2818" />
            {/* Sideburns */}
            <path d="M 63 60 L 65 72 L 66.5 72 L 66.5 60 Z" fill="#3b2818" />
            <path d="M 137 60 L 135 72 L 133.5 72 L 133.5 60 Z" fill="#3b2818" />

            {/* Eyes (Calm, intelligent) */}
            <g className={isLowStimulus ? '' : 'animate-[blink_5s_infinite]'}>
              <circle cx={type === 'thinking' ? 78 : 80} cy={type === 'thinking' ? 85 : 86} r="3.5" fill="#1e293b" />
              <circle cx={type === 'thinking' ? 118 : 120} cy={type === 'thinking' ? 85 : 86} r="3.5" fill="#1e293b" />
            </g>

            {/* Subtle Round Glasses */}
            <circle cx="80" cy="86" r="12" fill="none" stroke="#475569" strokeWidth="1.5" />
            <circle cx="120" cy="86" r="12" fill="none" stroke="#475569" strokeWidth="1.5" />
            <path d="M 92 86 Q 100 84 108 86" fill="none" stroke="#475569" strokeWidth="1.5" />
            <path d="M 68 86 L 63 84" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 132 86 L 137 84" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />

            {/* Eyebrows (Neat, professional) */}
            <g stroke="#3b2818" strokeWidth="2.5" strokeLinecap="round" fill="none">
              {type === 'error' ? (
                <>
                  <path d="M 73 77 L 87 79" />
                  <path d="M 127 77 L 113 79" />
                </>
              ) : type === 'thinking' ? (
                <>
                  <path d="M 73 77 L 87 75" />
                  <path d="M 127 74 L 113 75" />
                </>
              ) : type === 'success' ? (
                <>
                  <path d="M 73 76 Q 80 74 87 76" />
                  <path d="M 127 76 Q 120 74 113 76" />
                </>
              ) : (
                <>
                  <path d="M 73 76 Q 80 74 87 76" />
                  <path d="M 127 76 Q 120 74 113 76" />
                </>
              )}
            </g>

            {/* Nose (Clean, minimal) */}
            <path d="M 100 90 L 100 102 L 104 102" fill="none" stroke="#c89473" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Mouth (Subtle, reliable smile) */}
            {type === 'error' ? (
              <path d="M 93 113 Q 100 111 107 113" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
            ) : type === 'thinking' ? (
              <line x1="94" y1="112" x2="106" y2="112" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
            ) : type === 'success' ? (
              <path d="M 91 111 Q 100 116 109 111" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M 93 112 Q 100 115 107 112" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </g>
        </svg>
      </div>

      <style>{`
        @keyframes breathe { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-2px) scale(1.02); } }
        @keyframes blink { 0%, 96%, 100% { transform: scaleY(1); } 98% { transform: scaleY(0.1); } }
      `}</style>
    </motion.div>
  );
});
