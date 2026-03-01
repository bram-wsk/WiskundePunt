
import React from 'react';
import { ErrorType } from '../types';

interface InterventionModalProps {
  errorType: ErrorType;
}

const ERROR_ANALYSIS_TEXT: Record<ErrorType, string> = {
  [ErrorType.ORDER]: "De leerling past de volgorde van bewerkingen (H-M-W-V-D-O-A) niet consequent toe. Vaak wordt optellen/aftrekken voor vermenigvuldigen/delen gedaan, of haakjes vergeten.",
  [ErrorType.CALCULATION]: "De leerling maakt procedurele rekenfouten in het hoofdrekenen (tafels, optellen tot 100). Het concept is vaak wel begrepen, maar de uitvoering hapert.",
  [ErrorType.SIGN]: "De leerling maakt fouten tegen toestandstekens (plus/min). Vaak bij het aftrekken van negatieve getallen of het vermenigvuldigen van tekens.",
  [ErrorType.CONCEPT]: "Er is een fundamentele misconceptie over de wiskundige eigenschap of de balansmethode. De leerling begrijpt 'waarom' we een stap zetten niet goed.",
  [ErrorType.COPY]: "De leerling schrijft de opgave of het resultaat van de vorige regel foutief over. Dit wijst op concentratieverlies of slordigheid.",
  [ErrorType.UNKNOWN]: "De leerling voert stappen in die niet logisch te verklaren zijn vanuit de huidige leerstof."
};

export const InterventionModal: React.FC<InterventionModalProps> = ({ errorType }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-orange-500 flex items-center justify-center p-6 animate-in zoom-in duration-300">
      <div className="max-w-2xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left: Alert Side */}
        <div className="bg-orange-600 p-10 flex flex-col items-center justify-center text-center text-white md:w-2/5 space-y-6">
           <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center shadow-inner animate-bounce-subtle">
              <i className="fa-solid fa-triangle-exclamation text-5xl"></i>
           </div>
           <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Even Pauze</h2>
              <p className="font-medium text-orange-100 mt-2 text-sm leading-relaxed">
                Je hebt 3 keer dezelfde soort fout gemaakt.
              </p>
           </div>
           <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
              <p className="text-xs font-black uppercase tracking-widest">{errorType}</p>
           </div>
        </div>

        {/* Right: Teacher Status */}
        <div className="p-10 md:w-3/5 flex flex-col justify-center items-center space-y-8 text-center">
           
           <div className="space-y-4">
              <div className="relative">
                 <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4 animate-pulse">
                    <i className="fa-solid fa-tower-broadcast"></i>
                 </div>
                 <span className="absolute top-0 right-1/3 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                 </span>
              </div>
              
              <h4 className="text-2xl font-black text-slate-900">Hulp is onderweg</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium px-4">
                Er is een melding verstuurd naar het dashboard van je leerkracht. Wacht even tot meneer Priem of je leerkracht je scherm vrijgeeft.
              </p>
           </div>

           <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><i className="fa-solid fa-bug mr-1"></i> Foutenanalyse voor leerkracht</h5>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                "{ERROR_ANALYSIS_TEXT[errorType]}"
              </p>
           </div>

           <div className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest animate-pulse">
              <i className="fa-solid fa-lock"></i> Scherm Vergrendeld
           </div>
        </div>

      </div>
    </div>
  );
};
