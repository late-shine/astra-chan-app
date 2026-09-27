/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * B1c — the 13 curated families (64 words), migrated from the legacy
 * `src/kanjiWordFamilies.ts` into the structured B1a schema
 * (`KanjiReadingRecord` / `WordFamilyEntryV2` in `src/types.ts`).
 *
 * This file is pure data (no logic) — mirrors the existing style of
 * `src/kanjiWordFamilies.ts`. `src/kanjiWordFamilies.ts` itself is
 * UNTOUCHED; this is a new, parallel store. `src/data.ts` is also untouched
 * — it is not in B1c's read/write scope, so nothing here edits it, even
 * where a gap below is functionally a data.ts bug (see "Visible fixes"
 * below). Any component wanting the migrated view of one of these 13 kanji
 * should read it from here, through `src/kanjiReadingAdapter.ts`'s
 * `deriveWordEntryFromV2`/`deriveReadingStrings` — not by hand-parsing
 * these arrays.
 *
 * ── The `source` convention on every KanjiReadingRecord below ──────────────
 * "legacy-declared" — a reading that IS (or, for the 4 documented gap-fixes
 *   below, SHOULD BE) part of data.ts's own top-level onyomi/kunyomi string
 *   for this kanji. These are the readings a learner already sees in the
 *   On/Kun rows today. Safe to surface in any UI that shows "the readings
 *   of this kanji."
 * "word-family-derived" — a real, correct secondary/tertiary onyomi that
 *   is NOT part of data.ts's top-level onyomi string, discovered only
 *   because a curated word-family entry uses it (e.g. 生's ショウ, seen in
 *   誕生/一生, vs. the single セイ that data.ts declares). These exist
 *   *solely* so the word-family entries below can carry an honest
 *   `baseReading` instead of leaving it undefined or guessing — they are
 *   deliberately NOT surfaced in the on-card On/Kun reading rows, so a
 *   learner never sees a reading appear that the rest of the app doesn't
 *   otherwise teach them yet. `KanjiScrollScreen.tsx`'s `toDisplayTokens`
 *   filters on this tag — see the comment there before changing either
 *   side of this contract.
 *
 * ── Visible fixes made during this migration (flagged for the verifier) ───
 * B1c's own acceptance criteria (astra-kanji-improvement-plan.md) says the
 * 13 curated kanji should look "unchanged from a learner's perspective
 * except that the fallback bug no longer produces a wrong reading." Read
 * strictly, that sentence is about the OTHER 133 kanji's guessing fallback.
 * But B1a's and B1b's handoffs explicitly flagged two real, live gaps in
 * THESE 13 kanji's own reading records and asked B1c to address them, and
 * migrating the data by hand surfaced two more of the exact same kind.
 * Judgment call: fix all four now, since they are honest additions (every
 * one is already taught by this kanji's own curated word-family example)
 * rather than new invented content, and leaving them unfixed after finding
 * them would defeat the point of this migration. Flagging clearly in case
 * Shine/the verifier would rather hold one back for a product decision.
 *   1. 生's kunyomi gains い (生きる) — the gap B1a's round-trip test and
 *      B1b's audit both already called out by name.
 *   2. 行's kunyomi keeps both readings it already had (い-く, おこな-う)
 *      but now BOTH get correct romaji (i-ku, okona-u) — data.ts's own
 *      kunyomiRomaji only has one token today ("i-ku") for two kana tokens,
 *      the token-count mismatch B1b's audit flagged by name. Learner-visible
 *      effect: 行's Kun row now shows romaji under both chips instead of
 *      neither (ReadingSummary's own mismatched-count rule currently
 *      suppresses romaji entirely for 行 — see A2 verification notes).
 *   3. 上's kunyomi gains のぼ-る (上る) and うわ (上着) — both already
 *      declared as plain "kunyomi" (not "onyomi-variant") in
 *      kanjiWordFamilies.ts, with notes explicitly calling them out as
 *      genuine separate kunyomi, but neither is in data.ts's kunyomi
 *      string ("うえ、あ-げる"). Same shape of gap as 生's い, just never
 *      caught by B1b's audit because the audit only checks a kanji's own
 *      `examples` field, not `kanjiWordFamilies.ts`.
 *   4. 下's kunyomi gains くだ-さい (下さい) — same situation; the word
 *      family's own note already says "くだ-さい is yet another kunyomi,
 *      distinct from した and さげる," but it was never added as a record.
 * No other kanji among the 13 has a legacy-declared gap — every other
 * word's reading matches one of data.ts's own declared onyomi/kunyomi
 * tokens exactly (see the per-kanji comments below for the match).
 *
 * The 半分/半 duplicate-card-key issue and the 107/25-count "declared
 * reading unused" / "example uncovered" B1b findings are NOT addressed
 * here — the former is a data.ts content decision outside B1c's scope, the
 * latter is a coverage metric for B4-B6, not a bug (see phase-B1b.md).
 */

import type { KanjiReadingRecord, WordFamilyEntryV2 } from "./types";

interface KanjiReadingRecordSet {
  onyomi: KanjiReadingRecord[];
  kunyomi: KanjiReadingRecord[];
}

// ============================================================================
// 生 (sei / life, born) — data.ts: onyomi "セイ", kunyomi "う-まれる、なま"
// ============================================================================
const SEI_ON_SEI: KanjiReadingRecord = {
  kana: "セイ", romaji: "sei", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["生-先生"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const SEI_ON_SHOU: KanjiReadingRecord = {
  kana: "ショウ", romaji: "shou", type: "onyomi", priority: 2, commonness: "moderate",
  exampleWordIds: ["生-誕生", "生-一生"], source: "word-family-derived", proofreadingStatus: "reviewed",
  note: "生's real secondary onyomi (used in 誕生/一生). Not in data.ts's onyomi string — kept off the visible On row; exists here only as the baseReading for the two variant entries below.",
};
const SEI_KUN_U: KanjiReadingRecord = {
  kana: "う-まれる", romaji: "u-mareru", type: "kunyomi", okurigana: "まれる", priority: 1,
  commonness: "common", exampleWordIds: ["生-生まれる"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const SEI_KUN_NAMA: KanjiReadingRecord = {
  kana: "なま", romaji: "nama", type: "kunyomi", priority: 2, commonness: "common",
  exampleWordIds: ["生-生"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const SEI_KUN_I: KanjiReadingRecord = {
  kana: "い", romaji: "i", type: "kunyomi", priority: 3, commonness: "common",
  exampleWordIds: ["生-生きる"], source: "legacy-declared", proofreadingStatus: "reviewed",
  note: "Visible fix #1 (see file header). Missing from data.ts's own kunyomi string even though 生's own examples list 生きる — the gap B1a's round-trip test and B1b's audit both flagged. data.ts itself is unchanged; this record only affects the 13-kanji migrated view.",
};

const SEI_WORDS: WordFamilyEntryV2[] = [
  { id: "生-先生", word: "先生", reading: "せんせい", meaning: "Teacher", segment: "せい", baseReading: "セイ", observedReading: "せい", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "生-生きる", word: "生きる", reading: "いきる", meaning: "To live", segment: "い", baseReading: "い", observedReading: "い", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "生-生", word: "生", reading: "なま", meaning: "Raw / fresh / live", segment: "なま", baseReading: "なま", observedReading: "なま", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "生-生まれる", word: "生まれる", reading: "うまれる", meaning: "To be born", segment: "う", baseReading: "う", observedReading: "う", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "生-誕生", word: "誕生", reading: "たんじょう", meaning: "Birth", segment: "じょう", baseReading: "ショウ", observedReading: "じょう", transformationType: "rendaku", commonness: "common", note: "生 has a second onyomi ショウ, which voices to じょう here — different from the セイ you see in 先生.", source: "curated-v1", proofreadingStatus: "reviewed" },
  // Classified "variant" rather than "sokuon": the small っ doubling belongs to 一's own
  // reading (いち→いっ) at the compound boundary, not to 生's own segment, which is exactly
  // ショウ read as しょう with no change of its own. (Reasoning kept out of the user-facing
  // `note` below — that field is rendered to the learner as-is; keep it identical to the
  // original curated copy.)
  { id: "生-一生", word: "一生", reading: "いっしょう", meaning: "One's whole life", segment: "しょう", baseReading: "ショウ", observedReading: "しょう", transformationType: "variant", commonness: "common", note: "Same secondary onyomi ショウ as in 誕生, here unvoiced and doubled before the small っ.", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 上 (jou / up, above) — data.ts: onyomi "ジョウ", kunyomi "うえ、あ-げる"
// ============================================================================
const JOU_ON_JOU: KanjiReadingRecord = {
  kana: "ジョウ", romaji: "jou", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["上-上手", "上-屋上"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const JOU_KUN_UE: KanjiReadingRecord = {
  kana: "うえ", romaji: "ue", type: "kunyomi", priority: 1, commonness: "common",
  exampleWordIds: ["上-上"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const JOU_KUN_AGERU: KanjiReadingRecord = {
  kana: "あ-げる", romaji: "a-geru", type: "kunyomi", okurigana: "げる", priority: 2, commonness: "common",
  exampleWordIds: ["上-上げる"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const JOU_KUN_NOBORU: KanjiReadingRecord = {
  kana: "のぼ-る", romaji: "nobo-ru", type: "kunyomi", okurigana: "る", priority: 3, commonness: "common",
  exampleWordIds: ["上-上る"], source: "legacy-declared", proofreadingStatus: "reviewed",
  note: "Visible fix #3 (see file header). Not in data.ts's kunyomi string, even though the word family already teaches it as a plain kunyomi with its own note distinguishing it from あげる.",
};
const JOU_KUN_UWA: KanjiReadingRecord = {
  kana: "うわ", romaji: "uwa", type: "kunyomi", priority: 4, commonness: "moderate",
  exampleWordIds: ["上-上着"], source: "legacy-declared", proofreadingStatus: "reviewed",
  note: "Visible fix #3 (see file header). Same situation as のぼ-る above — a real kunyomi the word family already teaches, just never in data.ts's kunyomi string.",
};

const JOU_WORDS: WordFamilyEntryV2[] = [
  { id: "上-上手", word: "上手", reading: "じょうず", meaning: "Skilled", segment: "じょう", baseReading: "ジョウ", observedReading: "じょう", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "上-上", word: "上", reading: "うえ", meaning: "Above / on top", segment: "うえ", baseReading: "うえ", observedReading: "うえ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "上-上げる", word: "上げる", reading: "あげる", meaning: "To raise", segment: "あ", baseReading: "あ", observedReading: "あ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "上-上る", word: "上る", reading: "のぼる", meaning: "To climb / go up", segment: "のぼ", baseReading: "のぼ", observedReading: "のぼ", transformationType: "direct", commonness: "common", note: "A separate kunyomi from あげる — this one is about ascending (stairs, a mountain), not lifting something.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "上-上着", word: "上着", reading: "うわぎ", meaning: "Jacket / outerwear", segment: "うわ", baseReading: "うわ", observedReading: "うわ", transformationType: "direct", commonness: "moderate", note: "うわ is a reading of 上 that only shows up in a handful of compounds like this one.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "上-屋上", word: "屋上", reading: "おくじょう", meaning: "Rooftop", segment: "じょう", baseReading: "ジョウ", observedReading: "じょう", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 下 (ka/ge / down, below) — data.ts: onyomi "カ、ゲ", kunyomi "した、さ-げる"
// ============================================================================
const KA_ON_KA: KanjiReadingRecord = {
  kana: "カ", romaji: "ka", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["下-地下"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const KA_ON_GE: KanjiReadingRecord = {
  kana: "ゲ", romaji: "ge", type: "onyomi", priority: 2, commonness: "moderate",
  exampleWordIds: ["下-下車"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const KA_KUN_SHITA: KanjiReadingRecord = {
  kana: "した", romaji: "shita", type: "kunyomi", priority: 1, commonness: "common",
  exampleWordIds: ["下-下"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const KA_KUN_SAGERU: KanjiReadingRecord = {
  kana: "さ-げる", romaji: "sa-geru", type: "kunyomi", okurigana: "げる", priority: 2, commonness: "common",
  exampleWordIds: ["下-下がる"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const KA_KUN_KUDASAI: KanjiReadingRecord = {
  kana: "くだ-さい", romaji: "kuda-sai", type: "kunyomi", okurigana: "さい", priority: 3, commonness: "common",
  exampleWordIds: ["下-下さい"], source: "legacy-declared", proofreadingStatus: "reviewed",
  note: "Visible fix #4 (see file header). The word family's own note already calls this out as \"yet another kunyomi, distinct from した and さげる\" — it just never had a matching record until now.",
};

const KA_WORDS: WordFamilyEntryV2[] = [
  { id: "下-下手", word: "下手", reading: "へた", meaning: "Unskilled", segment: "へ", baseReading: undefined, observedReading: "へ", transformationType: "irregular", commonness: "common", note: "A special whole-word reading (jukujikun) — 下 doesn't normally read as へ on its own.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "下-下", word: "下", reading: "した", meaning: "Below / under", segment: "した", baseReading: "した", observedReading: "した", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "下-下がる", word: "下がる", reading: "さがる", meaning: "To go down / descend", segment: "さ", baseReading: "さ", observedReading: "さ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "下-地下", word: "地下", reading: "ちか", meaning: "Underground", segment: "か", baseReading: "カ", observedReading: "か", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "下-下車", word: "下車", reading: "げしゃ", meaning: "Getting off (a train/bus)", segment: "げ", baseReading: "ゲ", observedReading: "げ", transformationType: "direct", commonness: "common", note: "Uses the less common of 下's two onyomi (ゲ) instead of カ.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "下-下さい", word: "下さい", reading: "ください", meaning: "Please give me", segment: "くだ", baseReading: "くだ", observedReading: "くだ", transformationType: "direct", commonness: "common", note: "くだ-さい is yet another kunyomi, distinct from した and さげる.", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 中 (chuu / middle, inside) — data.ts: onyomi "チュウ", kunyomi "なか"
// ============================================================================
const CHUU_ON_CHUU: KanjiReadingRecord = {
  kana: "チュウ", romaji: "chuu", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["中-中学校"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const CHUU_KUN_NAKA: KanjiReadingRecord = {
  kana: "なか", romaji: "naka", type: "kunyomi", priority: 1, commonness: "common",
  exampleWordIds: ["中-中"], source: "legacy-declared", proofreadingStatus: "reviewed",
};

const CHUU_WORDS: WordFamilyEntryV2[] = [
  { id: "中-中学校", word: "中学校", reading: "ちゅうがっこう", meaning: "Junior high school", segment: "ちゅう", baseReading: "チュウ", observedReading: "ちゅう", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "中-中", word: "中", reading: "なか", meaning: "Middle / inside", segment: "なか", baseReading: "なか", observedReading: "なか", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "中-一日中", word: "一日中", reading: "いちにちじゅう", meaning: "All day long", segment: "じゅう", baseReading: "チュウ", observedReading: "じゅう", transformationType: "rendaku", commonness: "common", note: "In time-span words like this, 中 voices from ちゅう to じゅう.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "中-世界中", word: "世界中", reading: "せかいじゅう", meaning: "All over the world", segment: "じゅう", baseReading: "チュウ", observedReading: "じゅう", transformationType: "rendaku", commonness: "moderate", note: "Same じゅう pattern as 一日中, used for 'throughout' rather than a strict time duration.", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 分 (bun/fun / minute, understand) — data.ts: onyomi "ブン、フン", kunyomi "わ-かる"
// ============================================================================
const BUN_ON_BUN: KanjiReadingRecord = {
  kana: "ブン", romaji: "bun", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["分-自分"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const BUN_ON_FUN: KanjiReadingRecord = {
  kana: "フン", romaji: "fun", type: "onyomi", priority: 2, commonness: "common",
  exampleWordIds: ["分-五分"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const BUN_ON_BU: KanjiReadingRecord = {
  kana: "ブ", romaji: "bu", type: "onyomi", priority: 3, commonness: "rare",
  exampleWordIds: ["分-五分五分"], source: "word-family-derived", proofreadingStatus: "reviewed",
  note: "A genuine third onyomi of 分 (ratio/proportion words), separate from both ぶん and ふん — not a voicing or shortening of either. Not in data.ts's onyomi string; kept off the visible On row.",
};
const BUN_KUN_WAKARU: KanjiReadingRecord = {
  kana: "わ-かる", romaji: "wa-karu", type: "kunyomi", okurigana: "かる", priority: 1, commonness: "common",
  exampleWordIds: ["分-分かる", "分-分ける"], source: "legacy-declared", proofreadingStatus: "reviewed",
};

const BUN_WORDS: WordFamilyEntryV2[] = [
  { id: "分-分かる", word: "分かる", reading: "わかる", meaning: "To understand", segment: "わ", baseReading: "わ", observedReading: "わ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "分-五分", word: "五分", reading: "ごふん", meaning: "Five minutes", segment: "ふん", baseReading: "フン", observedReading: "ふん", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "分-自分", word: "自分", reading: "じぶん", meaning: "Oneself", segment: "ぶん", baseReading: "ブン", observedReading: "ぶん", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "分-分ける", word: "分ける", reading: "わける", meaning: "To divide", segment: "わ", baseReading: "わ", observedReading: "わ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "分-五分五分", word: "五分五分", reading: "ごぶごぶ", meaning: "Fifty-fifty / even odds", segment: "ぶ", baseReading: "ブ", observedReading: "ぶ", transformationType: "variant", commonness: "moderate", note: "ぶ is a third onyomi for 分, separate from ぶん and ふん, used in ratio/proportion words.", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 気 (ki / spirit, air) — data.ts: onyomi "キ", kunyomi "いき"
// ============================================================================
const KI_ON_KI: KanjiReadingRecord = {
  kana: "キ", romaji: "ki", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["気-元気", "気-天気", "気-気持ち"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const KI_ON_KE: KanjiReadingRecord = {
  kana: "ケ", romaji: "ke", type: "onyomi", priority: 2, commonness: "rare",
  exampleWordIds: ["気-気配"], source: "word-family-derived", proofreadingStatus: "reviewed",
  note: "気's real (rare) second onyomi. Not in data.ts's onyomi string; kept off the visible On row.",
};
const KI_KUN_IKI: KanjiReadingRecord = {
  kana: "いき", romaji: "iki", type: "kunyomi", priority: 1, commonness: "common",
  exampleWordIds: [], source: "legacy-declared", proofreadingStatus: "reviewed",
  note: "Declared in data.ts but not used by any curated word-family example yet — a coverage gap (B1b's \"declared reading unused\" category), not an error.",
};

const KI_WORDS: WordFamilyEntryV2[] = [
  { id: "気-元気", word: "元気", reading: "げんき", meaning: "Healthy / energetic", segment: "き", baseReading: "キ", observedReading: "き", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "気-天気", word: "天気", reading: "てんき", meaning: "Weather", segment: "き", baseReading: "キ", observedReading: "き", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "気-気配", word: "気配", reading: "けはい", meaning: "Sign / indication", segment: "け", baseReading: "ケ", observedReading: "け", transformationType: "variant", commonness: "common", note: "気 has a rarer second onyomi ケ, heard here instead of the usual キ.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "気-気持ち", word: "気持ち", reading: "きもち", meaning: "Feeling", segment: "き", baseReading: "キ", observedReading: "き", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 会 (kai / to meet) — data.ts: onyomi "カイ", kunyomi "あ-う"
// ============================================================================
const KAI_ON_KAI: KanjiReadingRecord = {
  kana: "カイ", romaji: "kai", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["会-会社"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const KAI_ON_E: KanjiReadingRecord = {
  kana: "エ", romaji: "e", type: "onyomi", priority: 2, commonness: "rare",
  exampleWordIds: ["会-会釈"], source: "word-family-derived", proofreadingStatus: "reviewed",
  note: "会's real (very rare) second onyomi — almost unique to 会釈 and 会得. Not in data.ts's onyomi string; kept off the visible On row.",
};
const KAI_KUN_AU: KanjiReadingRecord = {
  kana: "あ-う", romaji: "a-u", type: "kunyomi", okurigana: "う", priority: 1, commonness: "common",
  exampleWordIds: ["会-会う", "会-出会う"], source: "legacy-declared", proofreadingStatus: "reviewed",
};

const KAI_WORDS: WordFamilyEntryV2[] = [
  { id: "会-会う", word: "会う", reading: "あう", meaning: "To meet", segment: "あ", baseReading: "あ", observedReading: "あ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "会-会社", word: "会社", reading: "かいしゃ", meaning: "Company", segment: "かい", baseReading: "カイ", observedReading: "かい", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "会-出会う", word: "出会う", reading: "であう", meaning: "To encounter / run into", segment: "あ", baseReading: "あ", observedReading: "あ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "会-会釈", word: "会釈", reading: "えしゃく", meaning: "A slight bow / nod of greeting", segment: "え", baseReading: "エ", observedReading: "え", transformationType: "variant", commonness: "rare", note: "A rare onyomi エ that shows up in almost no other word besides this one and 会得 (えとく).", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 行 (kou / to go) — data.ts: onyomi "コウ", kunyomi "い-く、おこな-う"
// (kunyomiRomaji is "i-ku" only — a real token-count bug, fixed here.)
// ============================================================================
const KOU_ON_KOU: KanjiReadingRecord = {
  kana: "コウ", romaji: "kou", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["行-行動"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const KOU_ON_GYOU: KanjiReadingRecord = {
  kana: "ギョウ", romaji: "gyou", type: "onyomi", priority: 2, commonness: "moderate",
  exampleWordIds: ["行-行事"], source: "word-family-derived", proofreadingStatus: "reviewed",
  note: "行's real second onyomi (ceremonies/scheduled-event words). Not in data.ts's onyomi string; kept off the visible On row.",
};
const KOU_KUN_IKU: KanjiReadingRecord = {
  kana: "い-く", romaji: "i-ku", type: "kunyomi", okurigana: "く", priority: 1, commonness: "common",
  exampleWordIds: ["行-行く"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const KOU_KUN_OKONAU: KanjiReadingRecord = {
  kana: "おこな-う", romaji: "okona-u", type: "kunyomi", okurigana: "う", priority: 2, commonness: "common",
  exampleWordIds: ["行-行う"], source: "legacy-declared", proofreadingStatus: "reviewed",
  note: "Visible fix #2 (see file header). Both kun readings were already declared in data.ts's kana string, but kunyomiRomaji only had one token (\"i-ku\") for the two kana tokens — the token-count mismatch B1b's audit flagged by name. This record supplies おこな-う's own correct romaji instead of leaving it unpaired.",
};

const KOU_WORDS: WordFamilyEntryV2[] = [
  { id: "行-行く", word: "行く", reading: "いく", meaning: "To go", segment: "い", baseReading: "い", observedReading: "い", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "行-行う", word: "行う", reading: "おこなう", meaning: "To carry out / conduct", segment: "おこな", baseReading: "おこな", observedReading: "おこな", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "行-行動", word: "行動", reading: "こうどう", meaning: "Action / behavior", segment: "こう", baseReading: "コウ", observedReading: "こう", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "行-行事", word: "行事", reading: "ぎょうじ", meaning: "Event / function", segment: "ぎょう", baseReading: "ギョウ", observedReading: "ぎょう", transformationType: "variant", commonness: "common", note: "行's second onyomi ギョウ, common in words about ceremonies and scheduled events.", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 今 (kon / now) — data.ts: onyomi "コン", kunyomi "いま"
// ============================================================================
const KON_ON_KON: KanjiReadingRecord = {
  kana: "コン", romaji: "kon", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["今-今月", "今-今週", "今-今回"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const KON_KUN_IMA: KanjiReadingRecord = {
  kana: "いま", romaji: "ima", type: "kunyomi", priority: 1, commonness: "common",
  exampleWordIds: ["今-今"], source: "legacy-declared", proofreadingStatus: "reviewed",
};

const KON_WORDS: WordFamilyEntryV2[] = [
  { id: "今-今", word: "今", reading: "いま", meaning: "Now", segment: "いま", baseReading: "いま", observedReading: "いま", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "今-今日", word: "今日", reading: "きょう", meaning: "Today", segment: "きょう", baseReading: undefined, observedReading: "きょう", transformationType: "irregular", commonness: "common", note: "A very common irregular combination (jukujikun) that you'll use daily!", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "今-今月", word: "今月", reading: "こんげつ", meaning: "This month", segment: "こん", baseReading: "コン", observedReading: "こん", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "今-今週", word: "今週", reading: "こんしゅう", meaning: "This week", segment: "こん", baseReading: "コン", observedReading: "こん", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "今-今年", word: "今年", reading: "ことし", meaning: "This year", segment: "ことし", baseReading: undefined, observedReading: "ことし", transformationType: "irregular", commonness: "common", note: "Another jukujikun reading. Normal readings of 今 and 年 don't combine this way.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "今-今回", word: "今回", reading: "こんかい", meaning: "This time", segment: "こん", baseReading: "コン", observedReading: "こん", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 日 (nichi / sun, day) — data.ts: onyomi "ニチ、ジツ", kunyomi "ひ、び"
// ============================================================================
const NICHI_ON_NICHI: KanjiReadingRecord = {
  kana: "ニチ", romaji: "nichi", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["日-毎日", "日-日曜日"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const NICHI_ON_JITSU: KanjiReadingRecord = {
  kana: "ジツ", romaji: "jitsu", type: "onyomi", priority: 2, commonness: "moderate",
  exampleWordIds: [], source: "legacy-declared", proofreadingStatus: "reviewed",
  note: "Declared in data.ts but not used by any curated word-family example yet — a coverage gap, not an error (e.g. 本日/先日 would exercise it).",
};
const NICHI_KUN_HI: KanjiReadingRecord = {
  kana: "ひ", romaji: "hi", type: "kunyomi", priority: 1, commonness: "common",
  exampleWordIds: ["日-お日様"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const NICHI_KUN_BI: KanjiReadingRecord = {
  kana: "び", romaji: "bi", type: "kunyomi", priority: 2, commonness: "common",
  exampleWordIds: [], source: "legacy-declared", proofreadingStatus: "reviewed",
  note: "Declared in data.ts but not used by any curated word-family example yet (e.g. 何日 なんにち uses にち; a び example would need a compound like 三日間 systematically absent from this family).",
};

const NICHI_WORDS: WordFamilyEntryV2[] = [
  { id: "日-日本", word: "日本", reading: "にほん", meaning: "Japan", segment: "に", baseReading: "ニチ", observedReading: "に", transformationType: "vowel-shift", commonness: "common", note: "Here, 日 changes to に as a sound shift before ほん.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "日-毎日", word: "毎日", reading: "まいにち", meaning: "Every day", segment: "にち", baseReading: "ニチ", observedReading: "にち", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "日-日曜日", word: "日曜日", reading: "にちようび", meaning: "Sunday", segment: "にち", baseReading: "ニチ", observedReading: "にち", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "日-今日", word: "今日", reading: "きょう", meaning: "Today", segment: "きょう", baseReading: undefined, observedReading: "きょう", transformationType: "irregular", commonness: "common", note: "Irregular jukujikun reading. Super critical to learn first!", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "日-日記", word: "日記", reading: "にっき", meaning: "Diary", segment: "にっ", baseReading: "ニチ", observedReading: "にっ", transformationType: "sokuon", commonness: "common", note: "The sound doubles (sokuon) into にっ before き.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "日-お日様", word: "お日様", reading: "おひさま", meaning: "The sun (polite)", segment: "ひ", baseReading: "ひ", observedReading: "ひ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 月 (getsu / moon, month) — data.ts: onyomi "ゲツ", kunyomi "つき"
// ============================================================================
const GETSU_ON_GETSU: KanjiReadingRecord = {
  kana: "ゲツ", romaji: "getsu", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["月-月曜日", "月-今月", "月-三ヶ月"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const GETSU_ON_GATSU: KanjiReadingRecord = {
  kana: "ガツ", romaji: "gatsu", type: "onyomi", priority: 2, commonness: "common",
  exampleWordIds: ["月-一月"], source: "word-family-derived", proofreadingStatus: "reviewed",
  note: "月's other real onyomi (used for every calendar month name: 一月, 二月, ...). Not in data.ts's onyomi string; kept off the visible On row.",
};
const GETSU_KUN_TSUKI: KanjiReadingRecord = {
  kana: "つき", romaji: "tsuki", type: "kunyomi", priority: 1, commonness: "common",
  exampleWordIds: ["月-月"], source: "legacy-declared", proofreadingStatus: "reviewed",
};

const GETSU_WORDS: WordFamilyEntryV2[] = [
  { id: "月-月曜日", word: "月曜日", reading: "げつようび", meaning: "Monday", segment: "げつ", baseReading: "ゲツ", observedReading: "げつ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "月-今月", word: "今月", reading: "こんげつ", meaning: "This month", segment: "げつ", baseReading: "ゲツ", observedReading: "げつ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "月-一月", word: "一月", reading: "いちがつ", meaning: "January", segment: "がつ", baseReading: "ガツ", observedReading: "がつ", transformationType: "variant", commonness: "common", note: "Months of the year use the がつ reading instead of げつ.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "月-三ヶ月", word: "三ヶ月", reading: "さんかげつ", meaning: "Three months (duration)", segment: "げつ", baseReading: "ゲツ", observedReading: "げつ", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "月-月", word: "月", reading: "つき", meaning: "The moon / moon phase", segment: "つき", baseReading: "つき", observedReading: "つき", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 木 (moku / tree, wood) — data.ts: onyomi "モク", kunyomi "き"
// ============================================================================
const MOKU_ON_MOKU: KanjiReadingRecord = {
  kana: "モク", romaji: "moku", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["木-木曜日"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const MOKU_ON_BOKU: KanjiReadingRecord = {
  kana: "ボク", romaji: "boku", type: "onyomi", priority: 2, commonness: "moderate",
  exampleWordIds: ["木-大木", "木-木刀"], source: "word-family-derived", proofreadingStatus: "reviewed",
  note: "木's real second onyomi. Not in data.ts's onyomi string; kept off the visible On row.",
};
const MOKU_KUN_KI: KanjiReadingRecord = {
  kana: "き", romaji: "ki", type: "kunyomi", priority: 1, commonness: "common",
  exampleWordIds: ["木-木"], source: "legacy-declared", proofreadingStatus: "reviewed",
};

const MOKU_WORDS: WordFamilyEntryV2[] = [
  { id: "木-木", word: "木", reading: "き", meaning: "Tree / wood", segment: "き", baseReading: "き", observedReading: "き", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "木-木曜日", word: "木曜日", reading: "もくようび", meaning: "Thursday", segment: "もく", baseReading: "モク", observedReading: "もく", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "木-大木", word: "大木", reading: "たいぼく", meaning: "Huge tree / old timber", segment: "ぼく", baseReading: "ボク", observedReading: "ぼく", transformationType: "variant", commonness: "moderate", note: "Uses the secondary onyomi ボク instead of モク.", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "木-木刀", word: "木刀", reading: "ぼくとう", meaning: "Wooden sword / training blade", segment: "ぼく", baseReading: "ボク", observedReading: "ぼく", transformationType: "variant", commonness: "moderate", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// 水 (sui / water) — data.ts: onyomi "スイ", kunyomi "みず"
// ============================================================================
const SUI_ON_SUI: KanjiReadingRecord = {
  kana: "スイ", romaji: "sui", type: "onyomi", priority: 1, commonness: "common",
  exampleWordIds: ["水-水曜日", "水-海水"], source: "legacy-declared", proofreadingStatus: "reviewed",
};
const SUI_KUN_MIZU: KanjiReadingRecord = {
  kana: "みず", romaji: "mizu", type: "kunyomi", priority: 1, commonness: "common",
  exampleWordIds: ["水-水", "水-水着"], source: "legacy-declared", proofreadingStatus: "reviewed",
};

const SUI_WORDS: WordFamilyEntryV2[] = [
  { id: "水-水曜日", word: "水曜日", reading: "すいようび", meaning: "Wednesday", segment: "すい", baseReading: "スイ", observedReading: "すい", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "水-水", word: "水", reading: "みず", meaning: "Water", segment: "みず", baseReading: "みず", observedReading: "みず", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "水-海水", word: "海水", reading: "かいすい", meaning: "Seawater", segment: "すい", baseReading: "スイ", observedReading: "すい", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
  { id: "水-水着", word: "水着", reading: "みずぎ", meaning: "Swimsuit / swimwear", segment: "みず", baseReading: "みず", observedReading: "みず", transformationType: "direct", commonness: "common", source: "curated-v1", proofreadingStatus: "reviewed" },
];

// ============================================================================
// Exported aggregates
// ============================================================================

/** Every migrated kanji's onyomi/kunyomi records. Filter by `source` before rendering — see the file header. */
export const KANJI_READING_RECORDS_V2: Record<string, KanjiReadingRecordSet> = {
  "生": { onyomi: [SEI_ON_SEI, SEI_ON_SHOU], kunyomi: [SEI_KUN_U, SEI_KUN_NAMA, SEI_KUN_I] },
  "上": { onyomi: [JOU_ON_JOU], kunyomi: [JOU_KUN_UE, JOU_KUN_AGERU, JOU_KUN_NOBORU, JOU_KUN_UWA] },
  "下": { onyomi: [KA_ON_KA, KA_ON_GE], kunyomi: [KA_KUN_SHITA, KA_KUN_SAGERU, KA_KUN_KUDASAI] },
  "中": { onyomi: [CHUU_ON_CHUU], kunyomi: [CHUU_KUN_NAKA] },
  "分": { onyomi: [BUN_ON_BUN, BUN_ON_FUN, BUN_ON_BU], kunyomi: [BUN_KUN_WAKARU] },
  "気": { onyomi: [KI_ON_KI, KI_ON_KE], kunyomi: [KI_KUN_IKI] },
  "会": { onyomi: [KAI_ON_KAI, KAI_ON_E], kunyomi: [KAI_KUN_AU] },
  "行": { onyomi: [KOU_ON_KOU, KOU_ON_GYOU], kunyomi: [KOU_KUN_IKU, KOU_KUN_OKONAU] },
  "今": { onyomi: [KON_ON_KON], kunyomi: [KON_KUN_IMA] },
  "日": { onyomi: [NICHI_ON_NICHI, NICHI_ON_JITSU], kunyomi: [NICHI_KUN_HI, NICHI_KUN_BI] },
  "月": { onyomi: [GETSU_ON_GETSU, GETSU_ON_GATSU], kunyomi: [GETSU_KUN_TSUKI] },
  "木": { onyomi: [MOKU_ON_MOKU, MOKU_ON_BOKU], kunyomi: [MOKU_KUN_KI] },
  "水": { onyomi: [SUI_ON_SUI], kunyomi: [SUI_KUN_MIZU] },
};

/** Every migrated kanji's word family, in the new WordFamilyEntryV2 shape. 64 words across the 13 kanji, matching the legacy kanjiWordFamilies.ts one-for-one. */
export const KANJI_WORD_FAMILIES_V2: Record<string, WordFamilyEntryV2[]> = {
  "生": SEI_WORDS,
  "上": JOU_WORDS,
  "下": KA_WORDS,
  "中": CHUU_WORDS,
  "分": BUN_WORDS,
  "気": KI_WORDS,
  "会": KAI_WORDS,
  "行": KOU_WORDS,
  "今": KON_WORDS,
  "日": NICHI_WORDS,
  "月": GETSU_WORDS,
  "木": MOKU_WORDS,
  "水": SUI_WORDS,
};
