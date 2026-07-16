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
}

