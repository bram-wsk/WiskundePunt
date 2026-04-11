
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'text' | 'icon';
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 'md', variant = 'text' }) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  const iconSizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-16 h-16 text-3xl',
    xl: 'w-24 h-24 text-5xl'
  };

  if (variant === 'icon') {
    return (
      <div className={`flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 font-['Fredoka'] select-none ${iconSizeClasses[size].split(' ').slice(0,2).join(' ')} ${className}`}>
        <span className={`${iconSizeClasses[size].split(' ').slice(2).join(' ')} font-bold text-slate-800 tracking-tight`}>W</span>
        <span className={`${iconSizeClasses[size].split(' ').slice(2).join(' ')} font-bold text-emerald-500`}>.</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center font-['Fredoka'] select-none ${className}`}>
      <span className={`${sizeClasses[size]} font-bold text-slate-800 tracking-tight`}>W</span>
      <span className={`${sizeClasses[size]} font-bold text-emerald-500`}>.</span>
    </div>
  );
};
