
import { Type } from "@google/genai";
import { AIAnalysis, ErrorType, SessionStats, DifficultyLevel, AIProgression, ModuleId, StudentResult, ClassAnalysis } from "../types";

// GLOBAL_COACHING_GUIDELINE is now passed dynamically from the AI Guide config.
// The content will be provided by the aiGuideContext parameter in each function.

async function callGeminiProxy(contents: string, config: any, model = "gemini-2.5-flash"): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, config, model })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API call failed with status: ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.text) throw new Error("No text received from AI.");
  return data.text;
}

export async function analyzeMathStep(
  expression: string,
  previousStep: string,
  userInput: string,
  expectedStep: string,
  moduleId: string,
  userOperation: string | undefined,
  expectedOperation: string | undefined,
  aiGuideContext: string,
  attemptCount: number = 0
): Promise<AIAnalysis> {
  try {
    const prompt = `
      Analyseer deze wiskunde stap voor module: ${moduleId}.
      Opgave: ${expression}
      Vorige stap: ${previousStep}
      Invoer van leerling: ${userInput}
      Verwachte stap: ${expectedStep}
      ${userOperation ? `Ingevoerde bewerking: ${userOperation}` : ''}
      ${expectedOperation ? `Verwachte bewerking: ${expectedOperation}` : ''}
      
      CONTEXT:
      Dit is fout-poging nummer: ${attemptCount + 1} voor deze specifieke stap.
      (Poging 1 = eerste keer dat de leerling deze stap fout doet).

      INSTRUCTIES:
      - Analyseer de rekenkundige juistheid, volgorde van bewerkingen, tekens (+/-), en slordigheden.
      - Bij vergelijkingen: controleer de balans aan beide kanten.
      - Bepaal ALLE types fouten uit de lijst: ${Object.values(ErrorType).join(', ')}.
    `;

    const text = await callGeminiProxy(prompt, {
        systemInstruction: `
          ${aiGuideContext || "Je bent een didactische wiskunde coach."} 
          
          BELANGRIJK:
          Volg de "DIDACTISCHE AANPAK" uit de bovenstaande gids strikt op basis van het pogingnummer:
          - Poging 1: Pas "STAP 0" toe (subtiel, zelf laten controleren, geen tips).
          - Poging 2 of meer: Pas "STAP 1" toe (Socratische methode, gerichte vragen).
          
          HOU DE FEEDBACK ZEER KORT: MAXIMAAL 30 WOORDEN.
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            errorTypes: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING, enum: Object.values(ErrorType) },
              description: "Lijst van ALLE gedetecteerde fouten in deze ene stap."
            },
            feedUp: { type: Type.STRING },
            feedback: { type: Type.STRING },
            feedForward: { type: Type.STRING },
            tip: { type: Type.STRING },
            encouragement: { type: Type.STRING }
          },
          required: ["isCorrect", "errorTypes", "feedUp", "feedback", "feedForward", "tip", "encouragement"]
        }
    });

    return JSON.parse(text.trim());
  } catch (error: any) {
    console.error("AI Analysis Error details:", error);
    
    // Check if the error is about a missing API key on Vercel
    const errorMsg = error.message || "";
    if (errorMsg.includes("GEMINI_API_KEY") || errorMsg.includes("Missing")) {
        return {
            isCorrect: false,
            errorTypes: [ErrorType.UNKNOWN],
            feedUp: "Configuratiefout!",
            feedback: "De GEMINI_API_KEY ontbreekt in Vercel. Voeg deze toe in de Vercel Settings onder Environment Variables.",
            feedForward: "Herstart de Vercel deployment daarna.",
            tip: "Controleer Vercel instellingen.",
            encouragement: ""
        };
    }

    return { 
      isCorrect: false, 
      errorTypes: [ErrorType.UNKNOWN], 
      feedUp: "Systeemfout of timeout", 
      feedback: `Meneer Priem kon je stap even niet goed lezen. (Foutmelding: ${errorMsg}). Kijk je notatie na of probeer het later opnieuw.`, 
      feedForward: "Probeer de stap nog eens in te vullen.", 
      tip: "Verwittig je leerkracht als dit blijft optreden.", 
      encouragement: "Zet door!" 
    };
  }
}

export async function evaluateProgression(stats: SessionStats, currentLevel: DifficultyLevel, moduleId: string, aiGuideContext: string): Promise<AIProgression> {
  try {
    const text = await callGeminiProxy(
      `Evalueer de sessie voor module ${moduleId}. Stats: ${JSON.stringify(stats)}. Huidig niveau: ${currentLevel}.`,
      { 
        systemInstruction: aiGuideContext,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shouldLevelUp: { type: Type.BOOLEAN },
            newLevel: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            growthMessage: { type: Type.STRING },
            feedUp: { type: Type.STRING },
            feedback: { type: Type.STRING },
            feedForward: { type: Type.STRING },
            tip: { type: Type.STRING },
            encouragement: { type: Type.STRING }
          },
          required: ["shouldLevelUp", "newLevel", "reasoning", "growthMessage", "feedUp", "feedback", "feedForward", "tip", "encouragement"]
        }
      }
    );
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Progression Evaluation Error:", e);
    return {
      shouldLevelUp: false,
      newLevel: currentLevel,
      reasoning: "Fout bij AI evaluatie.",
      growthMessage: "Goed gewerkt!",
      feedUp: "Blijf oefenen.",
      feedback: "Je bent goed bezig.",
      feedForward: "Volgende keer weer!",
      tip: "",
      encouragement: "Zet door!"
    };
  }
}

export async function analyzeClassPerformance(
  className: string,
  results: StudentResult[],
  aiGuideContext: string
): Promise<ClassAnalysis> {
  try {
    const contents = `ANALYSEER DEZE VOLLEDIGE KLASRESULTATEN VOOR ${className}:
    ${JSON.stringify(results, null, 2)}
    
    Formaat: JSON.`;

    const text = await callGeminiProxy(contents, {
        systemInstruction: aiGuideContext,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            crossModularTrends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ["high", "medium", "low"] }
                },
                required: ["title", "description", "impact"]
              }
            },
            moduleAnalyses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  moduleId: { type: Type.STRING },
                  moduleDisplayName: { type: Type.STRING },
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                  didacticAdvice: { type: Type.STRING }
                },
                required: ["moduleId", "moduleDisplayName", "strengths", "weaknesses", "didacticAdvice"]
              }
            }
          },
          required: ["summary", "crossModularTrends", "moduleAnalyses"]
        }
    });
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Class Analysis Error:", error);
    return {
      summary: "Er is onvoldoende data of de analyse kon niet worden voltooid.",
      crossModularTrends: [],
      moduleAnalyses: []
    };
  }
}

export async function generateMathProblem(
  moduleId: string,
  level: DifficultyLevel,
  aiGuideContext: string
): Promise<{ expression: string; steps: { content: string; operation?: string }[] }> {
  const isEquation = moduleId.startsWith('vergelijkingen');

  try {
    const prompt = `
      Je bent een wiskunde content generator.
      Genereer EEN wiskunde oefening voor module: '${moduleId}' op niveau ${level} (1=makkelijk, 2=gemiddeld, 3=moeilijk).
      ${isEquation ? 'Het is een vergelijking. Geef stappen en de bewerking (balansmethode) die uitgevoerd wordt aan de zijkant.' : 'Het is een expressie om uit te rekenen (volgorde bewerkingen/hoofdbewerkingen).'}

      Regels:
      - Gebruik LaTeX notatie waar nodig (maar simpel houden).
      - Gebruik een punt '.' voor vermenigvuldigen, geen 'x'.
      - Niveau 1: Basis, kleine getallen, max 1 of 2 stappen.
      - Niveau 2: Gemiddeld, haakjes of negatieve getallen.
      - Niveau 3: Uitdagender, meer stappen, complexere getallen.

      Format: JSON
      {
        "expression": "${isEquation ? '3x + 5 = 11' : '5 + 3 \\cdot 2'}",
        "steps": [
           { "content": "${isEquation ? '3x = 6' : '5 + 6'}", "operation": "${isEquation ? '-5' : ''}" },
           ... (rest van de stappen tot oplossing)
        ]
      }
    `;

    const text = await callGeminiProxy(prompt, {
        systemInstruction: aiGuideContext,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            expression: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.STRING },
                  operation: { type: Type.STRING }
                },
                required: ["content"]
              }
            }
          },
          required: ["expression", "steps"]
        }
    });

    console.log("Gemini response text (generateMathProblem):", text);
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}
