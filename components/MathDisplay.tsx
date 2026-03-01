
import React, { memo } from 'react';
import katex from 'katex';

interface MathDisplayProps {
  math: string;
  className?: string;
  block?: boolean;
}

const MathDisplayComponent: React.FC<MathDisplayProps> = ({ math, className, block = false }) => {
  const toLaTeX = (str: string) => {
    if (!str) return "";
    if (str.includes('\\')) return str;

    return str
      .replace(/·/g, '\\cdot ')
      .replace(/÷/g, ':')
      .replace(/√\((.*?)\)/g, '\\sqrt{$1}') 
      .replace(/√(\d+)/g, '\\sqrt{$1}')    
      .replace(/\^(\d+)/g, '^{$1}')         
      .replace(/\^\((.*?)\)/g, '^{$1}');    
  };

  try {
    const html = katex.renderToString(toLaTeX(math), {
      throwOnError: false,
      displayMode: block,
      trust: true
    });

    return (
      <span 
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (e) {
    return <span className={className}>{math}</span>;
  }
};

// Memoization zorgt voor veel betere performance bij grote lijsten of complexe schermen
export const MathDisplay = memo(MathDisplayComponent);
