// Polish C3b: the one place that sets how screens (and the Study Room swap inside the menu) move.
// Used by the App router and by MenuScreen. To make the whole app calmer or snappier, change
// the numbers below and nothing else.
//
// Look: a slow, soft fade out; then the new view fades in while it floats up a few pixels and
// settles. No rotation, scale, blur or perspective, so once settled the node has NO transform
// (a leftover transform would trap fixed children such as the word-family modal).
import type { Variants } from "motion/react";

/** Fade out of the old view, in seconds. */
export const SCREEN_EXIT_S = 0.22;
/** Fade in of the new view, in seconds. */
export const SCREEN_FADE_IN_S = 0.5;
/** Rise of the new view (it settles a little after it is fully visible), in seconds. */
export const SCREEN_RISE_S = 0.6;
/** How far the new view floats up, in pixels. */
export const SCREEN_RISE_PX = 14;
/** Failsafe for `isTransitioning` (full swap plus render and frame slack), in milliseconds. */
export const SCREEN_SETTLE_MS = Math.round((SCREEN_EXIT_S + SCREEN_RISE_S) * 1000) + 400;

export const SCREEN_VARIANTS: Variants = {
  enter: { opacity: 0, y: SCREEN_RISE_PX },
  center: {
    opacity: 1,
    y: 0,
    transition: {
      opacity: { duration: SCREEN_FADE_IN_S, ease: [0.33, 0, 0.2, 1] },
      y: { duration: SCREEN_RISE_S, ease: [0.22, 1, 0.36, 1] },
    },
  },
  exit: { opacity: 0, transition: { duration: SCREEN_EXIT_S, ease: "easeInOut" } },
};

// Reduced motion: opacity only, short, no movement.
export const SCREEN_VARIANTS_REDUCED: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.12, ease: "linear" } },
  exit: { opacity: 0, transition: { duration: 0.08, ease: "linear" } },
};
