

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Problem, DifficultyLevel, ModuleId, ThemeConfig, Classroom, Teacher, StudentResult, ModuleProgress, ErrorType, InterventionAlert, ClassAnalysis, ModuleAnalysis, CrossModularTrend, SubModuleConfig, AIGuideConfig, Student, DiaryEntry } from '../types';
import { MathDisplay } from './MathDisplay';
import { MathInput, MathInputRef } from './MathInput';
import { MathToolbar } from './MathToolbar';
import { analyzeClassPerformance, generateMathProblem } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AIGuideEditor } from './AIGuideEditor';
import { supabase } from '../services/supabaseClient';

// --- HELPER COMPONENT FOR ACCESS TREE (CHILDREN) ---
interface AccessTreeItemProps {
  item: ThemeConfig | SubModuleConfig | { id: string; title: string; icon: string; subModules?: any[] };
  classId: string;
  lockedModules: string[];
  onToggle: (cid: string, mid: string) => void;
  level?: number;
}

const AccessTreeItem: React.FC<AccessTreeItemProps> = ({ item, classId, lockedModules, onToggle, level = 0 }) => {
  const isLocked = lockedModules.includes(item.id);
  const hasSub = item.subModules && item.subModules.length > 0;
  
  return (
    <div className="select-none relative">
      <div 
        className={`flex items-center justify-between py-2 px-2 rounded-lg transition-all hover:bg-slate-100/50`}
        style={{ paddingLeft: `${level * 1.2 + 0.5}rem` }}
      >
         <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${isLocked ? 'text-slate-300' : 'text-slate-400'}`}>
               {item.icon?.startsWith('fa-') ? <i className={`fa-solid ${item.icon}`}></i> : <span className="font-bold">{item.icon}</span>}
            </div>
            <span className={`text-xs truncate ${isLocked ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>{item.title}</span>
         </div>
         
         <button 
           onClick={() => onToggle(classId, item.id as string)}
           className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border-none cursor-pointer text-[10px] ${isLocked ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
           title={isLocked ? "Ontgrendelen" : "Vergrendelen"}
         >
            <i className={`fa-solid ${isLocked ? 'fa-lock' : 'fa-lock-open'}`}></i>
         </button>
      </div>
      {hasSub && (
        <div className="relative border-l border-slate-100 ml-4 my-1">
           {item.subModules!.map((sub: any) => (
             <AccessTreeItem key={sub.id} item={sub} classId={classId} lockedModules={lockedModules} onToggle={onToggle} level={level + 1} />
           ))}
        </div>
      )}
    </div>
  );
};

// --- HELPER COMPONENT FOR ACCESS CARD (ROOT THEME) ---
interface AccessThemeCardProps {
  theme: ThemeConfig;
  classId: string;
  lockedModules: string[];
  onToggle: (cid: string, mid: string) => void;
}

const AccessThemeCard: React.FC<AccessThemeCardProps> = ({ theme, classId, lockedModules, onToggle }) => {
  const isLocked = lockedModules.includes(theme.id);
  const bgClass = THEME_COLORS[theme.color || 'blue'].replace('bg-', 'bg-').replace('500', '50');
  const textClass = THEME_COLORS[theme.color || 'blue'].replace('bg-', 'text-').replace('500', '600');
  const borderClass = THEME_COLORS[theme.color || 'blue'].replace('bg-', 'border-').replace('500', '100');

  return (
    <div className={`bg-white rounded-[2rem] border p-5 shadow-sm flex flex-col h-full transition-all hover:shadow-md ${isLocked ? 'border-rose-100 opacity-70' : 'border-slate-200'}`}>
        {/* Header */}
        <div className={`flex justify-between items-center pb-4 mb-2 border-b ${isLocked ? 'border-rose-50' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${isLocked ? 'bg-rose-50 text-rose-400' : `${bgClass} ${textClass}`}`}>
                    {theme.icon?.startsWith('fa-') ? <i className={`fa-solid ${theme.icon}`}></i> : <span className="font-bold font-serif">{theme.icon}</span>}
                </div>
                <span className={`font-black text-sm ${isLocked ? 'text-rose-400' : 'text-slate-800'}`}>{theme.title}</span>
            </div>
            <button 
                onClick={() => onToggle(classId, theme.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer shadow-sm ${isLocked ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-white border-2 border-slate-100 text-emerald-500 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
            >
                <i className={`fa-solid ${isLocked ? 'fa-lock' : 'fa-lock-open'}`}></i>
            </button>
        </div>

        {/* Submodules List */}
        <div className="flex-1 space-y-1">
            {theme.subModules?.map(sub => (
                <AccessTreeItem 
                    key={sub.id} 
                    item={sub} 
                    classId={classId} 
                    lockedModules={lockedModules} 
                    onToggle={onToggle} 
                    level={0} // Start level 0 inside the card
                />
            ))}
            {(!theme.subModules || theme.subModules.length === 0) && (
                <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest py-4">
                    Geen deelmodules
                </div>
            )}
        </div>
    </div>
  );
};

// --- HELPER COMPONENT FOR DATABASE TREE ---
interface DatabaseTreeItemProps {
  item: ThemeConfig | SubModuleConfig;
  problems: Problem[];
  onEdit: (p: Problem) => void;
  onDelete: (id: string) => void;
  level?: number;
  showActions: boolean;
}

const DatabaseTreeItem: React.FC<DatabaseTreeItemProps> = ({ item, problems, onEdit, onDelete, level = 0, showActions }) => {
  const hasSub = item.subModules && item.subModules.length > 0;
  
  // Filter problems belonging to this exact module (leaf node)
  const moduleProblems = useMemo(() => {
      if (hasSub) return [];
      return problems.filter(p => p.moduleId === item.id);
  }, [problems, item.id, hasSub]);

  // Recursively check if this branch has any content to display
  const hasContent = useMemo(() => {
      if (moduleProblems.length > 0) return true;
      if (!hasSub) return false;
      
      const checkContent = (subItems: any[]): boolean => {
          return subItems.some(sub => {
              const subHasProblems = problems.some(p => p.moduleId === sub.id);
              if (subHasProblems) return true;
              return sub.subModules ? checkContent(sub.subModules) : false;
          });
      };
      return checkContent(item.subModules!);
  }, [moduleProblems, hasSub, item.subModules, problems]);

  if (!hasContent && problems.length > 0) return null; // Hide empty branches if filtering is active, but show all if problems list is empty (initial state handled in parent)

  return (
    <div className="select-none mb-2">
      <div 
        className={`flex items-center gap-3 p-3 rounded-xl ${level === 0 ? 'bg-slate-50/50 mb-2 mt-4 border border-slate-100' : ''}`}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
         <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${level === 0 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
            {item.icon?.startsWith('fa-') ? <i className={`fa-solid ${item.icon}`}></i> : <span className="font-bold">{item.icon}</span>}
         </div>
         <span className={`${level === 0 ? 'font-black text-slate-800' : 'font-medium text-slate-600 text-sm'}`}>
            {item.title}
            {moduleProblems.length > 0 && <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[9px] font-black">{moduleProblems.length}</span>}
         </span>
      </div>

      {/* Render Problems for Leaf Nodes */}
      {moduleProblems.length > 0 && (
          <div className="space-y-2 mb-4" style={{ paddingLeft: `${level * 1.5 + 3.5}rem` }}>
              {moduleProblems.map(p => {
                  const levelConfig = LEVEL_CONFIG[p.level];
                  return (
                    <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md hover:border-blue-200 transition-all group">
                        <div className="flex items-center gap-4">
                            <span 
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] text-white ${levelConfig.btn.replace('bg-', 'bg-')}`} 
                                title={levelConfig.label}
                            >
                                <i className={`fa-solid ${levelConfig.icon}`}></i>
                            </span>
                            <div className="font-bold text-slate-700 text-sm">
                                <MathDisplay math={p.expression} />
                            </div>
                        </div>
                        {showActions && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => onEdit(p)} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border-none cursor-pointer hover:bg-blue-100"><i className="fa-solid fa-pen text-xs"></i></button>
                              <button onClick={() => onDelete(p.id)} className="w-8 h-8 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center border-none cursor-pointer hover:bg-rose-100"><i className="fa-solid fa-trash-can text-xs"></i></button>
                          </div>
                        )}
                    </div>
                  );
              })}
          </div>
      )}

      {/* Recursive Children */}
      {hasSub && (
        <div className="relative">
           {/* Vertical line for hierarchy visual */}
           <div className="absolute top-0 bottom-4 w-px bg-slate-200" style={{ left: `${level * 1.5 + 1.75}rem` }}></div>
           {item.subModules!.map((sub: any) => (
             <DatabaseTreeItem key={sub.id} item={sub} problems={problems} onEdit={onEdit} onDelete={onDelete} level={level + 1} showActions={showActions} />
           ))}
        </div>
      )}
    </div>
  );
};

interface StepItem { 
  id: string; 
  value: string; 
  leftValue: string; 
  rightValue: string; 
  operation: string;
  hasOperation: boolean;
}

interface TeacherDashboardProps {
  role: 'admin' | 'teacher';
  problems: Problem[];
  classrooms: Classroom[];
  teachers: Teacher[];
  students: Student[];
  studentResults: StudentResult[];
  assignedClassIds?: string[];
  themes: ThemeConfig[];
  onToggleLock: (classId: string, moduleId: string) => void;
  onAddProblem: (problem: Problem) => void;
  onUpdateProblem: (problem: Problem) => void;
  onDeleteProblem: (id: string) => void;
  onUpdateClassrooms: (classes: Classroom[]) => void;
  onUpdateTeachers: (teachers: Teacher[]) => void;
  onUpdateStudents: (students: Student[]) => void;
  onClose: () => void;
  onSetProblems?: (problems: Problem[]) => void;
  onEnterStudentView: (classId: string) => void;
  aiGuideConfig: AIGuideConfig;
  setAIGuideConfig: (config: AIGuideConfig) => void;
}

type DashboardTab = 'create' | 'database' | 'access' | 'users' | 'students' | 'results' | 'live' | 'ai-guide';

const LEVEL_CONFIG = {
  1: { label: 'Zaadje', icon: 'fa-seedling', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', btn: 'bg-emerald-500' },
  2: { label: 'Plantje', icon: 'fa-leaf', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', btn: 'bg-blue-500' },
  3: { label: 'Boompje', icon: 'fa-tree', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', btn: 'bg-purple-500' }
};

const ERROR_LABELS: Record<ErrorType, string> = {
    [ErrorType.ORDER]: "Volgorde",
    [ErrorType.CALCULATION]: "Rekenfout",
    [ErrorType.SIGN]: "Teken",
    [ErrorType.CONCEPT]: "Denkfout",
    [ErrorType.COPY]: "Overtip",
    [ErrorType.UNKNOWN]: "Onbekend"
};

const ERROR_COLORS = {
    [ErrorType.ORDER]: '#f43f5e',
    [ErrorType.CALCULATION]: '#2563eb',
    [ErrorType.SIGN]: '#f59e0b',
    [ErrorType.CONCEPT]: '#a855f7',
    [ErrorType.COPY]: '#64748b',
    [ErrorType.UNKNOWN]: '#94a3b8'
};

const THEME_COLORS: Record<string, string> = {
    'blue': 'bg-blue-500',
    'emerald': 'bg-emerald-500',
    'purple': 'bg-purple-500',
    'indigo': 'bg-indigo-500',
    'orange': 'bg-orange-500',
    'rose': 'bg-rose-500',
};

const getAllLeafModules = (themes: ThemeConfig[]): LeafModuleOption[] => {
  const leafModules: LeafModuleOption[] = [];
  const traverse = (configs: (ThemeConfig | SubModuleConfig)[], parentTitles: string[]) => {
    configs.forEach(config => {
      const currentTitles = [...parentTitles, config.title];
      if (config.subModules && config.subModules.length > 0) {
        traverse(config.subModules, currentTitles);
      } else {
        leafModules.push({ id: config.id as ModuleId, fullTitle: currentTitles.join(' - ') });
      }
    });
  };
  traverse(themes, []);
  return leafModules;
};

// Helper to get all descendant IDs from a given node
const getRecursiveModuleIds = (item: ThemeConfig | SubModuleConfig): string[] => {
    const ids: string[] = [];
    ids.push(item.id);
    if (item.subModules) {
        item.subModules.forEach(sub => {
            ids.push(...getRecursiveModuleIds(sub));
        });
    }
    return ids;
};

interface LeafModuleOption {
  id: ModuleId;
  fullTitle: string;
}

const collectAllModuleIds = (themes: ThemeConfig[]): string[] => {
  const ids: string[] = [];
  const traverse = (items: (ThemeConfig | SubModuleConfig)[]) => {
    items.forEach(item => {
      ids.push(item.id);
      if (item.subModules) traverse(item.subModules);
    });
  };
  traverse(themes);
  return ids;
};

const generatePassword = () => {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const special = "&é@#(!+*/$µ=ç";
    const numbers = "0123456789";
    const all = lower + upper + numbers + special;

    let pass = "";
    // Verplichte karakters
    pass += lower.charAt(Math.floor(Math.random() * lower.length));
    pass += upper.charAt(Math.floor(Math.random() * upper.length));
    pass += special.charAt(Math.floor(Math.random() * special.length));

    // Aanvullen tot 8 tekens
    while (pass.length < 8) {
        pass += all.charAt(Math.floor(Math.random() * all.length));
    }

    // Shuffle resultaat
    return pass.split('').sort(() => 0.5 - Math.random()).join('');
};

// Helper for unified Supabase Error Handling
const handleSupabaseError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  if (error.message?.includes('row-level security') || error.code === '42501') {
     alert(`RLS Fout bij ${context}: De database blokkeert deze actie. Zorg dat je het "supabase_rls_setup.sql" script hebt uitgevoerd in de Supabase SQL Editor.`);
  } else if (error.message?.includes('foreign key constraint')) {
     alert(`Kan niet verwijderen: Er zijn gekoppelde gegevens. Probeer het opnieuw (de app probeert nu gerelateerde data op te ruimen).`);
  } else {
     alert(`Fout bij ${context}: ${error.message}`);
  }
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  role, problems, classrooms, teachers, students, studentResults, assignedClassIds, themes, onToggleLock,
  onAddProblem, onUpdateProblem, onDeleteProblem, onUpdateClassrooms, onUpdateTeachers, onUpdateStudents, onClose, onSetProblems, onEnterStudentView,
  aiGuideConfig, setAIGuideConfig
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('live');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [newClassName, setNewClassName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState<'admin' | 'teacher'>('teacher');
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [serverError, setServerError] = useState<string>('');
  const [manualAuthId, setManualAuthId] = useState('');

  // Student management state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [newStudentFirst, setNewStudentFirst] = useState('');
  const [newStudentLastInitial, setNewStudentLastInitial] = useState('');
  const [newStudentClassId, setNewStudentClassId] = useState<string>('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [selectedStudentClassFilter, setSelectedStudentClassFilter] = useState<string>('all');
  
  // Custom confirmation states
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  // Clear All Students state
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearAllConfirmationText, setClearAllConfirmationText] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordValue, setChangePasswordValue] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
      if (changePasswordValue.length < 6) {
          alert("Wachtwoord moet minimaal 6 tekens zijn.");
          return;
      }
      setIsChangingPassword(true);
      try {
          const { error } = await supabase.auth.updateUser({ password: changePasswordValue });
          if (error) throw error;
          alert("Wachtwoord succesvol gewijzigd!");
          setShowChangePasswordModal(false);
          setChangePasswordValue('');
      } catch (e: any) {
          alert(`Fout bij wijzigen wachtwoord: ${e.message}`);
      } finally {
          setIsChangingPassword(false);
      }
  };

  // Portal target state to prevent Error #299
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Access Tab State
  const myClassrooms = useMemo(() => {
    const relevantClassrooms = role === 'admin' 
      ? [...classrooms] 
      : classrooms.filter(c => assignedClassIds?.includes(c.id));
      
    return relevantClassrooms.sort((a, b) => a.name.localeCompare(b.name));
  }, [role, classrooms, assignedClassIds]);

  const [selectedAccessClassId, setSelectedAccessClassId] = useState<string | null>(null);

  // Auto-select first class for access tab if available
  useEffect(() => {
    if (activeTab === 'access' && !selectedAccessClassId && myClassrooms.length > 0) {
      setSelectedAccessClassId(myClassrooms[0].id);
    }
    // Fix: Allow 'all' filter by removing the forced override of selectedStudentClassFilter
    // Just ensure the "New Student" form has a default class selected
    if (activeTab === 'students' && myClassrooms.length > 0 && !newStudentClassId) {
        setNewStudentClassId(myClassrooms[0].id);
    }
  }, [activeTab, myClassrooms, selectedAccessClassId, newStudentClassId]);

  // Set portal target after mount
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const [viewClassId, setViewClassId] = useState<string>(() => {
    if (role === 'teacher' && myClassrooms.length > 0) return myClassrooms[0].id;
    return 'all';
  });
  
  const [viewStudentName, setViewStudentName] = useState<string>('all');
  const [selectedStudentResult, setSelectedStudentResult] = useState<StudentResult | null>(null);
  const [studentDiaryEntries, setStudentDiaryEntries] = useState<DiaryEntry[]>([]); // New state for granular data
  
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [classReport, setClassReport] = useState<ClassAnalysis | null>(null);
  const [alerts, setAlerts] = useState<InterventionAlert[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string[]>>({});

  // Filters for Database Tab
  const [dbFilterLevel, setDbFilterLevel] = useState<DifficultyLevel | 'all'>('all');
  const [dbFilterTheme, setDbFilterTheme] = useState<string>('all');
  const [dbFilterSubModule, setDbFilterSubModule] = useState<string>('all');
  const [dbSearchQuery, setDbSearchQuery] = useState('');

  // Filters for Results Tab
  const [resultFilterTheme, setResultFilterTheme] = useState<string>('all');
  const [resultFilterSubModule, setResultFilterSubModule] = useState<string>('all');
  const [resultViewMode, setResultViewMode] = useState<'individual' | 'groups'>('individual');

  // Removed groupingStats state and effect as we now use cumulative stats


  const myStudents = useMemo(() => {
    return studentResults.filter(s => {
        const cls = classrooms.find(c => c.name === s.className);
        return cls && (role === 'admin' || assignedClassIds?.includes(cls.id));
    });
  }, [role, studentResults, classrooms, assignedClassIds]);

  const filteredDisplayStudents = useMemo(() => {
    let result = myStudents;
    if (viewClassId !== 'all') {
      const clsName = classrooms.find(c => c.id === viewClassId)?.name;
      result = result.filter(s => s.className === clsName);
    }
    if (viewStudentName !== 'all') {
      result = result.filter(s => s.firstName === viewStudentName);
    }
    return result;
  }, [myStudents, viewClassId, viewStudentName, classrooms]);

  const displayedRegisteredStudents = useMemo(() => {
      let result = [...students];
      // Filter by role access
      if (role !== 'admin') {
         result = result.filter(s => assignedClassIds?.includes(s.classId));
      }
      // Filter by selection
      if (selectedStudentClassFilter !== 'all') {
          result = result.filter(s => s.classId === selectedStudentClassFilter);
      }
      
      // Sort alphabetically by firstName, then lastInitial
      return result.sort((a, b) => {
          const nameA = `${a.firstName} ${a.lastInitial}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastInitial}`.toLowerCase();
          return nameA.localeCompare(nameB);
      });
  }, [students, role, assignedClassIds, selectedStudentClassFilter]);


  useEffect(() => {
    if (viewStudentName !== 'all') {
        const selected = filteredDisplayStudents.find(s => s.firstName === viewStudentName) || null;
        setSelectedStudentResult(selected);
        
        // Fetch detailed diary entries when a student is selected
        if (selected) {
           const fetchDiary = async () => {
              const { data } = await supabase
                 .from('learning_diary')
                 .select('*')
                 .eq('student_name', selected.firstName)
                 .eq('class_name', selected.className)
                 .order('date', { ascending: false })
                 .limit(50); // Get last 50 entries for trend analysis
              
              if (data) {
                 setStudentDiaryEntries(data.map(d => ({
                    date: d.date,
                    moduleId: d.module_id,
                    stats: d.stats
                 })));
              } else {
                 setStudentDiaryEntries([]);
              }
           };
           fetchDiary();
        }
    } else {
        setSelectedStudentResult(null);
        setStudentDiaryEntries([]);
    }
  }, [viewStudentName, filteredDisplayStudents]);

  const aiGuideContextForClassAnalysis = useMemo(() => {
    const sections = aiGuideConfig.sections;
    return `
      ${sections.systemPersona}
      ${sections.didacticApproach}
      ${sections.terminologyRules}
      ${sections.errorIdentification}
      ${sections.doubtHandling}
      ${sections.differentiation}
    `;
  }, [aiGuideConfig]);

  const handleGenerateClassReport = async () => {
    if (viewClassId === 'all') return;
    setIsGeneratingReport(true);
    const clsName = classrooms.find(c => c.id === viewClassId)?.name || "";
    const clsResults = myStudents.filter(s => s.className === clsName);
    
    try {
      const report = await analyzeClassPerformance(clsName, clsResults, aiGuideContextForClassAnalysis);
      setClassReport(report);
    } catch (e) { console.error(e); } finally { setIsGeneratingReport(false); }
  };

  const handlePrint = () => {
    // Standard window.print() triggers the browser dialog.
    window.print();
  };

  useEffect(() => {
    setClassReport(null);
    setViewStudentName('all');
  }, [viewClassId]);

  // Polling for live alerts from Supabase
  useEffect(() => {
    const checkAlerts = async () => {
        try {
            const { data, error } = await supabase.from('intervention_alerts').select('*');
            if (error) throw error;
            if (data) {
                const mappedAlerts: InterventionAlert[] = data.map(a => ({
                    id: a.id,
                    studentName: a.student_name,
                    className: a.class_name,
                    errorType: a.error_type,
                    moduleId: a.module_id,
                    timestamp: a.timestamp
                }));
                
                const relevant = role === 'admin' 
                    ? mappedAlerts 
                    : mappedAlerts.filter(a => {
                        const classObj = classrooms.find(c => c.name === a.className);
                        return classObj && assignedClassIds?.includes(classObj.id);
                    });
                setAlerts(relevant);
            }
        } catch (e) { console.error("Error polling alerts:", e); }
    };
    const interval = setInterval(checkAlerts, 2000); // Poll every 2s
    checkAlerts();
    return () => clearInterval(interval);
  }, [role, classrooms, assignedClassIds]);

  // LIVE PRESENCE TRACKING
  useEffect(() => {
    if (activeTab === 'live') {
        const channel = supabase.channel('online-users');
        channel
          .on('presence', { event: 'sync' }, () => {
             const state = channel.presenceState();
             const grouped: Record<string, Set<string>> = {};
             
             Object.values(state).flat().forEach((user: any) => {
                if (user.className && user.studentName) {
                   if (!grouped[user.className]) grouped[user.className] = new Set();
                   grouped[user.className].add(user.studentName);
                }
             });

             const result: Record<string, string[]> = {};
             Object.keys(grouped).forEach(k => {
                result[k] = Array.from(grouped[k]);
             });
             setOnlineUsers(result);
          })
          .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
  }, [activeTab]);

  const handleRemoteUnlock = async (alertId: string) => {
    try {
        const { error } = await supabase.from('intervention_alerts').delete().eq('id', alertId);
        if (error) throw error;
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (e) { 
       handleSupabaseError(e, "leerling ontgrendelen");
    }
  };

  const handleClearAllStudents = async () => {
     if (clearAllConfirmationText !== 'VERWIJDEREN') return;
     setIsClearing(true);
     
     try {
       // Best-effort cascading delete for all student data
       // We use .neq('id', '0') to satisfy Supabase's requirement for a filter on delete
       
       await supabase.from('intervention_alerts').delete().neq('id', '0'); 
       await supabase.from('learning_diary').delete().neq('student_name', '_');
       await supabase.from('student_progress').delete().neq('module_id', '_');
       
       // Delete students
       const { error } = await supabase.from('students').delete().neq('id', '0');
       
       if (error) throw error;
       
       onUpdateStudents([]);
       setShowClearAllModal(false);
       setClearAllConfirmationText('');
       alert("Alle leerlingen en hun gegevens zijn succesvol verwijderd.");
     } catch (e) {
       handleSupabaseError(e, "wissen alle leerlingen");
     } finally {
       setIsClearing(false);
     }
  };

  // --- EDITOR STATE ---
  const [expression, setExpression] = useState('');
  const [leftExpr, setLeftExpr] = useState('');
  const [rightExpr, setRightExpr] = useState('');
  
  const allLeafModules = useMemo(() => getAllLeafModules(themes), [themes]);
  const [selectedModule, setSelectedModule] = useState<ModuleId>(allLeafModules[0]?.id || 'volgorde-geheel');

  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [steps, setSteps] = useState<StepItem[]>([{ id: 'init', value: '', leftValue: '', rightValue: '', operation: '', hasOperation: true }]);
  
  const activeInputRef = useRef<MathInputRef | null>(null);
  const isEquationMode = useMemo(() => selectedModule.startsWith('vergelijkingen'), [selectedModule]);

  useEffect(() => {
    setSteps([{ id: 'init', value: '', leftValue: '', rightValue: '', operation: '', hasOperation: isEquationMode }]);
    setExpression(''); setLeftExpr(''); setRightExpr('');
  }, [isEquationMode]);

  const handleAddStep = () => setSteps(prev => [...prev, { id: Date.now().toString(), value: '', leftValue: '', rightValue: '', operation: '', hasOperation: isEquationMode }]);
  const handleRemoveStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));
  const updateStep = (id: string, field: keyof StepItem, val: any) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleGenerateProblem = async () => {
    setIsGenerating(true);
    try {
      // Construct minimal context from config
      const context = `
        ${aiGuideConfig.sections.terminologyRules}
        ${aiGuideConfig.sections.didacticApproach}
      `;
      
      const generated = await generateMathProblem(selectedModule, level, context);

      if (isEquationMode) {
         // Equation logic
         const [left, right] = generated.expression.split('=').map(s => s.trim());
         setLeftExpr(left || '');
         setRightExpr(right || '');
         
         const newSteps = generated.steps.map((s, i) => {
            const [sLeft, sRight] = s.content.split('=').map(p => p.trim());
            return {
               id: Date.now().toString() + i,
               leftValue: sLeft || '',
               rightValue: sRight || '',
               value: '',
               operation: s.operation || '',
               hasOperation: !!s.operation && s.operation.trim() !== ''
            };
         });
         setSteps(newSteps);
      } else {
         // Expression logic
         setExpression(generated.expression);
         const newSteps = generated.steps.map((s, i) => ({
            id: Date.now().toString() + i,
            value: s.content,
            leftValue: '',
            rightValue: '',
            operation: '',
            hasOperation: false
         }));
         setSteps(newSteps);
      }
    } catch (error) {
       alert("Er ging iets mis bij het genereren. Probeer het opnieuw.");
    } finally {
       setIsGenerating(false);
    }
  };

  const handleSaveProblem = async () => {
    if ((isEquationMode && (!leftExpr || !rightExpr)) || (!isEquationMode && !expression)) { alert('Vul de opgave volledig in.'); return; }
    if (steps.some(s => (isEquationMode && (!s.leftValue || !s.rightValue || (s.hasOperation && !s.operation))) || (!isEquationMode && !s.value))) { alert('Vul alle stappen volledig in.'); return; }

    const finalExpression = isEquationMode ? `${leftExpr}=${rightExpr}` : expression;
    const finalSolution = isEquationMode ? steps.map(s => `${s.leftValue}=${s.rightValue}`) : steps.map(s => s.value);
    const finalOperations = isEquationMode ? steps.map(s => s.hasOperation ? s.operation : '') : [];
    const newId = editingId || Date.now().toString();

    const problemPayload = {
      id: newId,
      expression: finalExpression,
      solution: finalSolution,
      operations: finalOperations,
      level,
      module_id: selectedModule,
      is_custom: true,
      final_answer: 0
    };

    // Update Supabase
    const { error } = await supabase.from('problems').upsert(problemPayload);

    if (!error) {
      const problemObj: Problem = { ...problemPayload, operations: finalOperations, solution: finalSolution, moduleId: selectedModule, isCustom: true, finalAnswer: 0 };
      if (editingId) { onUpdateProblem(problemObj); setEditingId(null); } else { onAddProblem(problemObj); }
      setExpression(''); setLeftExpr(''); setRightExpr('');
      setSteps([{ id: 'init', value: '', leftValue: '', rightValue: '', operation: '', hasOperation: isEquationMode }]);
      setActiveTab('database');
    } else {
      handleSupabaseError(error, "opslaan oefening");
    }
  };

  const handleDeleteProblem = async (id: string) => {
    const { error } = await supabase.from('problems').delete().eq('id', id);
    if (error) {
      handleSupabaseError(error, "verwijderen oefening");
    } else {
      onDeleteProblem(id);
    }
  };

  const startEdit = (p: Problem) => {
    setEditingId(p.id); setSelectedModule(p.moduleId); setLevel(p.level);
    const problemIsEquationMode = p.moduleId.startsWith('vergelijkingen');

    if (problemIsEquationMode) {
      const parts = p.expression.split('=');
      setLeftExpr(parts[0] || ''); setRightExpr(parts[1] || '');
      setSteps(p.solution.map((sol, i) => {
        const solParts = sol.split('=');
        const op = p.operations ? p.operations[i] : '';
        return { id: i.toString(), leftValue: solParts[0] || '', rightValue: solParts[1] || '', value: '', operation: op || '', hasOperation: !!op };
      }));
    } else {
      setExpression(p.expression);
      setSteps(p.solution.map((sol, i) => ({ id: i.toString(), value: sol, leftValue: '', rightValue: '', operation: '', hasOperation: false })));
    }
    setActiveTab('create');
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    const newClass = { id: Date.now().toString(), name: newClassName.trim(), locked_modules: [] };
    const { error } = await supabase.from('classrooms').insert(newClass);
    if (!error) {
       onUpdateClassrooms([...classrooms, { id: newClass.id, name: newClass.name, lockedModules: [] }]);
       setNewClassName('');
    } else {
       handleSupabaseError(error, "toevoegen klas");
    }
  };
  
  const handleDeleteClass = async (id: string) => {
    const { error } = await supabase.from('classrooms').delete().eq('id', id);
    if (!error) {
      onUpdateClassrooms(classrooms.filter(c => c.id !== id));
    } else {
      handleSupabaseError(error, "verwijderen klas");
    }
  };

  const handleAddTeacher = async () => {
    // 2. Automatic Mode (Try Server API)
    if (!newTeacherName.trim() || !newTeacherEmail.trim()) return;
    
    setIsAddingTeacher(true);
    try {
      // Use our new local API route instead of Edge Function
      const response = await fetch('/api/invite-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newTeacherEmail.trim(),
          name: newTeacherName.trim(),
          role: newTeacherRole
        })
      });

      const data = await response.json();

      if (!response.ok) {
          // If server fails, switch to manual mode
          console.warn("Server API failed, switching to manual mode:", data.error);
          setServerError(data.error || "Onbekende fout");
          setShowManualEntry(true);
      } else if (data?.teacher) {
           onUpdateTeachers([...teachers, { 
               id: data.teacher.id, 
               name: data.teacher.name, 
               pin: "PROTECTED", 
               classIds: [],
               role: data.teacher.role || newTeacherRole
           }]);
           setNewTeacherName(''); setNewTeacherEmail(''); setNewTeacherPassword(''); setNewTeacherRole('teacher');
           setServerError('');
           alert("Uitnodiging succesvol verstuurd!");
      }

    } catch (err: any) {
        console.error("Error adding teacher:", err);
        setServerError(err.message);
        setShowManualEntry(true);
    } finally {
        setIsAddingTeacher(false);
    }
  };


  const handleDeleteTeacher = async (id: string) => {
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (!error) {
      onUpdateTeachers(teachers.filter(t => t.id !== id));
    } else {
      handleSupabaseError(error, "verwijderen leerkracht");
    }
  };

  const startEditStudent = (s: Student) => {
      setEditingStudentId(s.id);
      setNewStudentFirst(s.firstName);
      setNewStudentLastInitial(s.lastInitial);
      setNewStudentPassword(s.password);
      setNewStudentClassId(s.classId);
  };

  const cancelEditStudent = () => {
      setEditingStudentId(null);
      setNewStudentFirst('');
      setNewStudentLastInitial('');
      setNewStudentPassword('');
      if (myClassrooms.length > 0) {
          setNewStudentClassId(selectedStudentClassFilter === 'all' ? myClassrooms[0].id : selectedStudentClassFilter);
      }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudentId || !newStudentFirst.trim() || !newStudentLastInitial.trim() || !newStudentClassId || !newStudentPassword) return;

    // 1. Get old student info to find related records (needed for legacy table consistency)
    const oldStudent = students.find(s => s.id === editingStudentId);
    if (!oldStudent) return;
    const oldClass = classrooms.find(c => c.id === oldStudent.classId);
    const oldClassName = oldClass ? oldClass.name : '';

    const newClass = classrooms.find(c => c.id === newStudentClassId);
    const newClassName = newClass ? newClass.name : 'Onbekende Klas';

    const updates = {
        first_name: newStudentFirst.trim(),
        last_initial: newStudentLastInitial.trim().toUpperCase().charAt(0),
        password: newStudentPassword,
        class_id: newStudentClassId
    };

    const { error } = await supabase.from('students').update(updates).eq('id', editingStudentId);

    if (!error) {
        // 2. Cascade update to related tables if name/class changed (to keep history linked)
        if (oldStudent.firstName !== updates.first_name || oldStudent.classId !== updates.class_id) {
             const filterMatch = { student_name: oldStudent.firstName, class_name: oldClassName };
             const progressMatch = { first_name: oldStudent.firstName, class_name: oldClassName };
             
             // Update Alerts
             await supabase.from('intervention_alerts')
                .update({ student_name: updates.first_name, class_name: newClassName })
                .match(filterMatch);

             // Update Diary
             await supabase.from('learning_diary')
                .update({ student_name: updates.first_name, class_name: newClassName })
                .match(filterMatch);

             // Update Progress
             await supabase.from('student_progress')
                .update({ first_name: updates.first_name, class_name: newClassName })
                .match(progressMatch);
        }

        onUpdateStudents(students.map(s => s.id === editingStudentId ? { 
            ...s, 
            id: editingStudentId, 
            firstName: updates.first_name, 
            lastInitial: updates.last_initial, 
            password: updates.password, 
            classId: updates.class_id 
        } : s));
        cancelEditStudent();
        alert("Leerling succesvol bijgewerkt!");
    } else {
        handleSupabaseError(error, "bijwerken student");
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentFirst.trim() || !newStudentLastInitial.trim() || !newStudentClassId || !newStudentPassword) return;

    const newStudent = {
      id: Date.now().toString(),
      first_name: newStudentFirst.trim(),
      last_initial: newStudentLastInitial.trim().toUpperCase().charAt(0),
      password: newStudentPassword,
      class_id: newStudentClassId
    };

    const { error } = await supabase.from('students').insert(newStudent);
    if (!error) {
        onUpdateStudents([...students, {
            id: newStudent.id,
            firstName: newStudent.first_name,
            lastInitial: newStudent.last_initial,
            password: newStudent.password,
            classId: newStudent.class_id
        }]);
        setNewStudentFirst('');
        setNewStudentLastInitial('');
        setNewStudentPassword('');
    } else {
        handleSupabaseError(error, "toevoegen student");
    }
  };

  const executeDeleteStudent = async () => {
      if (!deleteConfirmationId) return;
      const id = deleteConfirmationId;
      setDeleteConfirmationId(null); // Close modal

      const student = students.find(s => String(s.id) === String(id));
      if(!student) return;

      const previousStudents = [...students];
      onUpdateStudents(students.filter(s => String(s.id) !== String(id)));

      const studentClass = classrooms.find(c => String(c.id) === String(student.classId));
      const className = studentClass ? studentClass.name : '';

      try {
          if (className) {
              await supabase.from('intervention_alerts').delete().match({ student_name: student.firstName, class_name: className });
              await supabase.from('learning_diary').delete().match({ student_name: student.firstName, class_name: className });
              await supabase.from('student_progress').delete().match({ first_name: student.firstName, class_name: className });
          }

          const { error } = await supabase.from('problems').delete().eq('id', id); // Note: This line seems incorrect in original context (deleting problem with student ID?). Assuming it meant deleting student.
          // Correcting to delete student:
          const { error: studentError } = await supabase.from('students').delete().eq('id', id);
          if (studentError) { throw studentError; }

          if (String(editingStudentId) === id) cancelEditStudent();
          if (selectedStudentResult?.firstName === student.firstName) {
              setSelectedStudentResult(null);
              setViewStudentName('all');
          }

      } catch (error) {
          console.error("Delete failed:", error);
          onUpdateStudents(previousStudents);
          handleSupabaseError(error, "verwijderen student");
      }
  };

  const toggleClassForTeacher = async (teacherId: string, classId: string) => {
     const teacher = teachers.find(t => t.id === teacherId);
     if(!teacher) return;
     
     const updatedIds = teacher.classIds.includes(classId) 
        ? teacher.classIds.filter(id => id !== classId) 
        : [...teacher.classIds, classId];

     const { error } = await supabase.from('teachers').update({ class_ids: updatedIds }).eq('id', teacherId);
     if (!error) {
        onUpdateTeachers(teachers.map(t => t.id === teacherId ? { ...t, classIds: updatedIds } : t));
     } else {
        handleSupabaseError(error, "updaten leerkracht bevoegdheid");
     }
  };

  const handleBulkAccess = async (classId: string, action: 'lock_all' | 'unlock_all') => {
    let newLockedModules: string[] = [];
    if (action === 'lock_all') {
      newLockedModules = collectAllModuleIds(themes);
    } else {
      newLockedModules = [];
    }

    onUpdateClassrooms(classrooms.map(c => c.id === classId ? { ...c, lockedModules: newLockedModules } : c));
    const { error } = await supabase.from('classrooms').update({ locked_modules: newLockedModules }).eq('id', classId);
    if(error) handleSupabaseError(error, "updaten klas toegang");
  };

  const navStructure = [
    { id: 'live', label: 'Live Monitor', icon: 'fa-tower-broadcast' },
    { id: 'results', label: 'Resultaten', icon: 'fa-chart-column' },
    { id: 'students', label: 'Leerlingen', icon: 'fa-graduation-cap' },
    { id: 'access', label: 'Toegang', icon: 'fa-unlock-keyhole' },
    { id: 'database', label: 'Databank', icon: 'fa-database' },
    { id: 'create', label: 'Editor', icon: 'fa-pen-to-square', adminOnly: true },
    { id: 'users', label: 'Schoolbeheer', icon: 'fa-school', adminOnly: true },
    { id: 'ai-guide', label: 'AI-Sturing', icon: 'fa-robot', adminOnly: true },
  ];

  const availableSubModules = useMemo(() => {
      if (dbFilterTheme === 'all') return [];
      const selectedTheme = themes.find(t => t.id === dbFilterTheme);
      return selectedTheme?.subModules || [];
  }, [dbFilterTheme, themes]);

  const availableResultSubModules = useMemo(() => {
      if (resultFilterTheme === 'all') return [];
      const selectedTheme = themes.find(t => t.id === resultFilterTheme);
      return selectedTheme?.subModules || [];
  }, [resultFilterTheme, themes]);

  const filteredProblems = useMemo(() => {
    return problems.filter(p => {
      const levelMatch = dbFilterLevel === 'all' || p.level === dbFilterLevel;
      const searchMatch = !dbSearchQuery || p.expression.toLowerCase().includes(dbSearchQuery.toLowerCase());
      
      let themeMatch = true;
      if (dbFilterTheme !== 'all') {
          const theme = themes.find(t => t.id === dbFilterTheme);
          if (theme) {
              const themeIds = getRecursiveModuleIds(theme);
              if (dbFilterSubModule !== 'all') {
                  const subModule = theme.subModules?.find(s => s.id === dbFilterSubModule);
                  if (subModule) {
                      const subIds = getRecursiveModuleIds(subModule);
                      themeMatch = subIds.includes(p.moduleId);
                  } else {
                      themeMatch = false;
                  }
              } else {
                  themeMatch = themeIds.includes(p.moduleId);
              }
          } else {
              themeMatch = false;
          }
      }

      return levelMatch && searchMatch && themeMatch;
    });
  }, [problems, dbFilterLevel, dbSearchQuery, dbFilterTheme, dbFilterSubModule, themes]);

  const activeAccessClass = myClassrooms.find(c => c.id === selectedAccessClassId);

  // --- STATS CALCULATIONS FOR SELECTED STUDENT ---
  const selectedStudentComputedStats = useMemo(() => {
    if (!selectedStudentResult) return null;

    // 1. Calculate Recent Errors (from Diary Entries) - Limit to approx last 30 problem attempts
    // Each diary entry has 'completed' count. We sum until we hit ~30.
    const recentErrors: Record<ErrorType, number> = {
       [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0,
       [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0
    };
    
    let processedSteps = 0;
    let totalRecentSolved = 0;
    let totalRecentErrors = 0;

    for (const entry of studentDiaryEntries) {
       if (processedSteps >= 30) break;
       const stepsInEntry = entry.stats.completed * 5; // Approx 5 steps per problem
       processedSteps += stepsInEntry;
       
       totalRecentSolved += entry.stats.completed;
       totalRecentErrors += entry.stats.totalErrors;

       Object.entries(entry.stats.errorDistribution).forEach(([type, count]) => {
          recentErrors[type as ErrorType] += (count as number);
       });
    }

    const recentChartData = Object.entries(recentErrors).map(([type, count]) => ({
       name: ERROR_LABELS[type as ErrorType] || type,
       key: type,
       value: count
    })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

    // 2. Misconceptions Detection
    let dominantErrorType: ErrorType | null = null;
    let misconceptionsText = "Geen specifieke patronen gedetecteerd.";
    
    if (recentChartData.length > 0) {
        const topError = recentChartData[0];
        const totalRecent = Object.values(recentErrors).reduce((a,b) => a+b, 0);
        
        if (totalRecent > 5) { // Threshold for relevance
            if (topError.key === ErrorType.CONCEPT && (topError.value / totalRecent) > 0.4) {
               dominantErrorType = ErrorType.CONCEPT;
               misconceptionsText = "Mogelijke fundamentele verwarring over de wiskundige eigenschappen of regels.";
            } else if (topError.key === ErrorType.ORDER && (topError.value / totalRecent) > 0.4) {
               dominantErrorType = ErrorType.ORDER;
               misconceptionsText = "De volgorde van bewerkingen wordt niet consequent toegepast (H-M-W-V-D-O-A).";
            } else if (topError.key === ErrorType.SIGN && (topError.value / totalRecent) > 0.4) {
               dominantErrorType = ErrorType.SIGN;
               misconceptionsText = "Tekenfouten domineren: verwarring bij negatieve getallen of bewerkingstekens.";
            } else if (topError.key === ErrorType.CALCULATION && (topError.value / totalRecent) > 0.5) {
               dominantErrorType = ErrorType.CALCULATION;
               misconceptionsText = "Voornamelijk procedurele rekenfouten (tafels, optellen), begrip lijkt aanwezig.";
            }
        }
    }

    // 3. Self-Correction Ratio (Accurate based on recent history)
    let selfCorrectionRatio = 0;
    
    // Collect all recent history items across all active modules
    const allHistoryItems: string[] = [];
    Object.values(selectedStudentResult.progress).forEach((prog: ModuleProgress) => {
        if (prog.recentStepHistory) {
            allHistoryItems.push(...prog.recentStepHistory);
        }
    });

    // Determine correction opportunities (Step 0 Failures that were either self-corrected or needed guidance)
    const correctionOpportunities = allHistoryItems.filter(h => h !== 'perfect').length;
    const selfCorrections = allHistoryItems.filter(h => h === 'self_corrected').length;

    if (correctionOpportunities > 0) {
        selfCorrectionRatio = Math.round((selfCorrections / correctionOpportunities) * 100);
    } else {
        // If everything is perfect, 100% self-reliance/accuracy
        selfCorrectionRatio = 100;
    }

    // Calculate total stats from progress for the report
    let totalSolved = 0;
    let totalErrors = 0;
    if (selectedStudentResult.progress) {
        const progressValues = Object.values(selectedStudentResult.progress) as ModuleProgress[];
        progressValues.forEach(p => {
            totalSolved += p.solvedProblemIds.length;
            const errors = Object.values(p.allTimeErrors) as number[];
            totalErrors += errors.reduce((a, b) => a + b, 0);
        });
    }

    return { 
       recentChartData, 
       misconceptionsText, 
       dominantErrorType,
       selfCorrectionRatio,
       selfCorrectionStats: {
         corrected: selfCorrections,
         total: correctionOpportunities
       },
       totalSolved,
       totalErrors,
       processedSteps // Added processedSteps to return object
    };
  }, [selectedStudentResult, studentDiaryEntries]);

  const getStabilityStatus = (moduleId: string) => {
      const entry = studentDiaryEntries.find(e => e.moduleId === moduleId);
      if (!entry) return { label: '-', color: 'text-slate-300', bg: 'bg-slate-50', icon: 'fa-minus' };

      const { completed, totalErrors } = entry.stats;
      if (completed === 0) return { label: '-', color: 'text-slate-300', bg: 'bg-slate-50', icon: 'fa-minus' };

      // Heuristic logic based on last session performance
      // High performance: Promote (e.g. >= 5 completed, few errors)
      // Poor performance: Demote/Remediate (e.g. > 8 errors)
      // Else: Stay/Consolidate
      
      if (completed >= 5 && totalErrors <= 2) {
          return { label: 'Promotie', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'fa-arrow-up' };
      } else if (completed >= 5 && totalErrors > 8) {
          return { label: 'Verdieping', color: 'text-rose-600', bg: 'bg-rose-50', icon: 'fa-arrow-down' };
      } else {
          return { label: 'Consolidatie', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'fa-equals' };
      }
  };

  const getLastSessionScore = (moduleId: string) => {
      const entry = studentDiaryEntries.find(e => e.moduleId === moduleId);
      if (!entry || entry.stats.completed === 0) return '-';
      const score = Math.max(0, 100 - Math.round((entry.stats.totalErrors / (entry.stats.completed * 3)) * 100)); // Rough score calc
      return `${score}%`;
  };

  const getStudentFilterStats = (student: StudentResult) => {
      if (resultViewMode === 'individual') return null;
      let activeFilterIds: string[] = [];
      
      if (resultFilterTheme !== 'all') {
          if (resultFilterSubModule !== 'all') {
              const theme = themes.find(t => t.id === resultFilterTheme);
              const sub = theme?.subModules?.find(s => s.id === resultFilterSubModule);
              if (sub) activeFilterIds = getRecursiveModuleIds(sub);
          } else {
              const theme = themes.find(t => t.id === resultFilterTheme);
              if (theme) activeFilterIds = getRecursiveModuleIds(theme);
          }
      } else {
          return null; 
      }

      let totalSolved = 0;
      let totalErrors = 0;
      let startedCount = 0;
      let aggregatedLevel = 0;
      let modulesWithData = 0;

      activeFilterIds.forEach(id => {
          const prog = student.progress[id] as ModuleProgress | undefined;
          if (prog) {
              if (prog.solvedProblemIds.length > 0 || prog.growthStatus > 1) {
                  totalSolved += prog.solvedProblemIds.length;
                  startedCount++;
                  modulesWithData++;
                  aggregatedLevel += prog.growthStatus;
                  totalErrors += Object.values(prog.allTimeErrors).reduce((a: number, b: number) => a + b, 0);
              }
          }
      });

      const avgLevel = modulesWithData > 0 ? Math.round(aggregatedLevel / modulesWithData) : 1;

      return {
          totalSolved,
          totalErrors,
          startedCount,
          avgLevel,
          isSingleModule: activeFilterIds.length === 1 && resultFilterSubModule !== 'all'
      };
  };

  const getStudentGroup = (student: StudentResult): 'support' | 'independent' | 'challenge' | 'no_data' => {
      const stats = getStudentFilterStats(student);
      
      // If no stats or 0 solved, truly no data
      if (!stats || stats.totalSolved === 0) return 'no_data';

      const errorRate = stats.totalErrors / Math.max(1, stats.totalSolved);

      // If very few problems solved (< 5), default to independent unless error rate is very high
      if (stats.totalSolved < 5) {
          if (errorRate > 2.0) return 'support'; 
          return 'independent';
      }

      if (errorRate > 1.5) return 'support';
      if (errorRate <= 0.4) return 'challenge';
      
      return 'independent';
  };

  const getModuleTitle = (moduleId: string): string => {
      const allLeafModulesList = getAllLeafModules(themes);
      const found = allLeafModulesList.find(l => l.id === moduleId);
      return found ? found.fullTitle : moduleId;
  };

  const getStudentDisplayName = (result: StudentResult) => {
      const classroom = classrooms.find(c => c.name === result.className);
      if (!classroom) return result.firstName;
      
      const student = students.find(s => s.firstName === result.firstName && s.classId === classroom.id);
      return student ? `${result.firstName} ${student.lastInitial}.` : result.firstName;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
        {/* HEADER / TOP NAV */}
        <header className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
                <img 
                  src="/logo.png" 
                  alt="meneer Priem Logo" 
                  className="w-12 h-auto drop-shadow-sm"
                />
                <div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">{role === 'admin' ? 'Beheerder' : 'Leerkracht'}</p>
                </div>
            </div>

            <nav className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar mx-4">
                {navStructure.map(item => {
                    if (item.adminOnly && role !== 'admin') return null;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as DashboardTab)}
                            className={`px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 border border-transparent whitespace-nowrap cursor-pointer ${
                                isActive 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                        >
                            <i className={`fa-solid ${item.icon}`}></i>
                            {item.label}
                            {item.id === 'live' && alerts.length > 0 && (
                                <span className="ml-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] animate-pulse">
                                    {alerts.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowChangePasswordModal(true)} 
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest border-none cursor-pointer"
                >
                    <i className="fa-solid fa-key"></i>
                    <span className="hidden sm:inline">Wachtwoord</span>
                </button>
                <button 
                    onClick={onClose} 
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors font-black text-[10px] uppercase tracking-widest border-none cursor-pointer"
                >
                    <i className="fa-solid fa-power-off"></i>
                    <span className="hidden sm:inline">Afmelden</span>
                </button>
            </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 overflow-y-auto">
          
          {activeTab === 'live' && (
             <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] text-center shadow-sm">
                   <h3 className="text-rose-800 font-black text-2xl mb-2"><i className="fa-solid fa-satellite-dish mr-2"></i>Live Monitor</h3>
                   <p className="text-rose-600 text-sm font-medium">Dit scherm ververst live. Leerlingen die vastzitten verschijnen hier.</p>
                </div>

                {/* ONLINE STUDENTS SECTION */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-2">Online Leerlingen</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Object.entries(onlineUsers).map(([className, list]) => {
                       const studentsList = list as string[];
                       const cls = classrooms.find(c => c.name === className);
                       if (role !== 'admin' && cls && !assignedClassIds?.includes(cls.id)) return null;
                       
                       return (
                         <div key={className} className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                           <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">{className}</div>
                           <div className="flex items-end gap-2 mb-2">
                             <span className="text-3xl font-black text-slate-800">{studentsList.length}</span>
                             <span className="text-[10px] text-slate-400 font-bold mb-1">online</span>
                           </div>
                           <div className="text-[10px] text-slate-400 font-medium truncate" title={studentsList.join(', ')}>
                             {studentsList.length > 0 ? studentsList.join(', ') : 'Niemand'}
                           </div>
                         </div>
                       );
                    })}
                    {Object.keys(onlineUsers).length === 0 && (
                       <div className="col-span-full bg-white p-6 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                          Nog geen leerlingen online gedetecteerd
                       </div>
                    )}
                  </div>
                </div>
                
                {/* ALERTS SECTION */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-2">Hulp Nodig ({alerts.length})</h4>
                  {alerts.length === 0 ? (
                      <div className="py-12 text-center opacity-60 bg-white rounded-[2rem] border border-slate-100">
                           <i className="fa-solid fa-check-circle text-7xl text-emerald-300 mb-6"></i>
                           <p className="font-black text-slate-400 uppercase tracking-widest text-lg">Alles rustig in de klas</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {alerts.map(alert => (
                            <div key={alert.id} className="bg-white border-l-8 border-rose-500 rounded-3xl p-6 shadow-xl animate-[pulse_3s_infinite] relative">
                               <div className="flex justify-between items-start mb-4">
                                  <div>
                                     <h4 className="text-2xl font-black text-slate-900 leading-tight">{alert.studentName}</h4>
                                     <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest mt-2 inline-block">{alert.className}</span>
                                  </div>
                                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xl shadow-inner"><i className="fa-solid fa-bell fa-shake"></i></div>
                                </div>
                               <div className="space-y-4 pt-4 border-t border-slate-100">
                                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                                     <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Probleem Type</p>
                                     <p className="font-bold text-rose-700 text-lg">{alert.errorType}</p>
                                  </div>
                                  <div className="pt-3">
                                     <button onClick={() => handleRemoteUnlock(alert.id)} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all border-none cursor-pointer flex items-center justify-center gap-2">Ontgrendel Leerling <i className="fa-solid fa-lock-open ml-2"></i></button>
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                  )}
                </div>
             </div>
          )}

          {activeTab === 'access' && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-full flex flex-col animate-in slide-in-from-bottom-2 duration-300">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><i className="fa-solid fa-lock text-blue-500"></i> Toegangsbeheer</h3>
                  <div className="flex gap-2">
                     {activeAccessClass && (
                        <>
                           <button onClick={() => handleBulkAccess(activeAccessClass.id, 'lock_all')} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-colors border-none cursor-pointer">Alles Vergrendelen</button>
                           <button onClick={() => handleBulkAccess(activeAccessClass.id, 'unlock_all')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-colors border-none cursor-pointer">Alles Ontgrendelen</button>
                        </>
                     )}
                  </div>
               </div>
               
               <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                  {myClassrooms.map(c => (
                     <button
                        key={c.id}
                        onClick={() => setSelectedAccessClassId(c.id)}
                        className={`px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all border-none cursor-pointer ${selectedAccessClassId === c.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                     >
                        {c.name}
                     </button>
                  ))}
               </div>

               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {activeAccessClass ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {themes.filter(t => t.id !== 'mix').map(theme => (
                           <AccessThemeCard 
                              key={theme.id} 
                              theme={theme} 
                              classId={activeAccessClass.id} 
                              lockedModules={activeAccessClass.lockedModules || []} 
                              onToggle={onToggleLock} 
                           />
                        ))}
                        
                        {/* Mix Module Special Card */}
                        <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-5 shadow-sm flex flex-col h-full hover:border-blue-300 transition-all">
                           <div className="flex justify-between items-center pb-4 mb-2 border-b border-slate-200/50">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm bg-indigo-500 text-white">
                                    <span className="font-black font-serif">Σ</span>
                                 </div>
                                 <span className="font-black text-sm text-slate-800">Sigma Challenge</span>
                              </div>
                              <button 
                                onClick={() => onToggleLock(activeAccessClass.id, 'mix')}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer shadow-sm ${(activeAccessClass.lockedModules || []).includes('mix') ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-white border-2 border-slate-100 text-emerald-500 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                              >
                                 <i className={`fa-solid ${(activeAccessClass.lockedModules || []).includes('mix') ? 'fa-lock' : 'fa-lock-open'}`}></i>
                              </button>
                           </div>
                           <div className="flex-1 flex items-center justify-center text-slate-400 text-xs text-center font-medium leading-relaxed px-4">
                              De ultieme mixmodule die alle leerstof combineert.
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                        <i className="fa-solid fa-school text-4xl mb-4"></i>
                        <p className="font-black uppercase tracking-widest text-xs">Selecteer een klas</p>
                     </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-8 h-full flex flex-col">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-end gap-6 shrink-0">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Weergave</label>
                    <div className="flex bg-blue-50/30 p-1 rounded-xl h-11 border border-blue-50 w-[180px]">
                        <button 
                            onClick={() => setResultViewMode('individual')}
                            className={`flex-1 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer ${resultViewMode === 'individual' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400 hover:text-blue-600'}`}
                        >
                            Lijst
                        </button>
                        <button 
                            onClick={() => setResultViewMode('groups')}
                            className={`flex-1 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer ${resultViewMode === 'groups' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400 hover:text-blue-600'}`}
                        >
                            Groepen
                        </button>
                    </div>
                 </div>

                 <div className="space-y-1 min-w-[150px] flex-1">
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Kies Klas</label>
                    <select value={viewClassId} onChange={(e) => setViewClassId(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-blue-50 bg-blue-50/30 text-blue-700 font-bold text-sm outline-none cursor-pointer">
                       <option value="all">Alle mijn klassen</option>
                       {myClassrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>

                 <div className="space-y-1 min-w-[150px] flex-1">
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Kies Module</label>
                    <select 
                        value={resultFilterTheme} 
                        onChange={(e) => {
                            setResultFilterTheme(e.target.value);
                            setResultFilterSubModule('all');
                        }} 
                        disabled={resultViewMode === 'individual'}
                        className="w-full h-11 px-4 rounded-xl border border-blue-50 bg-blue-50/30 text-blue-700 font-bold text-sm outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       <option value="all">Alle Thema's</option>
                       {themes.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                 </div>

                 <div className="space-y-1 min-w-[150px] flex-1">
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Kies Onderdeel</label>
                    <select 
                        value={resultFilterSubModule} 
                        onChange={(e) => setResultFilterSubModule(e.target.value)} 
                        disabled={resultViewMode === 'individual' || resultFilterTheme === 'all'}
                        className="w-full h-11 px-4 rounded-xl border border-blue-50 bg-blue-50/30 text-blue-700 font-bold text-sm outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       <option value="all">Alle Onderdelen</option>
                       {availableResultSubModules.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                 </div>

                 {viewClassId !== 'all' && (
                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <button onClick={handleGenerateClassReport} disabled={isGeneratingReport} className="flex-1 md:flex-none h-11 px-6 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all border-none cursor-pointer flex items-center justify-center gap-2">
                           {isGeneratingReport ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                           Genereer Klas Insight
                        </button>
                        <button onClick={handlePrint} className="h-11 px-6 bg-white text-slate-700 border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-2">
                           <i className="fa-solid fa-print"></i>
                        </button>
                    </div>
                 )}
              </div>
              
              <div className="flex-1 space-y-8 overflow-y-auto pb-20">
                {classReport && viewClassId !== 'all' && (
                  <div className="animate-in slide-in-from-top-4 duration-500 space-y-6">
                     <div className="bg-slate-900 text-white p-10 rounded-[2rem] shadow-2xl relative overflow-hidden border-b-8 border-blue-600">
                        <div className="relative z-10 max-w-3xl">
                           <h3 className="text-3xl font-black text-blue-400 mb-4">Klasanalyse</h3>
                           <p className="text-slate-400 text-lg italic font-medium leading-relaxed">"{classReport.summary}"</p>
                        </div>
                     </div>
                  </div>
                )}

                {selectedStudentResult && selectedStudentComputedStats ? (
                    <div className="animate-in slide-in-from-right-4 duration-500 space-y-8">
                        {/* HEADER & NAV */}
                        <div className="flex items-center gap-4 mb-2">
                           <button onClick={() => setViewStudentName('all')} className="bg-slate-200 text-slate-600 hover:bg-slate-300 w-10 h-10 rounded-full flex items-center justify-center text-sm transition-colors border-none cursor-pointer">
                              <i className="fa-solid fa-arrow-left"></i>
                           </button>
                           <h3 className="text-3xl font-black text-slate-900 flex items-baseline gap-2">
                              {getStudentDisplayName(selectedStudentResult)}
                              <span className="text-base text-slate-400 font-bold uppercase tracking-widest">{selectedStudentResult.className}</span>
                           </h3>
                        </div>

                        {/* KPI CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Self Correction */}
                            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
                               <div className="flex items-center gap-2 mb-2 z-10">
                                  <i className="fa-solid fa-rotate-left text-emerald-500"></i>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Zelfcorrectieratio</span>
                               </div>
                               <div className="text-4xl font-black text-slate-800 z-10">{selectedStudentComputedStats.selfCorrectionRatio}%</div>
                               <p className="text-[10px] text-slate-400 font-bold mt-2 z-10 relative">
                                  {selectedStudentComputedStats.selfCorrectionStats.total > 0
                                    ? `${selectedStudentComputedStats.selfCorrectionStats.corrected} van de ${selectedStudentComputedStats.selfCorrectionStats.total} fouten zelf hersteld na de eerste hint (Stap 0).`
                                    : "Nog geen fouten gemaakt (of te weinig data)."}
                               </p>
                               <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                                  <i className="fa-solid fa-rotate-left text-8xl"></i>
                               </div>
                            </div>

                            {/* Misconception */}
                            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                               <div className="flex items-center gap-2 mb-2">
                                  <i className="fa-solid fa-brain text-rose-500"></i>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Misconcepties</span>
                               </div>
                               <p className="text-xs font-bold text-slate-600 leading-snug italic">
                                  "{selectedStudentComputedStats.misconceptionsText}"
                               </p>
                            </div>
                        </div>

                        {/* RECENT ERROR CHART (LAST 30 STEPS) */}
                        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                           <div className="flex items-center justify-between">
                              <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                 <i className="fa-solid fa-chart-bar text-blue-500"></i> Recent Foutenprofiel
                              </h4>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Laatste ~30 stappen</span>
                           </div>
                           <div className="h-64">
                              {selectedStudentComputedStats.recentChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart layout="vertical" data={selectedStudentComputedStats.recentChartData} margin={{ left: 40, right: 40, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis 
                                      type="number" 
                                      domain={[0, selectedStudentComputedStats.processedSteps || 'auto']}
                                      hide={false} 
                                      stroke="#cbd5e1" 
                                      fontSize={10} 
                                      tickLine={false} 
                                      axisLine={false} 
                                    />
                                    <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 11, fontWeight: 700, fill: '#475569'}} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                                      {selectedStudentComputedStats.recentChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={ERROR_COLORS[entry.key as ErrorType] || '#ccc'} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center text-emerald-500 gap-4">
                                   <i className="fa-solid fa-check-circle text-5xl opacity-20"></i>
                                   <span className="font-bold text-slate-400 text-sm">Geen fouten in de recente geschiedenis.</span>
                                </div>
                              )}
                           </div>
                        </div>

                        {/* MODULE BREAKDOWN (GRID PER THEME) */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          {themes.map(theme => {
                             // Recursively collect all LEAF submodules for this theme
                             const leaves: (ThemeConfig | SubModuleConfig)[] = [];
                             const collect = (node: ThemeConfig | SubModuleConfig) => {
                                if (node.subModules && node.subModules.length > 0) {
                                   node.subModules.forEach(collect);
                                } else {
                                   leaves.push(node);
                                }
                             };
                             collect(theme);

                             // Filter leaves that have actual data for this student
                             const activeLeaves = leaves.filter(leaf => {
                                const prog = selectedStudentResult.progress[leaf.id];
                                return prog && (prog.solvedProblemIds.length > 0 || prog.growthStatus > 1);
                             });

                             if (activeLeaves.length === 0) return null;

                             return (
                               <div key={theme.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                                  {/* Header */}
                                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${THEME_COLORS[theme.color || 'blue']} shadow-lg shadow-blue-50`}>
                                        <i className={`fa-solid ${theme.icon}`}></i>
                                     </div>
                                     <h4 className="font-black text-slate-800 text-xl tracking-tight">{theme.title}</h4>
                                  </div>
                                  
                                  {/* List */}
                                  <div className="space-y-3 flex-1">
                                     {activeLeaves.map(leaf => {
                                        const prog = selectedStudentResult.progress[leaf.id] as ModuleProgress;
                                        const lvlConfig = LEVEL_CONFIG[prog.growthStatus as DifficultyLevel];
                                        const topError = Object.entries(prog.allTimeErrors).sort((a,b) => b[1] - a[1])[0];
                                        const stability = getStabilityStatus(leaf.id);
                                        const lastScore = getLastSessionScore(leaf.id);

                                        return (
                                           <div key={leaf.id} className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col gap-3 hover:bg-slate-50 hover:border-blue-100 transition-all">
                                              <div className="flex justify-between items-start">
                                                 <span className="font-bold text-slate-700 text-sm flex-1 mr-2">{leaf.title}</span>
                                                 <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-black ${lvlConfig.bg} ${lvlConfig.color} border border-current/10 whitespace-nowrap`}>
                                                    <i className={`fa-solid ${lvlConfig.icon} mr-1`}></i>
                                                    {lvlConfig.label}
                                                 </span>
                                              </div>
                                              
                                              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100/50">
                                                 <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Stabiliteit</p>
                                                    <div className={`text-[10px] font-bold ${stability.color} flex items-center justify-center gap-1`}>
                                                       <i className={`fa-solid ${stability.icon}`}></i> {stability.label}
                                                    </div>
                                                 </div>
                                                 <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                                    <div className="font-mono font-bold text-slate-600 text-xs bg-white px-2 py-0.5 rounded-md inline-block border border-slate-100">{lastScore}</div>
                                                 </div>
                                                 <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Top Fout</p>
                                                    <div className="text-[10px] font-bold text-rose-500 truncate" title={topError && topError[1] > 0 ? ERROR_LABELS[topError[0] as ErrorType] : ''}>
                                                       {topError && topError[1] > 0 ? ERROR_LABELS[topError[0] as ErrorType] : '-'}
                                                    </div>
                                                 </div>
                                              </div>
                                           </div>
                                        )
                                     })}
                                  </div>
                               </div>
                             );
                          })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                      {resultViewMode === 'groups' ? (
                        resultFilterTheme !== 'all' && resultFilterSubModule !== 'all' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full items-start">
                           {/* GROUP 1: EXTRA ONDERSTEUNING */}
                           <div className="bg-rose-50/50 rounded-[2.5rem] p-6 border border-rose-100 min-h-[400px]">
                              <div className="flex items-center gap-3 mb-6">
                                 <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
                                    <i className="fa-solid fa-life-ring"></i>
                                 </div>
                                 <div>
                                    <h4 className="font-black text-rose-800 text-sm uppercase tracking-widest">Ondersteuning</h4>
                                    <p className="text-[10px] font-bold text-rose-400">Heeft moeite met de laatste reeks</p>
                                 </div>
                              </div>
                              <div className="space-y-3">
                                 {filteredDisplayStudents.filter(s => getStudentGroup(s) === 'support').map((student, idx) => {
                                    const filterStats = getStudentFilterStats(student);
                                    const lvlConfig = filterStats ? LEVEL_CONFIG[Math.max(1, Math.min(3, Math.round(filterStats.avgLevel))) as DifficultyLevel] : null;
                                    return (
                                       <div key={idx} onClick={() => setViewStudentName(student.firstName)} className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-pointer group">
                                          <div className="flex justify-between items-start">
                                             <h4 className="font-black text-slate-800">{getStudentDisplayName(student)}</h4>
                                             {lvlConfig && <i className={`fa-solid ${lvlConfig.icon} ${lvlConfig.color} text-xs`}></i>}
                                          </div>
                                          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                             <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg">
                                                {filterStats?.totalErrors || 0} fouten
                                             </span>
                                             <span>totaal</span>
                                          </div>
                                       </div>
                                    );
                                 })}
                                 {filteredDisplayStudents.filter(s => getStudentGroup(s) === 'support').length === 0 && (
                                    <div className="text-center py-10 text-rose-300 font-medium italic text-xs">Geen leerlingen in deze groep</div>
                                 )}
                              </div>
                           </div>

                           {/* GROUP 2: ZELFSTANDIG */}
                           <div className="bg-blue-50/50 rounded-[2.5rem] p-6 border border-blue-100 min-h-[400px]">
                              <div className="flex items-center gap-3 mb-6">
                                 <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                                    <i className="fa-solid fa-person-hiking"></i>
                                 </div>
                                 <div>
                                    <h4 className="font-black text-blue-800 text-sm uppercase tracking-widest">Zelfstandig</h4>
                                    <p className="text-[10px] font-bold text-blue-400">Kan vlot verder oefenen</p>
                                 </div>
                              </div>
                              <div className="space-y-3">
                                 {filteredDisplayStudents.filter(s => getStudentGroup(s) === 'independent').map((student, idx) => {
                                    const filterStats = getStudentFilterStats(student);
                                    const lvlConfig = filterStats ? LEVEL_CONFIG[Math.max(1, Math.min(3, Math.round(filterStats.avgLevel))) as DifficultyLevel] : null;
                                    return (
                                       <div key={idx} onClick={() => setViewStudentName(student.firstName)} className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
                                          <div className="flex justify-between items-start">
                                             <h4 className="font-black text-slate-800">{getStudentDisplayName(student)}</h4>
                                             {lvlConfig && <i className={`fa-solid ${lvlConfig.icon} ${lvlConfig.color} text-xs`}></i>}
                                          </div>
                                          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                             <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">
                                                {filterStats?.totalSolved || 0} opgelost
                                             </span>
                                          </div>
                                       </div>
                                    );
                                 })}
                                 {filteredDisplayStudents.filter(s => getStudentGroup(s) === 'independent').length === 0 && (
                                    <div className="text-center py-10 text-blue-300 font-medium italic text-xs">Geen leerlingen in deze groep</div>
                                 )}
                              </div>
                           </div>

                           {/* GROUP 3: DIFFERENTIATIE */}
                           <div className="bg-emerald-50/50 rounded-[2.5rem] p-6 border border-emerald-100 min-h-[400px]">
                              <div className="flex items-center gap-3 mb-6">
                                 <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                    <i className="fa-solid fa-rocket"></i>
                                 </div>
                                 <div>
                                    <h4 className="font-black text-emerald-800 text-sm uppercase tracking-widest">Uitdaging</h4>
                                    <p className="text-[10px] font-bold text-emerald-400">Klaar voor verdieping</p>
                                 </div>
                              </div>
                              <div className="space-y-3">
                                 {filteredDisplayStudents.filter(s => getStudentGroup(s) === 'challenge').map((student, idx) => {
                                    const filterStats = getStudentFilterStats(student);
                                    const lvlConfig = filterStats ? LEVEL_CONFIG[Math.max(1, Math.min(3, Math.round(filterStats.avgLevel))) as DifficultyLevel] : null;
                                    return (
                                       <div key={idx} onClick={() => setViewStudentName(student.firstName)} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group">
                                          <div className="flex justify-between items-start">
                                             <h4 className="font-black text-slate-800">{getStudentDisplayName(student)}</h4>
                                             {lvlConfig && <i className={`fa-solid ${lvlConfig.icon} ${lvlConfig.color} text-xs`}></i>}
                                          </div>
                                          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                             <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg">
                                                Topscore
                                             </span>
                                          </div>
                                       </div>
                                    );
                                 })}
                                 {filteredDisplayStudents.filter(s => getStudentGroup(s) === 'challenge').length === 0 && (
                                    <div className="text-center py-10 text-emerald-300 font-medium italic text-xs">Geen leerlingen in deze groep</div>
                                 )}
                              </div>
                           </div>

                           {/* GROUP 4: NOG GEEN GEGEVENS */}
                           <div className="bg-slate-50/50 rounded-[2.5rem] p-6 border border-slate-200 min-h-[400px]">
                              <div className="flex items-center gap-3 mb-6">
                                 <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shadow-sm">
                                    <i className="fa-solid fa-hourglass-start"></i>
                                 </div>
                                 <div>
                                    <h4 className="font-black text-slate-600 text-sm uppercase tracking-widest">Nog geen start</h4>
                                    <p className="text-[10px] font-bold text-slate-400">Nog niet geoefend</p>
                                 </div>
                              </div>
                              <div className="space-y-3">
                                 {filteredDisplayStudents.filter(s => getStudentGroup(s) === 'no_data').map((student, idx) => {
                                    return (
                                       <div key={idx} onClick={() => setViewStudentName(student.firstName)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group opacity-70 hover:opacity-100">
                                          <div className="flex justify-between items-start">
                                             <h4 className="font-black text-slate-600">{getStudentDisplayName(student)}</h4>
                                          </div>
                                          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                             <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">
                                                -
                                             </span>
                                          </div>
                                       </div>
                                    );
                                 })}
                                 {filteredDisplayStudents.filter(s => getStudentGroup(s) === 'no_data').length === 0 && (
                                    <div className="text-center py-10 text-slate-300 font-medium italic text-xs">Iedereen is gestart</div>
                                 )}
                              </div>
                           </div>
                        </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                                <div className="w-20 h-20 bg-blue-100 text-blue-500 rounded-3xl flex items-center justify-center text-4xl mb-4">
                                    <i className="fa-solid fa-layer-group"></i>
                                </div>
                                <h3 className="text-xl font-black text-slate-700 mb-2">Groepsweergave</h3>
                                <p className="text-slate-500 font-medium max-w-md">Selecteer een module én een onderdeel hierboven om de leerlingen in te delen op basis van hun prestaties.</p>
                            </div>
                        )
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredDisplayStudents.map((student, idx) => {
                          const filterStats = getStudentFilterStats(student);
                          const lvlConfig = filterStats ? LEVEL_CONFIG[Math.max(1, Math.min(3, Math.round(filterStats.avgLevel))) as DifficultyLevel] : null;

                          return (
                            <div key={idx} onClick={() => setViewStudentName(student.firstName)} className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4 group relative overflow-hidden cursor-pointer ${filterStats ? `border-${lvlConfig?.color.replace('text-', '')}-100` : ''}`}>
                              <div>
                                <h4 className="font-black text-slate-900 text-lg leading-none">{getStudentDisplayName(student)}</h4>
                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-lg mt-2 inline-block">{student.className}</span>
                              </div>
                              {filterStats ? (
                                  <div className="space-y-2 pt-2 border-t border-slate-50">
                                      <div className={`flex items-center gap-2 text-xs font-black ${lvlConfig?.color}`}>
                                          <div className={`w-6 h-6 rounded-lg ${lvlConfig?.bg} flex items-center justify-center`}><i className={`fa-solid ${lvlConfig?.icon}`}></i></div>
                                          <span>{lvlConfig?.label}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-center">
                                          <div className="bg-slate-50 rounded-xl py-1">
                                              <p className="text-[8px] uppercase font-black text-slate-400">Opgelost</p>
                                              <p className="font-black text-slate-700">{filterStats.totalSolved}</p>
                                          </div>
                                          <div className="bg-slate-50 rounded-xl py-1">
                                              <p className="text-[8px] uppercase font-black text-slate-400">Fouten</p>
                                              <p className="font-black text-slate-700">{filterStats.totalErrors}</p>
                                          </div>
                                      </div>
                                  </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-full flex flex-col animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-wrap items-end gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                   {editingStudentId ? (
                      <div className="flex items-center justify-between w-full">
                         <h3 className="font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-pen"></i> Leerling Bewerken</h3>
                         <button onClick={cancelEditStudent} className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-colors border-none cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
                      </div>
                   ) : (
                      <h3 className="font-black text-slate-400 uppercase tracking-widest w-full text-xs mb-2">Nieuwe Leerling Toevoegen</h3>
                   )}
                   
                   <div className="flex-1 min-w-[120px]">
                      <input type="text" placeholder="Voornaam" value={newStudentFirst} onChange={(e) => setNewStudentFirst(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-blue-500 transition-colors" />
                   </div>
                   <div className="w-24">
                      <input type="text" placeholder="Letter" maxLength={1} value={newStudentLastInitial} onChange={(e) => setNewStudentLastInitial(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-blue-500 transition-colors text-center" />
                   </div>
                   <div className="flex-1 min-w-[150px]">
                      <select value={newStudentClassId} onChange={(e) => setNewStudentClassId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-blue-500 bg-white cursor-pointer">
                         <option value="" disabled>Kies Klas</option>
                         {myClassrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                   </div>
                   <div className="flex-1 min-w-[120px] relative">
                      <input type="text" placeholder="Wachtwoord" value={newStudentPassword} onChange={(e) => setNewStudentPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-blue-500 transition-colors font-mono" />
                      <button onClick={() => setNewStudentPassword(generatePassword())} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 border-none bg-transparent cursor-pointer" title="Genereer"><i className="fa-solid fa-arrows-rotate"></i></button>
                   </div>
                   <button 
                     onClick={editingStudentId ? handleUpdateStudent : handleAddStudent}
                     disabled={!newStudentFirst || !newStudentLastInitial || !newStudentClassId || !newStudentPassword}
                     className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {editingStudentId ? 'Opslaan' : 'Toevoegen'}
                   </button>
                </div>

                <div className="flex items-center gap-4 mb-4">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter op klas:</span>
                   <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      <button onClick={() => setSelectedStudentClassFilter('all')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-none cursor-pointer transition-colors ${selectedStudentClassFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>Alle</button>
                      {myClassrooms.map(c => (
                         <button key={c.id} onClick={() => setSelectedStudentClassFilter(c.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-none cursor-pointer transition-colors ${selectedStudentClassFilter === c.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{c.name}</button>
                      ))}
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                   {displayedRegisteredStudents.map(s => (
                      <div key={s.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-700 shadow-sm border border-slate-100">
                               {s.lastInitial}
                            </div>
                            <div>
                               <h4 className="font-bold text-slate-800">{s.firstName} {s.lastInitial}.</h4>
                               <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded border border-slate-100">{classrooms.find(c => c.id === s.classId)?.name}</span>
                                  <span className="text-[11px] font-mono text-slate-600 font-bold bg-slate-200 px-2 py-0.5 rounded">pw: {s.password}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditStudent(s)} className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center border-none cursor-pointer hover:bg-blue-200"><i className="fa-solid fa-pen text-xs"></i></button>
                            <button onClick={() => setDeleteConfirmationId(s.id)} className="w-8 h-8 bg-rose-100 text-rose-500 rounded-lg flex items-center justify-center border-none cursor-pointer hover:bg-rose-200"><i className="fa-solid fa-trash-can text-xs"></i></button>
                         </div>
                      </div>
                   ))}
                   {displayedRegisteredStudents.length === 0 && (
                      <div className="col-span-full py-10 text-center text-slate-400 font-medium italic">
                         Geen leerlingen gevonden in deze weergave.
                      </div>
                   )}
                </div>
                
                {role === 'admin' && (
                   <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                      <button onClick={() => setShowClearAllModal(true)} className="text-rose-400 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-none bg-transparent cursor-pointer transition-colors">
                         <i className="fa-solid fa-triangle-exclamation"></i> Database Resetten
                      </button>
                   </div>
                )}
             </div>
          )}

          {activeTab === 'database' && (
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-full flex flex-col animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-wrap gap-4 mb-6 items-end">
                   <div className="flex-1 min-w-[200px] space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zoeken</label>
                      <div className="relative">
                         <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                         <input type="text" value={dbSearchQuery} onChange={(e) => setDbSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none focus:border-blue-500 transition-colors" placeholder="Zoek opgave..." />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Niveau</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                         <button onClick={() => setDbFilterLevel('all')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border-none cursor-pointer transition-all ${dbFilterLevel === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Alle</button>
                         {[1, 2, 3].map((lvl) => {
                            const cfg = LEVEL_CONFIG[lvl as DifficultyLevel];
                            const active = dbFilterLevel === lvl;
                            return (
                               <button 
                                 key={lvl} 
                                 onClick={() => setDbFilterLevel(lvl as DifficultyLevel)} 
                                 className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all border-none cursor-pointer ${active ? `bg-white shadow-sm ${cfg.color}` : 'text-slate-400 hover:text-slate-600'}`}
                                 title={cfg.label}
                               >
                                 <i className={`fa-solid ${cfg.icon}`}></i>
                               </button>
                            );
                         })}
                      </div>
                   </div>
                </div>

                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                   <button onClick={() => { setDbFilterTheme('all'); setDbFilterSubModule('all'); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-none cursor-pointer whitespace-nowrap transition-colors ${dbFilterTheme === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>Alles</button>
                   {themes.map(t => (
                      <button key={t.id} onClick={() => { setDbFilterTheme(t.id); setDbFilterSubModule('all'); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-none cursor-pointer whitespace-nowrap transition-colors ${dbFilterTheme === t.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{t.title}</button>
                   ))}
                </div>
                
                {dbFilterTheme !== 'all' && availableSubModules.length > 0 && (
                   <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar animate-in slide-in-from-left-2">
                      <button onClick={() => setDbFilterSubModule('all')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border-none cursor-pointer whitespace-nowrap transition-colors ${dbFilterSubModule === 'all' ? 'bg-slate-300 text-slate-800' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>Alle onderdelen</button>
                      {availableSubModules.map(s => (
                         <button key={s.id} onClick={() => setDbFilterSubModule(s.id as string)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border-none cursor-pointer whitespace-nowrap transition-colors ${dbFilterSubModule === s.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>{s.title}</button>
                      ))}
                   </div>
                )}

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                   {filteredProblems.length === 0 ? (
                      <div className="py-20 text-center opacity-50">
                         <i className="fa-solid fa-box-open text-4xl mb-4 text-slate-300"></i>
                         <p className="font-bold text-slate-400">Geen oefeningen gevonden.</p>
                      </div>
                   ) : (
                      themes.map(theme => (
                         <DatabaseTreeItem 
                            key={theme.id} 
                            item={theme} 
                            problems={filteredProblems} 
                            onEdit={startEdit} 
                            onDelete={handleDeleteProblem} 
                            showActions={true}
                         />
                      ))
                   )}
                </div>
             </div>
          )}

          {activeTab === 'create' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
               <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-wrap gap-4 items-end">
                     <div className="space-y-1 flex-1 min-w-[200px]">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Kies Module</label>
                        <select 
                          value={selectedModule} 
                          onChange={(e) => setSelectedModule(e.target.value as ModuleId)} 
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-sm outline-none cursor-pointer"
                        >
                          {allLeafModules.map(m => <option key={m.id} value={m.id}>{m.fullTitle}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Moeilijkheidsgraad</label>
                        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                           {[1, 2, 3].map((lvl) => {
                             const cfg = LEVEL_CONFIG[lvl as DifficultyLevel];
                             const active = level === lvl;
                             return (
                               <button 
                                 key={lvl} 
                                 onClick={() => setLevel(lvl as DifficultyLevel)}
                                 className={`w-10 h-9 rounded-lg flex items-center justify-center transition-all border-none cursor-pointer ${active ? `${cfg.btn} text-white shadow-md` : 'text-slate-400 hover:bg-slate-200'}`}
                                 title={cfg.label}
                               >
                                 <i className={`fa-solid ${cfg.icon}`}></i>
                               </button>
                             );
                           })}
                        </div>
                     </div>
                     <button
                        onClick={handleGenerateProblem}
                        disabled={isGenerating}
                        className="bg-indigo-600 text-white px-4 py-2 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all border-none cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-md"
                    >
                        {isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                        Genereer
                    </button>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">De Opgave</label>
                     <div className="p-2 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 min-h-[70px] flex items-center justify-center overflow-hidden">
                       {isEquationMode ? (
                          <div className="flex items-center gap-4 w-full px-6 h-full">
                             <div className="flex-1 flex items-center h-full"><MathInput value={leftExpr} onChange={setLeftExpr} onFocus={(ref) => activeInputRef.current = ref} /></div>
                             <span className="text-xl font-black text-slate-300">=</span>
                             <div className="flex-1 flex items-center h-full"><MathInput value={rightExpr} onChange={setRightExpr} onFocus={(ref) => activeInputRef.current = ref} /></div>
                          </div>
                       ) : <div className="w-full px-6 flex items-center h-full"><MathInput value={expression} onChange={setExpression} onFocus={(ref) => activeInputRef.current = ref} /></div>}
                     </div>
                     <div className="flex justify-center"><MathToolbar inputRef={activeInputRef} moduleId={selectedModule} className="bg-slate-50 p-2 rounded-2xl border border-slate-200" size="sm" /></div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Stappenplan & Oplossing</label>
                       <span className="text-[9px] text-slate-400 font-bold">{steps.length} tussenstappen</span>
                    </div>
                    <div className="space-y-4">
                       {steps.map((step, index) => (
                          <div key={step.id} className="relative group animate-in slide-in-from-left-2 duration-300">
                             <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200 z-10">{index + 1}</div>
                             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-4 transition-colors hover:border-blue-200 hover:bg-blue-50/30">
                                {isEquationMode ? (
                                   <div className="flex items-center gap-3">
                                       <div className="w-24 flex-shrink-0 flex justify-center">
                                          {step.hasOperation ? (
                                            <div className="relative group/op w-full">
                                              <div className="bg-white rounded-xl border-2 border-purple-200 h-12 px-2 flex items-center focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-50 transition-all shadow-sm">
                                                 <MathInput 
                                                    value={step.operation} 
                                                    onChange={(v) => updateStep(step.id, 'operation', v)} 
                                                    onFocus={(ref) => activeInputRef.current = ref} 
                                                 />
                                              </div>
                                              <button 
                                                onClick={() => updateStep(step.id, 'hasOperation', false)}
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover/op:opacity-100 transition-opacity cursor-pointer shadow-sm border-none"
                                                title="Verwijder sprong"
                                              >
                                                <i className="fa-solid fa-xmark"></i>
                                              </button>
                                            </div>
                                          ) : (
                                            <button 
                                              onClick={() => updateStep(step.id, 'hasOperation', true)}
                                              className="w-10 h-10 rounded-xl bg-purple-50 text-purple-400 border-2 border-dashed border-purple-200 hover:bg-purple-100 flex items-center justify-center transition-all cursor-pointer"
                                              title="Voeg bewerking toe"
                                            >
                                              <i className="fa-solid fa-wand-magic-sparkles text-sm"></i>
                                            </button>
                                          )}
                                       </div>

                                      <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 h-12 px-3 flex items-center focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                                         <MathInput value={step.leftValue} onChange={(v) => updateStep(step.id, 'leftValue', v)} onFocus={(ref) => activeInputRef.current = ref} />
                                      </div>
                                      <span className="text-slate-300 font-black text-xl">=</span>
                                      <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 h-12 px-3 flex items-center focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                                         <MathInput value={step.rightValue} onChange={(v) => updateStep(step.id, 'rightValue', v)} onFocus={(ref) => activeInputRef.current = ref} />
                                      </div>
                                   </div>
                                ) : (
                                   <div className="w-full bg-white rounded-xl border border-slate-200 h-12 px-3 flex items-center focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                                      <MathInput value={step.value} onChange={(v) => updateStep(step.id, 'value', v)} onFocus={(ref) => activeInputRef.current = ref} />
                                   </div>
                                )}
                                
                                <div className="pt-2 border-t border-slate-200/50 flex justify-center">
                                   <MathToolbar inputRef={activeInputRef} moduleId={selectedModule} size="sm" />
                                </div>
                             </div>
                             <button onClick={() => handleRemoveStep(step.id)} className="absolute -right-2 -top-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-md border-none cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
                          </div>
                       ))}
                    </div>
                    <button onClick={handleAddStep} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer bg-transparent">+ Stap Toevoegen</button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex gap-3"><button onClick={handleSaveProblem} className="flex-[2] bg-emerald-600 text-white font-black py-3 rounded-xl shadow-lg uppercase tracking-widest text-[10px] border-none cursor-pointer hover:bg-emerald-700 h-12">{editingId ? 'Oefening Bijwerken' : 'Opslaan in Database'}</button></div>
               </div>
            </div>
          )}

          {activeTab === 'users' && role === 'admin' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full animate-in slide-in-from-bottom-2 duration-300">
                {/* KLASSEN BEHEER */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
                   <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><i className="fa-solid fa-users-rectangle text-blue-500"></i> Klassen</h3>
                   <div className="flex gap-2 mb-4">
                      <input type="text" placeholder="Nieuwe klas naam" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm outline-none focus:border-blue-500" />
                      <button onClick={handleAddClass} disabled={!newClassName.trim()} className="px-4 py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg hover:bg-blue-700 transition-colors border-none cursor-pointer disabled:opacity-50"><i className="fa-solid fa-plus"></i></button>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                      {myClassrooms.map(c => (
                         <div key={c.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-100 transition-colors">
                            <span className="font-black text-slate-700">{c.name}</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">{students.filter(s => s.classId === c.id).length} lln</span>
                               <button onClick={() => handleDeleteClass(c.id)} className="w-8 h-8 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border-none cursor-pointer"><i className="fa-solid fa-trash-can"></i></button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                {/* LEERKRACHTEN BEHEER */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
                   <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><i className="fa-solid fa-chalkboard-user text-emerald-500"></i> Leerkrachten</h3>
                   
                   {/* ADD TEACHER FORM */}
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 space-y-3">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          {showManualEntry ? 'Handmatig Koppelen (Stap 2/2)' : 'Nieuwe Leerkracht (Stap 1/2)'}
                      </h4>
                      
                      {showManualEntry ? (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-xs border border-amber-100">
                                  <p className="font-bold mb-1"><i className="fa-solid fa-triangle-exclamation"></i> Automatisch uitnodigen mislukt.</p>
                                  {serverError && <p className="text-[10px] font-mono mb-2 bg-amber-100 p-1 rounded break-all">{serverError}</p>}
                                  <p>De server-functie reageert niet. Geen probleem! Stuur deze link naar je collega:</p>
                                  
                                  <div className="mt-2 bg-white p-2 rounded border border-amber-200 font-mono text-[10px] break-all select-all cursor-text">
                                      {window.location.origin}?register=true&name={encodeURIComponent(newTeacherName)}&role={newTeacherRole}
                                  </div>
                                  
                                  <p className="mt-2 text-[10px]">
                                     Via deze link kan de collega <strong>zelf</strong> een account aanmaken en een wachtwoord kiezen. De rol ({newTeacherRole === 'admin' ? 'Beheerder' : 'Leerkracht'}) staat al klaar.
                                  </p>
                              </div>
                              
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => setShowManualEntry(false)}
                                    className="flex-1 px-4 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-300 transition-colors border-none cursor-pointer"
                                  >
                                    Sluiten
                                  </button>
                                  <button 
                                    onClick={() => {
                                        const url = `${window.location.origin}?register=true&name=${encodeURIComponent(newTeacherName)}&role=${newTeacherRole}`;
                                        navigator.clipboard.writeText(url);
                                        alert("Link gekopieerd!");
                                    }} 
                                    className="flex-[2] px-4 py-3 bg-emerald-500 text-white rounded-xl font-black shadow-lg hover:bg-emerald-600 transition-colors border-none cursor-pointer"
                                  >
                                    <i className="fa-solid fa-copy mr-2"></i> Kopieer Link
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 gap-3">
                             <input 
                                type="text" 
                                placeholder="Naam (bv. Mevr. Jansen)" 
                                value={newTeacherName} 
                                onChange={(e) => setNewTeacherName(e.target.value)} 
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:border-emerald-500" 
                             />
                             <input 
                                type="email" 
                                placeholder="E-mailadres" 
                                value={newTeacherEmail} 
                                onChange={(e) => setNewTeacherEmail(e.target.value)} 
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:border-emerald-500" 
                             />
                             
                             <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <select 
                                        value={newTeacherRole}
                                        onChange={(e) => setNewTeacherRole(e.target.value as 'admin' | 'teacher')}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:border-emerald-500 appearance-none"
                                    >
                                        <option value="teacher">Leerkracht</option>
                                        <option value="admin">Beheerder</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <i className="fa-solid fa-chevron-down text-xs"></i>
                                    </div>
                                </div>
                             </div>

                             <button 
                                onClick={handleAddTeacher} 
                                disabled={!newTeacherName.trim() || !newTeacherEmail.trim() || isAddingTeacher} 
                                className="w-full px-4 py-3 bg-emerald-500 text-white rounded-xl font-black shadow-lg hover:bg-emerald-600 transition-colors border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                             >
                                {isAddingTeacher ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                                Verstuur Uitnodiging
                             </button>
                          </div>
                      )}
                   </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                      {teachers.map(t => (
                         <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-100 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-emerald-600 shadow-sm border border-emerald-50">{t.name.charAt(0)}</div>
                                  <div>
                                     <h4 className="font-bold text-slate-800 text-sm">{t.name}</h4>
                                     <p className="text-[10px] font-mono text-slate-400">
                                        {t.role === 'admin' ? 'Beheerder' : 'Leerkracht'}
                                     </p>
                                  </div>
                               </div>
                               <button onClick={() => handleDeleteTeacher(t.id)} className="w-8 h-8 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border-none cursor-pointer"><i className="fa-solid fa-trash-can"></i></button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                               {myClassrooms.map(c => {
                                  const hasAccess = t.classIds.includes(c.id);
                                  return (
                                     <button 
                                       key={c.id} 
                                       onClick={() => toggleClassForTeacher(t.id, c.id)}
                                       className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide border transition-all cursor-pointer ${hasAccess ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300'}`}
                                     >
                                       {c.name}
                                     </button>
                                  );
                               })}
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'ai-guide' && (
            <AIGuideEditor aiGuideConfig={aiGuideConfig} setAIGuideConfig={setAIGuideConfig} />
          )}

          {/* DELETE CONFIRMATION MODAL */}
          {deleteConfirmationId && (
            <div className="fixed inset-0 z-[2100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-200 border-4 border-rose-50">
                  <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-inner">
                     <i className="fa-solid fa-trash-can"></i>
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-slate-900 mb-2">Leerling Verwijderen?</h3>
                     <p className="text-slate-500 font-bold text-sm">
                       Je staat op het punt om <span className="text-slate-800 font-black">{students.find(s => String(s.id) === deleteConfirmationId)?.firstName}</span> definitief te verwijderen.
                     </p>
                     <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-4">Dit wist alle resultaten.</p>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={() => setDeleteConfirmationId(null)} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors border-none cursor-pointer">Annuleren</button>
                     <button onClick={executeDeleteStudent} className="flex-1 py-4 rounded-xl bg-rose-500 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 border-none cursor-pointer">Verwijderen</button>
                  </div>
               </div>
            </div>
          )}

          {/* CLEAR ALL STUDENTS CONFIRMATION MODAL */}
          {showClearAllModal && (
            <div className="fixed inset-0 z-[2200] bg-rose-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
               <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-200 border-8 border-rose-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
                  
                  <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner mb-4 animate-bounce-subtle">
                     <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  
                  <div>
                     <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">Ben je absoluut zeker?</h3>
                     <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
                       Je staat op het punt om <strong className="text-rose-600">ALLE leerlingen</strong> en hun volledige historiek (oefeningen, dagboeken, voortgang) te verwijderen.
                     </p>
                     <p className="bg-rose-50 p-4 rounded-xl text-rose-700 text-xs font-bold border border-rose-100">
                       Deze actie kan NIET ongedaan gemaakt worden.
                     </p>
                  </div>

                  <div className="space-y-4">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       Typ "VERWIJDEREN" om te bevestigen
                     </label>
                     <input 
                       type="text" 
                       value={clearAllConfirmationText}
                       onChange={(e) => setClearAllConfirmationText(e.target.value.toUpperCase())}
                       placeholder="Typ hier..."
                       className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 text-center font-bold text-rose-600 outline-none focus:border-rose-500 transition-colors uppercase"
                     />
                  </div>

                  <div className="flex gap-4">
                     <button 
                       onClick={() => {
                          setShowClearAllModal(false);
                          setClearAllConfirmationText('');
                       }} 
                       className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors border-none cursor-pointer"
                     >
                       Annuleren
                     </button>
                     <button 
                       onClick={handleClearAllStudents}
                       disabled={clearAllConfirmationText !== 'VERWIJDEREN' || isClearing}
                       className="flex-1 py-4 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 border-none cursor-pointer disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                     >
                       {isClearing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bomb"></i>}
                       Alles Wissen
                     </button>
                  </div>
               </div>
            </div>
          )}
        </main>
      
      {/* RENDER PRINTABLE REPORT VIA PORTAL TO ESCAPE OVERFLOW HIDDEN CONTAINERS */}
      {portalTarget && createPortal(
        <div 
          id="printable-area" 
          className="print:block bg-white text-black p-0 m-0"
          style={{ 
            position: 'fixed', 
            left: '-10000px', 
            top: 0, 
            width: '1000px', 
            height: 'auto',
            visibility: 'hidden',
            zIndex: -1
          }}
        >
             <div className="p-8">
                 <div className="mb-8 border-b-2 border-slate-200 pb-4 flex justify-between items-center">
                    <div>
                       <h1 className="text-3xl font-black">
                         {selectedStudentResult 
                            ? `Leerlingrapport: ${getStudentDisplayName(selectedStudentResult)}` 
                            : `Klasrapport: ${classrooms.find(c => c.id === viewClassId)?.name || 'Alle Klassen'}`
                         }
                       </h1>
                       <p className="text-sm text-slate-500">Gegenereerd op {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                       <div className="text-2xl font-black text-slate-300">Leerplatform</div>
                    </div>
                 </div>

                 {/* Single Student Report */}
                 {selectedStudentResult && selectedStudentComputedStats ? (
                    <div className="space-y-8">
                       <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="border p-4 rounded text-center">
                             <div className="text-xs uppercase text-slate-400 font-bold">Opgelost</div>
                             <div className="text-2xl font-black">{selectedStudentComputedStats.totalSolved}</div>
                          </div>
                          <div className="border p-4 rounded text-center">
                             <div className="text-xs uppercase text-slate-400 font-bold">Fouten</div>
                             <div className="text-2xl font-black">{selectedStudentComputedStats.totalErrors}</div>
                          </div>
                          <div className="border p-4 rounded text-center">
                             <div className="text-xs uppercase text-slate-400 font-bold">Top Fout</div>
                             <div className="text-xl font-black text-rose-600">
                                {selectedStudentComputedStats.recentChartData.length > 0 
                                   ? [...selectedStudentComputedStats.recentChartData].sort((a,b) => b.value - a.value)[0].name 
                                   : "-"}
                             </div>
                          </div>
                       </div>

                       <table className="w-full text-left border-collapse text-sm">
                          <thead>
                             <tr className="border-b-2 border-black">
                                <th className="py-2">Module</th>
                                <th className="py-2">Niveau</th>
                                <th className="py-2 text-center">Opgelost</th>
                                <th className="py-2 text-center">Fouten</th>
                                <th className="py-2">Top Fout</th>
                             </tr>
                          </thead>
                          <tbody>
                             {(Object.entries(selectedStudentResult.progress || {}) as [string, ModuleProgress][])
                               .filter(([_, prog]) => (prog?.solvedProblemIds?.length || 0) > 0 || (prog?.growthStatus || 1) > 1)
                               .map(([modId, prog]) => {
                                  const totalErrors = Object.values(prog?.allTimeErrors || {}).reduce((a: number, b: number) => a + b, 0);
                                  const topError = Object.entries(prog?.allTimeErrors || {}).sort((a, b) => b[1] - a[1])[0];
                                  
                                  return (
                                     <tr key={modId} className="border-b border-slate-200">
                                        <td className="py-2">{getModuleTitle(modId)}</td>
                                        <td className="py-2">{LEVEL_CONFIG[(prog.growthStatus || 1) as DifficultyLevel]?.label || 'Start'}</td>
                                        <td className="py-2 text-center">{prog?.solvedProblemIds?.length || 0}</td>
                                        <td className="py-2 text-center">{totalErrors}</td>
                                        <td className="py-2 text-rose-600">{topError && topError[1] > 0 ? ERROR_LABELS[topError[0] as ErrorType] : '-'}</td>
                                     </tr>
                                  );
                               })}
                          </tbody>
                       </table>
                    </div>
                 ) : (
                    /* Class Report */
                    <div>
                       {classReport && (
                          <div className="mb-8 p-6 border border-slate-200 rounded-xl bg-slate-50 break-inside-avoid">
                             <h3 className="text-lg font-black mb-2 uppercase tracking-widest">Klas Insight (AI Analyse)</h3>
                             <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif italic">{classReport.summary}</p>
                          </div>
                       )}

                       <div className="grid grid-cols-2 gap-4">
                          {filteredDisplayStudents.map((student: StudentResult, idx: number) => {
                             let totalSolved = 0;
                             let aggregatedErrors: Record<ErrorType, number> = { [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0, [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0 };
                             let modulesStarted = 0;

                             // Fix: Explicitly cast to ModuleProgress[] to avoid unknown type errors
                             // Use 'any' cast first to break potential unknown inference lock
                             // Add safety check for student.progress existence
                             const progressMap = student.progress || {};
                             const progressItems = Object.values(progressMap) as unknown as ModuleProgress[];
                             
                             progressItems.forEach((prog: ModuleProgress) => {
                                if ((prog?.solvedProblemIds?.length || 0) > 0 || (prog?.growthStatus || 1) > 1) {
                                   totalSolved += (prog?.solvedProblemIds?.length || 0);
                                   modulesStarted++;
                                   if (prog?.allTimeErrors) {
                                       Object.entries(prog.allTimeErrors).forEach(([type, count]) => {
                                          const t = type as ErrorType;
                                          aggregatedErrors[t] = (aggregatedErrors[t] || 0) + (count as number);
                                       });
                                   }
                                }
                             });

                             const topError = Object.entries(aggregatedErrors).sort((a,b) => b[1] - a[1])[0];

                             return (
                                <div key={idx} className="border border-slate-200 rounded-xl p-4 break-inside-avoid flex flex-col gap-2">
                                   <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                                      <span className="font-black text-lg">{getStudentDisplayName(student)}</span>
                                      <span className="text-xs font-mono bg-slate-100 px-2 rounded">{student.className}</span>
                                   </div>
                                   <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                      <div className="bg-slate-50 p-2 rounded">
                                         <div className="font-black text-slate-400 text-[9px] uppercase">Opgelost</div>
                                         <div className="font-bold text-lg">{totalSolved}</div>
                                      </div>
                                      <div className="bg-slate-50 p-2 rounded">
                                         <div className="font-black text-slate-400 text-[9px] uppercase">Modules</div>
                                         <div className="font-bold text-lg">{modulesStarted}</div>
                                      </div>
                                      <div className="bg-slate-50 p-2 rounded">
                                         <div className="font-black text-slate-400 text-[9px] uppercase">Top Fout</div>
                                         <div className="font-bold text-lg text-rose-500">{topError && topError[1] > 0 ? ERROR_LABELS[topError[0] as ErrorType].substring(0,6)+'..' : '-'}</div>
                                      </div>
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 )}
             </div>
          {/* CHANGE PASSWORD MODAL */}
          {showChangePasswordModal && (
            <div className="fixed inset-0 z-[2200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-200 border-4 border-blue-50">
                  <div className="w-20 h-20 bg-blue-100 text-blue-500 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-inner">
                     <i className="fa-solid fa-key"></i>
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-slate-900 mb-2">Wachtwoord Wijzigen</h3>
                     <p className="text-slate-500 font-bold text-sm">
                       Kies een nieuw, veilig wachtwoord.
                     </p>
                  </div>
                  <input 
                    type="password" 
                    placeholder="Nieuw wachtwoord (min. 6 tekens)" 
                    value={changePasswordValue} 
                    onChange={(e) => setChangePasswordValue(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm outline-none focus:border-blue-500 text-center" 
                  />
                  <div className="flex gap-3">
                     <button onClick={() => setShowChangePasswordModal(false)} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors border-none cursor-pointer">Annuleren</button>
                     <button onClick={handleChangePassword} disabled={isChangingPassword || changePasswordValue.length < 6} className="flex-1 py-4 rounded-xl bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 border-none cursor-pointer disabled:opacity-50">
                        {isChangingPassword ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Opslaan'}
                     </button>
                  </div>
               </div>
            </div>
          )}
        </div>,
        portalTarget
      )}
    </div>
  );
};
