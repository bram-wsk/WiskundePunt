
import React, { useEffect, useRef, useImperativeHandle, forwardRef, memo, useMemo } from 'react';
import 'mathlive';
import { normalizeMath } from '../constants';

interface MathInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onFocus?: (ref: MathInputRef) => void;
  onEnter?: () => void;
}

export interface MathInputRef {
  insert: (latex: string) => void;
  focus: () => void;
  setValue: (latex: string) => void;
  getSelection: () => string;
  getElement: () => any;
}

const MathFieldTag = 'math-field' as any;

const MathInputComponent = forwardRef<MathInputRef, MathInputProps>(({ value, onChange, disabled, onFocus, onEnter }, ref) => {
  const mfRef = useRef<any>(null);
  const isTypingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocus);
  const onEnterRef = useRef(onEnter);

  useEffect(() => {
    onChangeRef.current = onChange;
    onFocusRef.current = onFocus;
    onEnterRef.current = onEnter;
  }, [onChange, onFocus, onEnter]);

  const api = useMemo<MathInputRef>(() => ({
    insert: (latex: string) => {
      if (mfRef.current) {
        mfRef.current.insert(latex, { focus: true, selectionMode: 'placeholder' });
      }
    },
    focus: () => {
      if (mfRef.current) {
        requestAnimationFrame(() => {
          mfRef.current.focus();
        });
      }
    },
    setValue: (latex: string) => {
      if (mfRef.current) {
        mfRef.current.value = latex;
      }
    },
    getSelection: () => {
      if (mfRef.current) {
        return mfRef.current.getValue(mfRef.current.selection);
      }
      return "";
    },
    getElement: () => mfRef.current
  }), []);

  useImperativeHandle(ref, () => api);

  useEffect(() => {
    const mf = mfRef.current;
    if (!mf || isTypingRef.current) return;

    const currentVal = mf.value;
    if (!value && currentVal) {
      mf.value = "";
      return;
    }
    if (normalizeMath(value) !== normalizeMath(currentVal)) {
      mf.value = value || '';
    }
  }, [value]);

  useEffect(() => {
    if (mfRef.current) {
      mfRef.current.readOnly = !!disabled;
    }
  }, [disabled]);

  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;

    mf.mathVirtualKeyboardPolicy = "manual"; 
    mf.smartMode = false;
    mf.menuItems = []; 
    
    // UI Styling voor perfecte verticale uitlijning
    mf.style.display = "flex";
    mf.style.alignItems = "center";
    mf.style.justifyContent = "center";
    mf.style.width = "100%";
    mf.style.height = "100%";
    mf.style.minHeight = "46px";
    mf.style.outline = "none";
    mf.style.border = "none";
    mf.style.background = "transparent";
    mf.style.cursor = "text";
    mf.style.fontSize = "1.2rem";

    const handleInput = (e: any) => {
      isTypingRef.current = true;
      const newValue = e.target.value;
      if (onChangeRef.current) {
        onChangeRef.current(newValue);
      }
      setTimeout(() => {
        isTypingRef.current = false;
      }, 10);
    };

    const handleFocus = () => {
      if (onFocusRef.current) {
        onFocusRef.current(api);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault(); 
        if (onEnterRef.current) {
          onEnterRef.current();
        }
      }
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('focusin', handleFocus);
    mf.addEventListener('keydown', handleKeyDown);
    
    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('focusin', handleFocus);
      mf.removeEventListener('keydown', handleKeyDown);
    };
  }, [api]);

  return (
    <div 
      className="math-input-outer-container w-full h-full flex items-center justify-center cursor-text" 
      onMouseDown={(e) => {
        if (mfRef.current && document.activeElement !== mfRef.current) {
          e.preventDefault();
          mfRef.current.focus();
        }
      }}
    >
      <MathFieldTag ref={mfRef}></MathFieldTag>
    </div>
  );
});

export const MathInput = memo(MathInputComponent);
