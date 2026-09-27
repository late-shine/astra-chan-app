/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * B1b audit script — a standalone dev tool, NOT a UI feature. Reads the
 * *current* KANJI_DATA / KANJI_WORD_FAMILIES data and reports problems; it
 * never modifies data.ts, kanjiWordFamilies.ts, or any component. Re-run
 * this after every content batch (B4-B6) to catch regressions early.
 *
 * Run with: npx tsx scripts/audit-kanji-data.ts   (from the project root)
 * Writes reports/kanji-data-audit.md and also prints the same report to the
 * console. `reports/` is created if it doesn't exist yet.
 *
 * See handoffs/phase-B1b.md for the full report from the run against the
 * current 146-kanji / 13-family dataset, and the reasoning behind each
 * check below (especially the two "reading vs. example" heuristic checks,
 * which are deliberately approximate — see the comment above
 * readingAppearsIn()).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { KANJI_DATA } from "../src/data";
import { KANJI_WORD_FAMILIES } from "../src/kanjiWordFamilies";
import type { KanjiItem, KanjiWordEntry } from "../src/types";
import { katakanaToHiragana } from "../src/kanjiReadingAdapter";

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

type Severity = "error" | "warning";

interface Finding {
  severity: Severity;
  category: string;
  kanji: string;
  message: string;
}

const findings: Finding[] = [];
function flag(severity: Severity, category: string, kanji: string, message: string) {
  findings.push({ severity, category, kanji, message });
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Kana tokens from a "、"-joined reading string, trimmed, empties dropped. */
function kanaTokensOf(s: string): string[] {
  return s.split("、").map((t) => t.trim()).filter((t) => t.length > 0);
}

/** Romaji tokens from a ","-joined string, trimmed. NOT empty-filtered — an empty token IS the bug we're checking for. */
function romajiTokensOf(s: string): string[] {
  return s.split(",").map((t) => t.trim());
}

/** The part of a reading token before its okurigana dash (same convention as kanjiReadingAdapter.ts). */
function stemOf(token: string): string {
  const i = token.indexOf("-");
  return i === -1 ? token : token.slice(0, i);
}

/**
 * Extracts a usage example's furigana reading, e.g. "生きる (いきる)" -> "いきる".
 * Mirrors the exact regex KanjiScrollScreen.tsx's previewFromExamples() already
 * uses to parse this same field, so the audit agrees with what the app itself
 * derives from this data.
 */
function furiganaOf(example: { japanese: string }): string | null {
  const match = example.japanese.match(/^([^(（]+)(?:[(（]([^)）]+)[)）])?/);
  return match && match[2] ? match[2].trim() : null;
}

/**
 * Heuristic match between one declared reading token (e.g. "う-まれる") and one
 * example's furigana (e.g. "いきる"): true if the *stem* appears anywhere in the
 * furigana, OR (more leniently) if just the stem's first character does.
 *
 * The lenient first-character fallback exists specifically so ordinary,
 * expected phonetic shifts (e.g. 日's "にち" contributing just "に" in 日本/
 * にほん) don't get flagged as if something were actually wrong — only the
 * first character needs to survive a shift like that in virtually every case
 * in this dataset. This is a deliberately approximate heuristic for a
 * human-reviewed report, not a linguistic classifier: it can still both
 * under- and over-flag genuine edge cases. Treat every hit here as "worth a
 * human look," not as a proven bug — that's why both checks that use this
 * function are reported at "warning", not "error", severity.
 */
function readingAppearsIn(readingToken: string, furigana: string): boolean {
  const stem = katakanaToHiragana(stemOf(readingToken));
  const target = katakanaToHiragana(furigana);
  if (stem.length === 0) return false;
  if (target.includes(stem)) return true;
  return target.includes(stem[0]);
}

// ---------------------------------------------------------------------------
// Check: kanji-card keys with more than one character
// ---------------------------------------------------------------------------

// Nothing is currently believed intentional — see "What exists now" in the
// plan re: 半分/半. Add an entry here (with a comment explaining why) if a
// future multi-character key turns out to be deliberate.
const MULTI_CHAR_KEY_ALLOWLIST = new Set<string>([]);

function checkMultiCharacterKeys() {
  for (const item of KANJI_DATA) {
    const charCount = [...item.kanji].length;
    if (charCount > 1 && !MULTI_CHAR_KEY_ALLOWLIST.has(item.kanji)) {
      flag(
        "error",
        "multi-character-key",
        item.kanji,
        `Card key "${item.kanji}" has ${charCount} characters, but KanjiScrollScreen looks cards up by a single character (e.g. KANJI_WORD_FAMILIES["${item.kanji}"]). Not allowlisted as intentional.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Check: duplicate words within a curated family
// ---------------------------------------------------------------------------

function checkDuplicateWordsInFamilies() {
  for (const [kanji, entries] of Object.entries(KANJI_WORD_FAMILIES)) {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      counts.set(entry.word, (counts.get(entry.word) ?? 0) + 1);
    }
    for (const [word, count] of counts) {
      if (count > 1) {
        flag("error", "duplicate-word-in-family", kanji, `Word "${word}" appears ${count} times in this family.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Check: missing meanings, commonness, or transformation (reading-type) labels;
// unsupported reading-type values
// ---------------------------------------------------------------------------

const KNOWN_COMMONNESS = new Set<KanjiWordEntry["commonness"]>(["common", "moderate", "rare"]);
const KNOWN_READING_TYPES = new Set<KanjiWordEntry["readingType"]>(["onyomi", "kunyomi", "onyomi-variant", "irregular"]);

function checkWordFamilyFieldCompleteness() {
  for (const [kanji, entries] of Object.entries(KANJI_WORD_FAMILIES)) {
    for (const entry of entries) {
      if (!entry.meaning || entry.meaning.trim().length === 0) {
        flag("error", "missing-meaning", kanji, `Word "${entry.word}" has an empty meaning.`);
      }
      if (!entry.commonness || !KNOWN_COMMONNESS.has(entry.commonness)) {
        flag("error", "missing-or-invalid-commonness", kanji, `Word "${entry.word}" has commonness ${JSON.stringify(entry.commonness)} — expected one of common/moderate/rare.`);
      }
      if (!entry.readingType) {
        flag("error", "missing-transformation-label", kanji, `Word "${entry.word}" has no readingType set.`);
      } else if (!KNOWN_READING_TYPES.has(entry.readingType)) {
        flag("error", "unsupported-reading-type", kanji, `Word "${entry.word}" has readingType ${JSON.stringify(entry.readingType)} — not one of onyomi/kunyomi/onyomi-variant/irregular.`);
      }
    }
  }

  for (const item of KANJI_DATA) {
    if (!item.meaning || item.meaning.trim().length === 0) {
      flag("error", "missing-meaning", item.kanji, "Kanji card has an empty meaning.");
    }
  }
}

// ---------------------------------------------------------------------------
// Check: inconsistent kana/romaji
// ---------------------------------------------------------------------------

function checkKanaRomajiConsistency() {
  const checkOne = (kanji: string, label: "onyomi" | "kunyomi", kanaStr: string, romajiStr: string) => {
    const kanaTokens = kanaTokensOf(kanaStr);
    const romajiTokens = romajiTokensOf(romajiStr);
    if (kanaTokens.length !== romajiTokens.length) {
      flag(
        "error",
        "kana-romaji-token-mismatch",
        kanji,
        `${label}: ${kanaTokens.length} kana reading(s) (${JSON.stringify(kanaStr)}) vs ${romajiTokens.length} romaji token(s) (${JSON.stringify(romajiStr)}).`,
      );
    }
    if (/[^\x00-\x7F]/.test(romajiStr)) {
      flag("error", "non-latin-in-romaji", kanji, `${label}Romaji ${JSON.stringify(romajiStr)} contains a non-ASCII character.`);
    }
  };

  for (const item of KANJI_DATA) {
    checkOne(item.kanji, "onyomi", item.onyomi, item.onyomiRomaji);
    checkOne(item.kanji, "kunyomi", item.kunyomi, item.kunyomiRomaji);
  }
}

// ---------------------------------------------------------------------------
// Check: declared reading absent from examples / example reading absent from records
// ---------------------------------------------------------------------------

function checkReadingsAgainstExamples() {
  for (const item of KANJI_DATA) {
    const declaredTokens = [
      ...kanaTokensOf(item.onyomi).map((t) => ({ token: t, label: "onyomi" as const })),
      ...kanaTokensOf(item.kunyomi).map((t) => ({ token: t, label: "kunyomi" as const })),
    ];
    const furiganas = (item.examples || []).map(furiganaOf).filter((f): f is string => f !== null);

    // Direction 1: every declared reading should show up in at least one example.
    for (const { token, label } of declaredTokens) {
      const demonstrated = furiganas.some((f) => readingAppearsIn(token, f));
      if (!demonstrated) {
        flag(
          "warning",
          "declared-reading-not-in-examples",
          item.kanji,
          `Declared ${label} reading "${token}" isn't matched (even loosely) by any of this card's examples: ${JSON.stringify(furiganas)}.`,
        );
      }
    }

    // Direction 2: every example's reading should be traceable to at least one declared reading.
    for (const f of furiganas) {
      const traceable = declaredTokens.some(({ token }) => readingAppearsIn(token, f));
      if (!traceable) {
        flag(
          "warning",
          "example-reading-not-in-records",
          item.kanji,
          `Example reading "${f}" isn't matched (even loosely) by any declared reading — onyomi ${JSON.stringify(item.onyomi)}, kunyomi ${JSON.stringify(item.kunyomi)}.`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Coverage summary (not a per-item finding — the acceptance criteria asks for
// this as a clear, correct count/list, not 133 near-duplicate findings)
// ---------------------------------------------------------------------------

function coverageSummary(): { total: number; curated: string[]; uncurated: string[] } {
  const curated = KANJI_DATA.filter((item) => (KANJI_WORD_FAMILIES[item.kanji] || []).length > 0).map((i) => i.kanji);
  const uncurated = KANJI_DATA.filter((item) => (KANJI_WORD_FAMILIES[item.kanji] || []).length === 0).map((i) => i.kanji);
  return { total: KANJI_DATA.length, curated, uncurated };
}

// ---------------------------------------------------------------------------
// Run everything, print report
// ---------------------------------------------------------------------------

function run() {
  checkMultiCharacterKeys();
  checkDuplicateWordsInFamilies();
  checkWordFamilyFieldCompleteness();
  checkKanaRomajiConsistency();
  checkReadingsAgainstExamples();

  const coverage = coverageSummary();
  const lines: string[] = [];
  const out = (s: string = "") => lines.push(s);

  out("=".repeat(78));
  out("KANJI DATA AUDIT REPORT");
  out(`Generated: ${new Date().toISOString()}`);
  out("=".repeat(78));
  out();
  out(`Total kanji cards: ${coverage.total}`);
  out(`Curated word families: ${coverage.curated.length} kanji (${coverage.curated.join("、")})`);
  out(`No curated word family: ${coverage.uncurated.length} kanji`);
  out(coverage.uncurated.join("、"));
  out();

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  out(`Findings: ${errors.length} error(s), ${warnings.length} warning(s)`);
  out();

  const byCategory = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = byCategory.get(f.category) ?? [];
    list.push(f);
    byCategory.set(f.category, list);
  }

  for (const [category, items] of [...byCategory.entries()].sort()) {
    out("-".repeat(78));
    out(`${category.toUpperCase()} (${items.length})`);
    out("-".repeat(78));
    for (const item of items) {
      out(`  [${item.severity}] ${item.kanji}: ${item.message}`);
    }
    out();
  }

  const report = lines.join("\n");
  console.log(report);

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const reportsDir = join(scriptDir, "..", "reports");
  mkdirSync(reportsDir, { recursive: true });
  const reportPath = join(reportsDir, "kanji-data-audit.md");
  writeFileSync(reportPath, "```text\n" + report + "\n```\n", "utf-8");
  console.log(`\n(report written to ${reportPath})`);
}

run();
