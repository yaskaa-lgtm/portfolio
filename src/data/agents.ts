// Agents of the KIWIBYTE pipeline. Every field comes from D:/YouTube/README.md (pipeline table)
// and the Hermes profile configs (model per profile). Nothing here is invented.
export interface Agent {
  id: string;
  name: string;
  phase: string;
  role: string;
  model: string;
  out: string;
}

// Index 0 is the orchestrator (the pink core). Indices 1..6 follow the production order.
export const AGENTS: Agent[] = [
  {
    id: "tony",
    name: "Tony",
    phase: "Orchestrateur · phase 9",
    role: "Répartit le travail entre les agents, relit chaque phase et fait le contrôle final avant l'envoi en brouillon.",
    model: "Sonnet 5.5",
    out: "RAPPORT.md",
  },
  {
    id: "veille",
    name: "Veille",
    phase: "Phase 1 · Sujet",
    role: "Propose les sujets à partir de la veille quotidienne (GitHub, Hacker News, Hugging Face).",
    model: "Haiku 4.5",
    out: "01-sujets.md",
  },
  {
    id: "scenariste",
    name: "Scénariste",
    phase: "Phases 2-3 · Recherche + script",
    role: "Recherche le sujet, écrit le plan puis le script découpé en scènes. Le script passe le lint avant la voix.",
    model: "DeepSeek V4 Flash",
    out: "02-recherche.md, 03-plan.md, script.json",
  },
  {
    id: "narrateur",
    name: "Narrateur",
    phase: "Phase 4 · Voix off",
    role: "Produit la voix off de chaque scène avec VoiceStudio, en local, et mesure les durées.",
    model: "DeepSeek V4 Flash",
    out: "audio/, durations.json",
  },
  {
    id: "dev",
    name: "Développeur",
    phase: "Phases 5-6 · Scènes + rendu",
    role: "Écrit une scène HTML par entrée du script, calée sur la durée de l'audio, puis lance le rendu HyperFrames.",
    model: "Opus 5.5",
    out: "video.mp4",
  },
  {
    id: "artiste",
    name: "Artiste",
    phase: "Phase 7 · Miniature",
    role: "Crée deux miniatures à comparer, avec génération d'image.",
    model: "DeepSeek V4 Flash",
    out: "miniature-A.png, miniature-B.png",
  },
  {
    id: "referenceur",
    name: "Référenceur",
    phase: "Phase 8 · Titre / SEO",
    role: "Rédige le titre, la description et les mots-clés de la vidéo.",
    model: "Haiku 4.5",
    out: "publication.md",
  },
  {
    id: "scrapeur",
    name: "Scrapeur",
    phase: "Hors chaîne · sur demande",
    role: "Extrait des données de sites web et les livre en CSV ou Excel propres, sans rien inventer.",
    model: "DeepSeek V4 Flash",
    out: "CSV, Excel",
  },
];

// Scroll walk-through order: the life of one video, then the final check by the orchestrator.
export const WALK = [1, 2, 3, 4, 5, 6, 0];

// Graph edges (indices into AGENTS): orchestrator to everyone + the production chain.
export const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
  [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
];
