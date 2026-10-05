// src/srsScheduler.ts
// ─────────────────────────────────────────────────────────────────────────────
// Phase S1 — the Review Deck scheduling engine, as a PURE module.
//
// No React, no localStorage, no Firebase, no clock reads of its own: every
// function that needs "now" takes it as a parameter (mergeSrsCards defaults it).
// `useSRS` calls into this file; scripts/srs-sim.ts exercises it under plain
// Node. Isolating the scheduler here is what lets later phases (S2 queue and
// relearn, S3 grading, S4 leeches) and any future FSRS-style swap change one
// file instead of the hook.
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

import type { SRSCard } from "./types";

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

/** A wrong answer is due again after this long (the 10-minute relearn step arrives in S2). */
export const WRONG_INTERVAL_MS = 4 * HOUR_MS;

/** Fuzz is only applied to intervals at least this long. */
export const FUZZ_MIN_INTERVAL_MS = 3 * DAY_MS;
/** Fuzz spreads a new interval by ±12%. */
export const FUZZ_RATIO = 0.12;
/** The longest interval the scheduler can ever produce (maximum rung plus full fuzz). */
export const MAX_INTERVAL_MS = INTERVALS_MS[MAX_LEVEL] * (1 + FUZZ_RATIO);

export const CARD_TYPES: readonly SRSCard["type"][] = ["vocab", "kanji", "hiragana", "katakana"];

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
 *  • Optional `lastReviewed`, `addedAt` (timestamps) and `reps`, `lapses` (counts) are kept
 *    only when valid and OMITTED otherwise (never `undefined`).
 *  • Any other primitive field (string/boolean/finite number) is passed through
 *    untouched, so an older client cannot strip fields that later phases add
 *    (`introducedAt`, `ease`, `leech`, ...). Objects, arrays, null and non-finite
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

  for (const field of ["lastReviewed", "addedAt"] as const) {
    const value = toTimestamp(source[field]);
    if (value !== undefined && value >= 0) out[field] = value;
    else delete out[field];
  }
  for (const field of ["reps", "lapses"] as const) {
    const value = toFiniteNumber(source[field]);
    if (value !== undefined && value >= 0) out[field] = Math.floor(value);
    else delete out[field];
  }

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

/**
 * Schedule the next review after an answer. Pure: returns a new card, never mutates.
 *
 *  correct → level + 1 (max 8), due after that level's interval (fuzzed ±12% when ≥ 3 days),
 *            `lastReviewed` = now, `reps` + 1.
 *  wrong   → level = floor(level / 2), due in 4 hours, `lastReviewed` = now, `lapses` + 1.
 *            `reps` is unchanged (it counts successful reviews); a legacy card without `reps`
 *            stays without it.
 *
 * `random` is injectable for tests; by default it is seeded from the card and its next
 * rep count, so the same answer on the same card state always yields the same fuzz.
 */
export function scheduleAnswer(
  card: SRSCard,
  wasCorrect: boolean,
  now: number,
  random?: () => number
): SRSCard {
  const current = normalizeCard(card, now, card?.itemKey);
  if (!current) return card;

  if (wasCorrect) {
    const level = Math.min(MAX_LEVEL, current.level + 1);
    const reps = (current.reps ?? 0) + 1;
    const rng = random ?? seededRandom(`${current.itemKey}|${reps}|${level}`);
    return {
      ...current,
      level,
      nextReview: Math.round(now + applyFuzz(INTERVALS_MS[level], rng)),
      lastReviewed: now,
      reps,
    };
  }

  return {
    ...current,
    level: Math.floor(current.level / 2),
    nextReview: now + WRONG_INTERVAL_MS,
    lastReviewed: now,
    lapses: (current.lapses ?? 0) + 1,
  };
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
