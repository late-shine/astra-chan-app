// src/srsScheduler.ts
// ─────────────────────────────────────────────────────────────────────────────
// Phases S1 + S2 + S3 — the Review Deck scheduling engine, as a PURE module.
//
// No React, no localStorage, no Firebase, no clock reads of its own: every
// function that needs "now" takes it as a parameter (mergeSrsCards defaults it).
// `useSRS` calls into this file; scripts/srs-sim.ts exercises it under plain
// Node. Isolating the scheduler here is what lets later phases (S3 grading,
// S4 leeches) and any future FSRS-style swap change one file instead of the hook.
//
// S1: ladder, fuzz, history fields, cloud merge.
// S2: the 10-minute relearn step, daily limits (SrsSettings), the derived daily
//     counters, and buildSessionPlan (the one place a session queue is made).
// S3: three grades (Forgot / Hard / Got it), a per-card `ease` multiplier, overdue
//     credit, the 365-day ceiling, previewIntervals (the labels under the buttons)
//     and buildForecast (the 7-day strip). scheduleGrade and previewIntervals share
//     one interval function, so a preview can never disagree with the schedule.
//
// Ladder (a card's `level` is its position on this ladder, 0–8):
//   0: 8h   1: 1d   2: 3d   3: 7d   4: 14d   5: 30d   6: 60d   7: 120d   8: 240d
// Levels 0–5 keep their exact pre-S1 meaning. Level 8 is the maximum and a
// correct answer there stays at 8 (there is no retirement).
//
// Cloud-safety rules every function here follows (Realtime Database):
//   • Never emits `undefined` anywhere: optional fields are omitted.
//   • Output is plain JSON (numbers, strings, booleans) and survives a
//     JSON.stringify/parse round trip unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import type { SRSCard, SrsSettings } from "./types";

// ── Constants ────────────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const MIN_LEVEL = 0;
export const MAX_LEVEL = 8;

/** Interval in ms for a card that has just reached each level (index = level). */
export const INTERVALS_MS: readonly number[] = [
  8 * HOUR_MS, //   level 0 → 8 hours (also the delay before a brand-new card is first due)
  1 * DAY_MS, //    level 1 → 1 day
  3 * DAY_MS, //    level 2 → 3 days
  7 * DAY_MS, //    level 3 → 7 days
  14 * DAY_MS, //   level 4 → 14 days
  30 * DAY_MS, //   level 5 → 30 days
  60 * DAY_MS, //   level 6 → 60 days
  120 * DAY_MS, //  level 7 → 120 days
  240 * DAY_MS, //  level 8 → 240 days (maximum)
];

/** A forgotten card is due again after this long (the relearn step; S1 used 4 hours). */
export const RELEARN_INTERVAL_MS = 10 * 60 * 1000;
/** A forgotten card is re-shown in the same session at most this many extra times. */
export const MAX_RELEARN_REQUEUES = 2;
/** After a successful relearn pass the card waits at least this long (the "minimum 1 day" rule). */
export const RELEARN_MIN_GRADUATION_MS = DAY_MS;

/** Fuzz is only applied to intervals at least this long. */
export const FUZZ_MIN_INTERVAL_MS = 3 * DAY_MS;
/** Fuzz spreads a new interval by ±12%. */
export const FUZZ_RATIO = 0.12;
/**
 * The absolute ceiling on any interval the scheduler produces (S3). Ease (up to 1.4) and fuzz
 * (up to +12%) on the 240-day rung would otherwise reach about 376 days; before S3 this constant
 * was 240d × 1.12.
 */
export const MAX_INTERVAL_MS = 365 * DAY_MS;

export const CARD_TYPES: readonly SRSCard["type"][] = ["vocab", "kanji", "hiragana", "katakana"];

// ── Grading constants (S3) ───────────────────────────────────────────────────

/** The three answers a learner can give after the reveal. `answerCard(key, boolean)` maps true → gotIt, false → forgot. */
export type SrsGrade = "forgot" | "hard" | "gotIt";
export const SRS_GRADES: readonly SrsGrade[] = ["forgot", "hard", "gotIt"];

/** Per-card ease multiplier on the ladder interval. A card with no `ease` field behaves as DEFAULT_EASE. */
export const DEFAULT_EASE = 1.0;
export const MIN_EASE = 0.8;
export const MAX_EASE = 1.4;
/** How far each grade moves a card's ease. The interval is chosen with the ease the card has BEFORE this change. */
export const EASE_DELTA: Readonly<Record<SrsGrade, number>> = { gotIt: 0.05, hard: -0.1, forgot: -0.15 };
/** Hard keeps the card on its level and waits this fraction of that level's interval (× ease)... */
export const HARD_INTERVAL_FACTOR = 0.8;
/** ...but a recalled answer (Hard or Got it) is never scheduled sooner than this. */
export const MIN_RECALL_INTERVAL_MS = DAY_MS;
/** Overdue credit (Got it only) never grants more than this many times the new ladder interval. */
export const OVERDUE_CREDIT_CAP_FACTOR = 2;

// ── Small helpers ────────────────────────────────────────────────────────────

/** Interval for a level, clamping out-of-range levels onto the ladder. */
export function intervalForLevel(level: number): number {
  const index = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.floor(level) || 0));
  return INTERVALS_MS[index];
}

/** 32-bit FNV-1a hash of a string. */
function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministic pseudo-random generator in [0, 1) seeded from a string
 * (mulberry32). Used for fuzz so the same card in the same state always gets the
 * same offset: React may run a state updater twice (StrictMode), and the sim must
 * be reproducible. Different cards get different offsets, which is the point.
 */
export function seededRandom(seed: string): () => number {
  let state = hashString(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ±12% on intervals of 3 days or more; shorter intervals are returned unchanged. */
export function applyFuzz(intervalMs: number, random: () => number): number {
  if (!(intervalMs >= FUZZ_MIN_INTERVAL_MS)) return intervalMs;
  const factor = 1 + (random() * 2 - 1) * FUZZ_RATIO;
  return Math.round(intervalMs * factor);
}

// ── Normalization ────────────────────────────────────────────────────────────

/** A finite number from a number or a numeric string; otherwise undefined. */
function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** A timestamp from a number, a numeric string, or a date string; otherwise undefined. */
function toTimestamp(value: unknown): number | undefined {
  const numeric = toFiniteNumber(value);
  if (numeric !== undefined) return numeric;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * Turn anything that might be a stored card into a valid SRSCard, or null if it
 * cannot be one. Never throws.
 *
 *  • A card that is already valid comes back with its `level` and `nextReview`
 *    exactly as they were, and gets NO invented fields: a legacy card (no `reps`)
 *    stays legacy and is never mistaken for a new card.
 *  • `level` → integer clamped to 0–8 (NaN/missing → 0).
 *  • `nextReview` → finite timestamp; a numeric or date string is converted; anything
 *    unusable becomes `now` (the card is simply due, never lost).
 *  • `type` → one of the four known types (unknown → "vocab"); `itemKey` falls back to
 *    `fallbackKey` (the map key) when missing.
 *  • Optional `lastReviewed`, `addedAt`, `introducedAt` (timestamps) and `reps`, `lapses` (counts) are kept
 *    only when valid and OMITTED otherwise (never `undefined`).
 *  • Optional `ease` (S3) is clamped to 0.8–1.4 when it is a number (or numeric string) and OMITTED
 *    otherwise. A legacy card is never given an `ease` it did not have.
 *  • Any other primitive field (string/boolean/finite number) is passed through
 *    untouched, so an older client cannot strip fields that later phases add
 *    (`leech`, ...). Objects, arrays, null and non-finite
 *    numbers are dropped.
 */
export function normalizeCard(raw: unknown, now: number, fallbackKey?: string): SRSCard | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;

  const itemKey = typeof source.itemKey === "string" && source.itemKey !== "" ? source.itemKey : fallbackKey;
  if (!itemKey) return null;

  const out: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(source)) {
    if (field === "__proto__") continue;
    if (typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
      out[field] = value;
    }
  }

  const level = toFiniteNumber(source.level);
  out.level = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.floor(level ?? 0)));
  out.nextReview = toTimestamp(source.nextReview) ?? now;
  out.type = (CARD_TYPES as readonly unknown[]).includes(source.type) ? source.type : "vocab";
  out.itemKey = itemKey;

  for (const field of ["lastReviewed", "addedAt", "introducedAt"] as const) {
    const value = toTimestamp(source[field]);
    if (value !== undefined && value >= 0) out[field] = value;
    else delete out[field];
  }
  for (const field of ["reps", "lapses"] as const) {
    const value = toFiniteNumber(source[field]);
    if (value !== undefined && value >= 0) out[field] = Math.floor(value);
    else delete out[field];
  }
  const ease = toFiniteNumber(source.ease);
  if (ease !== undefined) out.ease = clampEase(ease);
  else delete out.ease;

  return out as unknown as SRSCard;
}

/**
 * Normalize a whole deck. Entries that cannot be cards are dropped; the map keys
 * are kept as they are. A non-object input gives an empty deck. Never throws.
 */
export function normalizeSrsCards(raw: unknown, now: number): Record<string, SRSCard> {
  const out: Record<string, SRSCard> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key === "__proto__") continue;
    const card = normalizeCard(value, now, key);
    if (card) out[key] = card;
  }
  return out;
}

// ── Creating and answering cards ─────────────────────────────────────────────

/** A brand-new card: level 0, first due in 8 hours, with the S1 history fields set. */
export function createNewCard(itemKey: string, type: SRSCard["type"], now: number): SRSCard {
  return {
    level: 0,
    nextReview: now + INTERVALS_MS[0],
    type,
    itemKey,
    reps: 0,
    lapses: 0,
    addedAt: now,
  };
}

/**
 * True for a card that has never been answered. Legacy cards (no `reps`) are
 * never new, and any answer sets `lastReviewed`, so a card that was failed on its
 * first showing is no longer new either.
 */
export function isNewCard(card: SRSCard): boolean {
  return card.reps === 0 && card.lastReviewed === undefined;
}

// ── Grading (S3) ─────────────────────────────────────────────────────────────

/** Ease clamped into 0.8–1.4 (no rounding: used to read stored values). */
function clampEase(value: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, value));
}

/** A card's ease: its stored value clamped to 0.8–1.4, or 1.0 when it has none. */
export function cardEase(card: Pick<SRSCard, "ease">): number {
  return typeof card.ease === "number" && Number.isFinite(card.ease) ? clampEase(card.ease) : DEFAULT_EASE;
}

/** The ease a card has after a first-pass grade: moved by EASE_DELTA, rounded to 2 decimals, kept in range. */
function easeAfter(card: SRSCard, grade: SrsGrade): number {
  return clampEase(Math.round((cardEase(card) + EASE_DELTA[grade]) * 100) / 100);
}

/**
 * The un-fuzzed interval (ms) a FIRST-PASS answer schedules. This is the single source of truth:
 * scheduleGrade adds fuzz to it, and previewIntervals shows it as is, so the label under a button is
 * exactly what the answer schedules, before fuzz. The result is never above MAX_INTERVAL_MS (365 days).
 *
 *  forgot → 10 minutes (the relearn step).
 *  hard   → 0.8 × the card's current level interval × ease, at least 1 day; the level does not change.
 *  gotIt  → the interval of level + 1 (max 8) × ease, at least 1 day (so a low-ease card on the 1-day rung is
 *           never scheduled sooner than Hard would be). Overdue credit: if the card was reviewed later than
 *           scheduled, the interval is at least min(time since the last review, 2 × that ladder interval).
 *           No credit without `lastReviewed` (legacy cards, until their first answer), and none for a card
 *           that was only waiting on its 10-minute relearn step (it was failed, not remembered).
 */
export function gradeIntervalMs(card: SRSCard, grade: SrsGrade, now: number): number {
  if (grade === "forgot") return RELEARN_INTERVAL_MS;

  const ease = cardEase(card);
  if (grade === "hard") {
    const interval = Math.round(HARD_INTERVAL_FACTOR * intervalForLevel(card.level) * ease);
    return Math.min(MAX_INTERVAL_MS, Math.max(MIN_RECALL_INTERVAL_MS, interval));
  }

  const ladder = intervalForLevel(Math.min(MAX_LEVEL, card.level + 1));
  let interval = ladder * ease;
  const lastReviewed = card.lastReviewed;
  if (lastReviewed !== undefined && now > card.nextReview && card.nextReview - lastReviewed > RELEARN_INTERVAL_MS) {
    interval = Math.max(interval, Math.min(now - lastReviewed, OVERDUE_CREDIT_CAP_FACTOR * ladder));
  }
  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_RECALL_INTERVAL_MS, Math.round(interval)));
}

/**
 * The un-fuzzed interval (ms) the answer to a RELEARN re-show schedules (the in-session re-show of a card
 * that was just forgotten; the card already lost its level, so ease plays no part here).
 *
 *  forgot → 10 minutes again.
 *  hard   → 0.8 × the (already halved) level's interval, at least 1 day.
 *  gotIt  → that level's interval, at least 1 day (the S2 rule).
 */
export function relearnIntervalMs(card: SRSCard, grade: SrsGrade): number {
  if (grade === "forgot") return RELEARN_INTERVAL_MS;
  const ladder = intervalForLevel(card.level);
  if (grade === "hard") return Math.max(MIN_RECALL_INTERVAL_MS, Math.round(HARD_INTERVAL_FACTOR * ladder));
  return Math.max(RELEARN_MIN_GRADUATION_MS, ladder);
}

/**
 * Schedule the next review after a FIRST-PASS grade. Pure: returns a new card, never mutates.
 *
 *  gotIt  → level + 1 (max 8), due after gradeIntervalMs (fuzzed ±12% from 3 days, then capped at 365 days),
 *           `lastReviewed` = now, `reps` + 1, ease + 0.05.
 *  hard   → level unchanged (never lowered), due after gradeIntervalMs (fuzzed the same way),
 *           `lastReviewed` = now, `reps` + 1 (it was recalled), ease − 0.1.
 *  forgot → level = floor(level / 2), due in 10 minutes (the relearn step), `lastReviewed` = now,
 *           `lapses` + 1, ease − 0.15. `reps` is unchanged (it counts successful reviews); a legacy card
 *           without `reps` stays without it.
 *
 * Ease is kept within 0.8–1.4 and rounded to 2 decimals. A card that was brand new (see isNewCard) also
 * gets `introducedAt` = now, once, whatever the grade.
 *
 * The in-session re-show of a forgotten card is graded with scheduleRelearnGrade, not this.
 *
 * `random` is injectable for tests; by default it is seeded from the card and its next rep count, so the
 * same grade on the same card state always yields the same fuzz.
 */
export function scheduleGrade(card: SRSCard, grade: SrsGrade, now: number, random?: () => number): SRSCard {
  const current = normalizeCard(card, now, card?.itemKey);
  if (!current) return card;
  const introduced = isNewCard(current) ? { introducedAt: now } : {};
  const ease = easeAfter(current, grade);

  if (grade === "forgot") {
    return {
      ...current,
      ...introduced,
      level: Math.floor(current.level / 2),
      nextReview: now + gradeIntervalMs(current, "forgot", now),
      lastReviewed: now,
      lapses: (current.lapses ?? 0) + 1,
      ease,
    };
  }

  const level = grade === "gotIt" ? Math.min(MAX_LEVEL, current.level + 1) : current.level;
  const reps = (current.reps ?? 0) + 1;
  const seed = grade === "gotIt" ? `${current.itemKey}|${reps}|${level}` : `${current.itemKey}|${reps}|${level}|hard`;
  const rng = random ?? seededRandom(seed);
  const interval = Math.min(MAX_INTERVAL_MS, applyFuzz(gradeIntervalMs(current, grade, now), rng));
  return {
    ...current,
    ...introduced,
    level,
    nextReview: Math.round(now + interval),
    lastReviewed: now,
    reps,
    ease,
  };
}

/**
 * Schedule the answer to the in-session RELEARN re-show of a card that was just forgotten (see relearnIntervalMs
 * for the intervals). The card already lost its level, counted its lapse and lost its ease on the first pass, so:
 *
 *  gotIt / hard → level and ease unchanged, due after the interval above (fuzzed ±12% from 3 days).
 *                 `reps` is not changed: this confirms the card, it is not a new successful review.
 *  forgot       → no further penalty (level, lapses and ease unchanged); due again in 10 minutes.
 *
 * All stamp `lastReviewed`. Relearn answers earn no XP (the screen does not call awardSRSXP).
 */
export function scheduleRelearnGrade(card: SRSCard, grade: SrsGrade, now: number, random?: () => number): SRSCard {
  const current = normalizeCard(card, now, card?.itemKey);
  if (!current) return card;

  if (grade === "forgot") return { ...current, nextReview: now + RELEARN_INTERVAL_MS, lastReviewed: now };

  const seed =
    grade === "gotIt"
      ? `${current.itemKey}|relearn|${current.lapses ?? 0}|${current.level}`
      : `${current.itemKey}|relearn|hard|${current.lapses ?? 0}|${current.level}`;
  const rng = random ?? seededRandom(seed);
  const interval = Math.min(MAX_INTERVAL_MS, applyFuzz(relearnIntervalMs(current, grade), rng));
  return { ...current, nextReview: Math.round(now + interval), lastReviewed: now };
}

/** Two-button form of scheduleGrade, kept for `answerCard(key, boolean)`: true → gotIt, false → forgot. */
export function scheduleAnswer(card: SRSCard, wasCorrect: boolean, now: number, random?: () => number): SRSCard {
  return scheduleGrade(card, wasCorrect ? "gotIt" : "forgot", now, random);
}

/** Two-button form of scheduleRelearnGrade, kept for `answerRelearnCard(key, boolean)`. */
export function scheduleRelearnAnswer(card: SRSCard, wasCorrect: boolean, now: number, random?: () => number): SRSCard {
  return scheduleRelearnGrade(card, wasCorrect ? "gotIt" : "forgot", now, random);
}

/** The un-fuzzed interval each button would schedule, in ms. */
export interface IntervalPreview {
  forgot: number;
  hard: number;
  gotIt: number;
}

/**
 * What each of the three buttons would schedule for this card right now, before fuzz (the screen writes
 * them with a "~"). Uses the same functions as scheduleGrade / scheduleRelearnGrade, so it matches the
 * next answer exactly. Pass `{ relearn: true }` for the in-session re-show of a forgotten card, where the
 * card is the post-forgot state (halved level). Never throws.
 */
export function previewIntervals(card: SRSCard, now: number, options: { relearn?: boolean } = {}): IntervalPreview {
  const current =
    normalizeCard(card, now, card?.itemKey) ??
    ({ level: 0, nextReview: now, type: "vocab", itemKey: "" } as SRSCard);
  if (options.relearn) {
    return {
      forgot: relearnIntervalMs(current, "forgot"),
      hard: relearnIntervalMs(current, "hard"),
      gotIt: relearnIntervalMs(current, "gotIt"),
    };
  }
  return {
    forgot: gradeIntervalMs(current, "forgot", now),
    hard: gradeIntervalMs(current, "hard", now),
    gotIt: gradeIntervalMs(current, "gotIt", now),
  };
}

/** "10m", "8h", "3d", "2mo", "1y": a short interval label. The caller adds the "~". Never returns an empty string. */
export function formatIntervalShort(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const minutes = Math.max(1, Math.round(safe / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(safe / HOUR_MS);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(safe / DAY_MS);
  if (days < 60) return `${days}d`;
  if (days < 360) return `${Math.round(days / 30)}mo`;
  return `${Math.max(1, Math.round(days / 365))}y`;
}

// ── Merging two copies of a deck (cloud hydrate) ─────────────────────────────

/**
 * Should the local copy of a card win over the cloud copy?
 *
 *  1. Both have `lastReviewed` → the later review wins; on a tie, the higher `reps`.
 *     If those tie too, fall through to rule 3.
 *  2. Exactly one has `lastReviewed` → that one wins (a legacy copy carries no
 *     timestamp, so it is assumed older).
 *  3. Neither has it (or a full tie) → the pre-S1 rule: a future local schedule beats a
 *     cloud copy that still says "due"; otherwise the later `nextReview` wins. Equal →
 *     the cloud copy.
 */
function preferLocalCard(local: SRSCard, cloud: SRSCard, now: number): boolean {
  const localReviewed = local.lastReviewed;
  const cloudReviewed = cloud.lastReviewed;

  if (localReviewed !== undefined && cloudReviewed !== undefined) {
    if (localReviewed !== cloudReviewed) return localReviewed > cloudReviewed;
    const localReps = local.reps ?? 0;
    const cloudReps = cloud.reps ?? 0;
    if (localReps !== cloudReps) return localReps > cloudReps;
  } else if (localReviewed !== undefined || cloudReviewed !== undefined) {
    return localReviewed !== undefined;
  }

  return (local.nextReview > now && cloud.nextReview <= now) || local.nextReview > cloud.nextReview;
}

/**
 * Union of two decks. A card in only one deck is kept; a card in both is resolved by
 * preferLocalCard. Both inputs are normalized first, so corrupt cloud data cannot
 * throw, and the result contains only valid cards. Idempotent:
 * merge(merge(a, b), b) equals merge(a, b).
 */
export function mergeSrsCards(
  localCards: Record<string, SRSCard>,
  cloudCards: Record<string, SRSCard>,
  now: number = Date.now()
): Record<string, SRSCard> {
  const local = normalizeSrsCards(localCards, now);
  const cloud = normalizeSrsCards(cloudCards, now);
  const merged: Record<string, SRSCard> = { ...cloud };

  for (const [key, localCard] of Object.entries(local)) {
    const cloudCard = merged[key];
    merged[key] = cloudCard && !preferLocalCard(localCard, cloudCard, now) ? cloudCard : localCard;
  }
  return merged;
}

// ── Daily limits (S2) ────────────────────────────────────────────────────────

export const DEFAULT_DAILY_REVIEW_CAP = 50;
export const DEFAULT_DAILY_NEW_CAP = 10;
/** A review cap at or above this means "no limit". */
export const UNLIMITED_REVIEWS = 9999;
/** The choices offered in the Review Deck settings. */
export const REVIEW_CAP_OPTIONS: readonly number[] = [20, 50, 100, UNLIMITED_REVIEWS];
export const NEW_CAP_OPTIONS: readonly number[] = [0, 5, 10, 20];

/** Defaults for a learner who never opened the settings. */
export function defaultSrsSettings(): SrsSettings {
  return { dailyReviewCap: DEFAULT_DAILY_REVIEW_CAP, dailyNewCap: DEFAULT_DAILY_NEW_CAP };
}

/**
 * Turn anything into valid settings. Never throws. Missing or non-numeric limits get the
 * defaults; a review cap below 1 means unlimited (0 is the plan's "unlimited" spelling);
 * a new-card cap is clamped to 0–9999. `updatedAt` is kept only when valid and OMITTED
 * otherwise (never `undefined`).
 */
export function normalizeSrsSettings(raw: unknown): SrsSettings {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const review = toFiniteNumber(source.dailyReviewCap);
  const fresh = toFiniteNumber(source.dailyNewCap);
  const out: SrsSettings = {
    dailyReviewCap:
      review === undefined ? DEFAULT_DAILY_REVIEW_CAP : review < 1 ? UNLIMITED_REVIEWS : Math.min(UNLIMITED_REVIEWS, Math.floor(review)),
    dailyNewCap: fresh === undefined ? DEFAULT_DAILY_NEW_CAP : Math.min(UNLIMITED_REVIEWS, Math.max(0, Math.floor(fresh))),
  };
  const updatedAt = toTimestamp(source.updatedAt);
  if (updatedAt !== undefined && updatedAt >= 0) out.updatedAt = updatedAt;
  return out;
}

/**
 * Resolve the local and cloud copies of the settings (cloud hydrate). Returns `undefined`
 * when neither side has any, so nothing is invented. Later `updatedAt` wins; one stamped
 * and one not → the stamped one; otherwise the cloud copy (everything else in the stats
 * blob is cloud-wins too). Idempotent.
 */
export function mergeSrsSettings(local: unknown, cloud: unknown): SrsSettings | undefined {
  const present = (value: unknown) => !!value && typeof value === "object" && !Array.isArray(value);
  const hasLocal = present(local);
  const hasCloud = present(cloud);
  if (!hasLocal && !hasCloud) return undefined;
  if (!hasCloud) return normalizeSrsSettings(local);
  if (!hasLocal) return normalizeSrsSettings(cloud);

  const localSettings = normalizeSrsSettings(local);
  const cloudSettings = normalizeSrsSettings(cloud);
  const localStamp = localSettings.updatedAt;
  const cloudStamp = cloudSettings.updatedAt;
  if (localStamp !== undefined && (cloudStamp === undefined || localStamp > cloudStamp)) return localSettings;
  return cloudSettings;
}

// ── The daily session (S2) ───────────────────────────────────────────────────

/** Rough time per card, for the "about N min" estimate on the menu. */
export const SECONDS_PER_CARD = 10;
/** New cards pause while the review backlog (measured from the start of today) exceeds this many review caps. */
export const NEW_PAUSE_BACKLOG_FACTOR = 2;

export interface SessionPlan {
  /** Today's session, in the order to show it: due reviews first, then new cards. */
  queue: SRSCard[];
  reviewCount: number;
  newCount: number;
  /** reviewCount + newCount */
  total: number;
  /** Cards that are due but not in this session (over today's budget, or new cards held back). */
  waitingCount: number;
  /** True when new cards are being held back because the review backlog is too large. */
  newPaused: boolean;
  /** Non-new cards already answered today (excluding the ones introduced today). */
  reviewedToday: number;
  /** Cards introduced (first answered) today. */
  newToday: number;
  /** Earliest `nextReview` among cards that are not due yet, or null. */
  nextDueAt: number | null;
  estimatedMinutes: number;
}

/** A plan without the queue itself: small enough to pass around the menu. */
export type SessionSummary = Omit<SessionPlan, "queue">;

/** [start of the local calendar day containing `now`, start of the next one). */
export function localDayRange(now: number): [number, number] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
}

/**
 * How overdue a card is, relative to the interval it was scheduled for:
 * (now − nextReview) ÷ (nextReview − lastReviewed). A card without `lastReviewed` (legacy)
 * uses its level's interval. The divisor is never below the relearn step, so a card that
 * was due in 10 minutes does not outrank everything the moment it is a little late.
 */
export function overdueRatio(card: SRSCard, now: number): number {
  const scheduled =
    card.lastReviewed !== undefined && card.nextReview > card.lastReviewed
      ? card.nextReview - card.lastReviewed
      : intervalForLevel(card.level);
  return (now - card.nextReview) / Math.max(scheduled, RELEARN_INTERVAL_MS);
}

/**
 * Build today's session from the deck. Pure; the ONLY place a queue is made.
 *
 *  Counters (derived from the cards, so they sync and survive closing the app):
 *   • newToday      = cards whose `introducedAt` is on today's local date.
 *   • reviewedToday = other cards whose `lastReviewed` is on today's local date.
 *
 *  Queue:
 *   1. Due, non-new cards (isNewCard false) by overdue ratio, highest first; ties: lower level,
 *      then earlier `nextReview`, then key. Trimmed to `dailyReviewCap − reviewedToday`.
 *   2. Then new cards that are due (a new card is first due 8 hours after it is added, as
 *      before), oldest `addedAt` first, up to `dailyNewCap − newToday`.
 *   3. New cards pause while (due reviews + cards already reviewed today and not due again)
 *      is more than 2 × the review cap. This measures the backlog from the start of the
 *      day, so it does not flip back the moment the learner has done part of it.
 *   4. Everything beyond the caps simply stays due; nothing is changed or lost.
 */
export function buildSessionPlan(
  cards: Record<string, SRSCard>,
  settingsInput: unknown,
  now: number
): SessionPlan {
  const settings = normalizeSrsSettings(settingsInput);
  const unlimited = settings.dailyReviewCap >= UNLIMITED_REVIEWS;
  const [dayStart, dayEnd] = localDayRange(now);
  const today = (stamp: number | undefined) => stamp !== undefined && stamp >= dayStart && stamp < dayEnd;

  const dueReviews: SRSCard[] = [];
  const dueNew: SRSCard[] = [];
  let reviewedToday = 0;
  let reviewedTodayNotDue = 0;
  let newToday = 0;
  let nextDueAt: number | null = null;

  for (const card of Object.values(cards)) {
    if (today(card.introducedAt)) newToday++;
    else if (today(card.lastReviewed)) {
      reviewedToday++;
      if (card.nextReview > now) reviewedTodayNotDue++;
    }

    if (card.nextReview <= now) (isNewCard(card) ? dueNew : dueReviews).push(card);
    else if (nextDueAt === null || card.nextReview < nextDueAt) nextDueAt = card.nextReview;
  }

  const byKey = (a: SRSCard, b: SRSCard) => (a.itemKey < b.itemKey ? -1 : a.itemKey > b.itemKey ? 1 : 0);
  dueReviews.sort(
    (a, b) =>
      overdueRatio(b, now) - overdueRatio(a, now) || a.level - b.level || a.nextReview - b.nextReview || byKey(a, b)
  );
  dueNew.sort((a, b) => (a.addedAt ?? a.nextReview) - (b.addedAt ?? b.nextReview) || byKey(a, b));

  const reviewBudget = unlimited ? Infinity : Math.max(0, settings.dailyReviewCap - reviewedToday);
  const reviews = dueReviews.slice(0, reviewBudget);

  const backlogFromDayStart = dueReviews.length + reviewedTodayNotDue;
  const paused = !unlimited && backlogFromDayStart > NEW_PAUSE_BACKLOG_FACTOR * settings.dailyReviewCap;
  const newBudget = Math.max(0, settings.dailyNewCap - newToday);
  const fresh = paused ? [] : dueNew.slice(0, newBudget);

  const queue = [...reviews, ...fresh];
  const total = queue.length;
  return {
    queue,
    reviewCount: reviews.length,
    newCount: fresh.length,
    total,
    waitingCount: dueReviews.length - reviews.length + (dueNew.length - fresh.length),
    newPaused: paused && dueNew.length > 0,
    reviewedToday,
    newToday,
    nextDueAt,
    estimatedMinutes: total === 0 ? 0 : Math.ceil((total * SECONDS_PER_CARD) / 60),
  };
}

/** The plan without its queue. */
export function summarizeSession(plan: SessionPlan): SessionSummary {
  const { queue: _queue, ...summary } = plan;
  return summary;
}

/** "Today: 25 reviews · 5 new · about 5 min", or null when there is nothing to do today. */
export function formatSessionLine(summary: SessionSummary): string | null {
  const parts: string[] = [];
  if (summary.reviewCount > 0) parts.push(`${summary.reviewCount} review${summary.reviewCount === 1 ? "" : "s"}`);
  if (summary.newCount > 0) parts.push(`${summary.newCount} new`);
  if (parts.length === 0) return null;
  return `Today: ${parts.join(" · ")} · about ${summary.estimatedMinutes} min`;
}

/** "+120 waiting" when cards are due beyond today's session, otherwise null. Never leads the menu text. */
export function formatWaitingLine(summary: SessionSummary): string | null {
  return summary.waitingCount > 0 ? `+${summary.waitingCount} waiting` : null;
}

// ── 7-day forecast (S3) ──────────────────────────────────────────────────────

/** Cards scheduled for one upcoming local calendar day. */
export interface ForecastDay {
  /** Start of that local day (ms). */
  dayStart: number;
  count: number;
}

/**
 * How many cards fall due on each of the next `days` local calendar days, starting TOMORROW. Derived
 * from `nextReview` only. Cards that are due now or later today (including overdue and waiting cards)
 * are not counted here: they belong to today's session and the "waiting" line. Pure; day boundaries use
 * the calendar (not 24-hour steps), so a daylight-saving change cannot shift a bucket.
 */
export function buildForecast(cards: Record<string, SRSCard>, now: number, days = 7): ForecastDay[] {
  const [todayStart] = localDayRange(now);
  const bounds: number[] = [];
  for (let offset = 1; offset <= days + 1; offset++) {
    const boundary = new Date(todayStart);
    boundary.setDate(boundary.getDate() + offset);
    bounds.push(boundary.getTime());
  }
  const forecast: ForecastDay[] = Array.from({ length: days }, (_, index) => ({ dayStart: bounds[index], count: 0 }));

  for (const card of Object.values(cards)) {
    const due = card.nextReview;
    if (!(due >= bounds[0]) || !(due < bounds[days])) continue;
    let index = 0;
    while (due >= bounds[index + 1]) index++;
    forecast[index].count++;
  }
  return forecast;
}

/** "31 due in the next 7 days · 5 tomorrow", or "Nothing due in the next 7 days". One short line for phones. */
export function formatForecastLine(forecast: ForecastDay[]): string {
  const total = forecast.reduce((sum, day) => sum + day.count, 0);
  if (total === 0) return `Nothing due in the next ${forecast.length} days`;
  const tomorrow = forecast[0]?.count ?? 0;
  return `${total} due in the next ${forecast.length} days · ${tomorrow} tomorrow`;
}
