
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  return (
    <div className={`flex items-center font-['Fredoka'] select-none ${className}`}>
      <span className={`${sizeClasses[size]} font-bold text-slate-800 tracking-tight`}>Wiskunde</span>
      <span className={`${sizeClasses[size]} font-bold text-emerald-500`}>.</span>
    </div>
  );
};
