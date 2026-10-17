/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Phase B1: guided-tour progress (`StudentStats.tips`). Pure logic only: no React, no Firebase,
 * no storage. App.tsx plugs these helpers into the cloud hydrate, the initial load and the backup
 * import; the tour itself arrives in phase B2.
 *
 * `tips` is a grow-only set: a tip id, once seen, is never unseen, and `skipped` once set is never
 * cleared. Two copies therefore merge by union, which is idempotent, commutative and associative,
 * so a stale cloud copy (or an old backup) can never turn a seen tip back into an unseen one.
 *
 * Cloud-safe by construction: output never holds `undefined`, `false`, an empty `seen`, or an
 * empty object. Missing means "nothing seen". The five ids are plain words, free of `. $ # [ ] /`.
 */

import type { TipsState } from "./types";

/** The five Study Room tips, in tour order. Only these ids are ever stored. */
export const TIP_IDS = ["room", "spell", "bookshelf", "desk", "dock"] as const;
export type TipId = (typeof TIP_IDS)[number];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Reduce anything (a parsed blob, a cloud node, a backup file) to a valid TipsState, or `undefined`.
 * Keeps only known ids whose value is exactly `true`, and `skipped` only when exactly `true`.
 * Never throws. `seen` keys come out in tour order so equal sets always serialise identically.
 */
export function sanitizeTips(raw: unknown): TipsState | undefined {
  if (!isPlainObject(raw)) return undefined;

  const seen: Record<string, true> = {};
  let seenCount = 0;
  if (isPlainObject(raw.seen)) {
    for (const id of TIP_IDS) {
      if (Object.prototype.hasOwnProperty.call(raw.seen, id) && raw.seen[id] === true) {
        seen[id] = true;
        seenCount++;
      }
    }
  }

  const result: TipsState = {};
  if (seenCount > 0) result.seen = seen;
  if (raw.skipped === true) result.skipped = true;
  return seenCount > 0 || result.skipped ? result : undefined;
}

/**
 * Merge two copies of the tour progress by union: `seen` is the union of ids, `skipped` is OR.
 * Junk on either side counts as nothing; junk on both gives `undefined`. Returns `undefined`
 * (never `{}`) when nothing is seen and nothing is skipped, so the caller omits the field.
 */
export function mergeTips(local: unknown, cloud: unknown): TipsState | undefined {
  const a = sanitizeTips(local);
  const b = sanitizeTips(cloud);
  if (!a && !b) return undefined;
  return sanitizeTips({
    seen: { ...(a?.seen ?? {}), ...(b?.seen ?? {}) },
    skipped: a?.skipped === true || b?.skipped === true ? true : undefined,
  });
}

/**
 * Has this account or browser already done any studying? True when XP is above 0, any study date
 * is recorded, or at least one REAL SRS card exists. `srsCards` is `{}` on every blob (new accounts
 * included), so the object being present proves nothing: its keys are counted. Never throws.
 */
export function hasProgress(stats: unknown): boolean {
  if (!isPlainObject(stats)) return false;
  if (typeof stats.xp === "number" && Number.isFinite(stats.xp) && stats.xp > 0) return true;
  if (Array.isArray(stats.studyDates) && stats.studyDates.some((day) => typeof day === "string" && day.length > 0)) return true;
  if (isPlainObject(stats.srsCards) && Object.keys(stats.srsCards).length > 0) return true;
  return false;
}
