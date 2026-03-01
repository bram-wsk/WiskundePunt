
export enum ErrorType {
  ORDER = 'fout tegen volgorde',
  CALCULATION = 'rekenfout',
  SIGN = 'tekenfout',
  CONCEPT = 'denkfout',
  COPY = 'overtipfout',
  UNKNOWN = 'onbekende fout'
}

export type DifficultyLevel = 1 | 2 | 3;

export type StepSuccessStatus = 'perfect' | 'self_corrected' | 'guided';

export type ModuleId = 
  | 'volgorde-geheel' 
  | 'volgorde-machten' 
  | 'volgorde-rationaal' 
  | 'vergelijkingen' 
  | 'vergelijkingen-geheel' 
  | 'vergelijkingen-rationaal'
  | 'hoofdbewerkingen-natuurlijk'
  | 'hoofdbewerkingen-natuurlijk-optellen-aftrekken'
  | 'hoofdbewerkingen-natuurlijk-vermenigvuldigen-delen'
  | 'hoofdbewerkingen-geheel'
  | 'hoofdbewerkingen-geheel-optellen-aftrekken'
  | 'hoofdbewerkingen-geheel-vermenigvuldigen-delen'
  | 'hoofdbewerkingen-rationaal'
  | 'hoofdbewerkingen-rationaal-optellen-aftrekken'
  | 'hoofdbewerkingen-rationaal-vermenigvuldigen-delen'
  | 'mix';

export interface Classroom {
  id: string;
  name: string;
  lockedModules?: string[]; // Per-class locking
}

export interface Teacher {
  id: string;
  name: string;
  pin: string;
  classIds: string[];
  role?: 'admin' | 'teacher';
}

export interface Student {
  id: string;
  firstName: string;
  lastInitial: string;
  password: string;
  classId: string;
}

export interface UserInfo {
  id?: string;
  firstName: string;
  className: string;
  role: 'student' | 'teacher' | 'admin';
  assignedClassIds?: string[]; // Voor leerkrachten
}

export interface Problem {
  id: string;
  expression: string;
  solution: string[]; 
  operations?: string[];
  finalAnswer: number;
  level: DifficultyLevel;
  moduleId: ModuleId;
  isCustom?: boolean;
}

export interface ModuleProgress {
  growthStatus: DifficultyLevel;
  solvedProblemIds: string[];
  allTimeErrors: Record<ErrorType, number>;
  recentStepHistory?: StepSuccessStatus[]; // Last 30 steps history
}

export interface SessionStats {
  completed: number;
  totalErrors: number;
  errorDistribution: Record<ErrorType, number>;
  problemBreakdown?: Record<string, Record<ErrorType, number>>;
  sessionStartTime: number;
}

export interface DiaryEntry {
  date: string;
  moduleId: ModuleId;
  stats: SessionStats;
}

export interface LearningDiary {
  entries: DiaryEntry[];
  totalSessions: number;
  moduleProgress: Record<string, ModuleProgress>; 
}

export interface StudentResult {
  firstName: string;
  className: string;
  progress: Record<string, ModuleProgress>;
}

export interface InterventionAlert {
  id: string;
  studentName: string;
  className: string;
  errorType: ErrorType;
  moduleId: ModuleId;
  timestamp: number;
}

export interface AIProgression {
  shouldLevelUp: boolean;
  newLevel: DifficultyLevel;
  reasoning: string;
  growthMessage: string;
  feedUp: string;
  feedback: string;
  feedForward: string;
  tip: string;
  encouragement: string;
}

export interface ModuleAnalysis {
  moduleId: string;
  moduleDisplayName: string;
  strengths: string[];
  weaknesses: string[];
  didacticAdvice: string;
}

export interface CrossModularTrend {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ClassAnalysis {
  summary: string;
  crossModularTrends: CrossModularTrend[];
  moduleAnalyses: ModuleAnalysis[];
}

export interface SubModuleConfig {
  id: ModuleId;
  title: string;
  description: string;
  icon: string;
  isMix?: boolean;
  subModules?: SubModuleConfig[]; // Allow nesting
}

export interface ThemeConfig {
  id: string; 
  title: string;
  icon: string;
  color: string;
  description: string;
  subModules?: SubModuleConfig[];
}

export interface AIAnalysis {
  isCorrect: boolean;
  errorTypes: ErrorType[]; 
  feedUp: string;
  feedback: string;
  feedForward: string;
  tip: string;
  encouragement: string;
}

export interface StepAttempt {
  stepIndex: number;
  userInput: string;
  userOperation?: string;
  isCorrect: boolean;
  errorCategories?: ErrorType[]; 
}

export interface AIGuideConfig {
  version: string;
  lastUpdated: string;
  sections: {
    systemPersona: string;
    didacticApproach: string;
    terminologyRules: string;
    errorIdentification: string;
    doubtHandling: string;
    didacticInstruments: string;
    stepComparison: string;
    blockingCriteria: string;
    differentiation: string;
    exportImportFormat: string;
  };
}
