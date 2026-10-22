/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Polish C2: kanji catalog search. Pure module: no React, no DOM, no storage, no dependency.
 * The Bookshelf kanji catalog uses it today; the Kanji Quiz picker or a later in-Scroll search
 * can reuse it unchanged.
 *
 * What it searches (existing fields only): kanji, meaning, onyomi, kunyomi, onyomiRomaji and
 * kunyomiRomaji. Not the mnemonic, stroke count, examples or word families (not identifiers,
 * and they would add noisy hits).
 *
 * How it matches
 * - Normalise with Unicode NFKC (turns the full-width and half-width forms an IME produces
 *   into plain ones), lower-case, then fold katakana to hiragana (a fixed code-point offset),
 *   on the query and on the data alike. So the onyomi katakana "スイ" is found by "スイ",
 *   "すい" and half-width "ｽｲ".
 * - Every field is cut into tokens at spaces, slashes, commas, the ideographic comma and other
 *   punctuation (meaning is slash-separated, readings are comma-separated). Hyphens and dots inside a
 *   token are dropped on both sides, so "hitotsu" matches the stored "hito-tsu".
 *   Dash-like characters include the en dash that the data uses as a "no kunyomi" placeholder
 *   (週, 茶, 肉, 族, 曜): it becomes an empty token and is thrown away, never searchable.
 * - Word-start matching: every query word must be the beginning of some token of some field.
 *   Fields are never joined into one string, so nothing matches across a field boundary,
 *   and one or two romaji letters do not hit dozens of unrelated kanji the way a plain
 *   substring search would.
 * - Ideographs in the query are pulled out as a set of characters (so a pasted word such as
 *   日本 finds both 日 and 本). A kanji must be in that set, and every remaining word must
 *   still match.
 *
 * Order: an exact character match first, then a meaning that starts with the first query
 * word, then the rest, each group in data order.
 *
 * The result is always a list of ORIGINAL indexes into the array that was searched, never
 * positions in the filtered list. Callers must use them to read the data and to open a card.
 */

import type { KanjiItem } from "./types";

/** The only fields the matcher reads. A full `KanjiItem` fits. */
export type SearchableKanji = Pick<
  KanjiItem,
  "kanji" | "meaning" | "onyomi" | "kunyomi" | "onyomiRomaji" | "kunyomiRomaji"
>;

// ─── normalisation ───────────────────────────────────────────────────────────

/** Katakana "ァ" to "ヶ" sit exactly 0x60 above their hiragana twins. The long-vowel mark "ー" is outside this range and stays as it is. */
const KATAKANA_FIRST = 0x30a1;
const KATAKANA_LAST = 0x30f6;
const KATAKANA_TO_HIRAGANA = 0x60;

/**
 * Token separators: whitespace, the ASCII punctuation (except the hyphen and the dot, which are
 * joiners below), a few typographic marks, and the common Japanese punctuation (ideographic
 * comma and full stop, brackets, wave dash, middle dot). So "water?", "(mizu)" and "水。" search
 * like "water", "mizu" and "水". Written with escapes only. Full-width forms are already plain
 * after NFKC.
 */
const SEPARATORS = /[\s\u0021-\u002c\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007e\u00b7\u2018-\u201f\u2022\u2026\u3001\u3002\u3008-\u3011\u3014-\u301f\u30fb]+/;

/** Hyphen, the dashes U+2010 to U+2015 (en dash and em dash included), minus sign, dot. Dropped inside tokens. */
const JOINERS = /[-\u2010-\u2015\u2212.]/g;

/** Han ideographs: unified, extension A, compatibility, plus the iteration and number marks. */
const HAN = /[\u3005\u3007\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

/** Katakana to hiragana. Everything else is returned unchanged. */
export function foldKana(text: string): string {
  let out = "";
  for (const ch of Array.from(text)) {
    const code = ch.charCodeAt(0);
    out += ch.length === 1 && code >= KATAKANA_FIRST && code <= KATAKANA_LAST
      ? String.fromCharCode(code - KATAKANA_TO_HIRAGANA)
      : ch;
  }
  return out;
}

/** NFKC, lower case, katakana folded to hiragana. The one normaliser for query and data. */
export function normalizeSearchText(text: string): string {
  return foldKana(String(text ?? "").normalize("NFKC").toLowerCase());
}

/** Tokens of already-normalised text: split, joiners removed, empties dropped. */
function tokenizeNormalized(normalized: string): string[] {
  return normalized
    .split(SEPARATORS)
    .map((token) => token.replace(JOINERS, ""))
    .filter((token) => token.length > 0);
}

// ─── index (built once per array) ────────────────────────────────────────────

interface IndexedKanji {
  /** Position in the searched array. This is what every result carries. */
  index: number;
  kanji: string;
  /** Tokens of meaning, onyomi, kunyomi and both romaji fields. */
  tokens: string[];
  /** The meaning split at slashes only ("to see / watch" gives "to see" and "watch"), for ranking. */
  meaningSegments: string[];
}

const indexCache = new WeakMap<readonly SearchableKanji[], IndexedKanji[]>();

function buildIndex(items: readonly SearchableKanji[]): IndexedKanji[] {
  return items.map((item, index) => {
    const meaning = normalizeSearchText(item.meaning);
    return {
      index,
      kanji: normalizeSearchText(item.kanji),
      tokens: [
        meaning,
        normalizeSearchText(item.onyomi),
        normalizeSearchText(item.kunyomi),
        normalizeSearchText(item.onyomiRomaji),
        normalizeSearchText(item.kunyomiRomaji),
      ].flatMap(tokenizeNormalized),
      meaningSegments: meaning
        .split("/")
        .map((segment) => segment.replace(JOINERS, "").split(/\s+/).filter(Boolean).join(" "))
        .filter((segment) => segment.length > 0),
    };
  });
}

function getIndex(items: readonly SearchableKanji[]): IndexedKanji[] {
  let index = indexCache.get(items);
  if (!index) {
    index = buildIndex(items);
    indexCache.set(items, index);
  }
  return index;
}

// ─── query ───────────────────────────────────────────────────────────────────

export interface ParsedKanjiQuery {
  /** Ideographs found in the query. A result kanji must be one of them. Empty when there are none. */
  chars: ReadonlySet<string>;
  /** Remaining words, normalised. Every one must start some token. */
  words: readonly string[];
}

/** Null when the text holds nothing searchable (empty, spaces, punctuation only). */
export function parseKanjiQuery(rawQuery: string): ParsedKanjiQuery | null {
  const normalized = normalizeSearchText(rawQuery);
  const chars = new Set<string>();
  let rest = "";
  for (const ch of Array.from(normalized)) {
    if (HAN.test(ch)) {
      chars.add(ch);
      rest += " ";
    } else {
      rest += ch;
    }
  }
  const words = tokenizeNormalized(rest);
  if (chars.size === 0 && words.length === 0) return null;
  return { chars, words };
}

/** True when the text would filter anything. Whitespace or punctuation alone shows every kanji. */
export function isKanjiQueryActive(rawQuery: string): boolean {
  return parseKanjiQuery(rawQuery) !== null;
}

// ─── search ──────────────────────────────────────────────────────────────────

/**
 * Ranked list of ORIGINAL indexes into `items`. With no searchable text it returns every index
 * in data order. Never throws, whatever the text.
 */
export function searchKanji(items: readonly SearchableKanji[], rawQuery: string): number[] {
  const index = getIndex(items);
  const query = parseKanjiQuery(rawQuery);
  if (!query) return index.map((entry) => entry.index);

  const exact: number[] = [];
  const meaningFirst: number[] = [];
  const rest: number[] = [];

  for (const entry of index) {
    if (query.chars.size > 0 && !query.chars.has(entry.kanji)) continue;
    if (!query.words.every((word) => entry.tokens.some((token) => token.startsWith(word)))) continue;

    if (query.chars.size > 0) {
      exact.push(entry.index);
    } else if (entry.meaningSegments.some((segment) => segment.startsWith(query.words[0]))) {
      meaningFirst.push(entry.index);
    } else {
      rest.push(entry.index);
    }
  }
  return [...exact, ...meaningFirst, ...rest];
}
