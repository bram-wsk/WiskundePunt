
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ErrorType, SessionStats, DifficultyLevel, Problem, LearningDiary, UserInfo, AIProgression, ModuleId, ThemeConfig, DiaryEntry, Classroom, Teacher, StudentResult, InterventionAlert, SubModuleConfig, ModuleProgress, AIGuideConfig, Student, StepSuccessStatus } from './types';
import { ProgressBar } from './components/ProgressBar';
import { ProblemSolver } from './components/ProblemSolver';
import { SessionSummary } from './components/SessionSummary';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Onboarding } from './components/Onboarding';
import { ModuleHub } from './components/ModuleHub';
import { InterventionModal } from './components/InterventionModal';
import { SetPasswordModal } from './components/SetPasswordModal';
import { evaluateProgression } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { DEFAULT_AI_GUIDE_CONFIG } from './constants';

const DEFAULT_SESSION_TARGET = 5;

const THEMES: ThemeConfig[] = [
  { 
    id: 'volgorde-main', 
    title: 'Volgorde van Bewerkingen', 
    icon: 'fa-arrow-down-1-9', 
    color: 'blue', 
    description: 'Meester worden in H-M-W-V-D-O-A.',
    subModules: [
      { id: 'volgorde-geheel', title: 'Met Gehele Getallen', description: 'Oefen met positieve en negatieve getallen.', icon: 'ℤ' },
      { id: 'volgorde-machten', title: 'Met Machten', description: 'Inclusief kwadraten en worteltrekken.', icon: 'x²' },
      { id: 'volgorde-rationaal', title: 'Met Rationale Getallen', description: 'Rekenen met breuken en kommagetallen.', icon: 'ℚ' }
    ]
  },
  { 
    id: 'vergelijkingen-main', 
    title: 'Vergelijkingen', 
    icon: 'fa-scale-balanced', 
    color: 'emerald', 
    description: 'De balans zoeken tussen links en rechts.',
    subModules: [
      { id: 'vergelijkingen-geheel', title: 'Met Gehele Getallen', description: 'Vergelijkingen oplossen zonder breuken.', icon: 'ℤ' },
      { id: 'vergelijkingen-rationaal', title: 'Met Rationale Getallen', description: 'Vergelijkingen met breuken en kommagetallen.', icon: 'ℚ' }
    ]
  },
  { 
    id: 'hoofdbewerkingen-main', 
    title: 'Hoofdbewerkingen', 
    icon: 'fa-plus-minus', 
    color: 'purple', 
    description: 'Optellen, aftrekken, vermenigvuldigen en delen.',
    subModules: [
      { 
        id: 'hoofdbewerkingen-natuurlijk', 
        title: 'Met Natuurlijke Getallen', 
        description: 'Rekenen met positieve getallen.', 
        icon: 'ℕ',
        subModules: [
          { id: 'hoofdbewerkingen-natuurlijk-optellen-aftrekken', title: 'Optellen & Aftrekken', description: 'Oefen basis optellen en aftrekken met natuurlijke getallen.', icon: '⁺₋' },
          { id: 'hoofdbewerkingen-natuurlijk-vermenigvuldigen-delen', title: 'Vermenigvuldigen & Delen', description: 'Oefen basis vermenigvuldigen en delen met natuurlijke getallen.', icon: '· ∶' }
        ]
      },
      { 
        id: 'hoofdbewerkingen-geheel', 
        title: 'Met Gehele Getallen', 
        description: 'Rekenen met positieve en negatieve getallen.', 
        icon: 'ℤ',
        subModules: [
          { id: 'hoofdbewerkingen-geheel-optellen-aftrekken', title: 'Optellen & Aftrekken', description: 'Oefen optellen en aftrekken met gehele getallen.', icon: '⁺₋' },
          { id: 'hoofdbewerkingen-geheel-vermenigvuldigen-delen', title: 'Vermenigvuldigen & Delen', description: 'Oefen vermenigvuldigen en delen met gehele getallen.', icon: '· ∶' }
        ]
      },
      { 
        id: 'hoofdbewerkingen-rationaal', 
        title: 'Met Rationale Getallen', 
        description: 'Rekenen met breuken en kommagetallen.', 
        icon: 'ℚ',
        subModules: [
          { id: 'hoofdbewerkingen-rationaal-optellen-aftrekken', title: 'Optellen & Aftrekken', description: 'Oefen optellen en aftrekken met rationale getallen (breuken/kommagetallen).', icon: '⁺₋' },
          { id: 'hoofdbewerkingen-rationaal-vermenigvuldigen-delen', title: 'Vermenigvuldigen & Delen', description: 'Oefen vermenigvuldigen en delen met rationale getallen (breuken/kommagetallen).', icon: '· ∶' }
        ]
      }
    ]
  },
  {
    id: 'mix',
    title: 'Sigma Challenge',
    icon: 'Σ',
    color: 'indigo',
    description: 'De ultieme mix van alle leerstof. Durf jij de uitdaging aan?'
  }
];

// Helper to create empty progress structure
const createInitialProgress = (): Record<string, ModuleProgress> => {
  const initialProgress: Record<string, ModuleProgress> = {};
  const allModIds: ModuleId[] = [];

  const collectModuleIds = (configs: (ThemeConfig | SubModuleConfig)[]): void => {
    configs.forEach(config => {
      allModIds.push(config.id as ModuleId);
      if ((config as ThemeConfig).subModules) {
        collectModuleIds((config as ThemeConfig).subModules!);
      } else if ((config as SubModuleConfig).subModules) {
        collectModuleIds((config as SubModuleConfig).subModules!);
      }
    });
  };
  
  collectModuleIds(THEMES);
  if (!allModIds.includes('mix')) allModIds.push('mix');

  allModIds.forEach(id => {
    initialProgress[id] = {
      growthStatus: 1,
      solvedProblemIds: [],
      allTimeErrors: { [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0, [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0 },
      recentStepHistory: []
    };
  });
  return initialProgress;
};

// Main Application Component - Triggering Redeploy for API Key fix
const App: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudentResults, setAllStudentResults] = useState<StudentResult[]>([]);
  
  const [diary, setDiary] = useState<LearningDiary>({ entries: [], totalSessions: 0, moduleProgress: createInitialProgress() });
  const [aiGuideConfig, setAIGuideConfig] = useState<AIGuideConfig>(DEFAULT_AI_GUIDE_CONFIG);

  const [activeModule, setActiveModule] = useState<ModuleId | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);

  const [solvedCount, setSolvedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [progressionInfo, setProgressionInfo] = useState<AIProgression | null>(null);
  const [isEvaluatingGrowth, setIsEvaluatingGrowth] = useState(false);
  const [showGrowthCelebration, setShowGrowthCelebration] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.hash.substring(1));
    return searchParams.get('setup_password') === 'true' || hashParams.get('setup_password') === 'true';
  });

  const [sessionErrorCounts, setSessionErrorCounts] = useState<Record<ErrorType, number>>({
    [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0, 
    [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0 
  });
  const [intervention, setIntervention] = useState<{ isActive: boolean, errorType: ErrorType | null, alertId?: string }>({ isActive: false, errorType: null });

  const [simulatedClassId, setSimulatedClassId] = useState<string | null>(null);

  const [stats, setStats] = useState<SessionStats>({
    completed: 0, totalErrors: 0,
    errorDistribution: { [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0, [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0 },
    problemBreakdown: {},
    sessionStartTime: Date.now()
  });

  // Construct the AI Guide context string
  const aiGuideContext = useMemo(() => {
    const sections = aiGuideConfig.sections;
    if (!sections) return "";
    return Object.values(sections).join('\n\n');
  }, [aiGuideConfig]);

  // AUTH LISTENER FOR INVITES & PASSWORD SETUP
  useEffect(() => {
    const handleAuthUser = async (user: any) => {
        // Check for password setup param in both search and hash
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.hash.substring(1));
        
        if (searchParams.get('setup_password') === 'true' || hashParams.get('setup_password') === 'true') {
            setShowPasswordSetup(true);
        }

        setIsLoading(true);
        try {
            // Fetch teacher profile if not already set with retry
            const fetchTeacherWithRetry = async (retries = 2) => {
              for (let i = 0; i < retries; i++) {
                try {
                  const res = await supabase.from('teachers').select('*').eq('auth_id', user.id).maybeSingle();
                  if (res.error && (res.error.message === 'Failed to fetch' || res.error.message?.includes('fetch'))) {
                    throw res.error;
                  }
                  return res;
                } catch (err) {
                  if (i === retries - 1) throw err;
                  await new Promise(r => setTimeout(r, 1000));
                }
              }
            };

            const { data: teacher } = await fetchTeacherWithRetry();
            
            if (teacher) {
                setUserInfo({
                    firstName: teacher.name,
                    className: teacher.role === 'admin' ? 'Systeem' : 'Leerkrachten',
                    role: teacher.role,
                    assignedClassIds: teacher.class_ids
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) handleAuthUser(session.user);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) handleAuthUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // FETCH INITIAL DATA FROM SUPABASE
  useEffect(() => {
    const fetchInitialData = async (retries = 3) => {
      setIsLoading(true);
      try {
        // Helper to handle retries for network errors
        const safeFetch = async (fetchFn: () => Promise<any>) => {
          let lastErr;
          for (let i = 0; i < retries; i++) {
            try {
              const res = await fetchFn();
              // Supabase error object can contain network errors
              if (res.error && (res.error.message === 'Failed to fetch' || res.error.message?.includes('fetch'))) {
                throw res.error;
              }
              return res;
            } catch (err) {
              lastErr = err;
              if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
          }
          throw lastErr;
        };

        // 1. Fetch Classrooms (Publicly visible for student login selection)
        const { data: classesData, error: classesError } = await safeFetch(async () => await supabase.from('classrooms').select('*'));
        if (classesError) throw classesError;
        if (classesData) {
          setClassrooms(classesData.map(c => ({
            id: String(c.id),
            name: c.name,
            lockedModules: c.locked_modules || []
          })));
        }

        // 2. Fetch Problems (Publicly visible)
        const { data: problemsData, error: problemsError } = await safeFetch(async () => await supabase.from('problems').select('*'));
        if (problemsError) throw problemsError;
        if (problemsData) {
          setProblems(problemsData.map(p => ({
            id: String(p.id),
            expression: p.expression,
            solution: p.solution,
            operations: p.operations,
            finalAnswer: p.final_answer,
            level: p.level,
            moduleId: p.module_id,
            isCustom: p.is_custom
          })));
        }

        // 3. Fetch AI Guide Config (Publicly visible)
        const { data: configData, error: configError } = await safeFetch(async () => await supabase.from('ai_guide_config').select('*').single());
        if (configError && configError.code !== 'PGRST116') throw configError;
        if (configData) {
          setAIGuideConfig({
            version: configData.version,
            lastUpdated: configData.last_updated,
            sections: configData.sections
          });
        }

        // 4. Fetch Students (Publicly visible for student login selection - username check)
        const { data: studentsData, error: studentsError } = await safeFetch(async () => await supabase.from('students').select('*'));
        if (studentsError) throw studentsError;
        if (studentsData) {
          setStudents(studentsData.map(s => ({
            id: String(s.id),
            firstName: s.first_name,
            lastInitial: s.last_initial,
            password: s.password,
            classId: String(s.class_id)
          })));
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch Teacher Data when logged in as teacher/admin
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (userInfo && (userInfo.role === 'teacher' || userInfo.role === 'admin')) {
        setIsLoading(true);
        // Fetch Teachers (now allowed via RLS because we are authenticated)
        const { data: teachersData } = await supabase.from('teachers').select('*');
        if (teachersData) {
          setTeachers(teachersData.map(t => ({
            id: String(t.id),
            name: t.name,
            pin: "PROTECTED",
            classIds: t.class_ids || [],
            role: t.role || 'teacher'
          })));
        }
        
        // Fetch all student results for the dashboard
        const { data: progressData } = await supabase.from('student_progress').select('*');
        if (progressData) {
            // Transform flat SQL rows to nested StudentResult objects
            const resultsMap: Record<string, StudentResult> = {};
            
            progressData.forEach(row => {
              const key = `${row.first_name}-${row.class_name}`;
              if (!resultsMap[key]) {
                resultsMap[key] = {
                  firstName: row.first_name,
                  className: row.class_name,
                  progress: createInitialProgress() // start with defaults
                };
              }
              resultsMap[key].progress[row.module_id] = {
                  growthStatus: row.growth_status || 1,
                  solvedProblemIds: row.solved_problem_ids || [],
                  allTimeErrors: row.all_time_errors || { [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0, [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0 },
                  recentStepHistory: row.recent_step_history || []
              };
            });
            setAllStudentResults(Object.values(resultsMap));
        }
        
        setIsLoading(false);
      }
    };
    
    fetchTeacherData();
  }, [userInfo]);

  // Hydrate User Specific Data when UserInfo changes
  useEffect(() => {
    if (userInfo && userInfo.role === 'student' && !simulatedClassId) {
      const loadStudentData = async () => {
        // Load Progress
        const { data: progressData } = await supabase
          .from('student_progress')
          .select('*')
          .eq('first_name', userInfo.firstName)
          .eq('class_name', userInfo.className);
        
        const myProgress = createInitialProgress();
        if (progressData) {
          progressData.forEach(row => {
            myProgress[row.module_id] = {
              growthStatus: row.growth_status,
              solvedProblemIds: row.solved_problem_ids || [],
              allTimeErrors: row.all_time_errors,
              recentStepHistory: row.recent_step_history || []
            };
          });
        }

        // Load Diary (Recent entries)
        const { data: diaryData } = await supabase
          .from('learning_diary')
          .select('*')
          .eq('student_name', userInfo.firstName)
          .eq('class_name', userInfo.className)
          .order('date', { ascending: false })
          .limit(50);
        
        const entries = diaryData ? diaryData.map(d => ({
          date: d.date,
          moduleId: d.module_id,
          stats: d.stats
        })) : [];

        setDiary({
          entries,
          totalSessions: entries.length,
          moduleProgress: myProgress
        });
      };
      loadStudentData();
    }
  }, [userInfo, simulatedClassId]);

  // LIVE PRESENCE TRACKING
  const presenceChannelRef = useRef<any>(null);
  useEffect(() => {
    if (userInfo?.role === 'student' && !simulatedClassId) {
       // Ensure we don't have multiple active channels for the same topic
       if (presenceChannelRef.current) {
         supabase.removeChannel(presenceChannelRef.current);
       }

       // Use a unique channel name per user to avoid "Lock broken" errors
       // Adding a timestamp ensures that even if the same student logs in again, it's a fresh channel
       const channel = supabase.channel(`online-users-student-${userInfo.firstName}-${userInfo.className}-${Date.now()}`);
       presenceChannelRef.current = channel;

       channel.subscribe(async (status: string) => {
         if (status === 'SUBSCRIBED') {
           try {
             await channel.track({
               studentName: userInfo.firstName,
               className: userInfo.className,
               onlineAt: new Date().toISOString()
             });
           } catch (err) {
             console.error("Error tracking presence:", err);
           }
         }
       });

       return () => {
         if (presenceChannelRef.current) {
           supabase.removeChannel(presenceChannelRef.current);
           presenceChannelRef.current = null;
         }
       };
    }
  }, [userInfo, simulatedClassId]);


  const handleLogout = useCallback(() => {
    setUserInfo(null);
    setShowLogoutConfirm(false);
    setActiveModule(null);
    setCurrentProblem(null);
    setIsFinished(false);
    setSolvedCount(0);
    setSimulatedClassId(null);
    setIntervention({ isActive: false, errorType: null });
    setSessionErrorCounts({ [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0, [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0 });
    setStats({
      completed: 0, totalErrors: 0,
      errorDistribution: { [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0, [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0 },
      problemBreakdown: {},
      sessionStartTime: Date.now()
    });
  }, []);

  const createConfetti = useCallback(() => {
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.backgroundColor = ['#2563eb', '#10B981', '#F59E0B', '#EF4444', '#EC4899'][Math.floor(Math.random() * 5)];
      confetti.style.animationDelay = Math.random() * 2 + 's';
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 4000);
    }
  }, []);

  const handleStepStatusUpdate = useCallback((status: StepSuccessStatus) => {
    if (!activeModule || userInfo?.role !== 'student' || simulatedClassId) return;

    setDiary(prev => {
        const modProgress = prev.moduleProgress[activeModule] || createInitialProgress()[activeModule];
        const oldHistory = modProgress.recentStepHistory || [];
        
        // Add new status to front, max 30 items
        const newHistory = [status, ...oldHistory].slice(0, 30);

        // Optimistic Update
        const updatedDiary = {
            ...prev,
            moduleProgress: {
                ...prev.moduleProgress,
                [activeModule]: {
                    ...modProgress,
                    recentStepHistory: newHistory
                }
            }
        };

        // Sync to Supabase
        supabase.from('student_progress').upsert({
            first_name: userInfo.firstName,
            class_name: userInfo.className,
            module_id: activeModule,
            recent_step_history: newHistory // Assuming 'recent_step_history' column exists as jsonb or text[]
        }, { onConflict: 'first_name,class_name,module_id' }).then(({ error }) => {
            if (error) console.error("Error saving step history:", error);
        });

        return updatedDiary;
    });
  }, [activeModule, userInfo, simulatedClassId]);

  const saveSessionToDiary = useCallback(async () => {
    // Only save session to diary if it's a real student session
    if (!activeModule || userInfo?.role !== 'student' || simulatedClassId) return;
    
    const newEntry: DiaryEntry = { date: new Date().toISOString(), moduleId: activeModule, stats: { ...stats } };

    // 1. Save to Supabase Learning Diary
    await supabase.from('learning_diary').insert({
      student_name: userInfo.firstName,
      class_name: userInfo.className,
      date: newEntry.date,
      module_id: activeModule,
      stats: stats
    });

    // 2. Update Progress in State & Supabase
    setDiary(prev => {
      const currentModProgress = prev.moduleProgress[activeModule] || {
        growthStatus: 1,
        solvedProblemIds: [],
        allTimeErrors: { [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0, [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0 },
        recentStepHistory: []
      };
      
      const newAllTimeErrors = Object.entries(stats.errorDistribution).reduce((acc, [type, count]) => {
        acc[type as ErrorType] = (currentModProgress.allTimeErrors[type as ErrorType] || 0) + count;
        return acc;
      }, { ...currentModProgress.allTimeErrors });

      const newModuleProgress = {
        ...prev.moduleProgress,
        [activeModule]: {
          ...currentModProgress,
          allTimeErrors: newAllTimeErrors
        }
      };

      // Sync specific module progress to Supabase
      supabase.from('student_progress').upsert({
        first_name: userInfo.firstName,
        class_name: userInfo.className,
        module_id: activeModule,
        growth_status: currentModProgress.growthStatus,
        solved_problem_ids: currentModProgress.solvedProblemIds,
        all_time_errors: newAllTimeErrors,
        recent_step_history: currentModProgress.recentStepHistory // Persist history here too
      }, { onConflict: 'first_name,class_name,module_id' }).then(({error}) => {
          if(error) console.error("Error saving progress:", error);
      });

      return {
        ...prev,
        entries: [newEntry, ...prev.entries].slice(0, 50),
        totalSessions: prev.totalSessions + 1,
        moduleProgress: newModuleProgress
      };
    });
  }, [stats, activeModule, userInfo, simulatedClassId]);

  // Handle module selection and initial problem picking
  const handleModuleSelect = useCallback((id: ModuleId) => {
    setActiveModule(id);
    
    // Explicitly select the first problem to ensure stability
    const progress = diary.moduleProgress[id] || { growthStatus: 1, solvedProblemIds: [] };
    let pool: Problem[] = [];
    
    if (id === 'mix') {
      const mixProgress = diary.moduleProgress[id] || { solvedProblemIds: [] };
      pool = problems.filter(p => !mixProgress.solvedProblemIds.includes(p.id));
    } else {
      pool = problems.filter(p => p.moduleId === id && p.level === progress.growthStatus && !progress.solvedProblemIds.includes(p.id));
    }
    
    const problem = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    setCurrentProblem(problem);
  }, [diary, problems]);

  // LIVE ALERTS (SUPABASE REALTIME OR POLLING)
  useEffect(() => {
    // Simple polling for live alerts for specific user if teacher or admin
    // For student pushing alerts:
    // This part is handled in handleStepError
  }, []);

  const handleStepError = useCallback(async (types: ErrorType[]) => {
    setSessionErrorCounts(prev => {
      const newCounts = { ...prev };
      let triggeringErrorType: ErrorType | null = null;

      types.forEach(type => {
         const newCount = (newCounts[type] || 0) + 1;
         newCounts[type] = newCount;
         // Trigger intervention if a specific error type occurs 3 or more times
         if (newCount >= 3) {
            triggeringErrorType = type;
         }
      });

      if (triggeringErrorType) {
        let newAlertId = undefined;
        // Only broadcast alert if it's a real student session
        if (userInfo?.role === 'student' && !simulatedClassId) {
            newAlertId = `${Date.now()}-${userInfo.firstName}`;
            // Push to Supabase
            supabase.from('intervention_alerts').insert({
              id: newAlertId,
              student_name: userInfo.firstName,
              class_name: userInfo.className,
              error_type: triggeringErrorType,
              module_id: activeModule || 'mix',
              timestamp: Date.now()
            }).then();
        }
        setIntervention({ isActive: true, errorType: triggeringErrorType, alertId: newAlertId });
      }
      return newCounts;
    });
  }, [userInfo, activeModule, simulatedClassId]);

  const handleUnlockIntervention = async () => {
    if (intervention.errorType) {
       setSessionErrorCounts(prev => ({ ...prev, [intervention.errorType!]: 0 }));
       // Only clear broadcasted alert if it was a real student session
       if (userInfo?.role === 'student' && !simulatedClassId && intervention.alertId) {
          await supabase.from('intervention_alerts').delete().eq('id', intervention.alertId);
       }
    }
    setIntervention({ isActive: false, errorType: null, alertId: undefined });
  };

  // Poll for unlock if intervention active
  useEffect(() => {
    let interval: any;
    let isPolling = false;
    if (intervention.isActive && intervention.alertId && userInfo && !simulatedClassId) {
       interval = setInterval(async () => {
          if (isPolling) return;
          isPolling = true;
          try {
             const { data } = await supabase.from('intervention_alerts').select('id').eq('id', intervention.alertId);
             // If alert is gone from DB, unlock
             if (!data || data.length === 0) {
                handleUnlockIntervention();
             }
          } catch (err) {
             console.error("Error polling intervention status:", err);
          } finally {
             isPolling = false;
          }
       }, 3000);
    }
    return () => clearInterval(interval);
  }, [intervention.isActive, intervention.alertId, userInfo, simulatedClassId]);


  const handleProblemComplete = useCallback(async (errors: Record<ErrorType, number>) => {
    if (!activeModule || !currentProblem) return;
    
    // Prepare next state derived from current (to pick next problem immediately)
    const currentProgress = diary.moduleProgress[activeModule] || { growthStatus: 1, solvedProblemIds: [] };
    const nextSolvedIds = [...currentProgress.solvedProblemIds, currentProblem.id];

    // Only update student progress if it's a real student session
    if (userInfo?.role === 'student' && !simulatedClassId) {
      setDiary(prev => {
        const modProgress = prev.moduleProgress[activeModule];
        const updatedSolved = [...modProgress.solvedProblemIds, currentProblem.id];
        
        // Optimistic update
        const updatedDiary = {
          ...prev,
          moduleProgress: {
            ...prev.moduleProgress,
            [activeModule]: {
              ...modProgress,
              solvedProblemIds: updatedSolved
            }
          }
        };

        // Sync solved IDs to Supabase
        supabase.from('student_progress').upsert({
           first_name: userInfo.firstName,
           class_name: userInfo.className,
           module_id: activeModule,
           solved_problem_ids: updatedSolved
        }, { onConflict: 'first_name,class_name,module_id' }).then();

        return updatedDiary;
      });
    }

    setStats(prev => {
      const newDist = { ...prev.errorDistribution };
      Object.entries(errors).forEach(([type, count]) => { newDist[type as ErrorType] += count; });
      return { 
        ...prev,
        completed: prev.completed + 1, 
        totalErrors: prev.totalErrors + Object.values(errors).reduce((a, b) => a + b, 0), 
        errorDistribution: newDist 
      };
    });

    setSolvedCount(prev => prev + 1);

    // Pick NEXT problem
    let pool: Problem[] = [];
    if (activeModule === 'mix') {
        pool = problems.filter(p => !nextSolvedIds.includes(p.id));
    } else {
        const currentLevel = currentProgress.growthStatus;
        pool = problems.filter(p => p.moduleId === activeModule && p.level === currentLevel && !nextSolvedIds.includes(p.id));
    }
    
    const nextProblem = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    setCurrentProblem(nextProblem);

  }, [activeModule, currentProblem, userInfo, simulatedClassId, diary, problems]);

  const handleFinishEarly = useCallback(() => {
    if (!activeModule) return;
    setIsEvaluatingGrowth(true);
    setIsFinished(true);

    const levelToEval = activeModule === 'mix' ? 1 : diary.moduleProgress[activeModule].growthStatus;
    evaluateProgression(stats, levelToEval as DifficultyLevel, activeModule, aiGuideContext).then(prog => {
      setProgressionInfo(prog);
      setIsEvaluatingGrowth(false);
      // Only save session to diary if it's a real student session
      if (userInfo?.role === 'student' && !simulatedClassId) {
        saveSessionToDiary();
      }
      
      if (prog.shouldLevelUp && activeModule !== 'mix') {
        // Only level up if it's a real student session
        if (userInfo?.role === 'student' && !simulatedClassId) {
          setDiary(prev => {
            // Update Supabase
            supabase.from('student_progress').update({
               growth_status: prog.newLevel
            }).match({
               first_name: userInfo.firstName,
               class_name: userInfo.className,
               module_id: activeModule
            }).then();

            return {
              ...prev,
              moduleProgress: {
                ...prev.moduleProgress,
                [activeModule]: { ...prev.moduleProgress[activeModule], growthStatus: prog.newLevel }
              }
            };
          });
        }
        setShowGrowthCelebration(true);
        createConfetti();
      }
    });
  }, [stats, activeModule, diary, saveSessionToDiary, createConfetti, userInfo, simulatedClassId, aiGuideContext]);

  // Nieuwe useEffect om de sessie automatisch te beëindigen
  useEffect(() => {
    if (activeModule && solvedCount >= DEFAULT_SESSION_TARGET && !isFinished) {
      handleFinishEarly();
    }
  }, [solvedCount, activeModule, isFinished, handleFinishEarly]);

  const handleReturnToHub = () => {
    setActiveModule(null);
    setCurrentProblem(null);
    setIsFinished(false);
    setSolvedCount(0);
    setProgressionInfo(null);
    setIntervention({ isActive: false, errorType: null });
    setSessionErrorCounts({ [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0, [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0 });
    setStats({
      completed: 0, totalErrors: 0,
      errorDistribution: { [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0, [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0 },
      problemBreakdown: {},
      sessionStartTime: Date.now()
    });
  };

  const handleToggleLock = async (classId: string, moduleId: string) => {
    const cls = classrooms.find(c => c.id === classId);
    if (!cls) return;
    
    const currentLocks = cls.lockedModules || [];
    const updatedLocks = currentLocks.includes(moduleId)
      ? currentLocks.filter(m => m !== moduleId)
      : [...currentLocks, moduleId];
    
    // Update State
    setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, lockedModules: updatedLocks } : c));

    // Update Supabase
    await supabase.from('classrooms').update({ locked_modules: updatedLocks }).eq('id', classId);
  };

  const handleEnterStudentView = (classId: string) => {
    setSimulatedClassId(classId);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold">Laden...</div>;
  }

  // Dedicated Password Setup Page
  if (showPasswordSetup) {
    return (
      <SetPasswordModal 
        onComplete={() => {
          setShowPasswordSetup(false);
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
          // Refresh or redirect to ensure dashboard loads correctly
          window.location.reload();
        }} 
      />
    );
  }

  // If user is not logged in, show Onboarding
  if (!userInfo) {
    return <Onboarding onComplete={setUserInfo} classrooms={classrooms} teachers={teachers} students={students} />;
  }

  const isSimulating = simulatedClassId !== null;
  const currentClass = isSimulating 
    ? classrooms.find(c => c.id === simulatedClassId) 
    : classrooms.find(c => c.name === userInfo.className);
  
  const currentLocks = currentClass?.lockedModules || [];

  // If the user is a teacher or admin AND not currently simulating a student, show the TeacherDashboard
  if ((userInfo.role === 'admin' || userInfo.role === 'teacher') && !isSimulating) {
    const teacherDashboardProps = {
      role: userInfo.role,
      problems: problems, 
      classrooms: classrooms,
      teachers: teachers,
      studentResults: allStudentResults,
      assignedClassIds: userInfo.assignedClassIds,
      themes: THEMES,
      students: students,
      onToggleLock: handleToggleLock,
      onAddProblem: (p: Problem) => {
        setProblems(prev => [...prev, p]);
      },
      onUpdateProblem: (up: Problem) => setProblems(prev => prev.map(p => p.id === up.id ? up : p)),
      onDeleteProblem: (id: string) => setProblems(prev => prev.filter(p => p.id !== id)),
      onUpdateClassrooms: setClassrooms, 
      onUpdateTeachers: setTeachers,   
      onUpdateStudents: setStudents,  
      onSetProblems: setProblems,
      onClose: handleLogout,
      onEnterStudentView: handleEnterStudentView,
      aiGuideConfig: aiGuideConfig,
      setAIGuideConfig: setAIGuideConfig,
    };
    return <TeacherDashboard {...teacherDashboardProps} />;
  }

  // Otherwise, render the student-focused UI (including simulated student view)
  return (
    <div className="min-h-screen py-6 md:py-10 px-4 flex flex-col items-center bg-slate-50 relative overflow-x-hidden">
      
      {/* Student-specific modals */}
      {intervention.isActive && intervention.errorType && (
        <InterventionModal 
          errorType={intervention.errorType} 
        />
      )}

      {showGrowthCelebration && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-blue-900/90 backdrop-blur-md">
           <div className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center shadow-2xl space-y-8 animate-in zoom-in duration-500">
              <h2 className="text-3xl font-black text-slate-900 leading-tight">Gefeliciteerd!</h2>
              <p className="text-xl font-black text-blue-600 italic">"{progressionInfo?.growthMessage}"</p>
              <button onClick={() => setShowGrowthCelebration(false)} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-xs border-none cursor-pointer">Verder gaan</button>
           </div>
        </div>
      )}

      {isSimulating && (
        <div className="fixed top-0 left-0 right-0 z-[1000] bg-emerald-600 text-white py-2 px-4 text-center font-black text-[10px] uppercase tracking-widest flex justify-between items-center shadow-lg">
           <span><i className="fa-solid fa-eye mr-2"></i> Pupil View: Klas {currentClass?.name}</span>
           <button 
             onClick={() => setSimulatedClassId(null)}
             className="bg-white text-emerald-600 px-3 py-1 rounded-lg border-none cursor-pointer font-black text-[9px] uppercase hover:bg-emerald-50"
           >
             Sluit Preview
           </button>
        </div>
      )}

      <div className={`w-full max-w-5xl ${isSimulating ? 'pt-8' : ''}`}>
        <header className="flex items-center justify-between mb-12">
           <div className="flex items-center gap-4 cursor-pointer" onClick={handleReturnToHub}>
              <img src="/logo.png" alt="Logo" className="h-20 w-auto" />
           </div>
           
           <div className="flex items-center gap-3">
             <button onClick={() => setShowLogoutConfirm(true)} className="bg-white border-2 border-slate-200 px-5 py-3 rounded-2xl text-slate-500 hover:text-rose-600 transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer">Afmelden</button>
           </div>
        </header>

        {!activeModule ? (
          <ModuleHub themes={THEMES} progress={diary.moduleProgress} onSelect={handleModuleSelect} user={userInfo} lockedModules={currentLocks} />
        ) : isFinished ? (
          <SessionSummary stats={stats} onRestart={handleReturnToHub} onLogout={() => setShowLogoutConfirm(true)} progression={progressionInfo} isEvaluating={isEvaluatingGrowth} />
        ) : (
          <div className="space-y-6">
            <div className="bg-white px-8 py-5 rounded-[2.5rem] border border-blue-50 shadow-sm flex items-center justify-between">
              <button onClick={handleReturnToHub} className="text-slate-400 hover:text-blue-600 transition-all cursor-pointer bg-transparent border-none">
                <i className="fa-solid fa-chevron-left mr-2"></i> Terug
              </button>
              <div className="flex items-center gap-4 flex-1 mx-6">
                 <ProgressBar current={solvedCount} total={DEFAULT_SESSION_TARGET} />
                 <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">{solvedCount}/{DEFAULT_SESSION_TARGET}</span>
              </div>
              <button onClick={handleFinishEarly} className="text-emerald-600 font-black uppercase text-[10px] tracking-widest bg-emerald-50 px-4 py-2 rounded-xl border-none cursor-pointer">Afronden</button>
            </div>

            {currentProblem ? (
              <ProblemSolver 
                key={currentProblem.id} 
                problem={currentProblem} 
                onComplete={handleProblemComplete} 
                onStepError={handleStepError} 
                onStepSuccess={handleStepStatusUpdate}
                interventionType={intervention.isActive ? intervention.errorType : null} 
                onResetIntervention={handleUnlockIntervention} 
                allErrorCounts={sessionErrorCounts} 
                moduleId={activeModule} 
                aiGuideContext={aiGuideContext}
                studentName={userInfo.firstName}
              />
            ) : (
              <div className="bg-white p-20 rounded-[4rem] text-center space-y-6">
                {problems.filter(p => p.moduleId === activeModule).length === 0 ? (
                  <>
                     <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-4xl mx-auto shadow-inner">
                        <i className="fa-solid fa-empty-set"></i>
                     </div>
                     <h2 className="text-3xl font-black text-slate-900">Nog geen oefeningen</h2>
                     <p className="text-slate-500 font-medium">Vraag je leerkracht om oefeningen toe te voegen voor deze module.</p>
                     <button onClick={handleReturnToHub} className="bg-slate-200 text-slate-600 px-12 py-5 rounded-2xl font-black uppercase tracking-widest border-none cursor-pointer">Terug naar overzicht</button>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 text-4xl mx-auto shadow-inner">
                       <span className="font-black font-serif text-6xl mt-2">Σ</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900">Oefeningen Voltooid!</h2>
                    <p className="text-slate-500 font-medium">Geen nieuwe oefeningen meer op dit niveau. Bekijk je eindrapport!</p>
                    <button onClick={handleFinishEarly} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest border-none cursor-pointer shadow-xl shadow-blue-100">Bekijk Rapport</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[3rem] max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-900">Afmelden?</h2>
            <p className="text-slate-500 font-medium">Je keert veilig terug naar het startscherm.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleLogout} className="w-full bg-rose-600 text-white font-black py-5 rounded-2xl border-none cursor-pointer shadow-lg shadow-rose-100 uppercase tracking-widest text-xs">Afmelden</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full bg-slate-100 text-slate-600 font-black py-5 rounded-2xl border-none cursor-pointer uppercase tracking-widest text-xs">Annuleer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
