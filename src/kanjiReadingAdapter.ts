/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * B1a compatibility adapter — bridges the CURRENT flat onyomi/kunyomi strings
 * and KanjiWordEntry shape to the NEW structured KanjiReadingRecord /
 * WordFamilyEntryV2 shapes from src/types.ts, in both directions.
 *
 * This module does not read or write any real data — src/data.ts and
 * src/kanjiWordFamilies.ts are untouched by B1a. It exists so B1c (real
 * migration of the 13 curated families) and every later phase reuse the same
 * parsing/derivation logic instead of each reimplementing it.
 *
 * See handoffs/phase-B1a.md for the full design rationale.
 */

import type {
  KanjiReadingRecord,
  WordFamilyEntryV2,
  KanjiWordEntry,
  ReadingTransformation,
} from "./types";

// ---------------------------------------------------------------------------
// Kana helpers
// ---------------------------------------------------------------------------

/** Converts katakana (U+30A1-U+30F6) to hiragana; anything else passes through unchanged. */
export function katakanaToHiragana(input: string): string {
  return input.replace(/[\u30A1-\u30F6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** The part of a reading token before its okurigana dash, or the whole token if there's no dash. */
function stemOf(token: string): string {
  const dashIndex = token.indexOf("-");
  return dashIndex === -1 ? token : token.slice(0, dashIndex);
}

/** The part after the dash (dash removed), or undefined if there's no dash. */
function okuriganaOf(token: string): string | undefined {
  const dashIndex = token.indexOf("-");
  return dashIndex === -1 ? undefined : token.slice(dashIndex + 1);
}

// ---------------------------------------------------------------------------
// KanjiReadingRecord <-> legacy onyomi/kunyomi strings
// ---------------------------------------------------------------------------

export interface ParseReadingStringOptions {
  source: string;
  proofreadingStatus: KanjiReadingRecord["proofreadingStatus"];
  commonness?: KanjiReadingRecord["commonness"];
}

/**
 * OLD -> NEW. Splits one legacy `onyomi`/`kunyomi` + matching `*Romaji`
 * string pair into structured records, one per "、"-separated (kana) /
 * ","-separated (romaji) token, paired positionally by index. If the two
 * strings have mismatched token counts (a real data problem B1b's audit is
 * built to catch, not this adapter's job to fix), the shorter side is padded
 * with "" rather than throwing — this never crashes on messy legacy data.
 */
export function parseReadingRecords(
  kanaString: string,
  romajiString: string,
  type: "onyomi" | "kunyomi",
  options: ParseReadingStringOptions,
): KanjiReadingRecord[] {
  const kanaTokens = kanaString.split("、").map((s) => s.trim()).filter((s) => s.length > 0);
  const romajiTokens = romajiString.split(",").map((s) => s.trim());

  return kanaTokens.map((kana, i) => ({
    kana,
    romaji: romajiTokens[i] ?? "",
    type,
    okurigana: okuriganaOf(kana),
    priority: i + 1,
    commonness: options.commonness ?? "common",
    exampleWordIds: [],
    source: options.source,
    proofreadingStatus: options.proofreadingStatus,
  }));
}

/**
 * NEW -> OLD. Reconstructs the legacy kana/romaji string pair from structured
 * records, sorted by `priority`. Round-trips exactly for any record set that
 * `parseReadingRecords` produced from a well-formed legacy string (same
 * separators, same token order).
 */
export function deriveReadingStrings(records: KanjiReadingRecord[]): { kana: string; romaji: string } {
  const sorted = [...records].sort((a, b) => a.priority - b.priority);
  return {
    kana: sorted.map((r) => r.kana).join("、"),
    romaji: sorted.map((r) => r.romaji).join(", "),
  };
}

// ---------------------------------------------------------------------------
// WordFamilyEntryV2 <-> legacy KanjiWordEntry
// ---------------------------------------------------------------------------

const READING_TYPE_TO_TRANSFORMATION: Record<KanjiWordEntry["readingType"], ReadingTransformation> = {
  onyomi: "direct",
  kunyomi: "direct",
  "onyomi-variant": "variant",
  irregular: "irregular",
};

export interface ConvertWordEntryOptions {
  source: string;
  proofreadingStatus: WordFamilyEntryV2["proofreadingStatus"];
  /** IDs already used for this kanji's family, so generated IDs stay unique across a whole-family conversion. Mutated in place — pass the same Set across every entry in one family. */
  usedIds?: Set<string>;
}

/**
 * OLD -> NEW. Faithful field-for-field mapping, plus a best-effort default
 * for the two fields the old shape never captured:
 *  - `transformationType` comes from `readingType` via the table above.
 *  - `baseReading` defaults to the same string as `segment`/`observedReading`
 *    (i.e. "no transformation") for every entry EXCEPT "irregular" ones,
 *    where it's left undefined — a jukujikun word has no valid single-kanji
 *    base reading to report. For "onyomi-variant" entries specifically, this
 *    default is almost certainly wrong (the old schema's freeform notes
 *    usually describe a real underlying reading, e.g. 生's ショウ for 誕生's
 *    じょう) — that's exactly why the caller-supplied `proofreadingStatus`
 *    matters: B1c should pass "needs-review" here and hand-correct
 *    `baseReading`/`transformationType` per family member rather than trust
 *    this default.
 */
export function convertWordEntryToV2(
  entry: KanjiWordEntry,
  targetKanji: string,
  options: ConvertWordEntryOptions,
): WordFamilyEntryV2 {
  const usedIds = options.usedIds ?? new Set<string>();
  let id = `${targetKanji}-${entry.word}`;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${targetKanji}-${entry.word}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);

  const transformationType = READING_TYPE_TO_TRANSFORMATION[entry.readingType];

  return {
    id,
    word: entry.word,
    reading: entry.reading,
    meaning: entry.meaning,
    segment: entry.kanjiReading,
    baseReading: transformationType === "irregular" ? undefined : entry.kanjiReading,
    observedReading: entry.kanjiReading,
    transformationType,
    commonness: entry.commonness,
    note: entry.note,
    source: options.source,
    proofreadingStatus: options.proofreadingStatus,
  };
}

const TRANSFORMATION_TO_READING_TYPE_FALLBACK: KanjiWordEntry["readingType"] = "onyomi-variant";

/**
 * NEW -> OLD. `kanjiReadingRecords` should be the TARGET KANJI's own
 * onyomi/kunyomi records (e.g. KanjiItem.onyomiRecords/kunyomiRecords) so a
 * "direct" entry can be correctly mapped back to "onyomi" vs "kunyomi" —
 * matched against each record's STEM (okurigana stripped) after katakana ->
 * hiragana normalization, since onyomi is conventionally katakana in the
 * kanji's own reading but hiragana wherever it's actually used inside a
 * word. If no match is found (or records aren't supplied), defaults to
 * "onyomi" — every non-kunyomi, non-variant, non-irregular entry in the
 * current 13 families is in fact onyomi, so this default never actually
 * fires against real data today; flagged here in case a future phase adds a
 * kunyomi-based "direct" entry.
 */
export function deriveWordEntryFromV2(
  entryV2: WordFamilyEntryV2,
  kanjiReadingRecords?: { onyomi: KanjiReadingRecord[]; kunyomi: KanjiReadingRecord[] },
): KanjiWordEntry {
  let readingType: KanjiWordEntry["readingType"];

  if (entryV2.transformationType === "irregular") {
    readingType = "irregular";
  } else if (entryV2.transformationType === "direct") {
    const target = katakanaToHiragana(entryV2.baseReading ?? entryV2.observedReading);
    const isKunyomi = kanjiReadingRecords?.kunyomi.some(
      (r) => katakanaToHiragana(stemOf(r.kana)) === target,
    );
    readingType = isKunyomi ? "kunyomi" : "onyomi";
  } else {
    readingType = TRANSFORMATION_TO_READING_TYPE_FALLBACK;
  }

  return {
    word: entryV2.word,
    reading: entryV2.reading,
    meaning: entryV2.meaning,
    kanjiReading: entryV2.segment,
    readingType,
    note: entryV2.note,
    commonness: entryV2.commonness,
  };
}
