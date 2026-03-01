import { ErrorType } from '../types';

interface FeedbackTemplate {
  feedback: string[];
  feedForward: string[];
  tip: string[];
  encouragement: string[];
}

// Standaardzinnen per fouttype
export const FEEDBACK_TEMPLATES: Record<ErrorType, FeedbackTemplate> = {
  [ErrorType.ORDER]: {
    feedback: [
      "De volgorde van bewerkingen klopt hier niet helemaal.",
      "Kijk goed naar welke bewerking voorrang heeft.",
      "Je hebt de bewerkingen in een andere volgorde gedaan dan afgesproken."
    ],
    feedForward: [
      "Denk aan het ezelsbruggetje: H-M-W-V-D-O-A.",
      "Zoek eerst naar haakjes, dan machten/wortels, dan vermenigvuldigen/delen.",
      "Wat moet er eerst gebeuren volgens de rekenregels?"
    ],
    tip: [
      "Eerst haakjes, dan machten/wortels, dan x/:, dan +/-.",
      "Schrijf de tussenstap op waarin je alleen de voorrangsbewerking uitrekent.",
      "Het Veulen Draaft Op en Af."
    ],
    encouragement: [
      "Volgorde is alles! Je komt er wel.",
      "Stap voor stap de regels volgen.",
      "Blijf rustig kijken, je kunt dit."
    ]
  },
  [ErrorType.CALCULATION]: {
    feedback: [
      "Er zit een rekenfoutje in deze stap.",
      "De uitkomst van de bewerking is niet juist.",
      "Je hebt de juiste stap gekozen, maar verkeerd uitgerekend."
    ],
    feedForward: [
      "Reken dit stukje nog eens rustig na.",
      "Controleer je tafels of je optelling.",
      "Probeer de berekening nog eens te maken."
    ],
    tip: [
      "Gebruik een kladblaadje als het uit het hoofd lastig is.",
      "Splits de getallen als dat helpt.",
      "Controleer of je goed geleend of onthouden hebt."
    ],
    encouragement: [
      "Een rekenfoutje kan de beste overkomen!",
      "Geen zorgen, gewoon even herrekenen.",
      "Je aanpak is goed, nu nog de afwerking."
    ]
  },
  [ErrorType.SIGN]: {
    feedback: [
      "Er is iets misgegaan met de plus- en mintekens.",
      "Let op: je hebt een tekenfout gemaakt.",
      "Kijk goed naar de negatieve getallen."
    ],
    feedForward: [
      "Wat gebeurt er als tekens botsen?",
      "Is het resultaat positief of negatief?",
      "Vergeet het minteken niet mee te nemen."
    ],
    tip: [
      "Min maal min is plus.",
      "Twee dezelfde tekens worden plus, twee verschillende worden min.",
      "Denk aan de regel: 'Botsende tekens'."
    ],
    encouragement: [
      "Tekenfouten zijn de meest gemaakte fouten, let goed op!",
      "Bijna goed, alleen het teken nog.",
      "Houd je hoofd koel bij die mintekens."
    ]
  },
  [ErrorType.CONCEPT]: {
    feedback: [
      "Je gebruikt hier een regel die niet helemaal klopt.",
      "Deze stap is wiskundig niet toegestaan.",
      "Je aanpak past niet bij dit type oefening."
    ],
    feedForward: [
      "Welke regel probeer je hier toe te passen?",
      "Kijk nog eens naar de theorie voor dit onderdeel.",
      "Is er een andere manier om dit op te lossen?"
    ],
    tip: [
      "Vraag jezelf af: mag ik dit zomaar doen?",
      "Bij vergelijkingen: wat je links doet, moet je rechts ook doen.",
      "Kijk naar een vergelijkbaar voorbeeld."
    ],
    encouragement: [
      "Soms moet je even een stap terug doen om het te zien.",
      "Van proberen leer je het meest.",
      "Denk even rustig na over de juiste methode."
    ]
  },
  [ErrorType.COPY]: {
    feedback: [
      "Je hebt de opgave of het getal verkeerd overgenomen.",
      "Kijk nog eens goed naar wat er stond.",
      "Er is een schrijffoutje ingeslopen."
    ],
    feedForward: [
      "Vergelijk jouw regel met de vorige regel.",
      "Staat er precies hetzelfde als daarboven?",
      "Check elk getal en teken even."
    ],
    tip: [
      "Wijs met je vinger aan wat je overschrijft.",
      "Neem de tijd, haast je niet.",
      "Precisie is belangrijk in de wiskunde."
    ],
    encouragement: [
      "Goed kijken is ook een kunst.",
      "Dit is makkelijk op te lossen!",
      "Even scherpstellen en je hebt hem."
    ]
  },
  [ErrorType.UNKNOWN]: {
    feedback: [
      "Er klopt iets niet, maar ik zie niet direct wat.",
      "Deze stap lijkt niet op de juiste weg.",
      "Kijk je antwoord nog eens goed na."
    ],
    feedForward: [
      "Probeer de stap opnieuw te doen.",
      "Begin even opnieuw vanaf de vorige regel.",
      "Wat zou de logische volgende stap zijn?"
    ],
    tip: [
      "Vraag eventueel hulp aan de leerkracht als je vastzit.",
      "Kijk naar de opgave: wat wordt er gevraagd?",
      "Neem een stapje terug."
    ],
    encouragement: [
      "Blijf proberen, je leert van elke poging.",
      "Geef niet op!",
      "Soms is het even zoeken."
    ]
  }
};

export const CORRECT_FEEDBACK = {
  feedUp: ["Lekker bezig!", "Goed zo!", "Prima stap!", "Juist!", "Correct."],
  feedback: ["Deze stap is helemaal goed.", "Je zit op de goede weg.", "Foutloos, ga zo door.", "Dit klopt precies."],
  feedForward: ["Op naar de volgende stap!", "Wat is de volgende zet?", "Doe zo verder.", "Kun je de volgende ook?"],
  tip: ["Blijf geconcentreerd.", "Hou dit tempo vast.", "Je hebt de smaak te pakken.", "Let goed op de details."],
  encouragement: ["Je bent een topper!", "Wiskunde kampioen in de dop.", "Gaat lekker!", "High five!"]
};

// Helper functie om een willekeurige zin te kiezen
const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function getFeedbackForError(errorType: ErrorType, context?: string): { feedback: string, feedForward: string, tip: string, encouragement: string } {
  const template = FEEDBACK_TEMPLATES[errorType] || FEEDBACK_TEMPLATES[ErrorType.UNKNOWN];
  
  let feedback = getRandom(template.feedback);
  // Als er context is (bv. "bij -3"), kunnen we die toevoegen, maar voor nu houden we het simpel en generiek zoals gevraagd.
  // Je zou hier logica kunnen toevoegen: if (context) feedback += ` (${context})`;
  
  return {
    feedback: feedback,
    feedForward: getRandom(template.feedForward),
    tip: getRandom(template.tip),
    encouragement: getRandom(template.encouragement)
  };
}

export function getCorrectFeedback(): { feedUp: string, feedback: string, feedForward: string, tip: string, encouragement: string } {
  return {
    feedUp: getRandom(CORRECT_FEEDBACK.feedUp),
    feedback: getRandom(CORRECT_FEEDBACK.feedback),
    feedForward: getRandom(CORRECT_FEEDBACK.feedForward),
    tip: getRandom(CORRECT_FEEDBACK.tip),
    encouragement: getRandom(CORRECT_FEEDBACK.encouragement)
  };
}

// Progressie Templates
export const PROGRESSION_TEMPLATES = {
  LEVEL_UP: {
    growthMessage: [
      "Gefeliciteerd! Je hebt een nieuw niveau bereikt! 🚀",
      "Wauw, je gaat als een speer! Niveau omhoog!",
      "Je hebt dit onderdeel onder de knie. Tijd voor een nieuwe uitdaging!",
      "Super gedaan! Je bent klaar voor de volgende stap."
    ],
    feedUp: ["Nieuw niveau bereikt!", "Level Up!", "Promotie!", "Uitstekend!"],
    feedback: ["Je hebt laten zien dat je de stof beheerst.", "Je foutenpercentage is laag genoeg.", "Je antwoorden waren consistent goed."],
    feedForward: ["Op naar het volgende niveau!", "De volgende oefeningen worden iets uitdagender.", "Blijf zo doorgaan."],
    tip: ["Blijf geconcentreerd, ook als het moeilijker wordt.", "Gebruik wat je geleerd hebt in de volgende stap.", "Vertrouw op je kunnen."],
    encouragement: ["Je bent een wiskunde-topper!", "Ga zo door!", "Trots op jou!", "Je groeit elke dag."]
  },
  STAY: {
    growthMessage: [
      "Je bent goed bezig, maar we oefenen nog even verder op dit niveau.",
      "Bijna klaar voor de volgende stap, nog een paar oefeningen om zeker te zijn.",
      "Je maakt nog af en toe een foutje, dus we blijven nog even hier.",
      "Oefening baart kunst. We gaan nog even door."
    ],
    feedUp: ["Nog even oefenen", "Bijna daar", "Volhouden", "Stap voor stap"],
    feedback: ["Je hebt al veel goed, maar soms sluipt er nog een foutje in.", "Je bent op de goede weg.", "Consistentie is belangrijk."],
    feedForward: ["Probeer de volgende reeks foutloos te maken.", "Let goed op de details.", "Neem je tijd voor elke stap."],
    tip: ["Kijk je antwoorden goed na voor je op enter drukt.", "Gebruik de regels die je kent.", "Haastige spoed is zelden goed."],
    encouragement: ["Je kunt het!", "Geef niet op, je bent er bijna.", "Elke fout is een leermoment.", "Blijf proberen!"]
  }
};

export function getProgressionFeedback(shouldLevelUp: boolean): { growthMessage: string, feedUp: string, feedback: string, feedForward: string, tip: string, encouragement: string } {
  const template = shouldLevelUp ? PROGRESSION_TEMPLATES.LEVEL_UP : PROGRESSION_TEMPLATES.STAY;
  
  return {
    growthMessage: getRandom(template.growthMessage),
    feedUp: getRandom(template.feedUp),
    feedback: getRandom(template.feedback),
    feedForward: getRandom(template.feedForward),
    tip: getRandom(template.tip),
    encouragement: getRandom(template.encouragement)
  };
}
