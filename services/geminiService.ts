
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis, ErrorType, SessionStats, DifficultyLevel, AIProgression, ModuleId, StudentResult, ClassAnalysis } from "../types";

// GLOBAL_COACHING_GUIDELINE is now passed dynamically from the AI Guide config.
// The content will be provided by the aiGuideContext parameter in each function.

const getApiKey = () => {
  try {
    return process.env.GEMINI_API_KEY || '';
  } catch (e) {
    return '';
  }
};

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
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Gemini API Key is missing!");
    throw new Error("Gemini API Key ontbreekt.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
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
      }
    });

    const text = response.text;
    if (!text) throw new Error("Geen tekst ontvangen van AI.");
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("AI Analysis Error details:", error);
    return { 
      isCorrect: false, 
      errorTypes: [ErrorType.UNKNOWN], 
      feedUp: "Oeps!", 
      feedback: "Meneer Priem kon je stap even niet goed lezen. Kijk je notatie na of probeer het opnieuw.", 
      feedForward: "Probeer de stap nog eens in te vullen.", 
      tip: "Gebruik de knoppen op het scherm.", 
      encouragement: "Zet door!" 
    };
  }
}

export async function evaluateProgression(stats: SessionStats, currentLevel: DifficultyLevel, moduleId: string, aiGuideContext: string): Promise<AIProgression> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Gemini API Key missing in evaluateProgression, skipping AI evaluation.");
    return { shouldLevelUp: false, newLevel: currentLevel, reasoning: "API Key missing", growthMessage: "Oeps", feedUp: "", feedback: "", feedForward: "", tip: "", encouragement: "" };
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Evalueer de sessie voor module ${moduleId}. Stats: ${JSON.stringify(stats)}. Huidig niveau: ${currentLevel}.`,
      config: { 
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
    });
    const text = response.text;
    if (!text) throw new Error("Geen tekst ontvangen.");
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
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key ontbreekt voor klassenanalyse.");
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const contents = `ANALYSEER DEZE VOLLEDIGE KLASRESULTATEN VOOR ${className}:
    ${JSON.stringify(results, null, 2)}
    
    Formaat: JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
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
      }
    });
    const text = response.text;
    if (!text) throw new Error("Geen tekst ontvangen.");
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
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Gemini API Key is missing in generateMathProblem!");
    throw new Error("Gemini API Key ontbreekt.");
  }
  const ai = new GoogleGenAI({ apiKey });

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
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
      }
    });

    const text = response.text;
    if (!text) throw new Error("Geen tekst ontvangen.");
    console.log("Gemini response text (generateMathProblem):", text);
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}
