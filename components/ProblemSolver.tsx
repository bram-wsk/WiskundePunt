
import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import { Problem, StepAttempt, ErrorType, AIAnalysis, ModuleId, StepSuccessStatus } from '../types';
import { analyzeMathStep } from '../services/geminiService';
import { MathDisplay } from './MathDisplay';
import { MathInput, MathInputRef } from './MathInput';
import { MathToolbar } from './MathToolbar'; 
import { AvatarCoach } from './AvatarCoach';
import { Scratchpad } from './Scratchpad';
import { normalizeMath } from '../constants';
import { VirtualKeyboard } from './VirtualKeyboard';

interface ProblemSolverProps {
  problem: Problem;
  onComplete: (errors: Record<ErrorType, number>) => void;
  onStepError: (types: ErrorType[]) => void;
  onStepSuccess: (status: StepSuccessStatus) => void;
  interventionType: ErrorType | null;
  onResetIntervention: () => void;
  allErrorCounts: Record<ErrorType, number>;
  historyContext?: string;
  moduleId: ModuleId;
  aiGuideContext: string;
  studentName: string;
}

const ProblemSolverComponent: React.FC<ProblemSolverProps> = ({ 
  problem, onComplete, onStepError, onStepSuccess, interventionType, onResetIntervention, historyContext, moduleId, aiGuideContext, studentName
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [leftInput, setLeftInput] = useState('');
  const [rightInput, setRightInput] = useState('');
  const [userOperation, setUserOperation] = useState(''); 
  const [showScratchpad, setShowScratchpad] = useState(false);
  
  const [attempts, setAttempts] = useState<StepAttempt[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<AIAnalysis | null>(null);
  
  const [isExerciseComplete, setIsExerciseComplete] = useState(false);
  const [finalErrors, setFinalErrors] = useState<Record<ErrorType, number> | null>(null);

  const mathInputRef = useRef<MathInputRef>(null);
  const leftInputRef = useRef<MathInputRef>(null);
  const rightInputRef = useRef<MathInputRef>(null);
  const operationInputRef = useRef<MathInputRef>(null);
  
  const currentStepRef = useRef<HTMLDivElement>(null);
  
  const [activeInputRef, setActiveInputRef] = useState<React.RefObject<MathInputRef | null>>(mathInputRef);

  const isEquationMode = moduleId.startsWith('vergelijkingen') || (moduleId === 'mix' && problem.moduleId.startsWith('vergelijkingen'));
  
  const expectedOp = problem.operations ? problem.operations[currentStepIndex] : undefined;
  const hasExpectedOp = expectedOp && expectedOp.trim() !== '';

  useEffect(() => {
    if (isExerciseComplete) return;

    if (isEquationMode) {
        setTimeout(() => {
             leftInputRef.current?.focus();
             setActiveInputRef(leftInputRef);
        }, 100);
    } else {
        setTimeout(() => {
             mathInputRef.current?.focus();
             setActiveInputRef(mathInputRef);
        }, 100);
    }
  }, [isEquationMode, currentStepIndex, isExerciseComplete]); 

  useEffect(() => {
    if (currentStepRef.current) {
      setTimeout(() => {
        currentStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150); 
    }
  }, [currentStepIndex, attempts.length, isAnalyzing, isExerciseComplete]);

  const splitEquation = (eq: string): [string, string] => {
    const parts = eq.split('=');
    if (parts.length === 2) return [parts[0].trim(), parts[1].trim()];
    return [eq, '']; 
  };

  const getPreviousStepExpression = () => {
    if (currentStepIndex === 0) return problem.expression;
    const correctAttempts = attempts.filter(a => a.isCorrect);
    return correctAttempts[correctAttempts.length - 1]?.userInput || problem.expression;
  };

  const handleSubmitResult = useCallback(async () => {
    if (isAnalyzing) return;
    
    const cleanUserInput = userInput.trim().replace(/^=/, '');
    const finalInput = isEquationMode ? `${leftInput}=${rightInput}` : cleanUserInput;
    
    if (isEquationMode && (!leftInput.trim() || !rightInput.trim() || (hasExpectedOp && !userOperation.trim()))) {
      setFeedback({
        isCorrect: false, 
        errorTypes: [ErrorType.CONCEPT],
        feedback: hasExpectedOp 
          ? "Vergeet de bewerking (het sprongetje) en beide kanten van de balans niet!" 
          : "Vergeet de beide kanten van de balans niet!",
        feedUp: "Onvolledig", feedForward: "Vul alles in.", tip: "Balans!", encouragement: "Kijk nog eens naar de weegschaal."
      });
      return;
    }
    if (!isEquationMode && !finalInput) return;

    setIsAnalyzing(true);
    const expectedStep = problem.solution[currentStepIndex];
    const prevStep = getPreviousStepExpression();
    const expectedOpVal = problem.operations ? problem.operations[currentStepIndex] : undefined;

    const isPerfect = normalizeMath(finalInput) === normalizeMath(expectedStep) && 
                      (!hasExpectedOp || normalizeMath(userOperation) === normalizeMath(expectedOpVal || ''));

    // Count past failures for this step
    const failedAttemptsCount = attempts.filter(a => a.stepIndex === currentStepIndex && !a.isCorrect).length;

    if (isPerfect) {
      setIsAnalyzing(false);
      const isLastStep = currentStepIndex === problem.solution.length - 1;
      const successMessage = isLastStep 
        ? `Prima uitgevoerd, ${studentName}! Bekijk de totale oefening hiernaast nog even.`
        : `Prima uitgevoerd, ${studentName}! Wat is de volgende stap?`;
      
      handleSuccess(finalInput, userOperation, failedAttemptsCount, successMessage);
      return;
    }

    try {
      const result = await analyzeMathStep(
        problem.expression, prevStep, finalInput, expectedStep, problem.moduleId, userOperation, expectedOpVal, aiGuideContext, failedAttemptsCount
      );
      
      setIsAnalyzing(false);
      if (result.isCorrect) {
        handleSuccess(finalInput, userOperation, failedAttemptsCount);
      } else {
        // Use the feedback from the AI as it is guided by the AI-sturing (AI Guide)
        handleFailure(finalInput, result, userOperation);
      }
    } catch (err) {
      console.error("Critical submission error:", err);
      setIsAnalyzing(false);
      handleFailure(finalInput, {
        isCorrect: false, errorTypes: [ErrorType.UNKNOWN],
        feedback: "Er ging iets mis bij de analyse. Controleer je notatie en probeer het nog eens.",
        feedUp: "Foutje", feedForward: "Probeer opnieuw.", tip: "Kijk je tekens na.", encouragement: "Geen zorgen!"
      } as AIAnalysis);
    } finally {
      setIsAnalyzing(false);
    }
  }, [userInput, leftInput, rightInput, userOperation, isAnalyzing, currentStepIndex, problem, attempts, moduleId, isEquationMode, aiGuideContext]);

  const handleSuccess = (validInput: string, validOp: string, priorFailures: number, customMessage?: string) => {
    // Determine Success Status
    // 0 failures = Perfect
    // 1 failure = Self Corrected (because the first failure gives a subtle hint "Step 0" without solution)
    // >1 failures = Guided
    let status: StepSuccessStatus = 'perfect';
    if (priorFailures === 1) {
        status = 'self_corrected'; 
    } else if (priorFailures > 1) {
        status = 'guided'; 
    }
    
    // Notify Parent
    onStepSuccess(status);

    const nextIdx = currentStepIndex + 1;
    const updatedAttempts: StepAttempt[] = [...attempts, { 
      stepIndex: currentStepIndex, 
      userInput: validInput, 
      userOperation: validOp, 
      isCorrect: true 
    }];
    setAttempts(updatedAttempts);
    setUserInput(''); setLeftInput(''); setRightInput(''); setUserOperation('');
    setCurrentStepIndex(nextIdx);
    
    if (customMessage) {
      setFeedback({
        isCorrect: true,
        errorTypes: [],
        feedback: customMessage,
        feedUp: "Prima!",
        feedForward: "Volgende stap",
        tip: "",
        encouragement: "Goed zo!"
      });
    } else {
      setFeedback(null);
    }

    if (nextIdx >= problem.solution.length) {
      const errorCounts: Record<ErrorType, number> = {
        [ErrorType.ORDER]: 0, [ErrorType.CALCULATION]: 0, [ErrorType.SIGN]: 0,
        [ErrorType.CONCEPT]: 0, [ErrorType.COPY]: 0, [ErrorType.UNKNOWN]: 0,
      };
      
      updatedAttempts.forEach(attempt => {
        if (!attempt.isCorrect && attempt.errorCategories) {
           attempt.errorCategories.forEach(errType => {
              errorCounts[errType]++;
           });
        }
      });
      
      setFinalErrors(errorCounts);
      setIsExerciseComplete(true);
      setFeedback({ 
        isCorrect: true, 
        errorTypes: [], 
        feedback: `Prima uitgevoerd, ${studentName}! Bekijk de totale oefening hiernaast nog even.`, 
        feedUp: "Klaar!", feedForward: "Ga door.", tip: "", encouragement: "Top!" 
      });
    }
  };

  const handleContinue = () => {
    if (finalErrors) {
      onComplete(finalErrors);
    }
  };

  const handleFailure = (input: string, result: AIAnalysis, op?: string) => {
    setFeedback(result);
    onStepError(result.errorTypes);
    
    setAttempts(p => [...p, { 
      stepIndex: currentStepIndex, 
      userInput: input, 
      userOperation: op, 
      isCorrect: false, 
      errorCategories: result.errorTypes 
    }]);
  };

  const [prevLeft, prevRight] = splitEquation(getPreviousStepExpression());

  const historyAttempts = isExerciseComplete 
      ? attempts.filter(a => a.isCorrect) 
      : attempts.filter(a => a.isCorrect && a.stepIndex < currentStepIndex);

  return (
    <div className="w-full relative pb-10">
      {showScratchpad && <Scratchpad onClose={() => setShowScratchpad(false)} />}
      
      <AvatarCoach 
        message={isAnalyzing ? "Even denken..." : feedback?.feedback || (isExerciseComplete ? `Prima uitgevoerd, ${studentName}! Bekijk de totale oefening hiernaast nog even.` : (isEquationMode ? (hasExpectedOp ? "Eerst de bewerking aan de boogjes, dan de nieuwe balans!" : "Tijd voor een tussenstap. Werk de balans verder uit!") : "Wat is de volgende stap?"))} 
        type={isAnalyzing ? 'thinking' : feedback?.isCorrect === false ? 'error' : feedback ? 'success' : 'info'} 
        identifiedErrors={feedback?.errorTypes} // Doorgeven van gedetecteerde fouten
      />

      <div className="fixed top-24 right-6 flex flex-col gap-4 z-[30]">
         <button 
           onClick={() => setShowScratchpad(true)}
           className="w-14 h-14 bg-amber-400 text-amber-900 rounded-2xl shadow-xl flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95 cursor-pointer border-none"
           title="Kladblad openen"
         >
           <i className="fa-solid fa-note-sticky"></i>
         </button>
      </div>

      <div className={`bg-white/80 backdrop-blur-sm rounded-[2.5rem] border border-blue-100 card-shadow overflow-hidden transition-all ${interventionType ? 'opacity-10 grayscale blur-xl pointer-events-none' : ''}`}>
        <div className="p-6 md:p-10 space-y-6">
          
          <div className="bg-[#1a4d2e] text-white p-6 rounded-[2rem] border-[12px] border-amber-900 relative shadow-2xl overflow-x-auto overflow-y-hidden scroll-smooth">
             <div className="absolute top-2 left-4 text-[8px] font-black uppercase text-emerald-300/40">Opgave-bord</div>
             <div className="flex justify-center items-center gap-4 py-4 min-w-max px-4">
                {isEquationMode ? (
                  <>
                    <MathDisplay math={splitEquation(problem.expression)[0]} className="text-2xl font-black" />
                    <span className="text-emerald-400/50 text-2xl font-black">=</span>
                    <MathDisplay math={splitEquation(problem.expression)[1]} className="text-2xl font-black" />
                  </>
                ) : <MathDisplay math={problem.expression} className="text-3xl font-black" />}
             </div>
          </div>

          <div className="space-y-4">
            {historyAttempts.map((a, i) => (
              <div key={i} className="animate-in slide-in-from-top-2 duration-300 flex flex-col items-center">
                <div className="flex items-center gap-2 opacity-60 mb-1">
                     <i className="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
                     <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Correct</span>
                </div>
                {isEquationMode && a.userOperation && (
                   <div className="flex justify-center mb-1">
                      <div className="bg-purple-50 px-3 py-0.5 rounded-full text-[8px] font-black text-purple-400 border border-purple-100 opacity-60">
                        {a.userOperation}
                      </div>
                   </div>
                )}
                <div className="flex justify-center items-center gap-4 text-lg font-black text-emerald-600 opacity-70">
                  {isEquationMode ? (
                    <>
                      <MathDisplay math={splitEquation(a.userInput)[0]} />
                      <span className="opacity-30">=</span>
                      <MathDisplay math={splitEquation(a.userInput)[1]} />
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                       <span className="text-emerald-300 font-bold text-xl">=</span>
                       <MathDisplay math={a.userInput} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isExerciseComplete ? (
            currentStepIndex < problem.solution.length && (
              <div ref={currentStepRef} className="pt-6 border-t-2 border-blue-50 space-y-2 scroll-mt-20">
                
                {isEquationMode ? (
                  <div className="flex flex-col items-center">
                    
                    <div className="w-full max-w-4xl grid grid-cols-[1fr_auto_1fr] items-center gap-6 mb-2 relative group">
                      <div className="text-center bg-slate-50/50 py-3 rounded-2xl border border-slate-100 group-hover:border-blue-100 transition-colors">
                        <MathDisplay math={prevLeft} className="text-xl font-bold text-slate-500" />
                      </div>
                      <div className="text-slate-300 text-2xl font-black">=</div>
                      <div className="text-center bg-slate-50/50 py-3 rounded-2xl border border-slate-100 group-hover:border-blue-100 transition-colors">
                        <MathDisplay math={prevRight} className="text-xl font-bold text-slate-500" />
                      </div>
                    </div>

                    <div className="relative w-full max-w-4xl h-24 mb-2 flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full" overflow="visible">
                          <path 
                            d="M 220 5 Q 220 35 220 85" 
                            stroke="#a855f7" strokeWidth="3" fill="none" strokeDasharray="6 4" markerEnd="url(#arrow)" 
                            transform="translate(-140, 0)"
                          />
                          <path 
                            d="M 780 5 Q 780 35 780 85" 
                            stroke="#a855f7" strokeWidth="3" fill="none" strokeDasharray="6 4" markerEnd="url(#arrow)" 
                            transform="translate(-140, 0)"
                          />
                          <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
                            </marker>
                          </defs>
                      </svg>
                      
                      {hasExpectedOp ? (
                        <div className="z-10 relative">
                            <div className={`bg-white border-4 rounded-2xl shadow-lg w-40 h-14 flex items-center justify-center p-2 transition-all cursor-pointer ${activeInputRef === operationInputRef ? 'border-purple-500 ring-4 ring-purple-50' : 'border-purple-200'}`} onClick={() => { setActiveInputRef(operationInputRef); operationInputRef.current?.focus(); }}>
                              <MathInput ref={operationInputRef} value={userOperation} onChange={setUserOperation} disabled={isAnalyzing} onFocus={(ref) => setActiveInputRef({ current: ref })} onEnter={handleSubmitResult} />
                            </div>
                            <div className="text-center mt-1">
                              <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest bg-purple-50 rounded-full px-3 py-1 shadow-sm">Bewerking</span>
                            </div>
                        </div>
                      ) : (
                        <div className="z-10 bg-white/80 px-4 py-1 rounded-full border border-slate-100">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Tussenstap</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-6 max-w-4xl">
                      <div className={`bg-white border-4 rounded-[2rem] shadow-sm overflow-hidden transition-all cursor-pointer ${activeInputRef === leftInputRef ? 'border-blue-500 ring-4 ring-blue-50' : 'border-blue-100'}`} onClick={() => { setActiveInputRef(leftInputRef); leftInputRef.current?.focus(); }}>
                        <div className="px-4 py-1 bg-slate-50 border-b text-[8px] font-black text-slate-400 uppercase text-center">Nieuw Linkerlid</div>
                        <MathInput ref={leftInputRef} value={leftInput} onChange={setLeftInput} disabled={isAnalyzing} onFocus={(ref) => setActiveInputRef({ current: ref })} onEnter={handleSubmitResult} />
                      </div>
                      <div className="text-blue-600 text-3xl font-black">=</div>
                      <div className={`bg-white border-4 rounded-[2rem] shadow-sm overflow-hidden transition-all cursor-pointer ${activeInputRef === rightInputRef ? 'border-blue-500 ring-4 ring-blue-50' : 'border-blue-100'}`} onClick={() => { setActiveInputRef(rightInputRef); rightInputRef.current?.focus(); }}>
                         <div className="px-4 py-1 bg-slate-50 border-b text-[8px] font-black text-slate-400 uppercase text-center">Nieuw Rechterlid</div>
                        <MathInput ref={rightInputRef} value={rightInput} onChange={setRightInput} disabled={isAnalyzing} onFocus={(ref) => setActiveInputRef({ current: ref })} onEnter={handleSubmitResult} />
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-2">
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Volgende stap</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-black text-slate-300">=</div>
                      <div className={`flex-1 bg-white border-4 rounded-[2.5rem] shadow-xl p-2 transition-all cursor-text flex items-center ${activeInputRef === mathInputRef ? 'border-blue-500 ring-8 ring-blue-50' : 'border-blue-100'}`} onClick={() => { setActiveInputRef(mathInputRef); mathInputRef.current?.focus(); }}>
                        <div className="flex-1 px-4">
                          <MathInput ref={mathInputRef} value={userInput} onChange={setUserInput} disabled={isAnalyzing} onFocus={(ref) => setActiveInputRef({ current: ref })} onEnter={handleSubmitResult} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-6">
                   <MathToolbar inputRef={activeInputRef} moduleId={moduleId} className="bg-slate-50 p-2 rounded-2xl border border-slate-200" />
                   
                   <button 
                     onClick={handleSubmitResult} 
                     disabled={isAnalyzing}
                     className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all border-none cursor-pointer flex items-center gap-3 disabled:opacity-50 disabled:grayscale"
                   >
                     {isAnalyzing ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                     ) : (
                        <i className="fa-solid fa-check"></i>
                     )}
                     Controleer
                   </button>
                </div>
                
                <div className="md:hidden">
                   <VirtualKeyboard inputRef={activeInputRef} moduleId={moduleId} onEnter={handleSubmitResult} isAnalyzing={isAnalyzing} />
                </div>

              </div>
            )
          ) : (
             <div className="py-10 text-center animate-in zoom-in duration-500">
                <div className="inline-block p-6 bg-emerald-50 rounded-full mb-6">
                   <i className="fa-solid fa-flag-checkered text-4xl text-emerald-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Oefening Afgerond!</h3>
                <p className="text-slate-500 mb-8">Je hebt de eindstreep gehaald. Klaar voor de volgende?</p>
                <button onClick={handleContinue} className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all border-none cursor-pointer">
                   Volgende Oefening
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProblemSolver = memo(ProblemSolverComponent);
