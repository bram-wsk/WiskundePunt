
import React, { useMemo } from 'react';
import { QUICK_SYMBOLS } from '../constants';
import { MathInputRef } from './MathInput';
import { ModuleId } from '../types';

interface MathToolbarProps {
  inputRef: React.RefObject<MathInputRef | null>;
  moduleId?: ModuleId;
  className?: string;
  size?: 'sm' | 'md';
}

export const MathToolbar: React.FC<MathToolbarProps> = ({ inputRef, moduleId, className = "", size = "md" }) => {
  const handleInsert = (e: React.MouseEvent, latex: string) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.insert(latex);
  };

  const filteredSymbols = useMemo(() => {
    // Globale mix (Sigma Challenge) toont altijd alle symbolen
    if (moduleId === 'mix') {
      return QUICK_SYMBOLS;
    }

    // Specifieke logica voor Hoofdbewerkingen sub-sub-modules
    if (moduleId === 'hoofdbewerkingen-natuurlijk-optellen-aftrekken') {
      return QUICK_SYMBOLS.filter(s => ['+', '-'].includes(s.label));
    }
    if (moduleId === 'hoofdbewerkingen-geheel-optellen-aftrekken') {
      return QUICK_SYMBOLS.filter(s => ['+', '-', '(', ')'].includes(s.label));
    }
    if (moduleId === 'hoofdbewerkingen-rationaal-optellen-aftrekken') {
      return QUICK_SYMBOLS.filter(s => ['+', '-', 'a/b', '(', ')'].includes(s.label));
    }

    if (moduleId === 'hoofdbewerkingen-natuurlijk-vermenigvuldigen-delen') {
      return QUICK_SYMBOLS.filter(s => ['·', ':'].includes(s.label));
    }
    if (moduleId === 'hoofdbewerkingen-geheel-vermenigvuldigen-delen') {
      return QUICK_SYMBOLS.filter(s => ['·', ':', '(', ')'].includes(s.label));
    }
    if (moduleId === 'hoofdbewerkingen-rationaal-vermenigvuldigen-delen') {
      return QUICK_SYMBOLS.filter(s => ['·', ':', 'a/b', '(', ')'].includes(s.label));
    }

    // Overige modules (Volgorde, Vergelijkingen)
    if (moduleId === 'volgorde-geheel' || moduleId === 'vergelijkingen-geheel') {
      return QUICK_SYMBOLS.filter(s => !['xʸ', '√x', 'a/b'].includes(s.label));
    }
    
    if (moduleId === 'volgorde-machten') {
      return QUICK_SYMBOLS.filter(s => s.label !== 'a/b');
    }

    // Default: toon alles
    return QUICK_SYMBOLS;
  }, [moduleId]);

  const btnClass = size === 'sm' 
    ? "h-10 px-4 text-xs bg-white border-2 border-slate-200 rounded-xl font-black text-slate-700 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90 shadow-sm flex items-center justify-center min-w-[2.5rem]"
    : "w-12 h-12 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center font-black text-slate-700 hover:border-indigo-600 hover:bg-indigo-50 transition-all text-lg active:scale-90 shadow-md";

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {filteredSymbols.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onMouseDown={(e) => handleInsert(e, btn.latex)}
          className={btnClass}
          title={btn.label === 'a/b' ? 'Breuk invoegen' : btn.label}
        >
          {btn.label === 'a/b' ? (
            <div className="flex flex-col items-center leading-none">
              <span className={size === 'sm' ? 'text-[9px]' : 'text-xs'}>a</span>
              <div className={`w-3 h-[1.5px] bg-current my-[1px] rounded-full`}></div>
              <span className={size === 'sm' ? 'text-[9px]' : 'text-xs'}>b</span>
            </div>
          ) : (
            btn.label
          )}
        </button>
      ))}
    </div>
  );
};
