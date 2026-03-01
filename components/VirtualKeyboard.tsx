
import React, { useMemo } from 'react';
import { MathInputRef } from './MathInput';
import { ModuleId } from '../types';

interface VirtualKeyboardProps {
  inputRef: React.RefObject<MathInputRef | null>;
  moduleId: ModuleId;
  onEnter: () => void;
  isAnalyzing: boolean;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ inputRef, moduleId, onEnter, isAnalyzing }) => {
  
  const handlePress = (e: React.MouseEvent | React.TouchEvent, latex: string, command?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Tril-feedback (haptic feedback) als het apparaat dit ondersteunt
    if (navigator.vibrate) navigator.vibrate(5);

    if (command === 'delete') {
      inputRef.current?.getElement()?.executeCommand('deleteBackward');
    } else if (command === 'enter') {
      onEnter();
    } else {
      inputRef.current?.insert(latex);
    }
    
    // Houd focus op het veld
    inputRef.current?.focus();
  };

  const keys = useMemo(() => {
    const basicKeys = [
      { label: '7', latex: '7' }, { label: '8', latex: '8' }, { label: '9', latex: '9' }, { label: '÷', latex: ':' },
      { label: '4', latex: '4' }, { label: '5', latex: '5' }, { label: '6', latex: '6' }, { label: '·', latex: '\\cdot' },
      { label: '1', latex: '1' }, { label: '2', latex: '2' }, { label: '3', latex: '3' }, { label: '-', latex: '-' },
      { label: '0', latex: '0' }, { label: ',', latex: ',' }, { label: '+', latex: '+' }, { label: '=', latex: '=' }
    ];

    // Variabelen en haakjes
    const varKeys = [
      { label: 'x', latex: 'x', color: 'text-purple-600 bg-purple-50' },
      { label: '(', latex: '(', color: 'text-slate-600 bg-slate-100' },
      { label: ')', latex: ')', color: 'text-slate-600 bg-slate-100' }
    ];

    // Module specifieke toetsen
    const extraKeys = [];
    if (moduleId === 'volgorde-machten') {
      extraKeys.push({ label: 'x²', latex: '^2', color: 'text-indigo-600 bg-indigo-50' });
      extraKeys.push({ label: '√', latex: '\\sqrt{#?}', color: 'text-indigo-600 bg-indigo-50' });
    } else if (moduleId === 'volgorde-rationaal' || moduleId === 'vergelijkingen-rationaal') {
      extraKeys.push({ label: 'a/b', latex: '\\frac{#?}{#?}', color: 'text-indigo-600 bg-indigo-50' });
    }
    
    return { basicKeys, varKeys, extraKeys };
  }, [moduleId]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 pb-6 md:pb-2 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] select-none animate-in slide-in-from-bottom-full duration-300">
      <div className="max-w-5xl mx-auto flex gap-2 h-48 md:h-56">
        
        {/* Linkerblok: Acties & Variabelen */}
        <div className="flex flex-col gap-2 w-1/4">
           <div className="flex-1 grid grid-cols-1 gap-2">
              <button 
                onMouseDown={(e) => handlePress(e, '', 'delete')}
                className="rounded-2xl bg-rose-50 text-rose-500 font-black text-xl flex items-center justify-center active:scale-95 transition-transform shadow-sm border border-rose-100"
              >
                <i className="fa-solid fa-delete-left"></i>
              </button>
           </div>
           <div className="flex-[2] grid grid-cols-2 gap-2">
              {keys.extraKeys.map(k => (
                <button key={k.label} onMouseDown={(e) => handlePress(e, k.latex)} className={`rounded-xl font-black text-lg shadow-sm border border-slate-200 active:scale-95 transition-transform ${k.color || 'bg-slate-50 text-slate-700'}`}>{k.label}</button>
              ))}
              {keys.varKeys.map(k => (
                <button key={k.label} onMouseDown={(e) => handlePress(e, k.latex)} className={`rounded-xl font-black text-lg shadow-sm border border-slate-200 active:scale-95 transition-transform ${k.color || 'bg-slate-50 text-slate-700'}`}>{k.label}</button>
              ))}
           </div>
        </div>

        {/* Middenblok: Cijfers & Operaties */}
        <div className="flex-1 grid grid-cols-4 gap-2">
          {keys.basicKeys.map((k) => (
             <button
               key={k.label}
               onMouseDown={(e) => handlePress(e, k.latex)}
               className={`rounded-2xl font-black text-2xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all
                 ${['+', '-', '·', ':', '='].includes(k.label) 
                    ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                 }`}
             >
               {k.label}
             </button>
          ))}
        </div>

        {/* Rechterblok: Enter / Check */}
        <div className="w-1/5 flex flex-col">
           <button
             disabled={isAnalyzing}
             onMouseDown={(e) => handlePress(e, '', 'enter')}
             className="h-full rounded-2xl bg-emerald-500 text-white font-black text-xl flex flex-col items-center justify-center shadow-lg shadow-emerald-200 active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale"
           >
             {isAnalyzing ? (
               <i className="fa-solid fa-spinner fa-spin"></i>
             ) : (
               <>
                 <i className="fa-solid fa-check text-3xl mb-1"></i>
                 <span className="text-[10px] uppercase tracking-widest">OK</span>
               </>
             )}
           </button>
        </div>

      </div>
    </div>
  );
};
