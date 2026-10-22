/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Phase C2 check script: a standalone dev tool, NOT a UI feature. Runs the real matcher in
 * src/kanjiSearch.ts over the real KANJI_DATA and checks that every row can be found by its
 * character, meaning, kana and romaji, that the results always carry ORIGINAL indexes, that
 * junk input never throws, and that the plan's named cases hold. It never touches the app,
 * Firebase, storage or any data file. Exits with code 1 if any check fails.
 *
 * Expectations are derived here with plain splits and a plain code-point shift, not with the
 * matcher's own helpers, so a bug in the normaliser cannot hide itself.
 *
 * Run with: npx tsx scripts/kanji-search-sim.ts   (from the project root)
 */

import { KANJI_DATA } from "../src/data";
import { searchKanji, isKanjiQueryActive, foldKana, type SearchableKanji } from "../src/kanjiSearch";

// ─── tiny harness ────────────────────────────────────────────────────────────

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) passed++;
  else failures.push(`${name}${detail ? `  (${detail})` : ""}`);
}

const D = KANJI_DATA;
const N = D.length;
const find = (query: string) => searchKanji(D, query);
const chars = (indexes: number[]) => indexes.map((i) => D[i].kanji).join("");

/** Independent katakana to hiragana (plain shift). */
const kataToHira = (s: string) =>
  Array.from(s).map((c) => { const n = c.charCodeAt(0); return n >= 0x30a1 && n <= 0x30f6 ? String.fromCharCode(n - 0x60) : c; }).join("");
/** Independent ASCII to full-width (what a Japanese IME types in full-width mode). */
const toFullWidth = (s: string) =>
  Array.from(s).map((c) => { const n = c.charCodeAt(0); return n >= 0x21 && n <= 0x7e ? String.fromCharCode(n + 0xfee0) : c === " " ? "\u3000" : c; }).join("");
const DASHES = /[-\u2010-\u2015\u2212]/g;
const isPlaceholder = (s: string) => s.replace(DASHES, "").trim() === "";

console.log(`Scanning ${N} kanji rows.`);
check("data is not empty", N > 0);

// ─── 1. every row is findable, and found FIRST by its own character ─────────

let withPlaceholder = 0;
D.forEach((row, i) => {
  const r = find(row.kanji);
  check(`${row.kanji}: character finds exactly itself`, r.length === 1 && r[0] === i, chars(r));

  // meaning: whole string, every slash part, every word
  const meaningParts = row.meaning.split("/").map((s) => s.trim()).filter(Boolean);
  const meaningWords = row.meaning.split(/[\s/]+/).filter(Boolean);
  check(`${row.kanji}: full meaning "${row.meaning}"`, find(row.meaning).includes(i));
  meaningParts.forEach((p) => check(`${row.kanji}: meaning part "${p}"`, find(p).includes(i)));
  meaningWords.forEach((w) => {
    check(`${row.kanji}: meaning word "${w}"`, find(w).includes(i));
    check(`${row.kanji}: meaning word upper "${w.toUpperCase()}"`, find(w.toUpperCase()).includes(i));
  });

  // onyomi (katakana as stored, hiragana, and the same typed in the other script)
  row.onyomi.split("\u3001").map((s) => s.trim()).filter((s) => !isPlaceholder(s)).forEach((on) => {
    check(`${row.kanji}: onyomi katakana "${on}"`, find(on).includes(i));
    check(`${row.kanji}: onyomi as hiragana "${kataToHira(on)}"`, find(kataToHira(on)).includes(i));
    check(`${row.kanji}: onyomi full-width-safe (NFKC no-op)`, find(on.normalize("NFKC")).includes(i));
  });

  // kunyomi: with the okurigana hyphen as stored, and with it removed
  const kuns = row.kunyomi.split("\u3001").map((s) => s.trim()).filter((s) => !isPlaceholder(s));
  if (kuns.length === 0) withPlaceholder++;
  kuns.forEach((kun) => {
    check(`${row.kanji}: kunyomi "${kun}" as stored`, find(kun).includes(i));
    check(`${row.kanji}: kunyomi hyphen removed`, find(kun.replace(DASHES, "")).includes(i));
    check(`${row.kanji}: kunyomi typed in katakana`, find(foldKana(kun)).includes(i));
    const asKatakana = Array.from(kun.replace(DASHES, "")).map((c) => { const n = c.charCodeAt(0); return n >= 0x3041 && n <= 0x3096 ? String.fromCharCode(n + 0x60) : c; }).join("");
    check(`${row.kanji}: kunyomi typed in katakana (independent)`, find(asKatakana).includes(i));
  });

  // romaji: onyomi and kunyomi, with and without hyphens, lower, upper and full-width
  [row.onyomiRomaji, row.kunyomiRomaji].forEach((field) => {
    field.split(",").map((s) => s.trim()).filter((s) => !isPlaceholder(s)).forEach((token) => {
      check(`${row.kanji}: romaji "${token}" as stored`, find(token).includes(i));
      check(`${row.kanji}: romaji "${token}" hyphen removed`, find(token.replace(DASHES, "")).includes(i));
      check(`${row.kanji}: romaji "${token}" upper case`, find(token.toUpperCase()).includes(i));
      check(`${row.kanji}: romaji "${token}" full-width`, find(toFullWidth(token.replace(DASHES, ""))).includes(i));
    });
  });
});

// ─── 2. the plan's named cases ──────────────────────────────────────────────

const mizu = D.findIndex((k) => k.kanji === "水");
["mizu", "みず", "水", "water", "Water", "スイ", "すい", "ｽｲ", "sui", "ｍｉｚｕ", "ミズ"].forEach((q) =>
  check(`"${q}" finds 水`, find(q).includes(mizu), chars(find(q))));
const ichi = D.findIndex((k) => k.kanji === "一");
["hitotsu", "いち", "イチ", "ひとつ", "ひと-つ", "hito-tsu", "one"].forEach((q) =>
  check(`"${q}" finds 一`, find(q).includes(ichi), chars(find(q))));
check(`"water" and "水" give 水 first`, find("water")[0] === mizu && find("水")[0] === mizu);
check(`"to see" finds 見 first`, chars(find("to see")).startsWith("見"));
check(`"ki" returns a short list (at most 12, found ${find("ki").length}: ${chars(find("ki"))})`, find("ki").length > 0 && find("ki").length <= 12);
check(`"do" returns a short list (at most 12, found ${find("do").length}: ${chars(find("do"))})`, find("do").length > 0 && find("do").length <= 12);
check(`pasted word "日本" finds 日 and 本 only`, chars(find("日本")) === "日本");
check(`"水 water" finds 水, "日 water" finds nothing`, chars(find("水 water")) === "水" && find("日 water").length === 0);
check(`gibberish finds nothing`, find("zzzzqx").length === 0 && find("みずみずみず").length === 0);
check(`a word is not matched in the middle ("zu" does not find 水)`, !find("zu").includes(mizu));
check(`tokens never join across fields ("suimi" finds nothing)`, find("suimi").length === 0 && find("watersui").length === 0);

// ─── 3. blank and punctuation-only text shows everything, in data order ─────

["", " ", "   ", "\u3000", "-", "\u2013", "\u2014", ".", " - . ", "/", ",", "\u3001"].forEach((q) => {
  const r = find(q);
  check(`${JSON.stringify(q)}: not active, shows all ${N} in data order`, !isKanjiQueryActive(q) && r.length === N && r.every((v, i) => v === i));
});
check(`the en dash placeholder is never a searchable token`, find("\u2013").length === N && withPlaceholder === 5, `placeholders found: ${withPlaceholder}`);
["週", "茶", "肉", "族", "曜"].forEach((k) => {
  const row = D.find((d) => d.kanji === k);
  check(`${k}: still found by its character and its onyomi`, !!row && find(k).length === 1 && find(row!.onyomi.split("\u3001")[0]).length >= 1);
});

// ─── 4. the index trap: results are ORIGINAL indexes ────────────────────────

const last = N - 1;
check(`last kanji ${D[last].kanji}: found at index ${last}, not 0`, find(D[last].meaning)[0] === last || find(D[last].meaning).includes(last));
check(`last kanji by character is exactly [${last}]`, find(D[last].kanji).length === 1 && find(D[last].kanji)[0] === last);
check(`Prev from a filtered tile: index ${last} - 1 is the previous kanji of the FULL list`, D[find(D[last].kanji)[0] - 1].kanji === D[last - 1].kanji);
D.forEach((row) => {
  const r = find(row.kanji);
  if (D[r[0]].kanji !== row.kanji) check(`${row.kanji}: result index maps back to the same kanji`, false);
});
check(`every result index maps back to a row that really matches the character`, D.every((row) => D[find(row.kanji)[0]].kanji === row.kanji));
// a different array: indexes belong to the array that was searched (cache is per array)
const reversed: SearchableKanji[] = [...D].reverse();
const rr = searchKanji(reversed, "水");
check(`a reversed copy returns indexes into the copy`, rr.length === 1 && reversed[rr[0]].kanji === "水" && rr[0] === N - 1 - mizu);
check(`searching the copy did not disturb the original`, find("水")[0] === mizu);
// a longer-than-source custom array and an empty one
check(`empty array returns an empty list`, searchKanji([], "水").length === 0 && searchKanji([], "").length === 0);

// ─── 5. ranking ─────────────────────────────────────────────────────────────

{
  // exact character first, then meaning that starts with the first word, then the rest, each in data order
  const r = find("hi");
  const meaningStarts = (i: number) => D[i].meaning.toLowerCase().split("/").map((s) => s.trim()).some((s) => s.startsWith("hi"));
  const firstRest = r.findIndex((i) => !meaningStarts(i));
  check(`"hi": meaning-starts (${chars(r.filter(meaningStarts))}) come before the rest (${chars(r.filter((i) => !meaningStarts(i)))})`,
    firstRest === -1 || r.slice(firstRest).every((i) => !meaningStarts(i)));
  const asc = (xs: number[]) => xs.every((v, k) => k === 0 || xs[k - 1] < v);
  check(`"hi": each group is in data order`, asc(r.filter(meaningStarts)) && asc(r.filter((i) => !meaningStarts(i))));
  const mixed = find("日 sun");
  check(`"日 sun" gives 日 only`, chars(mixed) === "日");
  const kanjiThenMeaning = find("日本 sun");
  check(`"日本 sun": a kanji in the set that also matches the word`, kanjiThenMeaning.length === 1 && D[kanjiThenMeaning[0]].kanji === "日");
}
check(`results are unique and in range for a broad query`, (() => { const r = find("s"); return new Set(r).size === r.length && r.every((i) => Number.isInteger(i) && i >= 0 && i < N); })());

// ─── 6. junk never throws ───────────────────────────────────────────────────

const junk = [
  "(", ")", "[", "]", "*", "+", "?", "\\", "^$", "(?:", "[a-", ".*", "a{2,", "\u0000", "\ud800", "\udc00", "😀", "水😀", "\u202e水", "e\u0301", "\u200b", "\ufeff水",
  "a".repeat(10000), "水".repeat(5000), " ".repeat(5000) + "水", "ｱｲｳｴｵ", "ﾊﾟﾝ", "ｶﾞ", "ヴ", "ー", "ーー", "〜", "、、、", "・・・", "a/b/c", "to  see", "  to\tsee  ",
];
junk.forEach((q) => {
  let r: number[] | "threw" = [];
  try { r = find(q); } catch { r = "threw"; }
  check(`junk ${JSON.stringify(q.length > 12 ? q.slice(0, 12) + "…" : q)} does not throw and returns valid indexes`,
    r !== "threw" && r.every((i) => Number.isInteger(i) && i >= 0 && i < N) && new Set(r).size === r.length);
});
[undefined, null, 5, {}, []].forEach((q, i) => {
  let ok = true;
  try { searchKanji(D, q as unknown as string); isKanjiQueryActive(q as unknown as string); } catch { ok = false; }
  check(`non-string input #${i} does not throw`, ok);
});
check(`an emoji is an unmatched word, so "水😀" finds nothing (and does not throw)`, find("水😀").length === 0);
["water?", "water!", "\"water\"", "\u201cwater\u201d", "(mizu)", "[mizu]", "mizu,", "mizu;", "水。", "水、", "「水」", "\uff08\u6c34\uff09", "water.", "\uff57\uff41\uff54\uff45\uff52\uff1f", "\u301cmizu\u301c", "mizu\u30fb"].forEach((q) =>
  check(`punctuation around the word is ignored: ${JSON.stringify(q)} finds 水`, find(q).includes(mizu), chars(find(q))));
check(`punctuation-only text is inactive and shows everything`, ["?!", "()", "\u3002\u3001", "\u300c\u300d", "\"\"", "...", "--", "\u301c"].every((q) => !isKanjiQueryActive(q) && find(q).length === N));
check(`half-width "ｶﾞ" (ga) is composed and finds 画 or nothing without throwing`, Array.isArray(find("ｶﾞ")));

// ─── 7. how short are short queries? (informational, also a regression bound) ─

const prefixes = new Map<string, number>();
D.forEach((row) => {
  [row.onyomiRomaji, row.kunyomiRomaji].forEach((f) => f.split(",").map((s) => s.trim().replace(DASHES, "")).filter(Boolean).forEach((t) => {
    for (const len of [1, 2]) if (t.length >= len) prefixes.set(t.slice(0, len), find(t.slice(0, len)).length);
  }));
});
const two = [...prefixes.entries()].filter(([p]) => p.length === 2).sort((a, b) => b[1] - a[1]);
const counts = two.map(([, n]) => n).sort((a, b) => a - b);
const median = counts[Math.floor(counts.length / 2)];
console.log(`Two-letter romaji starts: ${two.length} distinct, median ${median} results, busiest: ${two.slice(0, 6).map(([p, n]) => `${p}=${n}`).join(" ")}`);
check(`a two-letter romaji start returns at most 40 of ${N} (so it is never most of the list)`, two.every(([, n]) => n <= 40), two[0]?.join("="));
check(`the typical two-letter start returns at most 12`, median <= 12, `median ${median}`);

// ─── report ─────────────────────────────────────────────────────────────────

console.log(`\n${passed} checks passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.slice(0, 60).forEach((failure) => console.log(`  ✗ ${failure}`));
  if (failures.length > 60) console.log(`  … and ${failures.length - 60} more`);
  process.exit(1);
}
console.log("C2 kanji search checks: all green.");
