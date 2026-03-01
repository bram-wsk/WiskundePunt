
import React, { useState, useEffect } from 'react';
import { AIGuideConfig } from '../types';
import { supabase } from '../services/supabaseClient';
import { DEFAULT_AI_GUIDE_CONFIG } from '../constants';

interface AIGuideEditorProps {
  aiGuideConfig: AIGuideConfig;
  setAIGuideConfig: (config: AIGuideConfig) => void;
}

export const AIGuideEditor: React.FC<AIGuideEditorProps> = ({ aiGuideConfig, setAIGuideConfig }) => {
  const [editableConfig, setEditableConfig] = useState<AIGuideConfig>(aiGuideConfig);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setEditableConfig(aiGuideConfig);
  }, [aiGuideConfig]);

  const handleChange = (section: keyof AIGuideConfig['sections'], value: string) => {
    setEditableConfig(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: value,
      },
    }));
  };

  const handleRestoreDefaults = () => {
    if (confirm("Weet je zeker dat je alle velden wilt herstellen naar de standaardwaarden? Dit overschrijft huidige wijzigingen.")) {
      setEditableConfig(DEFAULT_AI_GUIDE_CONFIG);
    }
  };

  const handleSave = async () => {
    const updatedConfig = {
      ...editableConfig,
      lastUpdated: new Date().toISOString()
    };
    
    // Save to Supabase (Singleton row ID 1)
    const { error } = await supabase.from('ai_guide_config').upsert({
       id: 1,
       version: updatedConfig.version,
       last_updated: updatedConfig.lastUpdated,
       sections: updatedConfig.sections
    });

    if (error) {
      setSaveMessage('Fout bij opslaan!');
    } else {
      setAIGuideConfig(updatedConfig);
      setSaveMessage('AI-gids succesvol opgeslagen in database!');
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const sectionTitles: Record<keyof AIGuideConfig['sections'], string> = {
    systemPersona: 'A. Systeem Persona',
    didacticApproach: 'B. Didactische Stijl & Aanpak',
    terminologyRules: 'C. Terminologie Regels',
    errorIdentification: 'D. Fouten Identificatie',
    doubtHandling: 'E. Omgaan met Twijfel (Doubt Protocol)',
    didacticInstruments: 'F. Didactische Instrumenten per Module',
    stepComparison: 'G. Tussenstappen Controle',
    blockingCriteria: 'H. Blokkering Mechanisme',
    differentiation: 'I. Differentiatie & Niveaus',
    exportImportFormat: 'J. Export/Import Formaat',
  };

  // Ensure we iterate over ALL keys defined in the default config, 
  // ensuring fields appear even if the loaded config has missing keys.
  const sectionKeys = Object.keys(DEFAULT_AI_GUIDE_CONFIG.sections) as Array<keyof AIGuideConfig['sections']>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border-b-8 border-purple-600">
        <div className="relative z-10 max-w-3xl">
          <h3 className="text-3xl font-black text-purple-400 mb-4">AI-gids Beheer</h3>
          <p className="text-slate-400 text-lg italic font-medium leading-relaxed">
            "Definieer en beheer de didactische strategie van de AI-coach."
          </p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-end pb-4 border-b border-slate-100">
           <button 
             onClick={handleRestoreDefaults}
             className="text-purple-600 hover:text-purple-800 text-[10px] font-black uppercase tracking-widest bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg transition-colors border-none cursor-pointer"
           >
             <i className="fa-solid fa-rotate-left mr-2"></i> Herstel Standaardwaarden
           </button>
        </div>

        {sectionKeys.map((key) => (
          <div key={key} className="space-y-2">
            <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest ml-1 block">
              {sectionTitles[key] || key}
            </label>
            <textarea
              value={editableConfig.sections?.[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl min-h-[120px] font-mono text-sm text-slate-800 resize-y focus:border-purple-500 outline-none"
              rows={6}
            />
          </div>
        ))}

        <div className="pt-6 border-t border-slate-100 flex justify-end relative">
          {saveMessage && (
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 text-sm font-bold ${saveMessage.includes('Fout') ? 'text-rose-600' : 'text-emerald-600'} animate-in fade-in slide-in-from-left-4`}>
              {saveMessage}
            </div>
          )}
          <button onClick={handleSave} className="bg-purple-600 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-[11px] border-none cursor-pointer hover:bg-purple-700 shadow-lg shadow-purple-100">
            <i className="fa-solid fa-save mr-2"></i> Wijzigingen Opslaan
          </button>
        </div>
      </div>
    </div>
  );
};
