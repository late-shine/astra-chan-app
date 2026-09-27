/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UsageExample {
  japanese: string;
  romaji: string;
  english: string;
}

export interface HiraganaItem {
  kana: string;
  romaji: string;
  category: "basic" | "dakuon" | "handakuon" | "yoon";
  group: string; // e.g. "a-row", "ka-row"
  examples: UsageExample[];
}

export interface KatakanaItem {
  kana: string;
  romaji: string;
  category: "basic" | "dakuon" | "handakuon" | "yoon";
  group: string; // e.g. "a-row", "ka-row"
  examples: UsageExample[];
}

export interface KanjiWordEntry {
  word: string;              // e.g. "先生"
  reading: string;           // full word reading in hiragana, e.g. "せんせい"
  meaning: string;           // e.g. "teacher"
  kanjiReading: string;      // just the reading this kanji contributes, e.g. "せい"
  readingType: "onyomi" | "kunyomi" | "onyomi-variant" | "irregular";
  note?: string;              // optional — only include when it adds real value
  commonness: "common" | "moderate" | "rare";
}

export interface KanjiItem {
  kanji: string;
  meaning: string;
  onyomi: string;
  onyomiRomaji: string;
  kunyomi: string;
  kunyomiRomaji: string;
  mnemonic: string;
  strokeCount: number;
  examples: UsageExample[];
  kanjiWords?: KanjiWordEntry[];
  /** B1a: structured, additive replacement for onyomi/onyomiRomaji above. Optional — undefined for every existing entry until a later phase populates it. */
  onyomiRecords?: KanjiReadingRecord[];
  /** B1a: structured, additive replacement for kunyomi/kunyomiRomaji above. Same rollout plan as onyomiRecords. */
  kunyomiRecords?: KanjiReadingRecord[];
}

export interface VocabularyItem {
  word: string; // The kanji or Hiragana spelling, e.g., 昨日 or ご飯
  hiragana: string; // The pure Hiragana/furigana spelling, e.g., きのう or ごはん
  romaji: string; // Romaji phonetic interpretation, e.g. kinou
  english: string; // Translated meaning, e.g., Yesterday
  category: "greetings" | "time" | "places" | "food" | "people" | "actions" | "adjectives" | "objects" | "school" | "body" | "weather";
}

export interface SRSCard {
  level: number;        // 0 to 5
  nextReview: number;   // Unix timestamp ms (Date.now() format)
  type: "vocab" | "kanji" | "hiragana" | "katakana";
  itemKey: string;      // the word/kanji/kana string itself e.g. "食べる"
}

export interface ReadingMissRecord {
  dictKey: string;
  surface: string;
  reading: string;
  meaning: string;
  firstSeen: number;
  lastSeen: number;
  count: number;
}

export interface StudentStats {
  xp: number;
  streakCount: number;
  lastActiveDate: string | null; // ISO Date String
  correctCount: number;
  totalAttempts: number;
  masteredChars: string[]; // List of kana/kanji mastered
  characterProgress: Record<string, { correct: number; total: number }>;
  vocabularyProgress: Record<string, boolean>; // Maps word -> learned (true)
  favoriteCategory: string;
  srsCards: Record<string, SRSCard>;
  // Feature additions
  studyDates: string[];         // "YYYY-MM-DD" strings — one per day studied
  survivalBestScore: number;    // Highest survival mode score ever achieved
  srsReviewedTotal: number;     // Cumulative SRS cards reviewed across all sessions
  readingMisses?: ReadingMissRecord[]; // Vocabulary noticed during Reading Room sessions
}

// ============================================================================
// B1a — Structured reading & word-family schema (additive)
// ============================================================================
//
// These types are NEW and ADDITIVE. The current KanjiItem.onyomi/onyomiRomaji/
// kunyomi/kunyomiRomaji strings and the current KanjiWordEntry shape (both
// above) are UNCHANGED — nothing is removed or renamed. src/data.ts and
// src/kanjiWordFamilies.ts are untouched by this phase; no KanjiItem in the
// real data populates onyomiRecords/kunyomiRecords yet. See
// handoffs/phase-B1a.md for the full design rationale and the adapter API in
// src/kanjiReadingAdapter.ts.

/** Shared content-quality metadata, reused by both new record types below. */
export type ProofreadingStatus = "unverified" | "needs-review" | "reviewed";

export interface SourceInfo {
  /** Freeform provenance tag, e.g. "curated-v1", "dictionary-import", "ai-generated". */
  source: string;
  proofreadingStatus: ProofreadingStatus;
}

/**
 * One reading of ONE kanji (a single onyomi or kunyomi), replacing one
 * "、"/","-separated token out of the current onyomi/kunyomi + *Romaji
 * strings. Deliberately has no "irregular" type value — a jukujikun reading
 * isn't a single kanji's own reading, it's a whole-word phenomenon, modeled
 * instead on WordFamilyEntryV2.transformationType === "irregular".
 */
export interface KanjiReadingRecord extends SourceInfo {
  /** Exactly as taught, dash included when this reading carries okurigana — e.g. "み-る" or "ニチ". Round-trips to the legacy string as-is. */
  kana: string;
  /** Romaji for `kana` above, same dash convention — e.g. "mi-ru" or "nichi". */
  romaji: string;
  type: "onyomi" | "kunyomi";
  /** Convenience substring: the part of `kana` after the dash, dash removed — e.g. "る" for kana "み-る". Undefined when `kana` has no dash. Derived from `kana`, not separately authoritative. */
  okurigana?: string;
  /** Lower sorts first. 1 is the reading the current single onyomi/kunyomi display field would show. */
  priority: number;
  commonness: "common" | "moderate" | "rare";
  /** WordFamilyEntryV2.id values that use this exact reading. */
  exampleWordIds: string[];
  note?: string;
}

/**
 * How an observed word reading relates to the target kanji's own reading
 * records. "variant" is a deliberately honest catch-all: the current data's
 * single "onyomi-variant" bucket conflates real secondary onyomi (生's ショウ
 * vs セイ) with genuine rendaku/sound changes of a single reading (ショウ
 * voicing to じょう) — this schema can express the more specific categories,
 * but nothing should claim one of them without a human actually checking,
 * hence "variant" as the safe default the adapter produces (see
 * kanjiReadingAdapter.ts) until B1c reviews each of the 13 families by hand.
 */
export type ReadingTransformation =
  | "direct"       // used exactly as one of the kanji's own reading records, no change
  | "rendaku"      // predictable sequential voicing, e.g. しょう -> じょう
  | "sokuon"       // gemination / small っ before the next mora, e.g. にち -> にっ
  | "vowel-shift"  // other predictable phonological shift, e.g. にち -> に in 日本
  | "variant"      // a documented difference from the primary reading, not yet classified into one of the specific categories above
  | "irregular";   // jukujikun — no valid single-kanji base-reading decomposition exists

export interface WordFamilyEntryV2 extends SourceInfo {
  /** Stable, human-readable: "<kanji>-<word>", de-duplicated with a numeric suffix on collision. */
  id: string;
  word: string;
  reading: string;
  meaning: string;
  /** The exact substring of `reading` contributed by the target kanji, e.g. "じょう" for 誕生. */
  segment: string;
  /**
   * The target kanji's own dictionary reading this segment comes from, e.g. "ショウ".
   * Undefined only when transformationType is "irregular" — a jukujikun word has no
   * valid single-kanji base reading to report; never guess one.
   */
  baseReading?: string;
  /** What's actually heard for this kanji's segment in this word, e.g. "じょう". Equals `segment` in every case in this schema, kept as a separate field so consumers reasoning about sound changes don't need to know about the "segment extraction" framing, and vice versa. */
  observedReading: string;
  transformationType: ReadingTransformation;
  commonness: "common" | "moderate" | "rare";
  /** Loose on purpose — B4-B6 define the actual scale. */
  learnerLevel?: string;
  partOfSpeech?: string;
  /** Text to hand to speech synthesis, only when it needs to differ from `word`. */
  audioText?: string;
  note?: string;
}
