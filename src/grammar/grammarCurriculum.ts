// src/grammar/grammarCurriculum.ts
// ─────────────────────────────────────────────────────────────────────────────
// Unified N5 Grammar Curriculum (28 patterns across 5 progressive chapters),
// search & navigation helpers, and pure Practice Arena session builders.
// ─────────────────────────────────────────────────────────────────────────────

import {
  GRAMMAR_CHAPTERS,
  type GrammarChapterId,
  type GrammarChapterMeta,
  type GrammarClozeItem,
  type GrammarPattern,
  type GrammarRole,
  type GrammarTileItem,
  type PracticeFormatId,
  type PracticeScopeId,
} from "./grammarTypes";
import { GRAMMAR_PATTERNS_FOUNDATIONS } from "./grammarDataFoundations";
import { GRAMMAR_PATTERNS_ACTIONS_AND_RULES } from "./grammarDataActions";
import { GRAMMAR_PATTERNS_CONNECTORS } from "./grammarDataConnectors";

export const GRAMMAR_PATTERNS: GrammarPattern[] = [
  ...GRAMMAR_PATTERNS_FOUNDATIONS,
  ...GRAMMAR_PATTERNS_ACTIONS_AND_RULES,
  ...GRAMMAR_PATTERNS_CONNECTORS,
];

export const GRAMMAR_PATTERN_BY_ID: Record<string, GrammarPattern> = Object.fromEntries(
  GRAMMAR_PATTERNS.map((pattern) => [pattern.id, pattern])
);

export const GRAMMAR_CHAPTER_BY_ID: Record<GrammarChapterId, GrammarChapterMeta> = Object.fromEntries(
  GRAMMAR_CHAPTERS.map((chapter) => [chapter.id, chapter])
) as Record<GrammarChapterId, GrammarChapterMeta>;

export function getPatternsByChapter(chapterId: GrammarChapterId): GrammarPattern[] {
  return GRAMMAR_PATTERNS.filter((pattern) => pattern.chapterId === chapterId);
}

export function filterGrammarPatterns(query: string): GrammarPattern[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return GRAMMAR_PATTERNS;

  return GRAMMAR_PATTERNS.filter((p) => {
    const chapter = GRAMMAR_CHAPTER_BY_ID[p.chapterId];
    const haystack = [
      p.pattern,
      p.reading,
      p.romaji,
      p.meaning,
      p.summary,
      p.structure,
      chapter?.title ?? "",
      p.contrast.title,
      ...p.examples.flatMap((ex) => [ex.japanese, ex.reading, ex.romaji, ex.english]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function getAdjacentPatterns(patternId: string): {
  prev: GrammarPattern | null;
  next: GrammarPattern | null;
  index: number;
} {
  const idx = GRAMMAR_PATTERNS.findIndex((p) => p.id === patternId);
  if (idx === -1) {
    return { prev: null, next: null, index: 0 };
  }
  return {
    prev: idx > 0 ? GRAMMAR_PATTERNS[idx - 1] : null,
    next: idx + 1 < GRAMMAR_PATTERNS.length ? GRAMMAR_PATTERNS[idx + 1] : null,
    index: idx,
  };
}

// ─── Practice Session Types & Pure Builders ───────────────────────────────────

export interface ShuffledTileInstance {
  instanceId: string;
  text: string;
  romaji: string;
  role?: GrammarRole;
}

export interface PracticeClozeQuestion {
  kind: "cloze";
  id: string;
  patternId: string;
  patternLabel: string;
  chapterNumber: string;
  sentence: string;
  sentenceRomaji: string;
  english: string;
  blank: string;
  choices: string[];
  choiceRomaji: Record<string, string>;
  hint: string;
}

export interface PracticeTileQuestion {
  kind: "tiles";
  id: string;
  patternId: string;
  patternLabel: string;
  chapterNumber: string;
  english: string;
  japanese: string;
  reading: string;
  romaji: string;
  bankTiles: ShuffledTileInstance[];
  acceptedOrders: string[][];
  hint: string;
}

export type PracticeQuestion = PracticeClozeQuestion | PracticeTileQuestion;

function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function matchesAnyAcceptedOrder(candidate: string[], acceptedOrders: string[][]): boolean {
  return acceptedOrders.some(
    (order) => order.length === candidate.length && order.every((token, idx) => token === candidate[idx])
  );
}

function createTileQuestion(
  pattern: GrammarPattern,
  item: GrammarTileItem,
  itemIndex: number
): PracticeTileQuestion {
  const chapter = GRAMMAR_CHAPTER_BY_ID[pattern.chapterId];
  const canonicalOrder = item.tiles.map((t) => t.text);
  const acceptedOrders = item.acceptedOrders && item.acceptedOrders.length > 0
    ? item.acceptedOrders
    : [canonicalOrder];

  const baseInstances: ShuffledTileInstance[] = item.tiles.map((t, idx) => ({
    instanceId: `${pattern.id}-tile-${itemIndex}-${idx}`,
    text: t.text,
    romaji: t.romaji,
    role: t.role,
  }));

  let bankTiles = shuffleArray(baseInstances);
  if (
    bankTiles.length > 1 &&
    matchesAnyAcceptedOrder(
      bankTiles.map((t) => t.text),
      acceptedOrders
    )
  ) {
    // Rotate by 1 so the learner never receives an already-solved tile tray
    bankTiles = [...bankTiles.slice(1), bankTiles[0]];
  }

  return {
    kind: "tiles",
    id: `${pattern.id}-tiles-${itemIndex}`,
    patternId: pattern.id,
    patternLabel: pattern.pattern,
    chapterNumber: chapter?.number ?? "01",
    english: item.english,
    japanese: item.japanese,
    reading: item.reading,
    romaji: item.romaji,
    bankTiles,
    acceptedOrders,
    hint: item.hint,
  };
}

function createClozeQuestion(
  pattern: GrammarPattern,
  item: GrammarClozeItem,
  itemIndex: number
): PracticeClozeQuestion {
  const chapter = GRAMMAR_CHAPTER_BY_ID[pattern.chapterId];
  return {
    kind: "cloze",
    id: `${pattern.id}-cloze-${itemIndex}`,
    patternId: pattern.id,
    patternLabel: pattern.pattern,
    chapterNumber: chapter?.number ?? "01",
    sentence: item.sentence,
    sentenceRomaji: item.sentenceRomaji,
    english: item.english,
    blank: item.blank,
    choices: shuffleArray(item.choices),
    choiceRomaji: item.choiceRomaji,
    hint: item.hint,
  };
}

export function resolvePracticeScopePatterns(
  scope: PracticeScopeId,
  studiedIds: ReadonlySet<string>
): { patterns: GrammarPattern[]; scopeLabel: string } {
  if (scope === "all") {
    return { patterns: GRAMMAR_PATTERNS, scopeLabel: "All N5 Chapters (28 Patterns)" };
  }
  if (scope === "studied") {
    const studied = GRAMMAR_PATTERNS.filter((p) => studiedIds.has(p.id));
    return {
      patterns: studied,
      scopeLabel: `Studied Patterns (${studied.length})`,
    };
  }
  const chapter = GRAMMAR_CHAPTER_BY_ID[scope];
  const chapterPatterns = getPatternsByChapter(scope);
  return {
    patterns: chapterPatterns,
    scopeLabel: chapter
      ? `Chapter ${chapter.number}: ${chapter.title}`
      : "Selected Chapter",
  };
}

export function buildPracticeSession(options: {
  scope: PracticeScopeId;
  format: PracticeFormatId;
  studiedIds: ReadonlySet<string>;
  singlePatternId?: string | null;
  maxQuestions?: number;
}): PracticeQuestion[] {
  const { scope, format, studiedIds, singlePatternId = null, maxQuestions = 10 } = options;

  const targetPatterns = singlePatternId && GRAMMAR_PATTERN_BY_ID[singlePatternId]
    ? [GRAMMAR_PATTERN_BY_ID[singlePatternId]]
    : resolvePracticeScopePatterns(scope, studiedIds).patterns;

  if (targetPatterns.length === 0) return [];

  const clozePool: PracticeClozeQuestion[] = [];
  const tilePool: PracticeTileQuestion[] = [];

  for (const pattern of targetPatterns) {
    if (format === "mixed" || format === "cloze") {
      pattern.clozeItems.forEach((item, idx) => {
        clozePool.push(createClozeQuestion(pattern, item, idx));
      });
    }
    if (format === "mixed" || format === "tiles") {
      pattern.tileItems.forEach((item, idx) => {
        tilePool.push(createTileQuestion(pattern, item, idx));
      });
    }
  }

  if (format === "cloze") {
    return shuffleArray(clozePool).slice(0, maxQuestions);
  }
  if (format === "tiles") {
    return shuffleArray(tilePool).slice(0, maxQuestions);
  }

  // Mixed mode: interleave shuffled cloze and tile questions ~50/50 for lively pacing
  const shuffledCloze = shuffleArray(clozePool);
  const shuffledTiles = shuffleArray(tilePool);
  const half = Math.ceil(maxQuestions / 2);
  const pickedCloze = shuffledCloze.slice(0, half);
  const pickedTiles = shuffledTiles.slice(0, maxQuestions - pickedCloze.length);

  return shuffleArray<PracticeQuestion>([...pickedCloze, ...pickedTiles]).slice(0, maxQuestions);
}

export function isTileSubmissionCorrect(
  question: PracticeTileQuestion,
  placedTiles: readonly ShuffledTileInstance[]
): boolean {
  const candidate = placedTiles.map((t) => t.text);
  return matchesAnyAcceptedOrder(candidate, question.acceptedOrders);
}
