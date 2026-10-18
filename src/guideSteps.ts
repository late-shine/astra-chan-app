/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Phase B2: the five Study Room tips and the pure maths that places the tip card.
 * No React, no DOM, no storage: GuideTour.tsx measures the page and feeds numbers in here.
 * Copy is English only (plan: "Content").
 */

import { TIP_IDS, type TipId } from "./tips";

export interface GuideStepDef {
  /** The value of the `data-guide` attribute the ring points at. */
  target: string;
  /** One or two sentences, shown under "Step N of 5". */
  copy: string;
  /** The target is `position: fixed` (the dock), so the page is never scrolled to reveal it. */
  fixed?: boolean;
}

/** Keyed by tip id, so TypeScript fails if a tip id has no step. Order comes from `TIP_IDS`. */
export const GUIDE_STEPS: Record<TipId, GuideStepDef> = {
  room: {
    target: "room",
    copy: "Welcome to your Study Room. Each tile is one kind of study. Come back here whenever you want a different one.",
  },
  spell: {
    target: "spell",
    copy: "Today's Spell is your daily session: a few new cards plus anything that is due, sized so you can finish it. Tap Begin when you are ready.",
  },
  bookshelf: {
    target: "bookshelf",
    copy: "The Bookshelf is where you learn hiragana, katakana, kanji and words. Start here if you are new.",
  },
  desk: {
    target: "desk",
    copy: "The Writing Desk is quizzes and timed rounds, for when you want to be tested.",
  },
  dock: {
    target: "dock",
    fixed: true,
    copy: "Music, backgrounds and fonts live in this corner, on every screen. Open it whenever you like.",
  },
};

export const GUIDE_STEP_COUNT = TIP_IDS.length;

/** A measured rectangle in viewport coordinates (what `getBoundingClientRect()` returns). */
export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function sameBox(a: Box | null, b: Box | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

/** Phones and small tablets get a full-width sheet; wider screens get a floating card. */
export const SMALL_SCREEN_MAX = 640;
/** Space kept between the card and the screen edge. */
export const CARD_MARGIN = 12;
/** Space between the ring and the card. */
export const CARD_GAP = 12;
/** The ring is drawn this many px outside the target. */
export const RING_PAD = 6;
/** Wide-screen card width cap. */
export const CARD_MAX_WIDTH = 360;
/** The dock's closed launcher row: 12 px offset plus a 44 px button. */
const DOCK_ROW = 12 + 44;

export interface Placement {
  top: number;
  left: number;
  width: number;
  /** False when no non-overlapping spot exists (or there is no target): a centered card with no ring. */
  showRing: boolean;
}

export function cardWidthFor(viewportWidth: number): number {
  return viewportWidth <= SMALL_SCREEN_MAX
    ? Math.max(0, viewportWidth - CARD_MARGIN * 2)
    : Math.min(CARD_MAX_WIDTH, viewportWidth - CARD_MARGIN * 2);
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Where the card goes. Order of preference:
 *   phone, target in the upper half: bottom sheet, then above the target, then pinned to the top;
 *   phone, target in the lower half (the dock): above the target, then pinned to the top, then the sheet;
 *   wide screen: below the target, above it, then pinned above the dock (right edge);
 * and if every spot would cover the target (or the target is missing) a centered card with no ring.
 * `safeTop` / `safeBottom` are the safe-area insets in px.
 */
export function computePlacement(
  box: Box | null,
  cardHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  safeTop = 0,
  safeBottom = 0,
): Placement {
  const small = viewportWidth <= SMALL_SCREEN_MAX;
  const width = cardWidthFor(viewportWidth);
  const minTop = CARD_MARGIN + safeTop;
  const maxBottom = viewportHeight - CARD_MARGIN - safeBottom;

  const centered: Placement = {
    top: Math.max(minTop, (viewportHeight - cardHeight) / 2),
    left: (viewportWidth - width) / 2,
    width,
    showRing: false,
  };
  if (!box) return centered;

  const ringTop = box.top - RING_PAD;
  const ringBottom = box.top + box.height + RING_PAD;
  const overlapsTarget = (top: number) => top < ringBottom + 4 && top + cardHeight > ringTop - 4;
  const fits = (top: number) => top >= minTop && top + cardHeight <= maxBottom && !overlapsTarget(top);
  const centerX = box.left + box.width / 2;
  const leftNear = small ? CARD_MARGIN : clamp(centerX - width / 2, CARD_MARGIN, viewportWidth - width - CARD_MARGIN);

  const sheet = maxBottom - cardHeight;
  const above = ringTop - CARD_GAP - cardHeight;
  const below = ringBottom + CARD_GAP;

  let candidates: Array<{ top: number; left: number }>;
  if (small) {
    const lowerHalf = box.top + box.height / 2 > viewportHeight / 2;
    candidates = lowerHalf
      ? [{ top: above, left: leftNear }, { top: minTop, left: leftNear }, { top: sheet, left: leftNear }]
      : [{ top: sheet, left: leftNear }, { top: above, left: leftNear }, { top: minTop, left: leftNear }];
  } else {
    candidates = [
      { top: below, left: leftNear },
      { top: above, left: leftNear },
      { top: maxBottom - cardHeight - DOCK_ROW, left: viewportWidth - width - CARD_MARGIN },
    ];
  }

  for (const candidate of candidates) {
    if (fits(candidate.top)) return { top: candidate.top, left: candidate.left, width, showRing: true };
  }
  return centered;
}
