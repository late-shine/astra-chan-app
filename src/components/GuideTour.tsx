/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Phase B2: the Study Room guided tour. A measured highlight ring (plus a light dim) and one small tip card.
 *
 * - Rendered by App.tsx as a root-level sibling of the toast, OUTSIDE <main>, so the screen-flip node can never trap it.
 * - Presentational: App decides WHEN it may show (`enabled`) and owns every stored write (`onMarkSeen`, `onSkipAll`).
 * - Finds targets with `document.querySelector('[data-guide="..."]')`. Measures only while the screen is not flipping.
 * - A missing, hidden or zero-size target gives the same card, centered, with no ring (the plan's built-in fallback).
 * - An id is reported seen only after its card has actually painted and the learner presses Next. Replay never writes.
 * - The page stays tappable: the ring and the dim are pointer-transparent; only the card takes taps.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { TIP_IDS, type TipId } from "../tips";
import {
  GUIDE_STEPS,
  GUIDE_STEP_COUNT,
  RING_PAD,
  SMALL_SCREEN_MAX,
  cardWidthFor,
  computePlacement,
  sameBox,
  type Box,
} from "../guideSteps";

export interface GuideTourProps {
  /** App's gate: hydrated, on the Study Room, no modal, dock closed. False hides everything and resets the measuring. */
  enabled: boolean;
  /** A Replay run: local step counter, and nothing here ever writes. */
  replay: boolean;
  /** `stats.tips.seen`. Ignored while replaying. The tour resumes at the first id that is not in it. */
  seen: Record<string, true> | undefined;
  /** True while the screen flips. The ring hides and nothing is measured. */
  isTransitioning: boolean;
  /** Next on a real run: the one id that was shown. */
  onMarkSeen: (id: TipId) => void;
  /** Skip all or Escape on a real run. */
  onSkipAll: () => void;
  /** Skip all, Escape or Done during a Replay. */
  onReplayDone: () => void;
}

interface Placed {
  id: TipId;
  box: Box | null; // null = target missing or hidden: centered card, no ring
  smooth: boolean; // animate the ring and card to this spot (a new step), not on scroll or resize
}

/** How long to wait for a missing target before showing the centered card. */
const WAIT_MS = 600;
/** Rough height the card needs above or below a target on a wide screen. */
const CARD_ROOM = 220;
/** Give up waiting for a moving target to settle after this many frames and use its latest position. */
const MAX_SETTLE_FRAMES = 40;

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-natural-clay";

const readViewport = () => {
  const root = document.documentElement;
  return {
    w: root.clientWidth || window.innerWidth,
    h: root.clientHeight || window.innerHeight,
  };
};

const findTarget = (name: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-guide="${name}"]`);

/** The target's rectangle, or null when it is missing, `display: none`, `visibility: hidden` or zero-size. */
const readBox = (el: Element | null): Box | null => {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
};

/**
 * Scroll the page (never smoothly: a settled position is what we measure) so the target sits in the upper part of
 * the screen, clear of the bottom sheet on phones. Returns true only if the page actually moved, so a page that
 * cannot scroll any further (the target is near the bottom) never keeps this loop going.
 */
const bringIntoView = (el: Element, viewportWidth: number, viewportHeight: number): boolean => {
  const rect = el.getBoundingClientRect();
  const small = viewportWidth <= SMALL_SCREEN_MAX;
  if (small) {
    // The card is a bottom sheet: keep the target in the upper half.
    if (rect.top >= 12 && rect.bottom <= viewportHeight * 0.5) return false;
  } else {
    // A floating card needs room above or below the target; a short (landscape) screen may force a scroll.
    const clear = rect.top >= 12 && rect.bottom <= viewportHeight - 16;
    if (clear && (rect.bottom + CARD_ROOM <= viewportHeight || rect.top >= CARD_ROOM)) return false;
  }
  const want = small ? Math.min(viewportHeight * 0.2, 120) : Math.min(Math.max(viewportHeight * 0.1, 16), 72);
  const delta = rect.top - want;
  if (Math.abs(delta) < 1) return false;
  const before = window.scrollY;
  window.scrollBy({ top: delta, left: 0, behavior: "auto" });
  return window.scrollY !== before;
};

export default function GuideTour({
  enabled,
  replay,
  seen,
  isTransitioning,
  onMarkSeen,
  onSkipAll,
  onReplayDone,
}: GuideTourProps) {
  const reduceMotion = useReducedMotion();

  const [replayIndex, setReplayIndex] = useState(0);
  const firstUnseen = TIP_IDS.findIndex((id) => !(seen && seen[id] === true));
  const index = replay ? replayIndex : firstUnseen;
  const currentId: TipId | null = index >= 0 && index < TIP_IDS.length ? TIP_IDS[index] : null;
  const active = enabled && currentId !== null;

  const [placed, setPlaced] = useState<Placed | null>(null);
  const [viewport, setViewport] = useState(readViewport);
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const [insets, setInsets] = useState({ top: 0, bottom: 0 });

  const cardRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const probeRef = useRef<HTMLDivElement | null>(null);
  /** The id whose card has actually painted (two frames after it was placed). Next is ignored until then. */
  const paintedRef = useRef<TipId | null>(null);
  /** The id Next was already pressed for, so a fast double tap cannot act twice (or skip a step in a Replay). */
  const actedRef = useRef<TipId | null>(null);
  // Latest callbacks for listeners that outlive a render.
  const callbacksRef = useRef({ replay, onSkipAll, onReplayDone });
  callbacksRef.current = { replay, onSkipAll, onReplayDone };

  const placedId = placed ? placed.id : null;
  const cardMeasured = cardHeight !== null;
  const shown = placedId !== null && cardMeasured;

  // 1. Not active (wrong screen, dock open, modal, tour finished): drop everything so nothing is half-measured.
  useEffect(() => {
    if (!active) {
      setPlaced(null);
      setCardHeight(null);
      paintedRef.current = null;
    }
  }, [active]);

  // 2. Find the target, scroll it into view, wait for it to stop moving, then place the card. Only while not flipping.
  useEffect(() => {
    if (!active || isTransitioning || currentId === null) return;
    const id = currentId;
    const step = GUIDE_STEPS[id];
    let cancelled = false;
    let raf = 0;
    let last: Box | null = null;
    let frames = 0;
    let scrolls = 0;
    const started = performance.now();

    const tick = () => {
      if (cancelled) return;
      frames += 1;
      const el = findTarget(step.target);
      const box = readBox(el);
      if (el && box) {
        const size = readViewport();
        if (!step.fixed && scrolls < 4 && bringIntoView(el, size.w, size.h)) {
          scrolls += 1;
          last = null; // the page just moved; read again next frame
        } else if (sameBox(box, last) || frames > MAX_SETTLE_FRAMES) {
          setViewport((prev) => (prev.w === size.w && prev.h === size.h ? prev : size));
          setPlaced({ id, box, smooth: true });
          return;
        } else {
          last = box;
        }
      } else {
        last = null;
        if (performance.now() - started > WAIT_MS) {
          setPlaced({ id, box: null, smooth: false });
          return;
        }
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [active, isTransitioning, currentId]);

  // 3. Keep the ring on the target: resize, orientation, visual viewport, scroll (capture, one frame at a time) and
  //    a ResizeObserver on the target and on the page.
  useEffect(() => {
    if (!active || placedId === null) return;
    const step = GUIDE_STEPS[placedId];
    let raf = 0;
    let correct = false;
    const remeasure = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const size = readViewport();
        // After a resize or rotation the card may no longer have room: bring the target back into view once.
        // (Never on a plain scroll: the learner is in charge of that.)
        if (correct && !step.fixed) {
          const el = findTarget(step.target);
          if (el && readBox(el)) bringIntoView(el, size.w, size.h);
        }
        correct = false;
        setViewport((prev) => (prev.w === size.w && prev.h === size.h ? prev : size));
        const box = readBox(findTarget(step.target));
        setPlaced((prev) => (prev && prev.id === placedId && !sameBox(prev.box, box) ? { id: placedId, box, smooth: false } : prev));
      });
    };
    const remeasureAndCorrect = () => {
      correct = true;
      remeasure();
    };
    window.addEventListener("resize", remeasureAndCorrect);
    window.addEventListener("orientationchange", remeasureAndCorrect);
    window.addEventListener("scroll", remeasure, { capture: true, passive: true });
    const visual = window.visualViewport;
    visual?.addEventListener("resize", remeasure);
    visual?.addEventListener("scroll", remeasure);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(remeasure);
      observer.observe(document.documentElement);
      const el = findTarget(step.target);
      if (el) observer.observe(el);
    }
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", remeasureAndCorrect);
      window.removeEventListener("orientationchange", remeasureAndCorrect);
      window.removeEventListener("scroll", remeasure, { capture: true } as EventListenerOptions);
      visual?.removeEventListener("resize", remeasure);
      visual?.removeEventListener("scroll", remeasure);
      observer?.disconnect();
    };
  }, [active, placedId]);

  // 4. Measure the card (before paint) so it can be placed without a jump. It renders hidden until measured.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const update = () => {
      const h = el.offsetHeight;
      setCardHeight((prev) => (prev !== null && Math.abs(prev - h) < 1 ? prev : h));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [placedId, active]);

  // 5. Safe-area insets in px, read from a hidden probe that uses env(...) padding.
  useLayoutEffect(() => {
    const el = probeRef.current;
    if (!el) return;
    const style = window.getComputedStyle(el);
    const top = parseFloat(style.paddingTop) || 0;
    const bottom = parseFloat(style.paddingBottom) || 0;
    setInsets((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, [active, viewport.w, viewport.h]);

  // 6. "Painted": two frames after a card is placed and measured. Until then Next is ignored and nothing is marked seen.
  useEffect(() => {
    paintedRef.current = null;
    actedRef.current = null;
    if (placedId === null || !cardMeasured) return;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        paintedRef.current = placedId;
      });
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [placedId, cardMeasured]);

  // 7. Focus moves to Next while the card is up and returns to where it was (if that is still sensible) when it goes.
  useEffect(() => {
    if (!shown) return;
    const current = document.activeElement as HTMLElement | null;
    const previous = current && current !== document.body && !cardRef.current?.contains(current) ? current : null;
    nextRef.current?.focus({ preventScroll: true });
    return () => {
      const now = document.activeElement;
      if (previous && document.contains(previous) && (!now || now === document.body)) {
        try {
          previous.focus({ preventScroll: true });
        } catch {
          /* focus can fail on a detached or disabled element */
        }
      }
    };
  }, [shown]);

  // 8. Escape means Skip all (on a Replay: just end the replay).
  useEffect(() => {
    if (!shown) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      if (callbacksRef.current.replay) callbacksRef.current.onReplayDone();
      else callbacksRef.current.onSkipAll();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shown]);

  const handleNext = () => {
    // Only the step that is on screen, and only once it has painted. A second press during the swap does nothing.
    if (currentId === null || !placed || placed.id !== currentId || paintedRef.current !== placed.id) return;
    if (actedRef.current === placed.id) return;
    actedRef.current = placed.id;
    if (replay) {
      if (index >= TIP_IDS.length - 1) onReplayDone();
      else setReplayIndex(index + 1);
      return;
    }
    onMarkSeen(currentId);
  };

  const handleSkip = () => {
    if (replay) onReplayDone();
    else onSkipAll();
  };

  if (!active) return null;

  const step = placed ? GUIDE_STEPS[placed.id] : null;
  const stepNumber = placed ? TIP_IDS.indexOf(placed.id) + 1 : 0;
  const isLast = placed ? placed.id === TIP_IDS[TIP_IDS.length - 1] : false;
  const placement =
    placed && cardHeight !== null
      ? computePlacement(placed.box, cardHeight, viewport.w, viewport.h, insets.top, insets.bottom)
      : null;
  const ringBox = placement && placement.showRing && placed ? placed.box : null;
  const smooth = !!placed && placed.smooth && !reduceMotion;
  const labelId = "guide-tour-step";
  const bodyId = "guide-tour-copy";

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 35 }}>
      {/* Reads the safe-area insets as px. Never visible. */}
      <div
        ref={probeRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          visibility: "hidden",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      />

      {ringBox && (
        <div
          aria-hidden="true"
          className="guide-ring absolute pointer-events-none"
          style={{
            top: ringBox.top - RING_PAD,
            left: ringBox.left - RING_PAD,
            width: ringBox.width + RING_PAD * 2,
            height: ringBox.height + RING_PAD * 2,
            boxSizing: "border-box",
            opacity: isTransitioning ? 0 : 1,
            transition: smooth
              ? "top 0.22s ease, left 0.22s ease, width 0.22s ease, height 0.22s ease, opacity 0.15s linear"
              : "opacity 0.15s linear",
          }}
        />
      )}

      {placed && step && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby={labelId}
          aria-describedby={bodyId}
          className="absolute pointer-events-auto rounded-2xl border border-natural-clay/40 bg-natural-card p-4 shadow-xl"
          style={{
            top: placement ? placement.top : 0,
            left: placement ? placement.left : 0,
            width: placement ? placement.width : cardWidthFor(viewport.w),
            boxSizing: "border-box",
            visibility: placement ? "visible" : "hidden",
            transition: smooth ? "top 0.22s ease, left 0.22s ease" : "none",
          }}
        >
          <motion.div
            key={placed.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
          >
            <p id={labelId} className="text-[10px] font-mono font-extrabold uppercase tracking-[0.22em] text-natural-clay">
              Step {stepNumber} of {GUIDE_STEP_COUNT}
            </p>
            <p id={bodyId} className="mt-2 text-sm font-serif leading-relaxed text-natural-forest">
              {step.copy}
            </p>
          </motion.div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className={`min-h-11 px-3 rounded-xl text-xs font-mono font-bold text-natural-forest-light hover:text-natural-forest transition cursor-pointer ${FOCUS_RING}`}
            >
              Skip all
            </button>
            <button
              ref={nextRef}
              type="button"
              onClick={handleNext}
              className={`min-h-11 min-w-20 px-5 rounded-xl bg-natural-forest text-natural-bg text-xs font-serif font-extrabold tracking-wide shadow-sm hover:bg-natural-forest/90 transition cursor-pointer ${FOCUS_RING}`}
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
