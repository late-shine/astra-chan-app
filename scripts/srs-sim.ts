/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Phase S1 check script — a standalone dev tool, NOT a UI feature. It exercises the
 * pure scheduler in src/srsScheduler.ts:
 *
 *   1. a legacy deck loads unchanged (levels, nextReview, due count)
 *   2. ladder, wrong-answer, fuzz and history-field rules
 *   3. defensive normalization of corrupt cards
 *   4. the cloud merge (lastReviewed rules, idempotence, parity with the old rule)
 *   5. a 365-day simulation, old rules vs new rules, printing reviews per day
 *
 * It never touches the app, Firebase, localStorage, or any data file. The "old rules"
 * below are a verbatim model of the pre-S1 hook and the pre-S1 mergeSrsCards, kept here
 * only so the comparisons are against the real previous behaviour.
 *
 * Exits with code 1 if any check fails. The load numbers in section 5 are a simplified
 * model (flat retention, instant answering, no daily cap), not a promise.
 *
 * Run with: npx tsx scripts/srs-sim.ts   (from the project root)
 *
 * Optional review gate: pass an exported backup to check YOUR real deck loads unchanged:
 *   npx tsx scripts/srs-sim.ts path/to/astra-progress-2026-10-04.json
 * The file is only read, never written, and nothing from it is printed except counts.
 */

import { readFileSync } from "node:fs";

import {
  FUZZ_MIN_INTERVAL_MS,
  FUZZ_RATIO,
  INTERVALS_MS,
  MAX_INTERVAL_MS,
  MAX_LEVEL,
  WRONG_INTERVAL_MS,
  applyFuzz,
  createNewCard,
  isNewCard,
  mergeSrsCards,
  normalizeCard,
  normalizeSrsCards,
  scheduleAnswer,
  seededRandom,
} from "../src/srsScheduler";
import type { SRSCard } from "../src/types";

// ─── tiny harness ────────────────────────────────────────────────────────────

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) passed++;
  else failures.push(`${name}${detail ? `  (${detail})` : ""}`);
}

function section(title: string): void {
  console.log(`\n── ${title}`);
}

/** Realtime Database rejects any undefined value, anywhere. */
function containsUndefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some(containsUndefined);
  return false;
}

/** Key-order-independent JSON, for deep equality. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_key, inner) =>
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
      : inner
  );
}

/** Small seeded generator for reproducible "random" decks and answers. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = 1_800_000_000_000;

// ─── models of the PRE-S1 behaviour (for comparison only) ───────────────────

const OLD_LADDER_MS = [8 * HOUR, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];
const OLD_WRONG_MS = 4 * HOUR;

type OldCard = { level: number; nextReview: number; type: SRSCard["type"]; itemKey: string };

function oldAnswer(card: OldCard, correct: boolean, now: number): OldCard {
  if (correct) {
    const level = Math.min(5, card.level + 1);
    return { ...card, level, nextReview: now + OLD_LADDER_MS[level] };
  }
  return { ...card, level: Math.max(0, card.level - 1), nextReview: now + OLD_WRONG_MS };
}

/** The pre-S1 mergeSrsCards from App.tsx, verbatim apart from taking `now`. */
function oldMerge(local: Record<string, OldCard>, cloud: Record<string, OldCard>, now: number): Record<string, OldCard> {
  const merged: Record<string, OldCard> = { ...cloud };
  Object.entries(local).forEach(([itemKey, localCard]) => {
    const cloudCard = merged[itemKey];
    if (!cloudCard) {
      merged[itemKey] = localCard;
      return;
    }
    if ((localCard.nextReview > now && cloudCard.nextReview <= now) || localCard.nextReview > cloudCard.nextReview) {
      merged[itemKey] = localCard;
    }
  });
  return merged;
}

function legacyDeck(count: number, seed: number): Record<string, SRSCard> {
  const random = lcg(seed);
  const deck: Record<string, SRSCard> = {};
  const types: SRSCard["type"][] = ["vocab", "kanji", "vocab", "vocab"];
  for (let i = 0; i < count; i++) {
    const key = `card-${i}`;
    deck[key] = {
      level: Math.floor(random() * 6),
      nextReview: NOW + Math.round((random() - 0.45) * 40 * DAY),
      type: types[i % types.length],
      itemKey: key,
    };
  }
  return deck;
}

const dueCount = (deck: Record<string, { nextReview: number }>, now: number) =>
  Object.values(deck).filter((card) => card.nextReview <= now).length;

// ─── 1. Legacy deck loads unchanged ──────────────────────────────────────────

section("A legacy deck loads unchanged");

{
  const legacy = legacyDeck(600, 11);
  const loaded = normalizeSrsCards(JSON.parse(JSON.stringify(legacy)), NOW);
  check("every legacy card is deep-equal after normalizing (nothing invented)", stable(loaded) === stable(legacy));
  check("no legacy card gained reps/lapses/addedAt/lastReviewed",
    Object.values(loaded).every((c) => !("reps" in c) && !("lapses" in c) && !("addedAt" in c) && !("lastReviewed" in c)));
  check("level and nextReview are identical for all 600 cards",
    Object.keys(legacy).every((k) => loaded[k].level === legacy[k].level && loaded[k].nextReview === legacy[k].nextReview));
  check("due count is identical at the same clock", dueCount(loaded, NOW) === dueCount(legacy, NOW));
  check("due count is identical a day later too", dueCount(loaded, NOW + DAY) === dueCount(legacy, NOW + DAY));
  check("a legacy card is never treated as new", Object.values(loaded).every((c) => !isNewCard(c)));
  check("loading twice is stable (idempotent)", stable(normalizeSrsCards(loaded, NOW + 5 * DAY)) === stable(loaded));
}

// ─── 2. Ladder, answers, fuzz, history fields ────────────────────────────────

section("Ladder, answers, fuzz");

{
  check("ladder has 9 rungs, strictly increasing", INTERVALS_MS.length === 9 && INTERVALS_MS.every((v, i) => i === 0 || v > INTERVALS_MS[i - 1]));
  check("rungs 0–5 are exactly the pre-S1 intervals", OLD_LADDER_MS.every((v, i) => INTERVALS_MS[i] === v));
  check("rungs 6–8 are 60d / 120d / 240d", INTERVALS_MS[6] === 60 * DAY && INTERVALS_MS[7] === 120 * DAY && INTERVALS_MS[8] === 240 * DAY);
  check("wrong interval is still 4 hours", WRONG_INTERVAL_MS === 4 * HOUR);
  check("MAX_LEVEL is 8", MAX_LEVEL === 8);

  const base: SRSCard = { level: 0, nextReview: NOW, type: "vocab", itemKey: "x" };

  // Correct answers climb level by level to 8 and stay there.
  let card: SRSCard = { ...base };
  const seen: number[] = [];
  for (let step = 0; step < 12; step++) {
    card = scheduleAnswer(card, true, NOW, seededRandom(`t${step}`));
    seen.push(card.level);
  }
  check("correct answers climb 1..8 then stay at 8", seen.join() === "1,2,3,4,5,6,7,8,8,8,8,8", seen.join());

  // Interval per level, un-fuzzed rungs exact, fuzzed rungs within ±12%.
  for (let from = 0; from < MAX_LEVEL; from++) {
    const after = scheduleAnswer({ ...base, level: from }, true, NOW);
    const to = from + 1;
    const interval = after.nextReview - NOW;
    const ladder = INTERVALS_MS[to];
    const ok = ladder < FUZZ_MIN_INTERVAL_MS
      ? interval === ladder
      : interval >= Math.floor(ladder * (1 - FUZZ_RATIO)) && interval <= Math.ceil(ladder * (1 + FUZZ_RATIO));
    check(`correct at level ${from} → level ${to}, interval ${ladder / DAY}d (±fuzz)`, after.level === to && ok, `interval ${interval / DAY}d`);
  }
  {
    const atMax = scheduleAnswer({ ...base, level: 8 }, true, NOW);
    check("correct at level 8 stays at 8 with a ~240d interval",
      atMax.level === 8 && atMax.nextReview - NOW <= MAX_INTERVAL_MS && atMax.nextReview - NOW >= 240 * DAY * (1 - FUZZ_RATIO) - 1);
  }

  // Wrong answers.
  const expectedAfterWrong = [0, 0, 1, 1, 2, 2, 3, 3, 4];
  for (let level = 0; level <= 8; level++) {
    const before: SRSCard = { ...base, level, lapses: 2, reps: 5 };
    const after = scheduleAnswer(before, false, NOW);
    check(`wrong at level ${level} → ${expectedAfterWrong[level]}`,
      after.level === expectedAfterWrong[level] && after.nextReview === NOW + 4 * HOUR && after.lapses === 3 && after.lastReviewed === NOW && after.reps === 5);
  }
  {
    const legacyWrong = scheduleAnswer(base, false, NOW);
    check("wrong on a legacy card: lapses 1, lastReviewed set, still no `reps` invented",
      legacyWrong.lapses === 1 && legacyWrong.lastReviewed === NOW && !("reps" in legacyWrong));
    const legacyRight = scheduleAnswer(base, true, NOW);
    check("correct on a legacy card: reps becomes 1 (never 0), lastReviewed set",
      legacyRight.reps === 1 && legacyRight.lastReviewed === NOW && !isNewCard(legacyRight));
  }

  // New cards.
  {
    const fresh = createNewCard("新", "vocab", NOW);
    check("new card: level 0, due in 8h, reps 0, lapses 0, addedAt now",
      fresh.level === 0 && fresh.nextReview === NOW + 8 * HOUR && fresh.reps === 0 && fresh.lapses === 0 && fresh.addedAt === NOW);
    check("new card is new; correct answer makes it not-new", isNewCard(fresh) && !isNewCard(scheduleAnswer(fresh, true, NOW + 9 * HOUR)));
    check("a new card failed on its first showing is no longer new", !isNewCard(scheduleAnswer(fresh, false, NOW + 9 * HOUR)));
    check("answering keeps addedAt", scheduleAnswer(fresh, true, NOW + 9 * HOUR).addedAt === NOW);
  }

  // Purity and cloud-safety.
  {
    const frozen = Object.freeze({ ...base, level: 3 });
    let threw = false;
    try { scheduleAnswer(frozen, true, NOW); scheduleAnswer(frozen, false, NOW); } catch { threw = true; }
    check("scheduleAnswer never mutates its input", !threw && frozen.level === 3);
    const outputs = [createNewCard("a", "kanji", NOW), scheduleAnswer(base, true, NOW), scheduleAnswer(base, false, NOW)];
    check("no output contains undefined", outputs.every((o) => !containsUndefined(o)));
    check("outputs survive a JSON round trip unchanged", outputs.every((o) => stable(JSON.parse(JSON.stringify(o))) === stable(o)));
    check("nextReview is always an integer", outputs.every((o) => Number.isInteger(o.nextReview)));
    check("same card + same state gives the same schedule (StrictMode-safe)",
      stable(scheduleAnswer({ ...base, level: 3 }, true, NOW)) === stable(scheduleAnswer({ ...base, level: 3 }, true, NOW)));
  }
}

section("Fuzz");

{
  const samples = 4000;
  const factors: number[] = [];
  for (let i = 0; i < samples; i++) factors.push(applyFuzz(10 * DAY, seededRandom(`s${i}`)) / (10 * DAY));
  const min = Math.min(...factors);
  const max = Math.max(...factors);
  const mean = factors.reduce((a, b) => a + b, 0) / samples;
  check("fuzz stays within ±12%", min >= 1 - FUZZ_RATIO - 1e-9 && max <= 1 + FUZZ_RATIO + 1e-9, `${min.toFixed(3)}..${max.toFixed(3)}`);
  check("fuzz actually uses the range (min < 0.90, max > 1.10)", min < 0.9 && max > 1.1);
  check("fuzz is centred (mean within 1%)", Math.abs(mean - 1) < 0.01, mean.toFixed(4));
  check("no fuzz under 3 days (1d, 8h, 4h unchanged)",
    applyFuzz(DAY, () => 0.99) === DAY && applyFuzz(8 * HOUR, () => 0.01) === 8 * HOUR && applyFuzz(4 * HOUR, () => 0.5) === 4 * HOUR);
  check("fuzz applies from exactly 3 days", applyFuzz(3 * DAY, () => 0) < 3 * DAY && applyFuzz(3 * DAY, () => 0.99) > 3 * DAY);
  check("fuzz bounds: random 0 → ×0.88, random → 1 stays below ×1.12",
    applyFuzz(100 * DAY, () => 0) === Math.round(100 * DAY * 0.88) && applyFuzz(100 * DAY, () => 0.999999) < 100 * DAY * 1.12);
  check("longest possible interval is 240d × 1.12", MAX_INTERVAL_MS === 240 * DAY * 1.12);

  // The point of fuzz: cards added in one sitting stop coming due together.
  const sitting: SRSCard[] = Array.from({ length: 300 }, (_, i) => createNewCard(`w${i}`, "vocab", NOW));
  const atLevel2 = sitting.map((c) => scheduleAnswer(scheduleAnswer(c, true, NOW + DAY), true, NOW + 2 * DAY));
  const distinct = new Set(atLevel2.map((c) => c.nextReview)).size;
  check("300 cards added together get spread-out due times at level 2", distinct > 280, `${distinct} distinct`);
}

// ─── 3. Defensive normalization ──────────────────────────────────────────────

section("Defensive normalization");

{
  const bad: unknown[] = [
    null, undefined, 5, "card", true, [], [1, 2], {}, { level: "x" },
    { itemKey: "a", level: NaN, nextReview: NaN, type: 42 },
    { itemKey: "b", level: Infinity, nextReview: -Infinity, type: null },
    { itemKey: "c", level: "3", nextReview: "1800000000000", type: "kanji", reps: "4", lapses: -2 },
    { itemKey: "d", level: 99, nextReview: "2026-10-04T00:00:00Z", type: "vocab", lastReviewed: "yesterday", addedAt: {} },
    { itemKey: "e", level: -7, nextReview: {}, type: "hiragana", extra: { nested: true }, flag: true, note: "hi", big: Infinity },
  ];
  let threw = false;
  const outputs: (SRSCard | null)[] = [];
  try { for (const item of bad) outputs.push(normalizeCard(item, NOW, "fallback")); } catch { threw = true; }
  check("normalizeCard never throws on garbage", !threw);
  const kept = outputs.filter((c): c is SRSCard => c !== null);
  check("every kept card is valid (level 0–8 integer, finite nextReview, known type, string itemKey)",
    kept.every((c) => Number.isInteger(c.level) && c.level >= 0 && c.level <= 8 && Number.isFinite(c.nextReview) &&
      ["vocab", "kanji", "hiragana", "katakana"].includes(c.type) && typeof c.itemKey === "string" && c.itemKey !== ""));
  check("no normalized card contains undefined", kept.every((c) => !containsUndefined(c)));
  check("null / numbers / strings / arrays are dropped; objects with a fallback key are kept",
    outputs[0] === null && outputs[2] === null && outputs[3] === null && outputs[5] === null && outputs[7] !== null);

  const byKey = Object.fromEntries(kept.map((c) => [c.itemKey, c]));
  check("NaN level → 0 and NaN timestamp → now", byKey.a.level === 0 && byKey.a.nextReview === NOW && byKey.a.type === "vocab");
  check("Infinity level → 0, -Infinity timestamp → now", byKey.b.level === 0 && byKey.b.nextReview === NOW);
  check("string level and numeric-string timestamp are converted", byKey.c.level === 3 && byKey.c.nextReview === 1_800_000_000_000 && byKey.c.type === "kanji");
  check("numeric-string reps kept, negative lapses omitted", byKey.c.reps === 4 && !("lapses" in byKey.c));
  check("level 99 clamps to 8; a date string becomes a timestamp", byKey.d.level === 8 && byKey.d.nextReview === Date.parse("2026-10-04T00:00:00Z"));
  check("unparseable lastReviewed and object addedAt are omitted", !("lastReviewed" in byKey.d) && !("addedAt" in byKey.d));
  check("negative level clamps to 0; unusable nextReview → now", byKey.e.level === 0 && byKey.e.nextReview === NOW);
  check("unknown primitive fields pass through (forward-compat); objects and non-finite numbers are dropped",
    (byKey.e as any).flag === true && (byKey.e as any).note === "hi" && !("extra" in byKey.e) && !("big" in byKey.e));
  check("normalizing twice changes nothing (idempotent)", kept.every((c) => stable(normalizeCard(c, NOW + 9 * DAY)) === stable(c)));

  check("a card missing itemKey takes the map key", normalizeSrsCards({ "山": { level: 2, nextReview: NOW, type: "vocab" } }, NOW)["山"].itemKey === "山");
  check("an existing itemKey is never overwritten by the map key (S5-safe)",
    normalizeSrsCards({ "kanji:山": { level: 2, nextReview: NOW, type: "kanji", itemKey: "山" } }, NOW)["kanji:山"].itemKey === "山");
  check("non-object decks give an empty deck",
    [null, undefined, 5, "x", true].every((v) => Object.keys(normalizeSrsCards(v, NOW)).length === 0));

  const hostile = normalizeSrsCards(JSON.parse('{"__proto__":{"level":1,"nextReview":1,"type":"vocab","itemKey":"p"},"ok":{"level":1,"nextReview":1,"type":"vocab","itemKey":"ok"}}'), NOW);
  check("a __proto__ key from an imported file is dropped", Object.keys(hostile).join() === "ok" && Object.getPrototypeOf(hostile) === Object.prototype);
}

// ─── 4. Cloud merge ──────────────────────────────────────────────────────────

section("Cloud merge");

const card = (patch: Partial<SRSCard>): SRSCard => ({ level: 3, nextReview: NOW + 5 * DAY, type: "vocab", itemKey: "k", ...patch });
const mergeOne = (local: SRSCard, cloud: SRSCard): SRSCard => mergeSrsCards({ k: local }, { k: cloud }, NOW).k;

{
  // The bug S1 fixes: a failed local card must not be overwritten by a stale cloud copy.
  const stale = card({ level: 5, nextReview: NOW + 30 * DAY, lastReviewed: NOW - 5 * DAY, reps: 6 });
  const failedLocal = scheduleAnswer(stale, false, NOW);
  const result = mergeOne(failedLocal, stale);
  check("a failed local card beats a stale cloud copy (lastReviewed present)", result.level === 2 && result.lastReviewed === NOW && result.lapses === 1);
  check("the same failure is not lost when the roles are reversed (cloud holds the failure)", mergeOne(stale, failedLocal).level === 2);
  const old = oldMerge({ k: { ...failedLocal } as OldCard }, { k: { ...stale } as OldCard }, NOW).k;
  check("(old behaviour) the pre-S1 merge would have restored the stale copy", old.level === 5);
}
{
  const a = card({ lastReviewed: NOW - 2 * DAY, nextReview: NOW + DAY, level: 1 });
  const b = card({ lastReviewed: NOW - 1 * DAY, nextReview: NOW + 60 * DAY, level: 6 });
  check("both have lastReviewed → the later review wins (local later)", mergeOne({ ...b }, { ...a }).level === 6);
  check("both have lastReviewed → the later review wins (cloud later)", mergeOne({ ...a }, { ...b }).level === 6);
  check("the later review wins even when the other copy has a later nextReview",
    mergeOne(card({ lastReviewed: NOW, nextReview: NOW + 4 * HOUR, level: 2 }), card({ lastReviewed: NOW - DAY, nextReview: NOW + 90 * DAY, level: 7 })).level === 2);
}
{
  const t = NOW - DAY;
  check("same lastReviewed → higher reps wins (local)", mergeOne(card({ lastReviewed: t, reps: 9, level: 4 }), card({ lastReviewed: t, reps: 3, level: 6 })).level === 4);
  check("same lastReviewed → higher reps wins (cloud)", mergeOne(card({ lastReviewed: t, reps: 3, level: 4 }), card({ lastReviewed: t, reps: 9, level: 6 })).level === 6);
  check("missing reps counts as 0 in the tie-break", mergeOne(card({ lastReviewed: t, level: 4 }), card({ lastReviewed: t, reps: 1, level: 6 })).level === 6);
  check("full tie falls back to the later nextReview", mergeOne(card({ lastReviewed: t, reps: 2, nextReview: NOW + 9 * DAY, level: 4 }), card({ lastReviewed: t, reps: 2, nextReview: NOW + 2 * DAY, level: 6 })).level === 4);
}
{
  const reviewed = card({ lastReviewed: NOW - 3 * DAY, level: 2, nextReview: NOW + DAY });
  const legacy = card({ level: 7, nextReview: NOW + 100 * DAY });
  check("exactly one has lastReviewed → it wins (cloud has it)", mergeOne(legacy, reviewed).level === 2);
  check("exactly one has lastReviewed → it wins (local has it)", mergeOne(reviewed, legacy).level === 2);
}
{
  check("neither has lastReviewed → later nextReview wins (local)", mergeOne(card({ level: 4, nextReview: NOW + 20 * DAY }), card({ level: 2, nextReview: NOW + 3 * DAY })).level === 4);
  check("neither has lastReviewed → later nextReview wins (cloud)", mergeOne(card({ level: 2, nextReview: NOW + 3 * DAY }), card({ level: 4, nextReview: NOW + 20 * DAY })).level === 4);
  check("neither has lastReviewed → a future local schedule beats a due cloud copy",
    mergeOne(card({ level: 3, nextReview: NOW + 7 * DAY }), card({ level: 1, nextReview: NOW - 2 * DAY })).level === 3);
  check("equal schedules → the cloud copy", mergeOne(card({ level: 3, nextReview: NOW + DAY }), card({ level: 4, nextReview: NOW + DAY })).level === 4);
}
{
  const local = { a: card({ itemKey: "a" }), onlyLocal: card({ itemKey: "onlyLocal" }) };
  const cloud = { a: card({ itemKey: "a" }), onlyCloud: card({ itemKey: "onlyCloud" }) };
  check("cards present on one side only are kept (union)", Object.keys(mergeSrsCards(local, cloud, NOW)).sort().join() === "a,onlyCloud,onlyLocal");
  check("merging with an empty side returns the other deck",
    stable(mergeSrsCards(local, {}, NOW)) === stable(local) && stable(mergeSrsCards({}, cloud, NOW)) === stable(cloud));
  check("corrupt cloud cards cannot throw the merge",
    (() => { try { mergeSrsCards(local, { a: null, b: 7, c: { level: "x" } } as any, NOW); mergeSrsCards(local, undefined as any, NOW); return true; } catch { return false; } })());
}

// Property tests on random decks.
{
  const random = lcg(2026);
  const makeDeck = (count: number, modern: boolean): Record<string, SRSCard> => {
    const deck: Record<string, SRSCard> = {};
    for (let i = 0; i < count; i++) {
      const key = `k${Math.floor(random() * 260)}`;
      const level = Math.floor(random() * 9);
      const c: SRSCard = { level, nextReview: NOW + Math.round((random() - 0.4) * 80 * DAY), type: "vocab", itemKey: key };
      if (modern && random() < 0.7) {
        c.lastReviewed = NOW - Math.floor(random() * 30) * HOUR * 7;
        c.reps = Math.floor(random() * 12);
        if (random() < 0.5) c.lapses = Math.floor(random() * 4);
        if (random() < 0.5) c.addedAt = NOW - 60 * DAY;
      }
      deck[key] = c;
    }
    return deck;
  };

  let idempotent = true;
  let valid = true;
  let safe = true;
  let unionOk = true;
  for (let round = 0; round < 60; round++) {
    const a = makeDeck(180, true);
    const b = makeDeck(180, true);
    const m = mergeSrsCards(a, b, NOW);
    if (stable(mergeSrsCards(m, b, NOW)) !== stable(m)) idempotent = false;
    if (stable(mergeSrsCards(a, m, NOW)) !== stable(mergeSrsCards(a, m, NOW))) idempotent = false;
    if (!Object.values(m).every((c) => Number.isInteger(c.level) && c.level >= 0 && c.level <= 8 && Number.isFinite(c.nextReview))) valid = false;
    if (containsUndefined(m) || stable(JSON.parse(JSON.stringify(m))) !== stable(m)) safe = false;
    if (Object.keys(m).sort().join() !== [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().join()) unionOk = false;
  }
  check("merge(merge(a, b), b) equals merge(a, b) on 60 random mixed decks", idempotent);
  check("merged decks contain only valid cards", valid);
  check("merged decks are cloud-safe (no undefined, JSON round trip stable)", safe);
  check("merged key set is exactly the union", unionOk);

  // Parity: with no lastReviewed anywhere, the new merge makes the same choices as the pre-S1 merge.
  let parity = true;
  let comparisons = 0;
  for (let round = 0; round < 60; round++) {
    const a = makeDeck(180, false);
    const b = makeDeck(180, false);
    const fresh = mergeSrsCards(a, b, NOW);
    const old = oldMerge(a as Record<string, OldCard>, b as Record<string, OldCard>, NOW);
    comparisons += Object.keys(old).length;
    if (stable(fresh) !== stable(old)) parity = false;
  }
  check(`legacy-only decks merge exactly as before S1 (${comparisons} cards compared)`, parity);

  // Order independence when every review time is unique (no ties to break).
  let commutes = true;
  for (let round = 0; round < 40; round++) {
    const a = makeDeck(150, true);
    const b = makeDeck(150, true);
    let stamp = 0;
    for (const deck of [a, b]) for (const c of Object.values(deck)) { c.lastReviewed = NOW - (++stamp) * 1000; c.reps = 1; }
    if (stable(mergeSrsCards(a, b, NOW)) !== stable(mergeSrsCards(b, a, NOW))) commutes = false;
  }
  check("with unique lastReviewed values the merge does not depend on which side is local", commutes);
}

// ─── 5. 365-day simulation, old rules vs new rules ───────────────────────────

section("365-day simulation (900 cards added at 10 per day for 90 days, 88% correct, no daily cap)");

{
  const DAYS = 365;
  const ADD_DAYS = 90;
  const PER_DAY = 10;
  const RETENTION = 0.88;

  const oldDeck: OldCard[] = [];
  const newDeck: SRSCard[] = [];
  const oldReviews: number[] = [];
  const newReviews: number[] = [];
  const oldDue: number[] = [];
  const newDue: number[] = [];
  const answers = lcg(7);

  let intervalOk = true;
  let levelOk = true;
  let finiteOk = true;
  let cloudSafe = true;
  let maxLevelSeen = 0;
  let longestInterval = 0;

  for (let day = 0; day < DAYS; day++) {
    const t = NOW + day * DAY + 9 * HOUR; // one review pass per day at 09:00

    if (day < ADD_DAYS) {
      for (let i = 0; i < PER_DAY; i++) {
        const key = `c${day}-${i}`;
        oldDeck.push({ level: 0, nextReview: t + OLD_LADDER_MS[0], type: "vocab", itemKey: key });
        newDeck.push(createNewCard(key, "vocab", t));
      }
    }

    // Same answer sequence for both rule sets, so the comparison is fair.
    let oldDone = 0;
    let newDone = 0;
    oldDue.push(dueCount(Object.fromEntries(oldDeck.map((c, i) => [i, c])), t));
    newDue.push(dueCount(Object.fromEntries(newDeck.map((c, i) => [i, c])), t));

    for (let i = 0; i < oldDeck.length; i++) {
      if (oldDeck[i].nextReview <= t) {
        oldDeck[i] = oldAnswer(oldDeck[i], answers() < RETENTION, t);
        oldDone++;
      }
    }
    for (let i = 0; i < newDeck.length; i++) {
      if (newDeck[i].nextReview <= t) {
        const correct = answers() < RETENTION;
        const before = newDeck[i];
        const after = scheduleAnswer(before, correct, t);
        newDeck[i] = after;
        newDone++;

        if (!Number.isFinite(after.nextReview)) finiteOk = false;
        if (after.level < 0 || after.level > MAX_LEVEL || !Number.isInteger(after.level)) levelOk = false;
        maxLevelSeen = Math.max(maxLevelSeen, after.level);
        if (correct) {
          const interval = after.nextReview - t;
          longestInterval = Math.max(longestInterval, interval);
          if (interval > MAX_INTERVAL_MS) intervalOk = false;
        }
        if (containsUndefined(after) || stable(JSON.parse(JSON.stringify(after))) !== stable(after)) cloudSafe = false;
      }
    }
    oldReviews.push(oldDone);
    newReviews.push(newDone);
  }

  const mean = (values: number[], from: number, to: number) => values.slice(from, to).reduce((a, b) => a + b, 0) / (to - from);
  const peak = (values: number[]) => Math.max(...values);
  const total = (values: number[]) => values.reduce((a, b) => a + b, 0);

  const oldSteady = mean(oldReviews, 300, 365);
  const newSteady = mean(newReviews, 300, 365);

  const row = (label: string, oldValue: string, newValue: string) =>
    console.log(`  ${label.padEnd(40)}${oldValue.padStart(12)}${newValue.padStart(12)}`);
  console.log(`  ${"".padEnd(40)}${"old rules".padStart(12)}${"new rules".padStart(12)}`);
  row("reviews/day, days 1-90 (intake) avg", mean(oldReviews, 0, 90).toFixed(1), mean(newReviews, 0, 90).toFixed(1));
  row("reviews/day, days 91-180 avg", mean(oldReviews, 90, 180).toFixed(1), mean(newReviews, 90, 180).toFixed(1));
  row("reviews/day, days 181-300 avg", mean(oldReviews, 180, 300).toFixed(1), mean(newReviews, 180, 300).toFixed(1));
  row("reviews/day, days 301-365 avg (steady)", oldSteady.toFixed(1), newSteady.toFixed(1));
  row("peak day", String(peak(oldReviews)), String(peak(newReviews)));
  row("total reviews in the year", String(total(oldReviews)), String(total(newReviews)));
  console.log(`  steady-state ratio new/old: ${(newSteady / oldSteady).toFixed(2)}   (the plan's model estimated about 10 vs about 35)`);
  console.log(`  highest level reached: ${maxLevelSeen}   longest correct interval: ${(longestInterval / DAY).toFixed(1)}d (limit ${(MAX_INTERVAL_MS / DAY).toFixed(1)}d)`);
  console.log("  note: the intake-phase peak is NOT reduced by S1; that is what S2's daily cap is for.");

  check("sim: no NaN/Infinity in any nextReview", finiteOk);
  check("sim: level stays an integer within 0–8", levelOk);
  check("sim: no interval exceeds 240d plus fuzz", intervalOk, `${(longestInterval / DAY).toFixed(1)}d`);
  check("sim: every scheduled card is cloud-safe (no undefined, JSON round trip stable)", cloudSafe);
  check("sim: the ladder is actually used beyond the old ceiling (level 6+ reached)", maxLevelSeen >= 6, `max ${maxLevelSeen}`);
  check("sim: steady-state load is lower under the new rules", newSteady < oldSteady, `${newSteady.toFixed(1)} vs ${oldSteady.toFixed(1)}`);
  check("sim: the new rules cut the steady-state load by at least a third", newSteady <= oldSteady * (2 / 3), `ratio ${(newSteady / oldSteady).toFixed(2)}`);
}

// ─── 6. Optional: a real exported deck ───────────────────────────────────────

const backupPath = process.argv[2];
if (backupPath) {
  section(`Your deck: ${backupPath}`);
  try {
    const parsed = JSON.parse(readFileSync(backupPath, "utf8"));
    const stats = parsed?.stats ?? parsed;
    const raw: Record<string, any> = stats?.srsCards && typeof stats.srsCards === "object" ? stats.srsCards : {};
    const clockNow = Date.now();
    const loaded = normalizeSrsCards(raw, clockNow);
    const rawEntries = Object.entries(raw);

    const isValid = (c: any) =>
      c && typeof c === "object" && Number.isFinite(c.level) && Number.isInteger(c.level) && c.level >= 0 && c.level <= 8 &&
      typeof c.nextReview === "number" && Number.isFinite(c.nextReview) &&
      ["vocab", "kanji", "hiragana", "katakana"].includes(c.type) && typeof c.itemKey === "string";

    const validEntries = rawEntries.filter(([, c]) => isValid(c));
    const changed = validEntries.filter(([k, c]) => loaded[k]?.level !== c.level || loaded[k]?.nextReview !== c.nextReview);
    const repaired = rawEntries.length - validEntries.length;
    const rawDue = rawEntries.filter(([, c]) => isValid(c) && c.nextReview <= clockNow).length;
    const loadedDue = validEntries.filter(([k]) => loaded[k] && loaded[k].nextReview <= clockNow).length;
    const histogram: Record<number, number> = {};
    validEntries.forEach(([, c]) => { histogram[c.level] = (histogram[c.level] ?? 0) + 1; });

    console.log(`  cards in file: ${rawEntries.length}   valid: ${validEntries.length}   needing repair or dropped: ${repaired}`);
    console.log(`  levels (valid cards): ${Object.entries(histogram).map(([l, n]) => `L${l}:${n}`).join("  ") || "none"}`);
    console.log(`  due right now: ${rawDue} before, ${loadedDue} after loading`);
    console.log(`  cards with S1 history fields already: ${validEntries.filter(([, c]) => c.reps !== undefined || c.lastReviewed !== undefined).length}`);

    check("your deck: every valid card keeps its level and nextReview", changed.length === 0, `${changed.length} changed`);
    check("your deck: due count is identical before and after loading", rawDue === loadedDue, `${rawDue} vs ${loadedDue}`);
    check("your deck: no valid card was invented or dropped", validEntries.every(([k]) => k in loaded));
  } catch (error) {
    check("your deck: the file could be read as an Astra backup", false, error instanceof Error ? error.message : String(error));
  }
}

// ─── report ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} checks passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.forEach((failure) => console.log(`  ✗ ${failure}`));
  process.exit(1);
}
console.log("S1 scheduler checks: all green.");
