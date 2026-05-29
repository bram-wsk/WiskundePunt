
import React from 'react';
import { ErrorType } from '../types';

interface InterventionModalProps {
  errorType: ErrorType;
  onDismiss: () => void;
}

const ERROR_ANALYSIS_TEXT: Record<ErrorType, string> = {
  [ErrorType.ORDER]: "De leerling past de volgorde van bewerkingen (H-M-W-V-D-O-A) niet consequent toe. Vaak wordt optellen/aftrekken voor vermenigvuldigen/delen gedaan, of haakjes vergeten.",
  [ErrorType.CALCULATION]: "De leerling maakt procedurele rekenfouten in het hoofdrekenen (tafels, optellen tot 100). Het concept is vaak wel begrepen, maar de uitvoering hapert.",
  [ErrorType.SIGN]: "De leerling maakt fouten tegen toestandstekens (plus/min). Vaak bij het aftrekken van negatieve getallen of het vermenigvuldigen van tekens.",
  [ErrorType.CONCEPT]: "Er is een fundamentele misconceptie over de wiskundige eigenschap of de balansmethode. De leerling begrijpt 'waarom' we een stap zetten niet goed.",
  [ErrorType.COPY]: "De leerling schrijft de opgave of het resultaat van de vorige regel foutief over. Dit wijst op concentratieverlies of slordigheid.",
  [ErrorType.UNKNOWN]: "De leerling voert stappen in die niet logisch te verklaren zijn vanuit de huidige leerstof."
};

export const InterventionModal: React.FC<InterventionModalProps> = ({ errorType, onDismiss }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-in zoom-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative max-w-2xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left: Alert Side */}
        <div className="bg-orange-500 p-10 flex flex-col items-center justify-center text-center text-white md:w-2/5 space-y-6">
           <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center shadow-inner animate-bounce-subtle">
              <i className="fa-solid fa-lightbulb text-5xl"></i>
           </div>
           <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Even Pauze</h2>
              <p className="font-medium text-orange-100 mt-2 text-sm leading-relaxed">
                Je maakte een paar keer dezelfde fout.
              </p>
           </div>
           <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
              <p className="text-xs font-black uppercase tracking-widest">{errorType}</p>
           </div>
        </div>

        {/* Right: Info and Action */}
        <div className="p-10 md:w-3/5 flex flex-col justify-center space-y-8 bg-white">
           
           <div className="space-y-4">
              <h4 className="text-2xl font-black text-slate-900">Signaal verstuurd</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Je leerkracht heeft een seintje gekregen dat je op dit onderdeel misschien even hulp kan gebruiken.
              </p>
           </div>

           <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><i className="fa-solid fa-circle-info mr-1"></i> Tip</h5>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                "{ERROR_ANALYSIS_TEXT[errorType]}"
              </p>
           </div>

           <div className="flex justify-end pt-2">
             <button
                onClick={onDismiss}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all transform hover:scale-105 shadow-md flex items-center space-x-2"
              >
                <span>Verder oefenen</span>
                <i className="fa-solid fa-arrow-right"></i>
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};
