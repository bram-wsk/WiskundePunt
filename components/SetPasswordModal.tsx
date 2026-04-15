import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface SetPasswordModalProps {
  onComplete: () => void;
}

export const SetPasswordModal: React.FC<SetPasswordModalProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Wachtwoord moet minstens 8 tekens zijn.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      // Success!
      onComplete();
    } catch (err: any) {
      console.error("Error setting password:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-10 text-center shadow-2xl space-y-6 animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          <i className="fa-solid fa-lock"></i>
        </div>
        
        <h2 className="text-2xl font-black text-slate-900">Stel je wachtwoord in</h2>
        <p className="text-slate-500 font-medium text-sm">
          Welkom! Om je account te beveiligen, vragen we je een nieuw wachtwoord te kiezen.
        </p>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nieuw Wachtwoord</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Min. 8 tekens" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bevestig Wachtwoord</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Herhaal wachtwoord" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-xs border-none cursor-pointer hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Wachtwoord Opslaan & Starten'}
          </button>
        </form>
      </div>
    </div>
  );
};
