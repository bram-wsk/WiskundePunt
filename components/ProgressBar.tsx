
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = Math.min((current / total) * 100, 100);
  
  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-full h-4 relative overflow-hidden shadow-inner">
      <div 
        className="bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)] relative"
        style={{ width: `${percentage}%` }}
      >
        {/* Animated flow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
      </div>
    </div>
  );
};
