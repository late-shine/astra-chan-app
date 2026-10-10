/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Phase S1 + S2 + S3 + S4 check script — a standalone dev tool, NOT a UI feature. It exercises the
 * pure scheduler in src/srsScheduler.ts:
 *
 *   1. a legacy deck loads unchanged (levels, nextReview, due count)
 *   2. ladder, wrong-answer, fuzz and history-field rules
 *   3. defensive normalization of corrupt cards
 *   4. the cloud merge (lastReviewed rules, idempotence, parity with the old rule)
 *   5. a 365-day simulation, old rules vs new rules, printing reviews per day
 *   6. (S2) the relearn step, introducedAt, daily limits and their merge, the derived daily
 *      counters, session queue construction, and a 365-day simulation WITH the daily caps
 *   7. (S3) the three grades, per-card ease, overdue credit, the 365-day ceiling, interval previews
 *      (which must match what the next answer schedules), the 7-day forecast, and a 365-day
 *      simulation that uses all three grades
 *   8. (S4) tricky cards (leeches): flagged on the 6th Forgot, set aside from queues, counts and the forecast,
 *      Put back, the merge, and the backlog tool (very overdue cards spread over the next days)
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
  BACKLOG_OFFER_FACTOR,
  DEFAULT_EASE,
  EASE_DELTA,
  FUZZ_MIN_INTERVAL_MS,
  FUZZ_RATIO,
  HARD_INTERVAL_FACTOR,
  INTERVALS_MS,
  LEECH_LAPSE_THRESHOLD,
  MAX_EASE,
  MAX_INTERVAL_MS,
  MAX_LEVEL,
  MAX_RELEARN_REQUEUES,
  MIN_EASE,
  MIN_RECALL_INTERVAL_MS,
  RELEARN_INTERVAL_MS,
  RESCHEDULE_LEVEL,
  RESCHEDULE_MAX_DAYS,
  RESCHEDULE_MIN_DAYS,
  RESCHEDULE_MIN_PER_DAY,
  SRS_GRADES,
  UNLIMITED_REVIEWS,
  VERY_OVERDUE_MIN_MS,
  VERY_OVERDUE_RATIO,
  applyFuzz,
  buildForecast,
  buildSessionPlan,
  cardEase,
  createNewCard,
  defaultSrsSettings,
  formatForecastLine,
  formatIntervalShort,
  formatSessionLine,
  formatWaitingLine,
  gradeIntervalMs,
  isLeech,
  isNewCard,
  isVeryOverdue,
  listTrickyCards,
  localDayRange,
  mergeSrsCards,
  mergeSrsSettings,
  normalizeCard,
  normalizeSrsCards,
  normalizeSrsSettings,
  overdueRatio,
  previewIntervals,
  putBackLeech,
  relearnIntervalMs,
  rescheduleSpreadDays,
  rescheduleVeryOverdue,
  scheduleAnswer,
  scheduleGrade,
  scheduleRelearnAnswer,
  scheduleRelearnGrade,
  seededRandom,
  summarizeSession,
  type SrsGrade,
} from "../src/srsScheduler";
import type { SRSCard, SrsSettings } from "../src/types";

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
  check("wrong interval is the 10-minute relearn step (S2; S1 used 4 hours)", RELEARN_INTERVAL_MS === 10 * 60 * 1000);
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
      after.level === expectedAfterWrong[level] && after.nextReview === NOW + RELEARN_INTERVAL_MS && after.lapses === 3 && after.lastReviewed === NOW && after.reps === 5);
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
  // S3 changed this: ease (up to 1.4) and fuzz on the 240d rung could reach ~376d, so there is now a hard ceiling.
  check("S3: the absolute interval ceiling is 365 days (S1/S2 had 240d × 1.12)", MAX_INTERVAL_MS === 365 * DAY && MAX_INTERVAL_MS > 240 * DAY * 1.12);

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
  check("sim: no interval exceeds the 365-day ceiling", intervalOk, `${(longestInterval / DAY).toFixed(1)}d`);
  check("sim: every scheduled card is cloud-safe (no undefined, JSON round trip stable)", cloudSafe);
  check("sim: the ladder is actually used beyond the old ceiling (level 6+ reached)", maxLevelSeen >= 6, `max ${maxLevelSeen}`);
  check("sim: steady-state load is lower under the new rules", newSteady < oldSteady, `${newSteady.toFixed(1)} vs ${oldSteady.toFixed(1)}`);
  check("sim: the new rules cut the steady-state load by at least a third", newSteady <= oldSteady * (2 / 3), `ratio ${(newSteady / oldSteady).toFixed(2)}`);
}

// ─── 6. S2: relearn, introducedAt, daily limits, session queue ───────────────

/** Local-time helpers: the daily counters use the local calendar day. */
const localAt = (dayOffset: number, hour: number, minute = 0) => new Date(2027, 0, 15 + dayOffset, hour, minute).getTime();
const TODAY_NOON = localAt(0, 12);
const MIN = 60 * 1000;

/** A due, non-new review card. */
function reviewCard(key: string, extra: Partial<SRSCard> = {}): SRSCard {
  return { level: 2, nextReview: TODAY_NOON - 3 * HOUR, type: "vocab", itemKey: key, reps: 3, lapses: 0, lastReviewed: TODAY_NOON - 3 * HOUR - 3 * DAY, ...extra };
}
/** A brand-new card that is already due. */
function newCard(key: string, addedAt: number, extra: Partial<SRSCard> = {}): SRSCard {
  return { level: 0, nextReview: addedAt + 8 * HOUR, type: "vocab", itemKey: key, reps: 0, lapses: 0, addedAt, ...extra };
}
const deckOf = (cards: SRSCard[]): Record<string, SRSCard> => Object.fromEntries(cards.map((c) => [c.itemKey, c]));
const keys = (cards: SRSCard[]) => cards.map((c) => c.itemKey).join(",");

section("S2: relearn step and introducedAt");

{
  // First-pass wrong: 10 minutes, level halves, lapse counted.
  const failed = scheduleAnswer(reviewCard("w", { level: 5, lapses: 1 }), false, TODAY_NOON);
  check("first-pass wrong: level 5 → 2, due in 10 minutes, lapses + 1, lastReviewed stamped",
    failed.level === 2 && failed.nextReview === TODAY_NOON + 10 * MIN && failed.lapses === 2 && failed.lastReviewed === TODAY_NOON);

  // introducedAt: set once, on the first answer of a brand-new card, right or wrong.
  const fresh = newCard("n", TODAY_NOON - DAY);
  const right = scheduleAnswer(fresh, true, TODAY_NOON);
  const wrong = scheduleAnswer(fresh, false, TODAY_NOON);
  check("introducedAt is set when a new card is first answered correctly", right.introducedAt === TODAY_NOON && right.reps === 1);
  check("introducedAt is set when a new card is first answered wrong", wrong.introducedAt === TODAY_NOON && wrong.reps === 0 && wrong.lapses === 1);
  check("a new card failed on its first showing is not new any more", !isNewCard(wrong));
  const later = scheduleAnswer(right, true, TODAY_NOON + 2 * DAY);
  check("introducedAt is never overwritten by later answers", later.introducedAt === TODAY_NOON);
  const laterAfterFail = scheduleAnswer(wrong, true, TODAY_NOON + DAY);
  check("a card failed first and answered later keeps its original introducedAt", laterAfterFail.introducedAt === TODAY_NOON);
  const legacy = scheduleAnswer({ level: 3, nextReview: TODAY_NOON - HOUR, type: "vocab", itemKey: "old" }, true, TODAY_NOON);
  check("a legacy card (no reps) never gets introducedAt", !("introducedAt" in legacy));
  check("answering never emits undefined", !containsUndefined(right) && !containsUndefined(wrong) && !containsUndefined(legacy));
  check("createNewCard has no introducedAt yet", !("introducedAt" in createNewCard("k", "vocab", TODAY_NOON)));

  // normalizeCard validates introducedAt like the other timestamps.
  const n1 = normalizeCard({ level: 1, nextReview: 5, type: "vocab", itemKey: "a", introducedAt: "1800000000000" }, TODAY_NOON);
  const n2 = normalizeCard({ level: 1, nextReview: 5, type: "vocab", itemKey: "a", introducedAt: "garbage" }, TODAY_NOON);
  const n3 = normalizeCard({ level: 1, nextReview: 5, type: "vocab", itemKey: "a", introducedAt: -4 }, TODAY_NOON);
  const n4 = normalizeCard({ level: 1, nextReview: 5, type: "vocab", itemKey: "a", introducedAt: { x: 1 } }, TODAY_NOON);
  check("normalizeCard: numeric-string introducedAt becomes a number", n1?.introducedAt === 1800000000000);
  check("normalizeCard: garbage / negative / object introducedAt is omitted, never undefined",
    !!n2 && !!n3 && !!n4 && !("introducedAt" in n2) && !("introducedAt" in n3) && !("introducedAt" in n4));

  // Relearn re-show.
  const base = reviewCard("r", { level: 2, lapses: 2, reps: 4 });
  const ok = scheduleRelearnAnswer(base, true, TODAY_NOON, seededRandom("r"));
  check("relearn correct: level kept, reps and lapses unchanged, lastReviewed stamped",
    ok.level === 2 && ok.reps === 4 && ok.lapses === 2 && ok.lastReviewed === TODAY_NOON);
  check("relearn correct at level 2: about 3 days (±12%)",
    ok.nextReview - TODAY_NOON >= 3 * DAY * (1 - FUZZ_RATIO) - 1 && ok.nextReview - TODAY_NOON <= 3 * DAY * (1 + FUZZ_RATIO) + 1);
  const ok0 = scheduleRelearnAnswer(reviewCard("r0", { level: 0 }), true, TODAY_NOON);
  check("relearn correct at level 0: minimum 1 day (not the 8-hour rung)", ok0.nextReview === TODAY_NOON + DAY);
  const ok1 = scheduleRelearnAnswer(reviewCard("r1", { level: 1 }), true, TODAY_NOON);
  check("relearn correct at level 1: exactly 1 day", ok1.nextReview === TODAY_NOON + DAY);
  let neverShort = true;
  for (let level = 0; level <= MAX_LEVEL; level++) {
    const c = scheduleRelearnAnswer(reviewCard(`s${level}`, { level }), true, TODAY_NOON);
    if (c.nextReview - TODAY_NOON < DAY || c.level !== level) neverShort = false;
  }
  check("relearn correct is never under 1 day and never changes the level (levels 0–8)", neverShort);
  const bad = scheduleRelearnAnswer(base, false, TODAY_NOON);
  check("relearn wrong: no second penalty (level, lapses, reps unchanged), due in 10 minutes",
    bad.level === 2 && bad.lapses === 2 && bad.reps === 4 && bad.nextReview === TODAY_NOON + 10 * MIN && bad.lastReviewed === TODAY_NOON);
  const legacyRelearn = scheduleRelearnAnswer({ level: 1, nextReview: TODAY_NOON, type: "vocab", itemKey: "lg" }, true, TODAY_NOON);
  check("relearn on a legacy card invents no reps / lapses / introducedAt",
    !("reps" in legacyRelearn) && !("lapses" in legacyRelearn) && !("introducedAt" in legacyRelearn));
  check("relearn is pure and cloud-safe",
    base.level === 2 && base.lastReviewed !== TODAY_NOON && !containsUndefined(ok) && stable(JSON.parse(JSON.stringify(ok))) === stable(ok));
  check("MAX_RELEARN_REQUEUES is 2", MAX_RELEARN_REQUEUES === 2);
}

section("S2: daily limits (settings)");

{
  const d = defaultSrsSettings();
  check("defaults are 50 reviews / 10 new, no updatedAt", d.dailyReviewCap === 50 && d.dailyNewCap === 10 && !("updatedAt" in d));
  check("normalize: missing / garbage → defaults",
    stable(normalizeSrsSettings(undefined)) === stable(d) && stable(normalizeSrsSettings("x")) === stable(d) &&
    stable(normalizeSrsSettings([1, 2])) === stable(d) && stable(normalizeSrsSettings({ dailyReviewCap: "abc", dailyNewCap: NaN })) === stable(d));
  check("normalize: review cap 0 or negative → unlimited", normalizeSrsSettings({ dailyReviewCap: 0 }).dailyReviewCap === UNLIMITED_REVIEWS && normalizeSrsSettings({ dailyReviewCap: -3 }).dailyReviewCap === UNLIMITED_REVIEWS);
  check("normalize: huge review cap clamps to the unlimited sentinel", normalizeSrsSettings({ dailyReviewCap: 1e9 }).dailyReviewCap === UNLIMITED_REVIEWS);
  check("normalize: new cap 0 is kept (no new cards); negative → 0; fractions floor",
    normalizeSrsSettings({ dailyNewCap: 0 }).dailyNewCap === 0 && normalizeSrsSettings({ dailyNewCap: -5 }).dailyNewCap === 0 && normalizeSrsSettings({ dailyNewCap: 7.9 }).dailyNewCap === 7);
  check("normalize: numeric strings are accepted", normalizeSrsSettings({ dailyReviewCap: "100", dailyNewCap: "5" }).dailyReviewCap === 100);
  check("normalize: valid updatedAt kept; invalid omitted (never undefined)",
    normalizeSrsSettings({ updatedAt: 123 }).updatedAt === 123 && !("updatedAt" in normalizeSrsSettings({ updatedAt: "nope" })) && !containsUndefined(normalizeSrsSettings({ updatedAt: null })));
  const once = normalizeSrsSettings({ dailyReviewCap: 20, dailyNewCap: 5, updatedAt: 9 });
  check("normalize is idempotent", stable(normalizeSrsSettings(once)) === stable(once));

  const A: SrsSettings = { dailyReviewCap: 20, dailyNewCap: 5, updatedAt: 1000 };
  const B: SrsSettings = { dailyReviewCap: 100, dailyNewCap: 20, updatedAt: 2000 };
  check("merge: neither side has settings → undefined (nothing invented)", mergeSrsSettings(undefined, undefined) === undefined && mergeSrsSettings(null, "x") === undefined);
  check("merge: only local → local; only cloud → cloud", mergeSrsSettings(A, undefined)?.dailyReviewCap === 20 && mergeSrsSettings(undefined, B)?.dailyReviewCap === 100);
  check("merge: later updatedAt wins, in both directions", mergeSrsSettings(A, B)?.dailyReviewCap === 100 && mergeSrsSettings(B, A)?.dailyReviewCap === 100);
  check("merge: a stamped copy beats an unstamped one", mergeSrsSettings(A, { dailyReviewCap: 100, dailyNewCap: 20 })?.dailyReviewCap === 20 && mergeSrsSettings({ dailyReviewCap: 100, dailyNewCap: 20 }, A)?.dailyReviewCap === 20);
  check("merge: a tie goes to the cloud copy", mergeSrsSettings({ ...A, dailyReviewCap: 20 }, { ...A, dailyReviewCap: 100 })?.dailyReviewCap === 100);
  const m = mergeSrsSettings(A, B);
  check("merge is idempotent", stable(mergeSrsSettings(m, B)) === stable(m) && stable(mergeSrsSettings(m, m)) === stable(m));
  check("merge result is cloud-safe", !containsUndefined(m) && !containsUndefined(mergeSrsSettings(undefined, { dailyReviewCap: 50 })));
}

section("S2: session queue (buildSessionPlan)");

{
  const settings: SrsSettings = { dailyReviewCap: 50, dailyNewCap: 10 };

  // 600 due cards → at most the cap.
  const many = deckOf(Array.from({ length: 600 }, (_, i) => reviewCard(`m${i}`, { nextReview: TODAY_NOON - (i + 1) * HOUR })));
  const big = buildSessionPlan(many, settings, TODAY_NOON);
  check("600 due cards → a session of exactly the cap (50), the rest waiting", big.queue.length === 50 && big.reviewCount === 50 && big.total === 50 && big.waitingCount === 550);
  check("…and every queued card is due", big.queue.every((c) => c.nextReview <= TODAY_NOON));
  check("…and nothing was changed or lost (input untouched, 600 cards still due)",
    Object.keys(many).length === 600 && Object.values(many).every((c) => c.nextReview <= TODAY_NOON));

  // Ordering by overdue ratio.
  const a = reviewCard("a", { level: 3, lastReviewed: TODAY_NOON - 14 * DAY, nextReview: TODAY_NOON - 7 * DAY }); // 7d late of 7d → 1.0
  const b = reviewCard("b", { level: 0, lastReviewed: TODAY_NOON - 9 * HOUR, nextReview: TODAY_NOON - HOUR }); // 1h late of 8h → 0.125
  const c = reviewCard("c", { level: 5, lastReviewed: TODAY_NOON - 33 * DAY, nextReview: TODAY_NOON - 3 * DAY }); // 3d late of 30d → 0.1
  const order = buildSessionPlan(deckOf([c, b, a]), settings, TODAY_NOON);
  check("ordered by overdue ratio (time overdue ÷ scheduled interval), most overdue first", keys(order.queue) === "a,b,c", keys(order.queue));
  check("overdueRatio values are as documented", Math.abs(overdueRatio(a, TODAY_NOON) - 1) < 1e-9 && Math.abs(overdueRatio(b, TODAY_NOON) - 0.125) < 1e-9);
  const t1 = reviewCard("t1", { level: 4, lastReviewed: TODAY_NOON - 2 * DAY, nextReview: TODAY_NOON - DAY });
  const t2 = reviewCard("t2", { level: 1, lastReviewed: TODAY_NOON - 2 * DAY, nextReview: TODAY_NOON - DAY });
  check("equal ratios: the lower level comes first", keys(buildSessionPlan(deckOf([t1, t2]), settings, TODAY_NOON).queue) === "t2,t1");
  const legacyLate = { level: 2, nextReview: TODAY_NOON - 3 * DAY, type: "vocab", itemKey: "lg" } as SRSCard; // ratio 3d/3d = 1
  check("a legacy card (no lastReviewed) uses its level's interval for the ratio", Math.abs(overdueRatio(legacyLate, TODAY_NOON) - 1) < 1e-9);

  // Deterministic regardless of input order.
  const shuffled = Object.values(many).reverse();
  check("the queue does not depend on the order of the deck", keys(buildSessionPlan(deckOf(shuffled), settings, TODAY_NOON).queue) === keys(big.queue));

  // Reviewed-today counts against the cap.
  const doneToday = Array.from({ length: 30 }, (_, i) => reviewCard(`d${i}`, { lastReviewed: TODAY_NOON - 2 * HOUR, nextReview: TODAY_NOON + 3 * DAY }));
  const dueMore = Array.from({ length: 100 }, (_, i) => reviewCard(`e${i}`));
  const mid = buildSessionPlan(deckOf([...doneToday, ...dueMore]), settings, TODAY_NOON);
  check("30 cards already reviewed today → only 20 more reviews", mid.reviewCount === 20 && mid.reviewedToday === 30, `${mid.reviewCount}/${mid.reviewedToday}`);
  const yesterday = Array.from({ length: 30 }, (_, i) => reviewCard(`y${i}`, { lastReviewed: localAt(-1, 20), nextReview: TODAY_NOON + 3 * DAY }));
  check("reviews from yesterday do not count today", buildSessionPlan(deckOf([...yesterday, ...dueMore]), settings, TODAY_NOON).reviewCount === 50);
  const exhausted = buildSessionPlan(deckOf([...Array.from({ length: 50 }, (_, i) => reviewCard(`x${i}`, { lastReviewed: TODAY_NOON - HOUR, nextReview: TODAY_NOON + DAY })), ...dueMore]), settings, TODAY_NOON);
  check("cap reached → empty session, everything else still due (waiting)", exhausted.total === 0 && exhausted.waitingCount === 100 && formatSessionLine(exhausted) === null);
  const midnight = buildSessionPlan(deckOf([...Array.from({ length: 50 }, (_, i) => reviewCard(`x${i}`, { lastReviewed: TODAY_NOON - HOUR, nextReview: TODAY_NOON + DAY })), ...dueMore]), settings, localAt(1, 0, 5));
  check("the budget resets at local midnight", midnight.reviewedToday === 0);
  const unlimited = buildSessionPlan(many, { dailyReviewCap: UNLIMITED_REVIEWS, dailyNewCap: 10 }, TODAY_NOON);
  check("unlimited reviews → all 600 are in the session", unlimited.reviewCount === 600 && unlimited.waitingCount === 0);
  check("raising the cap in settings gives a bigger session", buildSessionPlan(many, { dailyReviewCap: 100, dailyNewCap: 10 }, TODAY_NOON).reviewCount === 100);

  // New cards.
  const thirty = Array.from({ length: 30 }, (_, i) => newCard(`n${String(i).padStart(2, "0")}`, TODAY_NOON - 2 * DAY + i * MIN));
  const nw = buildSessionPlan(deckOf(thirty), settings, TODAY_NOON);
  check("30 new cards → only dailyNewCap (10) in the session, oldest addedAt first",
    nw.newCount === 10 && keys(nw.queue) === thirty.slice(0, 10).map((x) => x.itemKey).join(",") && nw.waitingCount === 20);
  check("new cards come after the reviews", (() => {
    const q = buildSessionPlan(deckOf([...thirty, ...dueMore.slice(0, 5)]), settings, TODAY_NOON).queue;
    return q.slice(0, 5).every((x) => !isNewCard(x)) && q.slice(5).every((x) => isNewCard(x)) && q.length === 15;
  })());
  check("newCap 0 → no new cards", buildSessionPlan(deckOf(thirty), { dailyReviewCap: 50, dailyNewCap: 0 }, TODAY_NOON).newCount === 0);
  const notDueYet = [newCard("late", TODAY_NOON - HOUR)]; // first due 8h after adding, as before S2
  const nd = buildSessionPlan(deckOf(notDueYet), settings, TODAY_NOON);
  check("a card added an hour ago is not in the session yet; it is the next due card", nd.total === 0 && nd.nextDueAt === TODAY_NOON - HOUR + 8 * HOUR);
  const introducedToday = thirty.slice(0, 4).map((x) => ({ ...x, reps: 1, lastReviewed: TODAY_NOON - HOUR, introducedAt: TODAY_NOON - HOUR, nextReview: TODAY_NOON + DAY, level: 1 }));
  const rest = buildSessionPlan(deckOf([...introducedToday, ...thirty.slice(4)]), settings, TODAY_NOON);
  check("4 introduced today → 6 new left today; introduced cards are not counted as reviews",
    rest.newToday === 4 && rest.newCount === 6 && rest.reviewedToday === 0);
  const failedFirst = newCard("ff", TODAY_NOON - DAY, { lastReviewed: TODAY_NOON - 3 * HOUR - 5 * MIN, introducedAt: localAt(-1, 8), lapses: 1, nextReview: TODAY_NOON - 3 * HOUR });
  const ffPlan = buildSessionPlan(deckOf([failedFirst]), settings, TODAY_NOON);
  check("a new card failed on its first showing is a review, not new", ffPlan.reviewCount === 1 && ffPlan.newCount === 0);
  const legacyOnly = buildSessionPlan(deckOf(Array.from({ length: 5 }, (_, i) => ({ level: 1, nextReview: TODAY_NOON - HOUR, type: "vocab", itemKey: `lg${i}` }) as SRSCard)), settings, TODAY_NOON);
  check("legacy cards (no reps) are reviews, never new", legacyOnly.reviewCount === 5 && legacyOnly.newCount === 0);

  // Auto-pause.
  const due100 = deckOf(Array.from({ length: 100 }, (_, i) => reviewCard(`p${i}`)));
  const due101 = deckOf(Array.from({ length: 101 }, (_, i) => reviewCard(`p${i}`)));
  check("exactly 2 × cap due: new cards still allowed", buildSessionPlan({ ...due100, ...deckOf(thirty) }, settings, TODAY_NOON).newCount === 10);
  const paused = buildSessionPlan({ ...due101, ...deckOf(thirty) }, settings, TODAY_NOON);
  check("more than 2 × cap due: new cards pause, flagged for the end screen", paused.newCount === 0 && paused.newPaused && paused.reviewCount === 50);
  const afterWork = [
    ...Array.from({ length: 50 }, (_, i) => reviewCard(`p${i}`, { lastReviewed: TODAY_NOON - HOUR, nextReview: TODAY_NOON + 3 * DAY })),
    ...Array.from({ length: 51 }, (_, i) => reviewCard(`q${i}`)),
  ];
  check("the pause does not lift just because part of today's backlog was done", buildSessionPlan({ ...deckOf(afterWork), ...deckOf(thirty) }, settings, TODAY_NOON).newPaused);
  check("unlimited reviews never pause new cards", !buildSessionPlan({ ...many, ...deckOf(thirty) }, { dailyReviewCap: UNLIMITED_REVIEWS, dailyNewCap: 10 }, TODAY_NOON).newPaused);

  // Counters, next due, summary text, cloud-safety.
  const mixed = buildSessionPlan(deckOf([reviewCard("one"), reviewCard("two", { nextReview: TODAY_NOON + 5 * HOUR }), reviewCard("three", { nextReview: TODAY_NOON + 2 * HOUR })]), settings, TODAY_NOON);
  check("nextDueAt is the earliest card that is not due yet", mixed.nextDueAt === TODAY_NOON + 2 * HOUR && mixed.total === 1);
  check("empty deck → empty plan", buildSessionPlan({}, settings, TODAY_NOON).total === 0 && buildSessionPlan({}, undefined, TODAY_NOON).nextDueAt === null);
  check("undefined / garbage settings → defaults", buildSessionPlan(many, undefined, TODAY_NOON).reviewCount === 50 && buildSessionPlan(many, "junk", TODAY_NOON).reviewCount === 50);
  const sum = summarizeSession(big);
  check("the summary has no queue and is JSON-safe", !("queue" in sum) && !containsUndefined(sum));
  const line = formatSessionLine(summarizeSession(buildSessionPlan(deckOf([...Array.from({ length: 25 }, (_, i) => reviewCard(`l${i}`)), ...thirty.slice(0, 5)]), settings, TODAY_NOON)));
  check("menu text: \"Today: 25 reviews · 5 new · about 5 min\"", line === "Today: 25 reviews · 5 new · about 5 min", String(line));
  check("menu text: singular and reviews-only / new-only", formatSessionLine({ ...sum, reviewCount: 1, newCount: 0, total: 1, estimatedMinutes: 1 }) === "Today: 1 review · about 1 min" && formatSessionLine({ ...sum, reviewCount: 0, newCount: 5, total: 5, estimatedMinutes: 1 }) === "Today: 5 new · about 1 min");
  check("menu text: nothing to do → null; waiting line is quiet and only when needed", formatSessionLine({ ...sum, reviewCount: 0, newCount: 0, total: 0 }) === null && formatWaitingLine(sum) === "+550 waiting" && formatWaitingLine({ ...sum, waitingCount: 0 }) === null);
  check("localDayRange spans one local calendar day", (() => { const [s0, e0] = localDayRange(TODAY_NOON); return s0 <= TODAY_NOON && TODAY_NOON < e0 && new Date(s0).getHours() === 0 && new Date(e0).getHours() === 0 && e0 - s0 >= 23 * HOUR; })());
}

section("S2: budgets survive closing the app and adding in bulk");

{
  const settings = defaultSrsSettings();
  // Reading Room "add all missed": 30 cards in one tick, all due at one instant.
  let deck = deckOf(Array.from({ length: 30 }, (_, i) => createNewCard(`rr${String(i).padStart(2, "0")}`, "vocab", localAt(0, 8))));
  const introducedPerDay: number[] = [];
  for (let day = 1; day <= 4; day++) {
    const t = localAt(day, 9);
    // Open and finish the session, then re-open it twice more the same day (budget must not reset).
    let answeredToday = 0;
    for (let reopen = 0; reopen < 3; reopen++) {
      const plan = buildSessionPlan(deck, settings, t + reopen * 5 * MIN);
      for (const card of plan.queue) {
        if (isNewCard(deck[card.itemKey])) answeredToday++; // count introductions only; yesterday's cards come back as reviews
        deck = { ...deck, [card.itemKey]: scheduleAnswer(deck[card.itemKey], true, t + reopen * 5 * MIN) };
      }
    }
    introducedPerDay.push(answeredToday);
  }
  check("30 cards added at once are introduced 10 / 10 / 10 / 0 over four days, however often the session is reopened",
    introducedPerDay.join() === "10,10,10,0", introducedPerDay.join());

  // Close mid-way: answer 5 of 10, reopen → exactly 5 left (counters are derived, not stored in the session).
  let deck2 = deckOf(Array.from({ length: 30 }, (_, i) => createNewCard(`mw${String(i).padStart(2, "0")}`, "vocab", localAt(0, 8))));
  const t = localAt(1, 9);
  const first = buildSessionPlan(deck2, settings, t);
  first.queue.slice(0, 5).forEach((card) => { deck2 = { ...deck2, [card.itemKey]: scheduleAnswer(deck2[card.itemKey], true, t) }; });
  const reopened = buildSessionPlan(deck2, settings, t + 10 * MIN);
  check("closing the session after 5 of 10 new cards leaves exactly 5 for today", first.newCount === 10 && reopened.newCount === 5 && reopened.newToday === 5);
  // A second device that only has the merged cards sees the same budget.
  const asOnOtherDevice = mergeSrsCards({}, deck2, t + 20 * MIN);
  check("the budget is identical on another device after a cloud merge", buildSessionPlan(asOnOtherDevice, settings, t + 20 * MIN).newCount === 5);
}

// Capped 365-day simulation: same intake and answers as section 5, but with S2's daily limits and relearn.
section("365-day simulation WITH the S2 daily limits (900 cards added at 10 per day for 90 days, 88% correct)");

{
  const settings = defaultSrsSettings();
  const DAYS = 365;
  const RETENTION = 0.88;
  const answers = lcg(7);
  let deck: Record<string, SRSCard> = {};
  const firstPass: number[] = [];
  const shownTotal: number[] = [];
  const backlogAtStart: number[] = [];
  let maxShownInOneDay = 0;
  let finiteOk = true;
  let cloudSafe = true;
  let capOk = true;
  let newCapOk = true;
  let relearnOk = true;

  for (let day = 0; day < DAYS; day++) {
    const t = localAt(day, 9);
    if (day < 90) {
      for (let i = 0; i < 10; i++) {
        const key = `c${day}-${i}`;
        deck[key] = createNewCard(key, "vocab", t);
      }
    }
    const dueBefore = Object.values(deck).filter((card) => card.nextReview <= t && !isNewCard(card)).length;
    backlogAtStart.push(dueBefore);

    // One sitting at 09:00. Reopen the session until nothing is left (so a budget bug would show up as extra work).
    let firstPassToday = 0;
    let newToday = 0;
    let shown = 0;
    for (let reopen = 0; reopen < 4; reopen++) {
      const plan = buildSessionPlan(deck, settings, t);
      if (plan.total === 0) break;
      const queue = [...plan.queue];
      const requeues: Record<string, number> = {};
      const seen = new Set<string>();
      for (let i = 0; i < queue.length; i++) {
        const key = queue[i].itemKey;
        const isRelearn = seen.has(key);
        seen.add(key);
        const correct = answers() < RETENTION;
        shown++;
        if (isRelearn) {
          deck[key] = scheduleRelearnAnswer(deck[key], correct, t);
        } else {
          if (isNewCard(deck[key])) newToday++;
          deck[key] = scheduleAnswer(deck[key], correct, t);
          firstPassToday++;
        }
        if (!correct && (requeues[key] ?? 0) < MAX_RELEARN_REQUEUES) {
          requeues[key] = (requeues[key] ?? 0) + 1;
          queue.push(queue[i]);
        }
        if (!Number.isFinite(deck[key].nextReview)) finiteOk = false;
        if (containsUndefined(deck[key])) cloudSafe = false;
        // After a relearn pass the card must be due at least a day out (when answered right).
        if (isRelearn && correct && deck[key].nextReview - t < DAY) relearnOk = false;
      }
    }
    if (firstPassToday - newToday > settings.dailyReviewCap) capOk = false;
    if (newToday > settings.dailyNewCap) newCapOk = false;
    firstPass.push(firstPassToday);
    shownTotal.push(shown);
    maxShownInOneDay = Math.max(maxShownInOneDay, shown);
  }

  const mean = (values: number[], from: number, to: number) => values.slice(from, to).reduce((a, b) => a + b, 0) / (to - from);
  const peak = (values: number[]) => Math.max(...values);
  const lastDue = Object.values(deck).filter((card) => card.nextReview <= localAt(DAYS, 9)).length;
  console.log(`  cards shown per day, days 1-90 (intake) avg      ${mean(shownTotal, 0, 90).toFixed(1)}`);
  console.log(`  cards shown per day, days 91-180 avg             ${mean(shownTotal, 90, 180).toFixed(1)}`);
  console.log(`  cards shown per day, days 301-365 avg (steady)   ${mean(shownTotal, 300, 365).toFixed(1)}`);
  console.log(`  busiest day: ${maxShownInOneDay} cards shown (cap 50 reviews + 10 new, plus relearn re-shows)   S1 alone peaked at 93`);
  console.log(`  review backlog at the start of a day: peak ${peak(backlogAtStart)}, on the last day ${backlogAtStart[DAYS - 1]}`);
  console.log(`  cards due on the day after the year: ${lastDue}`);

  check("capped sim: no day exceeds the review cap (50) of first-pass reviews", capOk);
  check("capped sim: no day introduces more than the new-card cap (10)", newCapOk);
  check("capped sim: the busiest day is bounded by cap + new cap + at most 2 re-shows per card", maxShownInOneDay <= (50 + 10) * (1 + MAX_RELEARN_REQUEUES), String(maxShownInOneDay));
  check("capped sim: the busiest day is far below the uncapped intake peak (93)", maxShownInOneDay < 93, String(maxShownInOneDay));
  check("capped sim: no NaN/Infinity and every card stays cloud-safe", finiteOk && cloudSafe);
  check("capped sim: a card answered right in its relearn pass waits at least a day", relearnOk);
  check("capped sim: the backlog is cleared by the end of the year", backlogAtStart[DAYS - 1] <= settings.dailyReviewCap, String(backlogAtStart[DAYS - 1]));
  check("capped sim: all 900 cards were introduced", Object.values(deck).length === 900 && Object.values(deck).every((card) => !isNewCard(card)));
}

// ─── 6b. S3: grades, ease, overdue credit, previews, forecast ────────────────

/** Is `interval` the target, allowing the ±12% fuzz that applies from 3 days up (and the 365-day ceiling)? */
function withinFuzz(interval: number, target: number): boolean {
  const capped = Math.min(target, MAX_INTERVAL_MS);
  if (capped < FUZZ_MIN_INTERVAL_MS) return interval === capped;
  return interval >= Math.floor(capped * (1 - FUZZ_RATIO)) && interval <= Math.min(MAX_INTERVAL_MS, Math.ceil(capped * (1 + FUZZ_RATIO)));
}
const NO_FUZZ = () => 0.5; // applyFuzz factor is exactly 1 at 0.5, so the result is the un-fuzzed interval

section("S3: the grade table (Forgot / Hard / Got it)");

{
  check("three grades, in button order", SRS_GRADES.join() === "forgot,hard,gotIt");
  check("ease constants: default 1.0, range 0.8–1.4, steps +0.05 / −0.1 / −0.15",
    DEFAULT_EASE === 1 && MIN_EASE === 0.8 && MAX_EASE === 1.4 && EASE_DELTA.gotIt === 0.05 && EASE_DELTA.hard === -0.1 && EASE_DELTA.forgot === -0.15 && HARD_INTERVAL_FACTOR === 0.8);

  // A card reviewed on time (not overdue), with no ease yet: the plain table.
  const onTime = (level: number, extra: Partial<SRSCard> = {}): SRSCard =>
    ({ level, nextReview: NOW + DAY, type: "vocab", itemKey: "g", reps: 4, lapses: 1, lastReviewed: NOW - 2 * DAY, ...extra });

  for (let level = 0; level <= MAX_LEVEL; level++) {
    const card = onTime(level);
    const got = scheduleGrade(card, "gotIt", NOW);
    const gotTo = Math.min(MAX_LEVEL, level + 1);
    check(`Got it at level ${level} → level ${gotTo}, ease 1.05, reps + 1, ~${INTERVALS_MS[gotTo] / DAY}d`,
      got.level === gotTo && got.ease === 1.05 && got.reps === 5 && got.lapses === 1 && got.lastReviewed === NOW && withinFuzz(got.nextReview - NOW, INTERVALS_MS[gotTo]),
      `${got.level} ${got.ease} ${(got.nextReview - NOW) / DAY}d`);

    const hard = scheduleGrade(card, "hard", NOW);
    const hardTarget = Math.max(DAY, Math.round(0.8 * INTERVALS_MS[level]));
    check(`Hard at level ${level} stays at ${level}, ease 0.9, reps + 1, ~${(hardTarget / DAY).toFixed(1)}d`,
      hard.level === level && hard.ease === 0.9 && hard.reps === 5 && hard.lapses === 1 && hard.lastReviewed === NOW && withinFuzz(hard.nextReview - NOW, hardTarget),
      `${hard.level} ${hard.ease} ${(hard.nextReview - NOW) / DAY}d`);

    const forgot = scheduleGrade(card, "forgot", NOW);
    check(`Forgot at level ${level} → level ${Math.floor(level / 2)}, ease 0.85, lapses + 1, due in exactly 10 minutes`,
      forgot.level === Math.floor(level / 2) && forgot.ease === 0.85 && forgot.lapses === 2 && forgot.reps === 4 && forgot.lastReviewed === NOW && forgot.nextReview === NOW + RELEARN_INTERVAL_MS);
  }

  // The two guarantees in the plan, over every level and several ease / overdue situations.
  {
    let hardKeepsLevel = true;
    let gotNeverLowers = true;
    let forgotAlwaysRelearns = true;
    let recalledAtLeastADay = true;
    for (let level = 0; level <= MAX_LEVEL; level++) {
      for (const ease of [undefined, 0.8, 1, 1.4]) {
        for (const overdueBy of [-3 * DAY, 0, 40 * DAY]) {
          const card: SRSCard = { level, nextReview: NOW + overdueBy * -1, type: "vocab", itemKey: "k", reps: 3, lastReviewed: NOW - 50 * DAY, ...(ease === undefined ? {} : { ease }) };
          const hard = scheduleGrade(card, "hard", NOW);
          const got = scheduleGrade(card, "gotIt", NOW);
          const forgot = scheduleGrade(card, "forgot", NOW);
          if (hard.level !== level) hardKeepsLevel = false;
          if (got.level < level) gotNeverLowers = false;
          if (forgot.nextReview - NOW !== RELEARN_INTERVAL_MS) forgotAlwaysRelearns = false;
          if (hard.nextReview - NOW < MIN_RECALL_INTERVAL_MS * (1 - FUZZ_RATIO) || got.nextReview - NOW < MIN_RECALL_INTERVAL_MS) recalledAtLeastADay = false;
        }
      }
    }
    check("Hard never changes (so never lowers) a card's level", hardKeepsLevel);
    check("Got it never lowers a card's level", gotNeverLowers);
    check("Forgot never skips the relearn step: always due in 10 minutes, at every level / ease / overdue state", forgotAlwaysRelearns);
    check("Hard and Got it are never scheduled sooner than a day", recalledAtLeastADay);
  }

  // Legacy and new cards.
  {
    const legacy: SRSCard = { level: 3, nextReview: NOW - DAY, type: "vocab", itemKey: "old" };
    check("a legacy card gains no `ease` just by loading", !("ease" in (normalizeCard(legacy, NOW) as SRSCard)));
    check("the first grade gives it an ease (omitted before, never undefined)", scheduleGrade(legacy, "gotIt", NOW).ease === 1.05 && !containsUndefined(scheduleGrade(legacy, "hard", NOW)));
    const fresh = createNewCard("n", "vocab", NOW);
    for (const grade of SRS_GRADES) {
      const after = scheduleGrade(fresh, grade, NOW + 9 * HOUR);
      check(`a new card graded ${grade} gets introducedAt and stops being new`, after.introducedAt === NOW + 9 * HOUR && !isNewCard(after));
    }
    check("Hard on a new card (level 0) waits the 1-day minimum", scheduleGrade(fresh, "hard", NOW + 9 * HOUR).nextReview - (NOW + 9 * HOUR) === DAY);
    check("Hard counts as a successful review (reps + 1); Forgot does not", scheduleGrade(fresh, "hard", NOW).reps === 1 && scheduleGrade(fresh, "forgot", NOW).reps === 0);
    const frozen = Object.freeze({ ...fresh });
    let threw = false;
    try { for (const grade of SRS_GRADES) { scheduleGrade(frozen, grade, NOW); scheduleRelearnGrade(frozen, grade, NOW); } } catch { threw = true; }
    check("grading never mutates its input", !threw);
  }

  // The two-button API still means Got it / Forgot, exactly.
  {
    const cards: SRSCard[] = [createNewCard("a", "vocab", NOW), { level: 4, nextReview: NOW - 3 * DAY, type: "kanji", itemKey: "b", reps: 6, lastReviewed: NOW - 17 * DAY, ease: 1.2 }, { level: 2, nextReview: NOW, type: "vocab", itemKey: "c" }];
    let same = true;
    for (const card of cards) {
      if (stable(scheduleAnswer(card, true, NOW + DAY)) !== stable(scheduleGrade(card, "gotIt", NOW + DAY))) same = false;
      if (stable(scheduleAnswer(card, false, NOW + DAY)) !== stable(scheduleGrade(card, "forgot", NOW + DAY))) same = false;
      if (stable(scheduleRelearnAnswer(card, true, NOW + DAY)) !== stable(scheduleRelearnGrade(card, "gotIt", NOW + DAY))) same = false;
      if (stable(scheduleRelearnAnswer(card, false, NOW + DAY)) !== stable(scheduleRelearnGrade(card, "forgot", NOW + DAY))) same = false;
    }
    check("answerCard(key, boolean) maps true → Got it and false → Forgot, byte for byte (first pass and relearn)", same);
  }
}

section("S3: ease");

{
  const base: SRSCard = { level: 3, nextReview: NOW + DAY, type: "vocab", itemKey: "e", reps: 2, lastReviewed: NOW - DAY };

  // Clamping and rounding.
  let card: SRSCard = { ...base };
  for (let i = 0; i < 40; i++) card = scheduleGrade(card, "gotIt", NOW);
  check("repeated Got it tops out at ease 1.4", card.ease === 1.4, String(card.ease));
  card = { ...base };
  for (let i = 0; i < 40; i++) card = scheduleGrade(card, "forgot", NOW);
  check("repeated Forgot bottoms out at ease 0.8", card.ease === 0.8, String(card.ease));
  check("Got it at 1.4 stays 1.4; Hard / Forgot at 0.8 stay 0.8",
    scheduleGrade({ ...base, ease: 1.4 }, "gotIt", NOW).ease === 1.4 && scheduleGrade({ ...base, ease: 0.8 }, "hard", NOW).ease === 0.8 && scheduleGrade({ ...base, ease: 0.8 }, "forgot", NOW).ease === 0.8);
  {
    const random = lcg(31);
    let walk: SRSCard = { ...base };
    let inRange = true;
    let twoDecimals = true;
    for (let i = 0; i < 5000; i++) {
      walk = scheduleGrade(walk, SRS_GRADES[Math.floor(random() * 3)], NOW + i * HOUR);
      const ease = walk.ease as number;
      if (!(ease >= MIN_EASE && ease <= MAX_EASE)) inRange = false;
      if (ease !== Math.round(ease * 100) / 100) twoDecimals = false; // exact: 1.1500000000000001 must not be stored
    }
    check("ease stays within 0.8–1.4 over a 5000-grade random walk", inRange);
    check("ease never drifts off two decimals (no floating-point creep)", twoDecimals);
  }

  // Ease multiplies the ladder interval, using the ease the card has BEFORE the grade.
  check("Got it at level 3, ease 1.4: 14d × 1.4 exactly (ease read before it changes)", gradeIntervalMs({ ...base, ease: 1.4 }, "gotIt", NOW) === Math.round(14 * DAY * 1.4));
  check("Got it at level 3, ease 0.8: 14d × 0.8", gradeIntervalMs({ ...base, ease: 0.8 }, "gotIt", NOW) === Math.round(14 * DAY * 0.8));
  check("Got it at level 3, no ease: the plain 14d", gradeIntervalMs(base, "gotIt", NOW) === 14 * DAY);
  check("Hard at level 3, ease 1.4: 0.8 × 7d × 1.4", gradeIntervalMs({ ...base, ease: 1.4 }, "hard", NOW) === Math.round(0.8 * 7 * DAY * 1.4));
  check("Forgot ignores ease (always 10 minutes)", gradeIntervalMs({ ...base, ease: 1.4 }, "forgot", NOW) === RELEARN_INTERVAL_MS);
  check("cardEase: missing → 1.0; out of range → clamped", cardEase({}) === 1 && cardEase({ ease: 9 }) === 1.4 && cardEase({ ease: -2 }) === 0.8);
  check("Got it is never sooner than Hard, even at the lowest ease on the 1-day rung",
    gradeIntervalMs({ ...base, level: 0, ease: 0.8 }, "gotIt", NOW) >= gradeIntervalMs({ ...base, level: 0, ease: 0.8 }, "hard", NOW));

  // Normalization of the new field.
  const valid: SRSCard = { level: 1, nextReview: NOW, type: "vocab", itemKey: "n" };
  const eased = (ease: unknown) => normalizeCard({ ...valid, ease }, NOW) as SRSCard;
  check("normalize: a valid ease is kept exactly", eased(1.05).ease === 1.05 && eased(0.8).ease === 0.8 && eased(1.4).ease === 1.4);
  check("normalize: out-of-range ease is clamped", eased(3).ease === 1.4 && eased(0.1).ease === 0.8);
  check("normalize: a numeric string is read", eased("1.2").ease === 1.2);
  check("normalize: NaN, junk, booleans and null drop the field (never undefined)",
    ["ease" in eased(NaN), "ease" in eased("abc"), "ease" in eased(true), "ease" in eased(null), "ease" in eased(Infinity)].every((has) => !has));
  check("normalizeSrsCards keeps ease on every card", normalizeSrsCards({ a: { ...valid, itemKey: "a", ease: 1.1 }, b: { ...valid, itemKey: "b" } }, NOW).a.ease === 1.1);
}

section("S3: overdue credit and the 365-day ceiling");

{
  // Level 3 card, last reviewed 20 days ago, scheduled for 7 days → 13 days overdue. Got it → level 4 (14d).
  const overdue = (extra: Partial<SRSCard> = {}): SRSCard =>
    ({ level: 3, type: "vocab", itemKey: "o", reps: 5, lastReviewed: NOW - 20 * DAY, nextReview: NOW - 13 * DAY, ...extra });

  check("overdue credit: 20 days since the last review beats the 14d rung (max(14d, min(20d, 28d)))", gradeIntervalMs(overdue(), "gotIt", NOW) === 20 * DAY);
  check("overdue credit is capped at 2 × the new rung (100 days late → 28d)", gradeIntervalMs(overdue({ lastReviewed: NOW - 100 * DAY, nextReview: NOW - 93 * DAY }), "gotIt", NOW) === 28 * DAY);
  check("ease applies first, credit only wins when larger (14d × 1.4 = 19.6d < 20d)", gradeIntervalMs(overdue({ ease: 1.4 }), "gotIt", NOW) === 20 * DAY);
  check("ease applies first (14d × 1.4 = 19.6d > 15d of credit)", gradeIntervalMs(overdue({ ease: 1.4, lastReviewed: NOW - 15 * DAY, nextReview: NOW - 8 * DAY }), "gotIt", NOW) === Math.round(14 * DAY * 1.4));
  check("no credit when reviewed early", gradeIntervalMs(overdue({ lastReviewed: NOW - 5 * DAY, nextReview: NOW + 2 * DAY }), "gotIt", NOW) === 14 * DAY);
  check("no credit exactly at the due time", gradeIntervalMs(overdue({ lastReviewed: NOW - 7 * DAY, nextReview: NOW }), "gotIt", NOW) === 14 * DAY);
  check("no credit without lastReviewed (a legacy card's first answer)", gradeIntervalMs({ level: 3, type: "vocab", itemKey: "l", nextReview: NOW - 30 * DAY }, "gotIt", NOW) === 14 * DAY);
  check("no credit for a card that was only waiting on its 10-minute relearn step (it was failed, not remembered)",
    gradeIntervalMs({ level: 2, type: "vocab", itemKey: "r", lastReviewed: NOW - 10 * DAY, nextReview: NOW - 10 * DAY + RELEARN_INTERVAL_MS }, "gotIt", NOW) === 7 * DAY);
  check("credit is for Got it only: Hard and Forgot on an overdue card equal the on-time values",
    gradeIntervalMs(overdue(), "hard", NOW) === gradeIntervalMs(overdue({ lastReviewed: NOW - 5 * DAY, nextReview: NOW + 2 * DAY }), "hard", NOW) && gradeIntervalMs(overdue(), "forgot", NOW) === RELEARN_INTERVAL_MS);

  // The 365-day ceiling.
  const top: SRSCard = { level: 8, type: "vocab", itemKey: "t", reps: 9, lastReviewed: NOW - 1000 * DAY, nextReview: NOW - 700 * DAY, ease: 1.4 };
  check("the ceiling: level 8, ease 1.4, hugely overdue → exactly 365 days before fuzz", gradeIntervalMs(top, "gotIt", NOW) === 365 * DAY);
  check("level 8, ease 1.4, on time: 240d × 1.4 = 336d (below the ceiling)", gradeIntervalMs({ ...top, lastReviewed: NOW - 240 * DAY, nextReview: NOW + DAY }, "gotIt", NOW) === 336 * DAY);
  let ceilingHolds = true;
  for (const r of [0, 0.25, 0.5, 0.75, 0.999999]) {
    if (scheduleGrade(top, "gotIt", NOW, () => r).nextReview - NOW > MAX_INTERVAL_MS) ceilingHolds = false;
    if (scheduleGrade({ ...top, nextReview: NOW + DAY }, "hard", NOW, () => r).nextReview - NOW > MAX_INTERVAL_MS) ceilingHolds = false;
  }
  check("fuzz can never push an interval past 365 days", ceilingHolds);
}

section("S3: previews match what the next answer schedules");

{
  const random = lcg(2026);
  const trials = 4000;
  let firstPassExact = true;
  let relearnExact = true;
  let realFuzzInBounds = true;
  let ordered = true;
  let firstFailure = "";
  for (let i = 0; i < trials; i++) {
    const level = Math.floor(random() * 9);
    const hasReviewed = random() < 0.8;
    const lastReviewed = NOW - Math.floor(random() * 400) * DAY - Math.floor(random() * 24) * HOUR;
    const scheduled = random() < 0.15 ? RELEARN_INTERVAL_MS : Math.floor(1 + random() * 200) * DAY;
    const card: SRSCard = {
      level,
      type: "vocab",
      itemKey: `p${i}`,
      nextReview: hasReviewed ? lastReviewed + scheduled : NOW + Math.round((random() - 0.5) * 120 * DAY),
      ...(hasReviewed ? { lastReviewed, reps: 1 + Math.floor(random() * 20) } : {}),
      ...(random() < 0.6 ? { ease: Math.round((0.8 + random() * 0.6) * 100) / 100 } : {}),
    };
    const preview = previewIntervals(card, NOW);
    const relearnPreview = previewIntervals(card, NOW, { relearn: true });
    for (const grade of SRS_GRADES) {
      const exact = scheduleGrade(card, grade, NOW, NO_FUZZ).nextReview - NOW;
      if (exact !== preview[grade]) { firstPassExact = false; firstFailure ||= `first pass ${grade} ${JSON.stringify(card)}: preview ${preview[grade]} vs ${exact}`; }
      const relearnExactValue = scheduleRelearnGrade(card, grade, NOW, NO_FUZZ).nextReview - NOW;
      if (relearnExactValue !== relearnPreview[grade]) { relearnExact = false; firstFailure ||= `relearn ${grade} ${JSON.stringify(card)}: preview ${relearnPreview[grade]} vs ${relearnExactValue}`; }
      if (!withinFuzz(scheduleGrade(card, grade, NOW).nextReview - NOW, preview[grade])) realFuzzInBounds = false;
    }
    if (!(preview.forgot < preview.hard && preview.hard <= preview.gotIt)) ordered = false;
    if (!(relearnPreview.forgot < relearnPreview.hard && relearnPreview.hard <= relearnPreview.gotIt)) ordered = false;
  }
  check(`first pass: the preview equals the schedule before fuzz, for all three grades (${trials} random cards)`, firstPassExact, firstFailure);
  check(`relearn re-show: the preview equals the schedule before fuzz, for all three grades (${trials} random cards)`, relearnExact, firstFailure);
  check("with real fuzz the schedule is within ±12% of the preview (exact under 3 days) and never past 365 days", realFuzzInBounds);
  check("previews are ordered: Forgot < Hard ≤ Got it (first pass and relearn)", ordered);

  const plain: SRSCard = { level: 2, nextReview: NOW - DAY, type: "vocab", itemKey: "x", reps: 2, lastReviewed: NOW - 4 * DAY };
  const sample = previewIntervals(plain, NOW);
  check("a level-2 card previews 10m / ~6d / ~7d... as the table says (Forgot 10m, Hard 0.8 × 3d = 2.4d, Got it 7d)",
    sample.forgot === 10 * MIN && sample.hard === Math.round(0.8 * 3 * DAY) && sample.gotIt === 7 * DAY, `${sample.forgot} ${sample.hard} ${sample.gotIt}`);
  const garbage = previewIntervals({ level: NaN, nextReview: "soon", type: "vocab", itemKey: "g" } as unknown as SRSCard, NOW);
  check("previewIntervals never throws or returns NaN on a corrupt card", [garbage.forgot, garbage.hard, garbage.gotIt].every(Number.isFinite));
  check("previewIntervals never mutates its card", (() => { const frozen = Object.freeze({ ...plain }); try { previewIntervals(frozen, NOW); previewIntervals(frozen, NOW, { relearn: true }); return true; } catch { return false; } })());

  // The relearn table.
  const halved: SRSCard = { level: 2, nextReview: NOW, type: "vocab", itemKey: "h", reps: 3, lapses: 2, ease: 1.1, lastReviewed: NOW - 3 * DAY };
  check("relearn intervals at level 2: Forgot 10m, Hard 2.4d → 2.4d (≥ 1d), Got it 3d (S2 rule)",
    relearnIntervalMs(halved, "forgot") === 10 * MIN && relearnIntervalMs(halved, "hard") === Math.round(0.8 * 3 * DAY) && relearnIntervalMs(halved, "gotIt") === 3 * DAY);
  check("relearn at level 0 or 1: Hard and Got it both wait the 1-day minimum", relearnIntervalMs({ ...halved, level: 0 }, "hard") === DAY && relearnIntervalMs({ ...halved, level: 0 }, "gotIt") === DAY && relearnIntervalMs({ ...halved, level: 1 }, "hard") === DAY);
  for (const grade of SRS_GRADES) {
    const after = scheduleRelearnGrade(halved, grade, NOW);
    check(`relearn ${grade}: level, lapses, reps and ease unchanged (the penalty was taken on the first pass); lastReviewed stamped`,
      after.level === 2 && after.lapses === 2 && after.reps === 3 && after.ease === 1.1 && after.lastReviewed === NOW);
  }
  check("relearn Forgot is due in exactly 10 minutes; Hard and Got it at least a day", scheduleRelearnGrade(halved, "forgot", NOW).nextReview === NOW + 10 * MIN && scheduleRelearnGrade(halved, "hard", NOW).nextReview - NOW >= DAY * 0.88);

  // Labels.
  const label = (ms: number) => formatIntervalShort(ms);
  check("labels: 10m, 45m, 8h, 1d, 3d, 45d", [label(10 * MIN), label(45 * MIN), label(8 * HOUR), label(DAY), label(3 * DAY), label(45 * DAY)].join() === "10m,45m,8h,1d,3d,45d", [label(10 * MIN), label(45 * MIN), label(8 * HOUR), label(DAY), label(3 * DAY), label(45 * DAY)].join());
  check("labels: 60d → 2mo, 120d → 4mo, 240d → 8mo, 365d → 1y", [label(60 * DAY), label(120 * DAY), label(240 * DAY), label(365 * DAY)].join() === "2mo,4mo,8mo,1y", [label(60 * DAY), label(120 * DAY), label(240 * DAY), label(365 * DAY)].join());
  check("labels: 23.6h rounds to 1d, never '24h'; never empty on bad input", label(23.6 * HOUR) === "1d" && [NaN, -5, 0, Infinity].every((v) => /^\d+[mhdoy]+$/.test(label(v))), [label(23.6 * HOUR), label(NaN), label(Infinity)].join());
}

section("S3: cloud merge with ease");

{
  const random = lcg(99);
  const pick = (): SRSCard => {
    const reviewed = random() < 0.75;
    return {
      level: Math.floor(random() * 9),
      nextReview: NOW + Math.round((random() - 0.5) * 60 * DAY),
      type: "vocab",
      itemKey: "m",
      ...(reviewed ? { lastReviewed: NOW - Math.floor(random() * 30) * DAY, reps: Math.floor(random() * 9) } : {}),
      ...(random() < 0.7 ? { ease: Math.round((0.8 + random() * 0.6) * 100) / 100 } : {}),
    };
  };
  let idempotent = true;
  let winnerKeepsItsEase = true;
  let safe = true;
  for (let i = 0; i < 400; i++) {
    const a: Record<string, SRSCard> = { m: pick(), only: { ...pick(), itemKey: "only" } };
    const b: Record<string, SRSCard> = { m: pick() };
    const merged = mergeSrsCards(a, b, NOW);
    if (stable(mergeSrsCards(merged, b, NOW)) !== stable(merged)) idempotent = false;
    const winner = [a.m, b.m].find((c) => stable(c) === stable(merged.m));
    if (!winner) winnerKeepsItsEase = false;
    if (containsUndefined(merged) || stable(JSON.parse(JSON.stringify(merged))) !== stable(merged)) safe = false;
  }
  check("merge stays idempotent with ease present (400 random pairs)", idempotent);
  check("the winning copy keeps its own ease (ease is never mixed between copies)", winnerKeepsItsEase);
  check("merged decks with ease are cloud-safe", safe);

  const local: SRSCard = { level: 4, nextReview: NOW + 9 * DAY, type: "vocab", itemKey: "m", lastReviewed: NOW - DAY, reps: 5, ease: 1.2 };
  const cloud: SRSCard = { ...local, lastReviewed: NOW - 3 * DAY, ease: 1.0, level: 3 };
  check("the later-reviewed copy wins and brings its ease (local newer)", mergeSrsCards({ m: local }, { m: cloud }, NOW).m.ease === 1.2);
  check("the later-reviewed copy wins and brings its ease (cloud newer)", mergeSrsCards({ m: cloud }, { m: local }, NOW).m.ease === 1.2);
  check("a copy that has ease beats a legacy copy that has none only through the lastReviewed rule (S1)", mergeSrsCards({ m: { ...local } }, { m: { level: 9 - 1, nextReview: NOW + 99 * DAY, type: "vocab", itemKey: "m" } }, NOW).m.ease === 1.2);
}

section("S3: 7-day forecast");

{
  const due = (key: string, at: number): SRSCard => ({ level: 2, nextReview: at, type: "vocab", itemKey: key, reps: 2, lastReviewed: at - 3 * DAY });
  const deck = deckOf([
    due("overdue", TODAY_NOON - 2 * DAY),          // not counted: due now
    due("later-today", TODAY_NOON + 3 * HOUR),      // not counted: part of today
    due("tomorrow-start", localAt(1, 0)),           // bucket 0, boundary is inclusive
    due("tomorrow-end", localAt(1, 23, 59)),        // bucket 0
    due("day2-start", localAt(2, 0)),               // bucket 1
    newCard("new-day3", localAt(2, 20), { nextReview: localAt(3, 4) }), // bucket 2: new cards count too
    due("day7-end", localAt(7, 23, 59)),            // bucket 6
    due("day8-start", localAt(8, 0)),               // not counted: beyond the week
    due("far", localAt(60, 12)),                    // not counted
  ]);
  const forecast = buildForecast(deck, TODAY_NOON);
  check("forecast: 7 buckets starting tomorrow, each at the start of its local day",
    forecast.length === 7 && forecast.every((day, i) => day.dayStart === localAt(i + 1, 0)), forecast.map((d) => new Date(d.dayStart).toISOString()).join(" "));
  check("forecast counts by day: [2, 1, 1, 0, 0, 0, 1]", forecast.map((d) => d.count).join() === "2,1,1,0,0,0,1", forecast.map((d) => d.count).join());
  check("forecast ignores overdue, due-later-today and beyond-the-week cards", forecast.reduce((a, d) => a + d.count, 0) === 5);
  check("forecast of an empty deck is seven zeros", buildForecast({}, TODAY_NOON).length === 7 && buildForecast({}, TODAY_NOON).every((d) => d.count === 0));
  check("forecast honours a different length", buildForecast(deck, TODAY_NOON, 3).map((d) => d.count).join() === "2,1,1");
  check("forecast is plain data (JSON-safe, no undefined)", !containsUndefined(forecast) && stable(JSON.parse(JSON.stringify(forecast))) === stable(forecast));
  check("forecast line: total and tomorrow", formatForecastLine(forecast) === "5 due in the next 7 days · 2 tomorrow", formatForecastLine(forecast));
  check("forecast line for an empty week", formatForecastLine(buildForecast({}, TODAY_NOON)) === "Nothing due in the next 7 days");

  // Consistency on a random deck.
  const random = lcg(5);
  const big: Record<string, SRSCard> = {};
  for (let i = 0; i < 600; i++) big[`b${i}`] = due(`b${i}`, TODAY_NOON + Math.round((random() - 0.3) * 20 * DAY));
  const bigForecast = buildForecast(big, TODAY_NOON);
  const expected = Object.values(big).filter((c) => c.nextReview >= localAt(1, 0) && c.nextReview < localAt(8, 0)).length;
  check("forecast total equals the number of cards due in [tomorrow, day 8) on a random 600-card deck", bigForecast.reduce((a, d) => a + d.count, 0) === expected, `${bigForecast.reduce((a, d) => a + d.count, 0)} vs ${expected}`);
}

// 365-day simulation using all three grades (S3), with the S2 daily limits.
section("365-day simulation WITH three grades (900 cards, 10/day for 90 days; 72% Got it, 16% Hard, 12% Forgot)");

{
  const settings = defaultSrsSettings();
  const DAYS = 365;
  const answers = lcg(7);
  const gradeOf = (): SrsGrade => { const r = answers(); return r < 0.72 ? "gotIt" : r < 0.88 ? "hard" : "forgot"; };
  let deck: Record<string, SRSCard> = {};
  const shownTotal: number[] = [];
  const backlogAtStart: number[] = [];
  let maxShownInOneDay = 0;
  let capOk = true;
  let newCapOk = true;
  let ceilingOk = true;
  let easeOk = true;
  let levelOk = true;
  let safe = true;
  let hardDropsLevel = false;
  let longest = 0;

  for (let day = 0; day < DAYS; day++) {
    const t = localAt(day, 9);
    if (day < 90) for (let i = 0; i < 10; i++) { const key = `c${day}-${i}`; deck[key] = createNewCard(key, "vocab", t); }
    backlogAtStart.push(Object.values(deck).filter((card) => card.nextReview <= t && !isNewCard(card)).length);

    let firstPassToday = 0;
    let newToday = 0;
    let shown = 0;
    for (let reopen = 0; reopen < 4; reopen++) {
      const plan = buildSessionPlan(deck, settings, t);
      if (plan.total === 0) break;
      const queue = [...plan.queue];
      const requeues: Record<string, number> = {};
      const seen = new Set<string>();
      for (let i = 0; i < queue.length; i++) {
        const key = queue[i].itemKey;
        const isRelearn = seen.has(key);
        seen.add(key);
        const grade = gradeOf();
        shown++;
        const before = deck[key];
        if (isRelearn) {
          deck[key] = scheduleRelearnGrade(before, grade, t);
        } else {
          if (isNewCard(before)) newToday++;
          deck[key] = scheduleGrade(before, grade, t);
          firstPassToday++;
          if (grade === "hard" && deck[key].level < before.level) hardDropsLevel = true;
          if (grade !== "forgot") longest = Math.max(longest, deck[key].nextReview - t);
        }
        if (grade === "forgot" && (requeues[key] ?? 0) < MAX_RELEARN_REQUEUES) { requeues[key] = (requeues[key] ?? 0) + 1; queue.push(queue[i]); }
        const after = deck[key];
        if (!Number.isFinite(after.nextReview) || containsUndefined(after) || stable(JSON.parse(JSON.stringify(after))) !== stable(after)) safe = false;
        if (after.nextReview - t > MAX_INTERVAL_MS) ceilingOk = false;
        if (after.ease !== undefined && !(after.ease >= MIN_EASE && after.ease <= MAX_EASE)) easeOk = false;
        if (!Number.isInteger(after.level) || after.level < 0 || after.level > MAX_LEVEL) levelOk = false;
      }
    }
    if (firstPassToday - newToday > settings.dailyReviewCap) capOk = false;
    if (newToday > settings.dailyNewCap) newCapOk = false;
    shownTotal.push(shown);
    maxShownInOneDay = Math.max(maxShownInOneDay, shown);
  }

  const mean = (values: number[], from: number, to: number) => values.slice(from, to).reduce((a, b) => a + b, 0) / (to - from);
  const eases = Object.values(deck).map((card) => cardEase(card));
  console.log(`  cards shown per day, days 1-90 (intake) avg      ${mean(shownTotal, 0, 90).toFixed(1)}`);
  console.log(`  cards shown per day, days 91-180 avg             ${mean(shownTotal, 90, 180).toFixed(1)}`);
  console.log(`  cards shown per day, days 181-300 avg            ${mean(shownTotal, 180, 300).toFixed(1)}`);
  console.log(`  cards shown per day, days 301-365 avg (steady)   ${mean(shownTotal, 300, 365).toFixed(1)}`);
  console.log(`  busiest day: ${maxShownInOneDay} cards shown   review backlog at the start of a day: peak ${Math.max(...backlogAtStart)}, last day ${backlogAtStart[DAYS - 1]}`);
  console.log(`  ease at the end: mean ${(eases.reduce((a, b) => a + b, 0) / eases.length).toFixed(2)}, min ${Math.min(...eases).toFixed(2)}, max ${Math.max(...eases).toFixed(2)}   longest interval given: ${(longest / DAY).toFixed(1)}d`);

  check("3-grade sim: no day exceeds the review cap or the new-card cap", capOk && newCapOk);
  check("3-grade sim: no NaN, no undefined, every card cloud-safe", safe);
  check("3-grade sim: no interval past 365 days", ceilingOk, `${(longest / DAY).toFixed(1)}d`);
  check("3-grade sim: ease stays within 0.8–1.4 and level within 0–8", easeOk && levelOk);
  check("3-grade sim: Hard never lowered a level", !hardDropsLevel);
  check("3-grade sim: the busiest day stays well under the uncapped intake peak (93)", maxShownInOneDay < 93, String(maxShownInOneDay));
  check("3-grade sim: the backlog is cleared by the end of the year", backlogAtStart[DAYS - 1] <= settings.dailyReviewCap, String(backlogAtStart[DAYS - 1]));
  check("3-grade sim: all 900 cards were introduced", Object.values(deck).length === 900 && Object.values(deck).every((card) => !isNewCard(card)));
}

// ─── 6d. S4: tricky cards (leeches) and backlog recovery ────────────────────

/** A tricky card: forgotten 6 times, its last (failed) answer 2 days ago, so it is still waiting on that Forgot's 10-minute step. */
const s4Leech = (key: string, extra: Partial<SRSCard> = {}): SRSCard =>
  reviewCard(key, { level: 1, lapses: 6, leech: true, lastReviewed: TODAY_NOON - 2 * DAY, nextReview: TODAY_NOON - 2 * DAY + RELEARN_INTERVAL_MS, ...extra });
/** A very overdue review card: due `daysLate` days ago after being scheduled for 7 days. */
const s4Ancient = (key: string, daysLate = 200, extra: Partial<SRSCard> = {}): SRSCard =>
  reviewCard(key, { level: 3, nextReview: TODAY_NOON - daysLate * DAY, lastReviewed: TODAY_NOON - (daysLate + 7) * DAY, ...extra });
const s4MergeAt = (local: SRSCard, cloud: SRSCard, at: number): SRSCard => mergeSrsCards({ k: local }, { k: cloud }, at).k;
const s4Cap20: SrsSettings = { dailyReviewCap: 20, dailyNewCap: 10 };

section("S4: flagging a tricky card");

{
  check("LEECH_LAPSE_THRESHOLD is 6", LEECH_LAPSE_THRESHOLD === 6);
  check("backlog constants: offer above 3 x the cap; spread over 3 to 30 days, 5+ a day; back to level 1",
    BACKLOG_OFFER_FACTOR === 3 && RESCHEDULE_MIN_DAYS === 3 && RESCHEDULE_MAX_DAYS === 30 && RESCHEDULE_MIN_PER_DAY === 5 && RESCHEDULE_LEVEL === 1);
  const sixth = scheduleGrade(reviewCard("f5", { lapses: 5 }), "forgot", TODAY_NOON);
  check("flag: the Forgot that brings lapses to 6 sets the card aside", sixth.lapses === 6 && sixth.leech === true, JSON.stringify(sixth));
  const seventh = scheduleGrade(reviewCard("f6", { lapses: 6 }), "forgot", TODAY_NOON);
  check("flag: 7 lapses (already over the line) is flagged too", seventh.lapses === 7 && seventh.leech === true);
  const fifth = scheduleGrade(reviewCard("f4", { lapses: 4 }), "forgot", TODAY_NOON);
  check("flag: 5 lapses is not enough, and there is no leech field at all", fifth.lapses === 5 && !("leech" in fifth));
  const legacy = scheduleGrade({ level: 2, nextReview: NOW, type: "vocab", itemKey: "legacy" }, "forgot", TODAY_NOON);
  check("flag: a legacy card without lapses counts from 0 and is not flagged", legacy.lapses === 1 && !("leech" in legacy));
  check("flag: Hard and Got it never set a card aside",
    (["hard", "gotIt"] as const).every((grade) => {
      const next = scheduleGrade(reviewCard("g", { lapses: 5 }), grade, TODAY_NOON);
      return next.lapses === 5 && !("leech" in next);
    }));
  const relearn = scheduleRelearnGrade(reviewCard("r", { lapses: 5 }), "forgot", TODAY_NOON);
  check("flag: a relearn Forgot is not a new lapse and never flags", relearn.lapses === 5 && !("leech" in relearn));
  const stillAside = scheduleGrade(s4Leech("keep"), "gotIt", TODAY_NOON);
  check("flag: an answer does not clear the flag (only Put back does)", stillAside.leech === true);
  check("flag: the flagged card is JSON-safe (no undefined anywhere)", !containsUndefined(sixth) && !containsUndefined(fifth) && !containsUndefined(stillAside));
  check("flag: isLeech reads the flag", isLeech(sixth) && !isLeech(fifth));

  // The whole life of a card that keeps being forgotten: flagged on exactly the sixth Forgot.
  let card: SRSCard = reviewCard("life", { level: 4, lapses: 0 });
  let flaggedAt = 0;
  for (let i = 1; i <= 8; i++) {
    card = scheduleGrade(card, "forgot", TODAY_NOON + i * HOUR);
    if (card.leech === true && flaggedAt === 0) flaggedAt = i;
  }
  check("flag: a card forgotten over and over is flagged on exactly the 6th Forgot", flaggedAt === 6, String(flaggedAt));
}

section("S4: normalization of the leech field");

{
  const base = reviewCard("n");
  const kept = normalizeCard({ ...base, leech: true }, NOW);
  check("normalize: leech true is kept", kept !== null && kept.leech === true);
  const bad: unknown[] = [false, "true", 1, 0, null, undefined, {}, []];
  check("normalize: leech false, strings, numbers, null and objects are omitted (the field is not even present)",
    bad.every((value) => {
      const out = normalizeCard({ ...base, leech: value }, NOW);
      return out !== null && !("leech" in out);
    }));
  const flagged = s4Leech("rt");
  check("normalize: a tricky card survives a JSON round trip and normalization unchanged",
    stable(normalizeCard(JSON.parse(JSON.stringify(flagged)), NOW)) === stable(flagged));
  check("normalize: normalizeSrsCards keeps the flag on a whole deck", normalizeSrsCards(deckOf([flagged, reviewCard("plain")]), NOW).rt?.leech === true);
}

section("S4: tricky cards are set aside everywhere");

{
  const plain = [reviewCard("p1"), reviewCard("p2"), reviewCard("p3")];
  const deck = deckOf([
    ...plain,
    s4Leech("t1", { lapses: 7 }),                                   // due, tricky
    s4Leech("t2", { lastReviewed: TODAY_NOON - HOUR, nextReview: TODAY_NOON + 10 * MIN }), // answered today, would be due in 10 minutes
    reviewCard("later", { nextReview: TODAY_NOON + 2 * DAY, lastReviewed: TODAY_NOON - DAY }),
  ]);
  const plan = buildSessionPlan(deck, defaultSrsSettings(), TODAY_NOON);
  check("plan: tricky cards are never queued", keys(plan.queue) === "p1,p2,p3" || plan.queue.every((c) => !c.itemKey.startsWith("t")), keys(plan.queue));
  check("plan: exactly the 3 ordinary due cards are queued", plan.queue.length === 3 && plan.total === 3);
  check("plan: trickyCount counts the set-aside cards", plan.trickyCount === 2, String(plan.trickyCount));
  check("plan: the backlog does not include tricky cards", plan.overdueBacklog === 3, String(plan.overdueBacklog));
  check("plan: nextDueAt ignores a tricky card that would be due in 10 minutes", plan.nextDueAt === TODAY_NOON + 2 * DAY, String(plan.nextDueAt));
  check("plan: the summary carries the S4 fields and still has no queue",
    (() => { const sum = summarizeSession(plan); return !("queue" in sum) && sum.trickyCount === 2 && sum.overdueBacklog === 3; })());
  check("plan: S4 fields are plain data (JSON-safe)", !containsUndefined(summarizeSession(plan)));

  // Waiting count: 25 ordinary due cards + 5 tricky ones, cap 20 → 20 queued, 5 waiting (not 10).
  const crowded = deckOf([...Array.from({ length: 25 }, (_, i) => reviewCard(`c${i}`)), ...Array.from({ length: 5 }, (_, i) => s4Leech(`x${i}`))]);
  const crowdedPlan = buildSessionPlan(crowded, s4Cap20, TODAY_NOON);
  check("plan: tricky cards are not counted as waiting", crowdedPlan.total === 20 && crowdedPlan.waitingCount === 5 && crowdedPlan.trickyCount === 5,
    `${crowdedPlan.total}/${crowdedPlan.waitingCount}/${crowdedPlan.trickyCount}`);

  // A tricky card that was answered today still used one of today's reviews.
  const spent = deckOf([...Array.from({ length: 25 }, (_, i) => reviewCard(`c${i}`)), s4Leech("today", { lastReviewed: TODAY_NOON - HOUR, nextReview: TODAY_NOON - HOUR + RELEARN_INTERVAL_MS })]);
  const spentPlan = buildSessionPlan(spent, s4Cap20, TODAY_NOON);
  check("plan: the Forgot that set a card aside still counts toward today's review budget", spentPlan.reviewedToday === 1 && spentPlan.reviewCount === 19,
    `${spentPlan.reviewedToday}/${spentPlan.reviewCount}`);

  // Forecast.
  const tomorrow = reviewCard("tomorrow", { nextReview: localAt(1, 10), lastReviewed: localAt(0, 9) });
  const asideTomorrow = s4Leech("aside-tomorrow", { nextReview: localAt(1, 11) });
  const forecast = buildForecast(deckOf([tomorrow, asideTomorrow]), TODAY_NOON);
  check("forecast: a tricky card is not counted as coming up", forecast[0].count === 1 && forecast.reduce((a, d) => a + d.count, 0) === 1, forecast.map((d) => d.count).join());

  // Listing.
  const listed = listTrickyCards(deckOf([reviewCard("ok"), s4Leech("b", { lapses: 6 }), s4Leech("a", { lapses: 6 }), s4Leech("c", { lapses: 9 })]));
  check("list: only tricky cards, most forgotten first, then by key", keys(listed) === "c,a,b", keys(listed));
  check("list: empty deck gives an empty list", listTrickyCards({}).length === 0);
}

section("S4: Put back");

{
  const aside = s4Leech("pb", { ease: 0.85, reps: 4 });
  const back = putBackLeech(aside, TODAY_NOON);
  check("put back: the flag and the ease are removed (omitted, not false or undefined)", !("leech" in back) && !("ease" in back) && !containsUndefined(back));
  check("put back: level 0 and lapses 0", back.level === 0 && back.lapses === 0);
  check("put back: it was already due, so nextReview is left alone", back.nextReview === aside.nextReview, `${back.nextReview} vs ${aside.nextReview}`);
  check("put back: lastReviewed, reps, type and key are untouched",
    back.lastReviewed === aside.lastReviewed && back.reps === 4 && back.type === aside.type && back.itemKey === "pb");
  check("put back: it does not turn into a new card", !isNewCard(back));
  const future = putBackLeech(s4Leech("pb-future", { nextReview: TODAY_NOON + 3 * DAY }), TODAY_NOON);
  check("put back: a card scheduled in the future becomes due now", future.nextReview === TODAY_NOON, String(future.nextReview));
  check("put back: a card that is not tricky is returned untouched (same object)", (() => { const plainCard = reviewCard("plain"); return putBackLeech(plainCard, TODAY_NOON) === plainCard; })());
  check("put back: the input card is not mutated", aside.leech === true && aside.ease === 0.85 && aside.lapses === 6);

  const before = buildSessionPlan(deckOf([aside, reviewCard("other")]), defaultSrsSettings(), TODAY_NOON);
  const after = buildSessionPlan(deckOf([back, reviewCard("other")]), defaultSrsSettings(), TODAY_NOON);
  check("put back: the card returns to the session queue", !before.queue.some((c) => c.itemKey === "pb") && after.queue.some((c) => c.itemKey === "pb"));
  check("put back: tricky count drops and it is not an answer, so today's reviewed count does not move",
    before.trickyCount === 1 && after.trickyCount === 0 && before.reviewedToday === after.reviewedToday, `${before.reviewedToday}/${after.reviewedToday}`);
  check("put back: it is picked first (it has been waiting longest)", after.queue[0].itemKey === "pb", keys(after.queue));

  // Its next answer is the plain ladder: no overdue credit for a card that was failed, not remembered.
  const late = TODAY_NOON + 30 * DAY;
  check("put back: no overdue credit on its next Got it (late or not, same interval)",
    gradeIntervalMs(back, "gotIt", late) === gradeIntervalMs(back, "gotIt", back.nextReview), `${gradeIntervalMs(back, "gotIt", late)} vs ${gradeIntervalMs(back, "gotIt", back.nextReview)}`);
  check("put back: six more Forgot answers are needed before it is set aside again", (() => {
    let card: SRSCard = back;
    for (let i = 1; i <= 5; i++) card = scheduleGrade(card, "forgot", TODAY_NOON + i * HOUR);
    const fiveLater = !("leech" in card) && card.lapses === 5;
    card = scheduleGrade(card, "forgot", TODAY_NOON + 6 * HOUR);
    return fiveLater && card.leech === true && card.lapses === 6;
  })());
}

section("S4: merge keeps a put-back card put back");

{
  const aside = s4Leech("m");
  const back = putBackLeech(aside, TODAY_NOON);
  const a = s4MergeAt(aside, back, TODAY_NOON);
  const b = s4MergeAt(back, aside, TODAY_NOON);
  check("merge: a put-back card beats the older leech copy, whichever device syncs first", !("leech" in a) && !("leech" in b), `${a.leech}/${b.leech}`);
  check("merge: and the result is the same both ways round", stable(a) === stable(b));
  check("merge: merging the result again changes nothing", stable(s4MergeAt(a, aside, TODAY_NOON)) === stable(a) && stable(s4MergeAt(a, back, TODAY_NOON)) === stable(a));
  const reflagged = s4Leech("m", { lastReviewed: TODAY_NOON - HOUR, nextReview: TODAY_NOON - HOUR + RELEARN_INTERVAL_MS, lapses: 6 });
  check("merge: a later Forgot that set the card aside again beats the put-back copy", s4MergeAt(back, reflagged, TODAY_NOON).leech === true && s4MergeAt(reflagged, back, TODAY_NOON).leech === true);
  const answered = scheduleGrade(back, "gotIt", TODAY_NOON);
  check("merge: an answer given after Put back beats the old leech copy", !("leech" in s4MergeAt(aside, answered, TODAY_NOON)) && !("leech" in s4MergeAt(answered, aside, TODAY_NOON)));
  check("merge: two identical tricky copies stay tricky", s4MergeAt(aside, { ...aside }, TODAY_NOON).leech === true);
  const deckMerge = mergeSrsCards(deckOf([aside, reviewCard("x")]), deckOf([back, reviewCard("x")]), TODAY_NOON);
  check("merge: on a whole deck the put-back card is not resurrected as tricky", !("leech" in deckMerge.m) && !containsUndefined(deckMerge));
}

section("S4: very overdue cards");

{
  check("very overdue: constants are 60 days and a ratio of 2", VERY_OVERDUE_MIN_MS === 60 * DAY && VERY_OVERDUE_RATIO === 2);
  check("very overdue: 200 days late on a 7-day interval is", isVeryOverdue(s4Ancient("a"), TODAY_NOON));
  check("very overdue: 59 days late is not (even though 59 / 1 day is far over the ratio)",
    !isVeryOverdue(reviewCard("b", { level: 1, nextReview: TODAY_NOON - 59 * DAY, lastReviewed: TODAY_NOON - 60 * DAY }), TODAY_NOON));
  check("very overdue: 61 days late on a 1-day interval is",
    isVeryOverdue(reviewCard("b2", { level: 1, nextReview: TODAY_NOON - 61 * DAY, lastReviewed: TODAY_NOON - 62 * DAY }), TODAY_NOON));
  check("very overdue: 90 days late on a 60-day interval is not (ratio 1.5)",
    !isVeryOverdue(reviewCard("c", { level: 6, nextReview: TODAY_NOON - 90 * DAY, lastReviewed: TODAY_NOON - 150 * DAY }), TODAY_NOON));
  check("very overdue: exactly twice the interval is not (it must be more than 2x)",
    !isVeryOverdue(reviewCard("d", { level: 6, nextReview: TODAY_NOON - 120 * DAY, lastReviewed: TODAY_NOON - 180 * DAY }), TODAY_NOON));
  check("very overdue: 130 days late on a 60-day interval is",
    isVeryOverdue(reviewCard("e", { level: 6, nextReview: TODAY_NOON - 130 * DAY, lastReviewed: TODAY_NOON - 190 * DAY }), TODAY_NOON));
  check("very overdue: a legacy card (no history) uses its level's interval", isVeryOverdue({ level: 5, nextReview: TODAY_NOON - 100 * DAY, type: "vocab", itemKey: "legacy" }, TODAY_NOON));
  check("very overdue: a card that is not due yet is not", !isVeryOverdue(s4Ancient("f", -2), TODAY_NOON));
  check("very overdue: a new card that was never answered is not", !isVeryOverdue(newCard("g", TODAY_NOON - 200 * DAY), TODAY_NOON));
  check("very overdue: a tricky card is not", !isVeryOverdue(s4Ancient("h", 200, { leech: true, lapses: 6 }), TODAY_NOON));

  // The offer: more than 3 x the review cap in due reviews, and at least one very overdue card.
  const sixty = deckOf(Array.from({ length: 60 }, (_, i) => s4Ancient(`o${i}`)));
  const sixtyOne = deckOf(Array.from({ length: 61 }, (_, i) => s4Ancient(`o${i}`)));
  check("offer: exactly 3 x the cap (60 with a cap of 20) is not enough", !buildSessionPlan(sixty, s4Cap20, TODAY_NOON).backlogOffer);
  const offered = buildSessionPlan(sixtyOne, s4Cap20, TODAY_NOON);
  check("offer: one more than 3 x the cap is offered, with the exact count", offered.backlogOffer && offered.veryOverdueCount === 61 && offered.overdueBacklog === 61, `${offered.backlogOffer}/${offered.veryOverdueCount}`);
  const recentBacklog = deckOf(Array.from({ length: 61 }, (_, i) => reviewCard(`rb${i}`, { nextReview: TODAY_NOON - 5 * DAY, lastReviewed: TODAY_NOON - 8 * DAY })));
  const recentPlan = buildSessionPlan(recentBacklog, s4Cap20, TODAY_NOON);
  check("offer: a big backlog of only recently overdue cards is not offered", !recentPlan.backlogOffer && recentPlan.veryOverdueCount === 0);
  const unlimitedPlan = buildSessionPlan(deckOf(Array.from({ length: 1000 }, (_, i) => s4Ancient(`u${i}`))), { dailyReviewCap: UNLIMITED_REVIEWS, dailyNewCap: 10 }, TODAY_NOON);
  check("offer: never with 'No limit' (the learner opted out of caps), though the count is still reported", !unlimitedPlan.backlogOffer && unlimitedPlan.veryOverdueCount === 1000);
  const defaultCap = (n: number) => buildSessionPlan(deckOf(Array.from({ length: n }, (_, i) => s4Ancient(`d${i}`))), defaultSrsSettings(), TODAY_NOON).backlogOffer;
  check("offer: with the default cap of 50 the line is between 150 and 151", !defaultCap(150) && defaultCap(151));
  check("offer: an empty deck offers nothing", !buildSessionPlan({}, defaultSrsSettings(), TODAY_NOON).backlogOffer);
}

section("S4: spreading very overdue cards");

{
  const dflt = defaultSrsSettings();
  check("spread: no cards → 0 days", rescheduleSpreadDays(0, dflt) === 0 && rescheduleSpreadDays(-3, dflt) === 0);
  check("spread: never more days than cards", rescheduleSpreadDays(1, dflt) === 1 && rescheduleSpreadDays(2, dflt) === 2);
  check("spread: at least 3 days when there are 3 or more cards", rescheduleSpreadDays(3, dflt) === 3 && rescheduleSpreadDays(60, dflt) === 3);
  check("spread: about half a daily cap per day (cap 50 → 25 a day)", rescheduleSpreadDays(100, dflt) === 4 && rescheduleSpreadDays(700, dflt) === 28);
  check("spread: at most 30 days", rescheduleSpreadDays(1000, dflt) === 30 && rescheduleSpreadDays(100000, dflt) === 30);
  check("spread: cap 20 → 10 a day", rescheduleSpreadDays(100, s4Cap20) === 10);
  check("spread: 'No limit' uses the default cap of 50", rescheduleSpreadDays(100, { dailyReviewCap: UNLIMITED_REVIEWS, dailyNewCap: 10 }) === 4);
  check("spread: nonsense settings fall back to the defaults", rescheduleSpreadDays(100, null) === 4 && rescheduleSpreadDays(100, "x") === 4);

  // A mixed deck: a0..a9 are very overdue (a0 the most, a9 the least), plus cards that must not be touched.
  const ancientCards = Array.from({ length: 10 }, (_, i) => s4Ancient(`a${i}`, 209 - i, { ease: 1.1, lapses: 2, reps: 5 }));
  const untouched: SRSCard[] = [
    reviewCard("r0"), reviewCard("r1"), reviewCard("r2"),                                                  // due, recent
    reviewCard("later", { nextReview: TODAY_NOON + 20 * DAY, lastReviewed: TODAY_NOON - DAY }),            // not due
    newCard("fresh", TODAY_NOON - 10 * HOUR),                                                              // new, due
    s4Leech("tricky", { nextReview: TODAY_NOON - 300 * DAY, lastReviewed: TODAY_NOON - 300 * DAY - RELEARN_INTERVAL_MS }), // tricky, absurdly old
  ];
  const deck = deckOf([...ancientCards, ...untouched]);
  const snapshot = stable(deck);
  const planBefore = buildSessionPlan(deck, dflt, TODAY_NOON);
  const result = rescheduleVeryOverdue(deck, dflt, TODAY_NOON);

  check("reschedule: moves exactly the very overdue cards, over 3 days", result.count === 10 && result.days === 3, `${result.count}/${result.days}`);
  check("reschedule: the count equals what the banner would have shown", result.count === planBefore.veryOverdueCount, `${result.count} vs ${planBefore.veryOverdueCount}`);
  check("reschedule: the input deck is not mutated and a new deck is returned", stable(deck) === snapshot && result.cards !== deck);
  check("reschedule: every other card is the very same object", untouched.every((card) => result.cards[card.itemKey] === deck[card.itemKey]));
  check("reschedule: the result is plain data (no undefined anywhere)", !containsUndefined(result.cards));
  check("reschedule: every moved card is back at level 1", ancientCards.every((card) => result.cards[card.itemKey].level === 1));
  check("reschedule: history, ease, lapses and type are untouched on moved cards",
    ancientCards.every((card) => {
      const moved = result.cards[card.itemKey];
      return moved.lastReviewed === card.lastReviewed && moved.reps === 5 && moved.lapses === 2 && moved.ease === 1.1 && moved.type === card.type && moved.itemKey === card.itemKey;
    }));
  check("reschedule: most overdue first, dealt round-robin to tomorrow, day 2 and day 3 at local midnight",
    ancientCards.every((card, i) => result.cards[card.itemKey].nextReview === localAt(1 + (i % 3), 0)),
    ancientCards.map((card) => new Date(result.cards[card.itemKey].nextReview).getDate()).join());
  const perDay = [1, 2, 3].map((day) => ancientCards.filter((card) => result.cards[card.itemKey].nextReview === localAt(day, 0)).length);
  check("reschedule: day sizes differ by at most one (4, 3, 3)", perDay.join() === "4,3,3", perDay.join());
  check("reschedule: nothing is due today any more", ancientCards.every((card) => result.cards[card.itemKey].nextReview > TODAY_NOON));

  const planAfter = buildSessionPlan(result.cards, dflt, TODAY_NOON);
  check("reschedule: the backlog is down to the ordinary due cards and the offer is gone", planAfter.overdueBacklog === 3 && planAfter.veryOverdueCount === 0 && !planAfter.backlogOffer, `${planAfter.overdueBacklog}`);
  check("reschedule: it is not an answer, so today's reviewed count does not move", planAfter.reviewedToday === planBefore.reviewedToday && planAfter.newToday === planBefore.newToday);
  check("reschedule: the forecast shows them on the next three days", buildForecast(result.cards, TODAY_NOON).map((day) => day.count).join() === "4,3,3,0,0,0,0", buildForecast(result.cards, TODAY_NOON).map((day) => day.count).join());
  const again = rescheduleVeryOverdue(result.cards, dflt, TODAY_NOON);
  check("reschedule: doing it again moves nothing and returns the same deck", again.count === 0 && again.days === 0 && again.cards === result.cards);
  check("reschedule: an empty deck moves nothing", rescheduleVeryOverdue({}, dflt, TODAY_NOON).count === 0);

  // A level-0 card is never raised; a high one comes down to 1.
  const levels = rescheduleVeryOverdue(deckOf([s4Ancient("zero", 200, { level: 0 }), s4Ancient("five", 200, { level: 5 })]), dflt, TODAY_NOON);
  check("reschedule: level = min(level, 1): 0 stays 0, 5 becomes 1", levels.cards.zero.level === 0 && levels.cards.five.level === 1);

  // Merge: the moved copy beats the old overdue copy whichever way round they meet.
  const old = ancientCards[0];
  const moved = result.cards[old.itemKey];
  check("merge: a rescheduled card beats its old overdue copy, both ways round",
    stable(s4MergeAt(old, moved, TODAY_NOON)) === stable(moved) && stable(s4MergeAt(moved, old, TODAY_NOON)) === stable(moved));
  check("merge: a deck merge keeps the rescheduled cards rescheduled", (() => {
    const merged = mergeSrsCards(deck, result.cards, TODAY_NOON);
    return ancientCards.every((card) => merged[card.itemKey].nextReview > TODAY_NOON && merged[card.itemKey].level === 1);
  })());
  check("merge: an answer given on another device after the reschedule still wins",
    s4MergeAt(moved, scheduleGrade(old, "gotIt", TODAY_NOON + HOUR), TODAY_NOON + HOUR).lastReviewed === TODAY_NOON + HOUR);
}

section("S4: a tricky card through a whole deck lifecycle");

{
  // 30 cards, one of them impossible: forgotten at every showing. It is set aside after its 6th Forgot, stops costing sessions,
  // can be put back, and is not counted as due, waiting or coming up while it is set aside.
  let deck = deckOf(Array.from({ length: 30 }, (_, i) => reviewCard(`k${i}`, { nextReview: TODAY_NOON - 3 * HOUR - i * MIN })));
  deck.hard = reviewCard("hard", { nextReview: TODAY_NOON - 4 * HOUR });
  let day = 0;
  let flaggedOnDay = -1;
  for (; day < 12; day++) {
    const now = TODAY_NOON + day * DAY;
    const plan = buildSessionPlan(deck, defaultSrsSettings(), now);
    for (const card of plan.queue) {
      const grade: SrsGrade = card.itemKey === "hard" ? "forgot" : "gotIt";
      deck[card.itemKey] = scheduleGrade(deck[card.itemKey], grade, now);
      if (deck.hard.leech === true && flaggedOnDay < 0) flaggedOnDay = day;
    }
    // Force "hard" due again each morning (a relearn step plus a night is always past).
    if (deck.hard.leech !== true) deck.hard = { ...deck.hard, nextReview: now + DAY - 12 * HOUR };
  }
  check("lifecycle: the impossible card is flagged after 6 days of one Forgot a day", flaggedOnDay === 5, String(flaggedOnDay));
  check("lifecycle: once flagged it is no longer in any queue", !buildSessionPlan(deck, defaultSrsSettings(), TODAY_NOON + 20 * DAY).queue.some((c) => c.itemKey === "hard"));
  check("lifecycle: it stays at 6 lapses (no further Forgot was possible)", deck.hard.lapses === 6 && deck.hard.leech === true, String(deck.hard.lapses));
  const listed = listTrickyCards(deck);
  check("lifecycle: it is the only entry in the Tricky cards list", keys(listed) === "hard");
  deck = { ...deck, hard: putBackLeech(deck.hard, TODAY_NOON + 20 * DAY) };
  const backPlan = buildSessionPlan(deck, defaultSrsSettings(), TODAY_NOON + 20 * DAY);
  check("lifecycle: after Put back it is due again and the list is empty", backPlan.queue.some((c) => c.itemKey === "hard") && listTrickyCards(deck).length === 0);
}

// ─── 7. Optional: a real exported deck ───────────────────────────────────────

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
console.log("S1 + S2 + S3 + S4 scheduler checks: all green.");
