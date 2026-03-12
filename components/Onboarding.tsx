
import React, { useState, useEffect } from 'react';
import { UserInfo, Classroom, Teacher, Student } from '../types';
import { AvatarCoach } from './AvatarCoach';
import { supabase } from '../services/supabaseClient';

interface OnboardingProps {
  onComplete: (info: UserInfo) => void;
  classrooms: Classroom[];
  teachers: Teacher[];
  students: Student[];
}

type OnboardingStep = 'choice' | 'student-login' | 'teacher-login' | 'register';

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, classrooms, teachers, students }) => {
  const [step, setStep] = useState<OnboardingStep>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.hash.substring(1));
    if (searchParams.get('register') === 'true' || hashParams.get('register') === 'true') {
        return 'register';
    }
    return 'choice';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // Used for both student (if needed) and teacher
  const [email, setEmail] = useState(''); // For teacher login
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration state
  const [regName, setRegName] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.hash.substring(1));
    return searchParams.get('name') || hashParams.get('name') || '';
  });
  const [regRole, setRegRole] = useState<'admin' | 'teacher'>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.hash.substring(1));
    return (searchParams.get('role') || hashParams.get('role') || 'teacher') as 'admin' | 'teacher';
  });

  useEffect(() => {
    // We still keep this to handle dynamic changes if needed, 
    // but the initial state is now set above.
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.hash.substring(1));
    
    const isRegister = searchParams.get('register') === 'true' || hashParams.get('register') === 'true';
    if (isRegister) {
        setStep('register');
        setRegName(searchParams.get('name') || hashParams.get('name') || '');
        setRegRole((searchParams.get('role') || hashParams.get('role') || 'teacher') as 'admin' | 'teacher');
    }
  }, []);

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUsername = username.trim().toLowerCase();
    const foundStudent = students.find(s => 
       (s.firstName.toLowerCase() + s.lastInitial.toLowerCase()) === normalizedUsername && 
       s.password === password
    );

    if (foundStudent) {
        const studentClass = classrooms.find(c => c.id === foundStudent.classId);
        onComplete({ 
            firstName: foundStudent.firstName, 
            className: studentClass?.name || 'Onbekende Klas', 
            role: 'student' 
        });
    } else {
        showError("Hmm, dat klopt niet helemaal. Probeer opnieuw.");
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        console.log("Auth success, user ID:", authData.user.id);

        // Fetch teacher profile to get name and role
        const { data: teacherData, error: dbError } = await supabase
          .from('teachers')
          .select('*')
          .eq('auth_id', authData.user.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid error if no row found

        if (dbError) {
            console.error("Database error fetching teacher:", dbError);
            throw new Error("Fout bij ophalen profiel: " + dbError.message);
        }

        if (!teacherData) {
           console.error("No teacher row found for auth_id:", authData.user.id);
           throw new Error(`Geen leerkrachtprofiel gevonden voor ID: ${authData.user.id}. Heb je de auth_id correct gekoppeld in de database?`);
        }

        onComplete({ 
          firstName: teacherData.name, 
          className: teacherData.role === 'admin' ? 'Systeem' : 'Leerkrachten', 
          role: teacherData.role === 'admin' ? 'admin' : 'teacher',
          assignedClassIds: teacherData.class_ids
        });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      showError(err.message === "Invalid login credentials" ? "E-mail of wachtwoord is onjuist." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherRegistration = async (e: React.FormEvent) => {
      e.preventDefault();
      if (password.length < 6) {
          showError("Wachtwoord moet minstens 6 tekens zijn.");
          return;
      }
      setLoading(true);
      setError('');

      try {
          // 1. Sign Up
          const { data: authData, error: authError } = await supabase.auth.signUp({
              email,
              password,
          });

          if (authError) throw authError;

          if (authData.user) {
              // 2. Create Profile
              // Note: This requires RLS to allow insert for authenticated users
              const { error: dbError } = await supabase.from('teachers').insert({
                  auth_id: authData.user.id,
                  name: regName,
                  role: regRole,
                  class_ids: []
              });

              if (dbError) {
                  console.error("Profile creation failed:", dbError);
                  // If profile creation fails, we might want to warn the user
                  // But they are signed up.
                  throw new Error("Account aangemaakt, maar profiel opslaan mislukt: " + dbError.message);
              }

              // 3. Auto Login / Complete
              onComplete({
                  firstName: regName,
                  className: regRole === 'admin' ? 'Systeem' : 'Leerkrachten',
                  role: regRole,
                  assignedClassIds: []
              });
              
              // Clean URL
              window.history.replaceState({}, document.title, window.location.pathname);
          } else {
              // Email confirmation required?
              showError("Check je e-mail om je account te bevestigen!");
          }

      } catch (err: any) {
          console.error("Registration error:", err);
          showError(err.message);
      } finally {
          setLoading(false);
      }
  };

  const showError = (msg: string) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
  };

  const getGreetingMessage = () => {
    if (error) return error;
    if (step === 'teacher-login') {
      return "Halt! Dit gedeelte is enkel voor leerkrachten.";
    }
    if (step === 'register') {
        return `Welkom ${regName}! Stel je wachtwoord in om je account te activeren.`;
    }
    return "Welkom bij WiskundePunt. Ik ben meneer Priem. Wie ben jij?";
  };

  return (
    <div className="fixed inset-0 z-[100] bg-blue-50/30 flex items-center justify-center p-6 overflow-y-auto">
      <AvatarCoach 
        message={getGreetingMessage()} 
        type={error ? 'error' : 'info'}
      />
      
      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-blue-50 text-center space-y-8 relative">
          <header className="space-y-6">
            <img src="/logo.png" alt="Logo" className="w-72 mx-auto mb-6" />
          </header>

          {step === 'choice' && (
            <div className="grid grid-cols-1 gap-4">
               <button onClick={() => setStep('student-login')} className="group p-6 bg-white border-2 border-blue-50 rounded-[2rem] hover:border-blue-500 hover:bg-blue-50/30 transition-all flex items-center gap-6 cursor-pointer border-none text-left">
                  <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fa-solid fa-user-graduate text-xl"></i></div>
                  <div><h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Ik ben een leerling</h3><p className="text-slate-400 text-[9px] font-bold mt-1">Inloggen met je gegevens</p></div>
               </button>
               
               <button onClick={() => setStep('teacher-login')} className="group p-6 bg-slate-900 text-white rounded-[2rem] hover:bg-slate-800 transition-all flex items-center gap-6 cursor-pointer border-none text-left">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform"><i className="fa-solid fa-briefcase text-xl"></i></div>
                  <div><h3 className="font-black uppercase tracking-widest text-xs">Ik ben een leerkracht</h3><p className="text-white/40 text-[9px] font-bold mt-1">Bekijk resultaten & beheer</p></div>
               </button>
            </div>
          )}

          {step === 'student-login' && (
            <form onSubmit={handleStudentLogin} className="space-y-5 text-left">
              <div>
                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Gebruikersnaam</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="bv. JanP" required className="w-full px-6 py-4 bg-blue-50/20 border-2 border-blue-50 rounded-2xl focus:border-blue-500 transition-all outline-none font-bold" />
                <p className="text-[9px] text-slate-400 font-bold ml-2 mt-1">Je voornaam + eerste letter achternaam</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Wachtwoord</label>
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="•••••••" required className="w-full px-6 py-4 bg-blue-50/20 border-2 border-blue-50 rounded-2xl focus:border-blue-500 transition-all outline-none font-bold font-mono" />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep('choice')} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-xl text-[10px] uppercase tracking-widest border-none cursor-pointer">Terug</button>
                <button type="submit" className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg text-[10px] uppercase tracking-widest hover:bg-blue-700 border-none cursor-pointer">Inloggen</button>
              </div>
            </form>
          )}

          {step === 'teacher-login' && (
             <form onSubmit={handleTeacherLogin} className="space-y-5 text-left">
                <div>
                   <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">E-mailadres</label>
                   <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@school.be" required className="w-full px-6 py-4 bg-emerald-50/20 border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 transition-all outline-none font-bold" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Wachtwoord</label>
                   <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="w-full px-6 py-4 bg-emerald-50/20 border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 transition-all outline-none font-black" />
                </div>
                <div className="flex gap-3">
                   <button type="button" onClick={() => setStep('choice')} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-xl text-[10px] uppercase tracking-widest border-none cursor-pointer" disabled={loading}>Terug</button>
                   <button type="submit" className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg text-[10px] uppercase tracking-widest border-none cursor-pointer disabled:opacity-50" disabled={loading}>
                     {loading ? 'Laden...' : 'Inloggen'}
                   </button>
                </div>
             </form>
          )}

          {step === 'register' && (
             <form onSubmit={handleTeacherRegistration} className="space-y-6 text-left">
                <div className="bg-emerald-50 p-6 rounded-[2rem] text-emerald-800 border-2 border-emerald-100 mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                        <i className="fa-solid fa-user-plus text-lg"></i>
                    </div>
                    <div>
                        <p className="font-black uppercase tracking-widest text-[10px]">Account Activeren</p>
                        <p className="text-xs font-medium opacity-80 mt-0.5">Je bent uitgenodigd als <strong>{regRole === 'admin' ? 'Beheerder' : 'Leerkracht'}</strong>.</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                       <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Volledige Naam</label>
                       <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} required className="w-full px-6 py-4 bg-emerald-50/20 border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 transition-all outline-none font-bold" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">E-mailadres</label>
                       <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@school.be" required className="w-full px-6 py-4 bg-emerald-50/20 border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 transition-all outline-none font-bold" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Kies een sterk wachtwoord</label>
                       <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimaal 6 tekens" required className="w-full px-6 py-4 bg-emerald-50/20 border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 transition-all outline-none font-black" />
                       <p className="text-[9px] text-slate-400 font-bold ml-2 mt-1">Dit wachtwoord gebruik je om later in te loggen.</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                   <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 uppercase tracking-widest text-xs border-none cursor-pointer disabled:opacity-50 hover:bg-emerald-700 transition-all" disabled={loading}>
                     {loading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
                     {loading ? 'Account aanmaken...' : 'Account Activeren & Starten'}
                   </button>
                   <button type="button" onClick={() => { setStep('choice'); window.history.replaceState({}, document.title, window.location.pathname); }} className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest border-none cursor-pointer hover:bg-slate-200 transition-all" disabled={loading}>Annuleren</button>
                </div>
             </form>
          )}
        </div>
      </div>
    </div>
  );
};
