// src/grammar/grammarTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Core schema, progressive chapter definitions, sentence block roles, and
// local studied-progress persistence for the Grammar Dojo N5 curriculum.
// ─────────────────────────────────────────────────────────────────────────────

export type GrammarChapterId =
  | "ch1-identity"
  | "ch2-particles"
  | "ch3-actions"
  | "ch4-desires-rules"
  | "ch5-connectors";

export type GrammarRole =
  | "topic"
  | "context"
  | "particle"
  | "action"
  | "plain";

export interface GrammarChapterMeta {
  id: GrammarChapterId;
  number: string;
  title: string;
  japaneseTitle: string;
  subtitle: string;
  summary: string;
}

export interface GrammarSegment {
  text: string;
  romaji: string;
  role: GrammarRole;
}

export interface GrammarBlueprintBlock {
  label: string;
  sample: string;
  romaji?: string;
  role: GrammarRole;
}

export interface GrammarExample {
  japanese: string;
  reading: string;
  romaji: string;
  english: string;
  segments: GrammarSegment[];
}

export interface GrammarContrastSide {
  label: string;
  japanese: string;
  reading: string;
  romaji: string;
  english: string;
}

export interface GrammarContrastPair {
  title: string;
  left: GrammarContrastSide;
  right: GrammarContrastSide;
  takeaway: string;
}

export interface GrammarClozeItem {
  sentence: string;       // contains ＿＿＿
  sentenceRomaji: string; // contains ___
  english: string;
  blank: string;
  choices: [string, string, string, string];
  choiceRomaji: Record<string, string>;
  hint: string;
}

export interface GrammarTileSpec {
  text: string;
  romaji: string;
  role?: GrammarRole;
}

export interface GrammarTileItem {
  english: string;
  japanese: string;
  reading: string;
  romaji: string;
  /** Listed in canonical Japanese sentence order; shuffled when building a quiz question. */
  tiles: GrammarTileSpec[];
  /** Optional alternate valid Japanese tile-text orders (e.g. flexible time/place adverbs). */
  acceptedOrders?: string[][];
  hint: string;
}

export interface GrammarPattern {
  id: string;
  chapterId: GrammarChapterId;
  orderInChapter: number;
  pattern: string;
  reading: string;
  romaji: string;
  meaning: string;
  summary: string;
  structure: string;
  blueprint: GrammarBlueprintBlock[];
  examples: [GrammarExample, GrammarExample, GrammarExample, GrammarExample];
  contrast: GrammarContrastPair;
  tip: string;
  clozeItems: GrammarClozeItem[];
  tileItems: GrammarTileItem[];
}

export type PracticeScopeId = "all" | "studied" | GrammarChapterId;
export type PracticeFormatId = "mixed" | "cloze" | "tiles";

export const GRAMMAR_CHAPTERS: GrammarChapterMeta[] = [
  {
    id: "ch1-identity",
    number: "01",
    title: "Identity, Questions & Nouns",
    japaneseTitle: "名詞と基本文",
    subtitle: "Naming things, asking questions, and linking nouns",
    summary: "Start with 'A is B', polite negatives, yes/no questions, noun ownership, 'also', and pointing words.",
  },
  {
    id: "ch2-particles",
    number: "02",
    title: "Everyday Particles & Existence",
    japaneseTitle: "助詞と存在",
    subtitle: "Objects, destinations, places, companions, and there is/are",
    summary: "Attach small post-noun particles to show who, where, when, how, and whether things are living or inanimate.",
  },
  {
    id: "ch3-actions",
    number: "03",
    title: "Polite & Plain Verb Actions",
    japaneseTitle: "動詞と時制",
    subtitle: "Present, negative, past, ongoing states, requests, and invitations",
    summary: "Move smoothly between polite ます-forms and everyday plain forms, ongoing ～ている, requests, and 'let's'.",
  },
  {
    id: "ch4-desires-rules",
    number: "04",
    title: "Wants, Likes, Ability & Rules",
    japaneseTitle: "希望と許可",
    subtitle: "Expressing preferences, desires, permission, prohibition, and purpose",
    summary: "Talk about what you like, want to do, may do, must not do, and why you go somewhere.",
  },
  {
    id: "ch5-connectors",
    number: "05",
    title: "Reasons, Thoughts & Comparisons",
    japaneseTitle: "理由と比較",
    subtitle: "Joining clauses with because, but, I think, probably, and comparisons",
    summary: "Connect full ideas naturally with reasons, soft contrasts, personal opinions, conjecture, and comparisons.",
  },
];

export interface GrammarRoleStyleMeta {
  label: string;
  shortLabel: string;
  chipClass: string;
  segmentClass: string;
}

export const GRAMMAR_ROLE_META: Record<GrammarRole, GrammarRoleStyleMeta> = {
  topic: {
    label: "Topic / Subject",
    shortLabel: "Topic",
    chipClass: "bg-natural-charcoal/10 border-natural-charcoal/25 text-natural-charcoal",
    segmentClass: "bg-natural-charcoal/8 border-b-2 border-natural-charcoal/35 text-natural-charcoal",
  },
  context: {
    label: "Target / Context",
    shortLabel: "Target",
    chipClass: "bg-natural-sage/15 border-natural-sage/35 text-natural-forest-light",
    segmentClass: "bg-natural-sage/12 border-b-2 border-natural-sage/45 text-natural-charcoal",
  },
  particle: {
    label: "Particle / Glue",
    shortLabel: "Glue",
    chipClass: "bg-natural-clay/15 border-natural-clay/45 text-natural-clay",
    segmentClass: "bg-natural-clay/16 border-b-2 border-natural-clay text-natural-clay font-extrabold",
  },
  action: {
    label: "Action / Ending",
    shortLabel: "Ending",
    chipClass: "bg-natural-forest/15 border-natural-forest/45 text-natural-forest",
    segmentClass: "bg-natural-forest/14 border-b-2 border-natural-forest text-natural-forest font-extrabold",
  },
  plain: {
    label: "Modifier",
    shortLabel: "Word",
    chipClass: "bg-natural-bg/70 border-natural-border text-natural-charcoal/80",
    segmentClass: "text-natural-charcoal",
  },
};

export const STUDIED_GRAMMAR_STORAGE_KEY = "astra_grammar_studied_v1";

export function readStudiedPatternIds(): Set<string> {
  try {
    if (typeof localStorage === "undefined") return new Set();
    const raw = localStorage.getItem(STUDIED_GRAMMAR_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string" && item.length > 0));
  } catch {
    return new Set();
  }
}

export function writeStudiedPatternIds(ids: Iterable<string>): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STUDIED_GRAMMAR_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage quota or private-mode restrictions; in-memory state still updates.
  }
}
