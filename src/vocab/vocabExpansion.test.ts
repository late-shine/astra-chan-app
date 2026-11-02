import test from "node:test";
import assert from "node:assert/strict";
import { VOCABULARY_DATA } from "../data";
import { VOCAB_PHASE_1_CORE_GLUE } from "./vocabPhase1CoreGlue";
import { VOCAB_PHASE_2_TIME_PEOPLE } from "./vocabPhase2TimePeople";
import { VOCAB_PHASE_3_WORLD_DAILY } from "./vocabPhase3WorldDaily";
import {
  VOCAB_CATEGORY_META,
  countVocabularyByCategory,
} from "./vocabCategories";

const PURE_HIRAGANA_READING_RE = /^[\u3041-\u3096ー\s/]+$/;

test("Phase 1, 2, and 3 modules match target entry counts and total 900 N5 words", () => {
  assert.equal(VOCAB_PHASE_1_CORE_GLUE.length, 62);
  assert.equal(VOCAB_PHASE_2_TIME_PEOPLE.length, 58);
  assert.equal(VOCAB_PHASE_3_WORLD_DAILY.length, 89);
  assert.equal(VOCABULARY_DATA.length, 900);
});

test("Every expanded vocabulary entry has valid non-empty fields and pure hiragana reading", () => {
  const validCategories = new Set(VOCAB_CATEGORY_META.map((c) => c.id));
  const expanded = [
    ...VOCAB_PHASE_1_CORE_GLUE,
    ...VOCAB_PHASE_2_TIME_PEOPLE,
    ...VOCAB_PHASE_3_WORLD_DAILY,
  ];

  for (const item of expanded) {
    assert.ok(item.word.trim().length > 0, `Empty word in ${JSON.stringify(item)}`);
    assert.ok(item.hiragana.trim().length > 0, `Empty hiragana for ${item.word}`);
    assert.ok(item.romaji.trim().length > 0, `Empty romaji for ${item.word}`);
    assert.ok(item.english.trim().length > 0, `Empty english for ${item.word}`);
    assert.ok(
      validCategories.has(item.category),
      `Invalid category "${item.category}" for ${item.word}`
    );
    assert.match(
      item.hiragana,
      PURE_HIRAGANA_READING_RE,
      `Hiragana field must contain only hiragana/long-vowel marks for ${item.word}: got "${item.hiragana}"`
    );
  }
});

test("No new duplicate word keys are introduced across all 900 VOCABULARY_DATA entries", () => {
  const wordCounts = new Map<string, number>();
  for (const item of VOCABULARY_DATA) {
    wordCounts.set(item.word, (wordCounts.get(item.word) ?? 0) + 1);
  }

  const duplicates = [...wordCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([word]) => word)
    .sort();

  // Only the two pre-existing homograph pairs in Part 1/2 (辛い karai/tsurai, ノート objects/school) may exist
  assert.deepEqual(duplicates, ["ノート", "辛い"]);

  // Every new word across Phases 1-3 appears exactly once in VOCABULARY_DATA
  for (const item of [
    ...VOCAB_PHASE_1_CORE_GLUE,
    ...VOCAB_PHASE_2_TIME_PEOPLE,
    ...VOCAB_PHASE_3_WORLD_DAILY,
  ]) {
    assert.equal(
      wordCounts.get(item.word),
      1,
      `Expanded word "${item.word}" collided with another entry`
    );
  }
});

test("VOCAB_CATEGORY_META covers 100% of categories in VOCABULARY_DATA and counts sum to total", () => {
  const counts = countVocabularyByCategory(VOCABULARY_DATA);
  let sum = 0;
  for (const meta of VOCAB_CATEGORY_META) {
    assert.ok(
      counts[meta.id] > 0,
      `Category "${meta.id}" should have at least 1 word`
    );
    sum += counts[meta.id];
  }
  assert.equal(sum, VOCABULARY_DATA.length);
});
