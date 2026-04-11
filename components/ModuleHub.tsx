

import React, { useState, useMemo } from 'react';
import { ModuleId, ModuleProgress, ThemeConfig, UserInfo, SubModuleConfig } from '../types';
import { AvatarCoach } from './AvatarCoach';

interface ModuleHubProps {
  themes: ThemeConfig[];
  progress: Record<string, ModuleProgress>;
  onSelect: (id: ModuleId) => void;
  user: UserInfo;
  lockedModules: string[];
}

const LEVEL_INFO = {
  1: { label: 'Zaadje', icon: 'fa-seedling', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  2: { label: 'Plantje', icon: 'fa-leaf', color: 'text-blue-500', bg: 'bg-blue-50' },
  3: { label: 'Boompje', icon: 'fa-tree', color: 'text-purple-500', bg: 'bg-purple-50' }
};

export const ModuleHub: React.FC<ModuleHubProps> = ({ themes, progress, onSelect, user, lockedModules }) => {
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [activeSubModuleGroupId, setActiveSubModuleGroupId] = useState<ModuleId | null>(null);

  const activeTheme = useMemo(() => themes.find(t => t.id === activeThemeId), [activeThemeId, themes]);
  const activeSubModuleGroup = useMemo(() => {
    if (!activeTheme || !activeSubModuleGroupId) return null;
    return activeTheme.subModules?.find(sub => sub.id === activeSubModuleGroupId);
  }, [activeTheme, activeSubModuleGroupId]);

  // Determine what list of modules to display
  const modulesToDisplay = useMemo(() => {
    if (!activeThemeId) {
      // Top level: show main themes (filtered by locks)
      return themes.filter(t => !lockedModules.includes(t.id));
    } else if (activeThemeId && !activeSubModuleGroupId) {
      // First level deep: show sub-modules of the active theme (filtered by locks)
      return activeTheme?.subModules?.filter(sub => !lockedModules.includes(sub.id)) || [];
    } else if (activeThemeId && activeSubModuleGroupId) {
      // Second level deep: show sub-modules of the active sub-module group (filtered by locks)
      return activeSubModuleGroup?.subModules?.filter(sub => !lockedModules.includes(sub.id)) || [];
    }
    return [];
  }, [activeThemeId, activeSubModuleGroupId, activeTheme, activeSubModuleGroup, themes, lockedModules]);


  const handleSelectModule = (item: ThemeConfig | SubModuleConfig) => {
    if (lockedModules.includes(item.id)) return; // Should already be filtered, but safety check

    if (item.subModules && item.subModules.length > 0) {
      // If the item has nested subModules, navigate deeper
      if (!activeThemeId) {
        setActiveThemeId(item.id);
      } else {
        // Must be a SubModuleConfig with further subModules
        setActiveSubModuleGroupId(item.id as ModuleId);
      }
    } else {
      // If it's a leaf node (no further subModules), select it for problems
      onSelect(item.id as ModuleId);
    }
  };

  const handleBack = () => {
    if (activeSubModuleGroupId) {
      setActiveSubModuleGroupId(null);
    } else if (activeThemeId) {
      setActiveThemeId(null);
    }
  };

  const currentGreeting = useMemo(() => {
    if (activeSubModuleGroup) {
      return `Prima keuze, ${user.firstName}. Welk onderdeel van ${activeSubModuleGroup.title.toLowerCase()} gaan we vandaag overwinnen?`;
    } else if (activeTheme) {
      return `Prima keuze, ${user.firstName}. Welk onderdeel van ${activeTheme.title.toLowerCase()} gaan we vandaag overwinnen?`;
    }
    return `Welkom, ${user.firstName}. Waar focussen we vandaag op?`;
  }, [activeTheme, activeSubModuleGroup, user.firstName]);

  const currentTitle = useMemo(() => {
    if (activeSubModuleGroup) {
      return activeSubModuleGroup.title;
    } else if (activeTheme) {
      return activeTheme.title;
    }
    return `Dag ${user.firstName}!`;
  }, [activeTheme, activeSubModuleGroup, user.firstName]);


  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {(activeThemeId || activeSubModuleGroupId) && (
        <div className="bg-white p-5 md:p-8 rounded-3xl md:rounded-[3rem] border border-blue-50 shadow-sm relative overflow-hidden mb-6 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3 mb-4">
               <button onClick={handleBack} className="text-blue-600 font-black uppercase text-[9px] md:text-[10px] tracking-widest bg-blue-50 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border-none cursor-pointer hover:bg-blue-100 transition-all">
                  <i className="fa-solid fa-arrow-left mr-1 md:mr-2"></i> Terug
               </button>
               {activeTheme && (
                 <>
                   <span className="text-slate-300">/</span>
                   <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">{activeTheme.title}</span>
                 </>
               )}
               {activeSubModuleGroup && (
                 <>
                   <span className="text-slate-300">/</span>
                   <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">{activeSubModuleGroup.title}</span>
                 </>
               )}
            </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {currentTitle}
          </h2>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {modulesToDisplay.map((item) => {
          const modProgress = progress[item.id as ModuleId] || { growthStatus: 1, solvedProblemIds: [] };
          const level = LEVEL_INFO[modProgress.growthStatus as keyof typeof LEVEL_INFO];
          const isLocked = lockedModules.includes(item.id);

          if (isLocked) return null; // Ensure locked items are not rendered

          // Special rendering for the global Sigma-Challenge at the top level
          if (item.id === 'mix' && !activeThemeId) {
            return (
              <div 
                key={item.id}
                onClick={() => handleSelectModule(item)}
                className={`group relative p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl transition-all flex flex-col h-72 md:h-80 overflow-hidden border-none bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 cursor-pointer hover:shadow-[0_20px_60px_-15px_rgba(99,102,241,0.5)]`}
              >
                <div className="absolute top-0 right-0 p-6 md:p-8 opacity-20 scale-125 md:scale-150 rotate-12 transition-transform duration-700 group-hover:rotate-0 pointer-events-none">
                  <span className={`text-7xl md:text-9xl font-black font-serif leading-none select-none text-white`}>Σ</span>
                </div>
                
                <div className="relative z-10 space-y-4 md:space-y-6 flex-1">
                  <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center shadow-inner border bg-white/20 border-white/10 text-white`}>
                    <span className="text-2xl md:text-4xl font-black font-serif pb-1">Σ</span>
                  </div>
                  <div>
                    <h3 className={`text-lg md:text-xl font-black text-white`}>{item.title}</h3>
                    <p className={`text-white/80 text-[11px] md:text-sm font-bold mt-1 md:mt-2 leading-relaxed line-clamp-2`}>{item.description}</p>
                  </div>
                </div>

                <div className={`relative z-10 mt-4 md:mt-6 pt-4 md:pt-6 border-t flex items-center justify-between shrink-0 border-white/20`}>
                  <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/60`}>
                    Adaptief
                  </span>
                  <div className={`px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg transform transition-transform bg-white text-indigo-600 group-hover:scale-105`}>
                    Starten
                  </div>
                </div>
              </div>
            );
          }
          
          // Determine the base color for the icon, inheriting from the active theme if nested
          const itemColorBase = activeThemeId ? activeTheme?.color : (item as ThemeConfig).color;
          const safeItemColor = itemColorBase || 'slate'; // Default to 'slate' if color is missing

          const iconBgClass = `bg-${safeItemColor}-100`;
          const iconTextColorClass = `text-${safeItemColor}-700`;

          // Render generic module card
          return (
            <div 
              key={item.id}
              onClick={() => handleSelectModule(item)}
              className={`group bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border-2 transition-all shadow-lg flex flex-col h-72 md:h-80 relative overflow-hidden border-transparent hover:border-blue-500 hover:shadow-2xl cursor-pointer`}
            >
              <div className={`space-y-4 md:space-y-6 flex-1`}>
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 md:w-16 md:h-16 ${iconBgClass} ${iconTextColorClass} rounded-xl md:rounded-[1.2rem] flex items-center justify-center text-xl md:text-2xl transition-transform group-hover:rotate-12 shadow-sm`}>
                    {item.icon.startsWith('fa-') ? (
                      <i className={`fa-solid ${item.icon}`}></i>
                    ) : (
                      <span className="font-serif font-black text-2xl md:text-3xl">{item.icon}</span>
                    )}
                  </div>
                  {(!item.subModules || item.subModules.length === 0) && ( // Only show level for leaf nodes
                    <div className={`px-3 md:px-4 py-1.5 md:py-2 ${level.bg} ${level.color} rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 md:gap-2 border border-current/10`}>
                      <i className={`fa-solid ${level.icon}`}></i>
                      {level.label}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                  <p className="text-slate-400 text-[11px] md:text-xs font-medium mt-1 leading-relaxed line-clamp-3">{item.description}</p>
                </div>
              </div>
              
              <div className={`mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-50 flex items-center justify-between shrink-0`}>
                <span className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  {(!item.subModules || item.subModules.length === 0) 
                    ? `${modProgress.solvedProblemIds?.length || 0} opgelost` 
                    : `${item.subModules.length} onderdelen`}
                </span>
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all bg-slate-50 text-slate-300 group-hover:bg-blue-600 group-hover:text-white`}>
                  <i className={`fa-solid ${(!item.subModules || item.subModules.length === 0) ? 'fa-play text-[10px] md:text-xs' : 'fa-arrow-right'}`}></i>
                </div>
              </div>
            </div>
          );
        })}
        {modulesToDisplay.length === 0 && !lockedModules.includes('mix') && (
            <div className="col-span-full py-20 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
              <i className="fa-solid fa-cloud-moon text-4xl text-slate-200 mb-4"></i>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">De leerkracht heeft momenteel alle modules gesloten.</p>
            </div>
          )}
      </div>

      <AvatarCoach message={currentGreeting} type="info" />
    </div>
  );
};