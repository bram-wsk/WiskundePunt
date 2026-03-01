
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ErrorType, SessionStats, LearningDiary, AIProgression } from '../types';

interface SessionSummaryProps {
  stats: SessionStats;
  onRestart: () => void;
  diary?: LearningDiary;
  onLogout?: () => void;
  progression?: AIProgression | null;
  isEvaluating?: boolean;
}

const LEVEL_CONFIG = {
  1: { label: 'Zaadje', icon: 'fa-seedling', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  2: { label: 'Plantje', icon: 'fa-leaf', color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600' },
  3: { label: 'Boompje', icon: 'fa-tree', color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600' }
};

export const SessionSummary: React.FC<SessionSummaryProps> = ({ stats, onRestart, onLogout, progression, isEvaluating }) => {
  const [showTeacherDetails, setShowTeacherDetails] = useState(false);

  const chartData = (Object.entries(stats.errorDistribution) as [ErrorType, number][])
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      shortName: name.length > 20 ? name.split(' ')[0] + '...' : name
    }));

  const COLORS = {
    [ErrorType.ORDER]: '#f43f5e',
    [ErrorType.CALCULATION]: '#2563eb',
    [ErrorType.SIGN]: '#f59e0b',
    [ErrorType.CONCEPT]: '#a855f7',
    [ErrorType.COPY]: '#64748b',
    [ErrorType.UNKNOWN]: '#94a3b8'
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12 bg-white rounded-[4rem] shadow-2xl border border-blue-50 animate-in zoom-in-95 duration-500 space-y-12">
      <div className="text-center">
        <div className="inline-block p-8 bg-blue-50 rounded-[3rem] mb-6 relative animate-bounce-subtle">
          <i className="fa-solid fa-graduation-cap text-7xl text-blue-600"></i>
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Mijn Eindrapport</h2>
        <p className="text-slate-500 mt-2 font-medium text-lg italic">"Groeien doe je stap voor stap!"</p>
      </div>

      {isEvaluating ? (
        <div className="bg-blue-50 border-4 border-dashed border-blue-100 p-16 rounded-[3rem] text-center space-y-6">
          <div className="w-16 h-16 border-8 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>
            <p className="text-blue-600 font-black uppercase tracking-[0.2em] text-xs">Een momentje geduld...</p>
            <p className="text-blue-400 font-bold mt-2">Je persoonlijke feedback wordt geschreven.</p>
          </div>
        </div>
      ) : progression ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feed-up: Waar werk ik naartoe? */}
            <div className="bg-amber-50/50 p-8 rounded-[3rem] border-2 border-amber-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fa-solid fa-bullseye"></i>
                </div>
                <h4 className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Feed-up</h4>
              </div>
              <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest leading-none">Mijn leerdoel</p>
              <p className="text-slate-700 font-bold leading-relaxed text-sm">
                {progression.feedUp}
              </p>
            </div>

            {/* Feedback: Hoe doe ik het nu? */}
            <div className="bg-blue-50/50 p-8 rounded-[3rem] border-2 border-blue-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fa-solid fa-magnifying-glass-chart"></i>
                </div>
                <h4 className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Feedback</h4>
              </div>
              <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest leading-none">Mijn prestatie</p>
              <p className="text-slate-700 font-bold leading-relaxed text-sm">
                {progression.feedback}
              </p>
            </div>

            {/* Feed-forward: Wat is de volgende stap? */}
            <div className="bg-emerald-50/50 p-8 rounded-[3rem] border-2 border-emerald-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fa-solid fa-forward-step"></i>
                </div>
                <h4 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Feed-forward</h4>
              </div>
              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest leading-none">Mijn actieplan</p>
              <p className="text-slate-700 font-bold leading-relaxed text-sm">
                {progression.feedForward}
              </p>
            </div>

            {/* Groei Boodschap - breed over 3 kolommen */}
            <div className="md:col-span-3 p-10 bg-white rounded-[3rem] border-4 border-blue-50 shadow-xl flex flex-col md:flex-row items-center gap-10">
              <div className={`w-32 h-32 rounded-[2rem] flex items-center justify-center text-5xl shadow-2xl shrink-0 ${LEVEL_CONFIG[progression.newLevel as keyof typeof LEVEL_CONFIG]?.bg || 'bg-slate-50'} ${LEVEL_CONFIG[progression.newLevel as keyof typeof LEVEL_CONFIG]?.text || 'text-slate-400'}`}>
                <i className={`fa-solid ${LEVEL_CONFIG[progression.newLevel as keyof typeof LEVEL_CONFIG]?.icon || 'fa-seedling'}`}></i>
              </div>
              <div className="text-center md:text-left space-y-3 flex-1">
                <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Evaluatie</h4>
                <p className="text-3xl font-black text-slate-900 leading-tight">"{progression.growthMessage}"</p>
              </div>
            </div>
          </div>
          
          {/* TEACHER INSIGHT SECTION (Toggle) */}
          <div className="space-y-4">
            <div className="flex justify-center">
               <button 
                  onClick={() => setShowTeacherDetails(!showTeacherDetails)}
                  className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black uppercase text-[10px] tracking-widest transition-colors cursor-pointer bg-transparent border-none"
               >
                  <i className={`fa-solid ${showTeacherDetails ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                  {showTeacherDetails ? 'Verberg leerkracht analyse' : 'Toon analyse voor leerkracht'}
               </button>
            </div>

            {showTeacherDetails && (
              <div className="bg-slate-800 text-slate-200 p-8 rounded-[2rem] animate-in slide-in-from-top-4 duration-300 shadow-inner">
                 <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
                       <i className="fa-solid fa-robot"></i>
                    </div>
                    <div className="space-y-2">
                       <h4 className="text-emerald-400 font-black uppercase tracking-widest text-xs">AI Didactische Verantwoording</h4>
                       <p className="text-sm leading-relaxed font-mono opacity-90 border-l-2 border-slate-600 pl-4">
                          {progression.reasoning}
                       </p>
                       <div className="pt-4 flex gap-4 text-[10px] font-mono text-slate-400 uppercase">
                          <span>Resultaat: {progression.shouldLevelUp ? 'GOEDGEKEURD' : 'BEHOUDEN'}</span>
                          <span>•</span>
                          <span>Fouten: {stats.totalErrors}</span>
                          <span>•</span>
                          <span>Gemaakt: {stats.completed}</span>
                       </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 bg-slate-50 p-10 rounded-[3rem] border-2 border-slate-100 space-y-8">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Fout-Analyse</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.completed} oefeningen gemaakt</span>
          </div>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={8} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    tick={{fill: '#475569', fontWeight: 800}} 
                  />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold', padding: '16px' }} 
                  />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={48}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#ccc'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-emerald-500 gap-6">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-4xl shadow-inner">
                  <i className="fa-solid fa-certificate"></i>
                </div>
                <div className="text-center">
                  <p className="font-black uppercase text-xs tracking-[0.3em]">Perfecte Score!</p>
                  <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-widest">Geen enkele fout gemaakt deze sessie.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-blue-600 p-8 rounded-[3rem] text-white space-y-6 shadow-2xl shadow-blue-200">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <i className="fa-solid fa-arrow-rotate-left"></i>
               </div>
               <h4 className="text-[11px] font-black uppercase tracking-widest">Nieuwe poging</h4>
             </div>
             <p className="text-blue-100 text-xs font-bold leading-relaxed">Klaar om nog sterker te worden? Begin een nieuwe sessie met verse oefeningen.</p>
             <button
              type="button"
              onClick={onRestart}
              className="w-full bg-white text-blue-600 font-black py-5 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-[11px] border-none shadow-xl hover:bg-blue-50 cursor-pointer"
            >
              Start nieuwe sessie
            </button>
          </div>

          <button 
            onClick={onLogout}
            className="w-full bg-slate-900 p-8 rounded-[3rem] text-white flex flex-col items-center justify-center text-center space-y-4 border-none cursor-pointer hover:bg-slate-800 transition-colors"
          >
            <i className="fa-solid fa-power-off text-slate-600 text-2xl"></i>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sessie beëindigen</p>
          </button>
        </div>
      </div>
    </div>
  );
};
