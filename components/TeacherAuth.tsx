
import React, { useState } from 'react';
import { AvatarCoach } from './AvatarCoach';
import { supabase } from '../services/supabaseClient';

interface TeacherAuthProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const TeacherAuth: React.FC<TeacherAuthProps> = ({ onSuccess, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.message === "Invalid login credentials") {
        setError("Ongeldig e-mailadres of wachtwoord. (Is je account al bevestigd?)");
      } else if (err.message.includes("Email not confirmed")) {
        setError("Je e-mailadres is nog niet bevestigd. Check je inbox.");
      } else {
        setError(err.message || "Inloggen mislukt. Controleer je gegevens.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
      <AvatarCoach 
        message={error 
          ? `Oeps! ${error}` 
          : "Welkom terug, collega! Log in om naar het dashboard te gaan."} 
        type={error ? 'error' : 'info'}
        title="Leerkracht Login"
      />
      
      <div className="max-w-sm w-full animate-in zoom-in-95 duration-300">
        <div className={`bg-white p-8 rounded-[2rem] shadow-2xl border-4 transition-all duration-300 ${error ? 'border-rose-400 shake-horizontal' : 'border-indigo-100'}`}>
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl">
              <i className="fa-solid fa-user-shield text-2xl"></i>
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Leerkracht Login</h2>
              <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Beveiligde omgeving</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mailadres</label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 transition-all outline-none font-medium text-slate-800"
                  placeholder="naam@school.be"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Wachtwoord</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 transition-all outline-none font-medium text-slate-800"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-slate-100 text-slate-500 font-black py-3 rounded-xl hover:bg-slate-200 transition-all text-[10px] uppercase tracking-widest"
                  disabled={loading}
                >
                  Annuleren
                </button>
                <button 
                  type="submit"
                  className="flex-[2] bg-indigo-600 text-white font-black py-3 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Laden...</>
                  ) : (
                    'Inloggen'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .shake-horizontal {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};
