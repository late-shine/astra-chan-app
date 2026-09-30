/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { STROKE_LOADERS } from "./manifest";
import type { KanjiStrokeData } from "./types";

/**
 * Stroke-data access for B2. Everything goes through here so the rest of the app never
 * imports ./data/* directly.
 *
 *  - `hasStrokeGuide(k)`        — true if KanjiVG data exists for the card key (sync, no download).
 *  - `loadKanjiStrokes(k)`      — resolves the data, or null when there is no guide. Cached; concurrent
 *                                  callers share one download. A failed download is NOT cached, so a
 *                                  later call retries.
 *  - `prefetchKanjiStrokes(ks)` — fire-and-forget warm-up for the neighbours of the current card.
 *  - `useKanjiStrokes(k)`       — React hook: { status, data }.
 *
 * Nothing here ever synthesises paths. No data → status "unavailable", and the UI says so.
 */

const cache = new Map<string, KanjiStrokeData>();
const pending = new Map<string, Promise<KanjiStrokeData | null>>();

export function hasStrokeGuide(kanji: string): boolean {
  return Object.prototype.hasOwnProperty.call(STROKE_LOADERS, kanji);
}

export function getCachedStrokes(kanji: string): KanjiStrokeData | undefined {
  return cache.get(kanji);
}

export function loadKanjiStrokes(kanji: string): Promise<KanjiStrokeData | null> {
  const hit = cache.get(kanji);
  if (hit) return Promise.resolve(hit);
  if (!hasStrokeGuide(kanji)) return Promise.resolve(null);
  const inflight = pending.get(kanji);
  if (inflight) return inflight;
  const request = STROKE_LOADERS[kanji]()
    .then((mod) => {
      cache.set(kanji, mod.default);
      pending.delete(kanji);
      return mod.default;
    })
    .catch((err) => {
      pending.delete(kanji); // don't cache failures: offline now, fine later
      throw err;
    });
  pending.set(kanji, request);
  return request;
}

export function prefetchKanjiStrokes(kanjis: Array<string | undefined>): void {
  for (const k of kanjis) {
    if (!k || cache.has(k) || pending.has(k) || !hasStrokeGuide(k)) continue;
    loadKanjiStrokes(k).catch(() => {
      /* prefetch is best-effort; the real request will surface any error */
    });
  }
}

export type StrokeGuideStatus = "loading" | "ready" | "unavailable" | "error";

export interface StrokeGuideState {
  status: StrokeGuideStatus;
  data: KanjiStrokeData | null;
}

export interface StrokeGuideHandle extends StrokeGuideState {
  /** Re-attempts the download after status "error". */
  retry: () => void;
}

export function useKanjiStrokes(kanji: string): StrokeGuideHandle {
  const [state, setState] = useState<StrokeGuideState>(() => initialState(kanji));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(kanji);
    if (cached) {
      setState({ status: "ready", data: cached });
      return;
    }
    if (!hasStrokeGuide(kanji)) {
      setState({ status: "unavailable", data: null });
      return;
    }
    setState({ status: "loading", data: null });
    loadKanjiStrokes(kanji)
      .then((data) => {
        if (!cancelled) setState(data ? { status: "ready", data } : { status: "unavailable", data: null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [kanji, attempt]);

  // For the one render between a kanji change and the effect above, `state` still describes the
  // previous kanji. Never hand that data out for the wrong character.
  const stale = state.data !== null && state.data.kanji !== kanji;
  const view: StrokeGuideState = stale ? initialState(kanji) : state;
  return { status: view.status, data: view.data, retry: () => setAttempt((n: number) => n + 1) };
}

function initialState(kanji: string): StrokeGuideState {
  const cached = cache.get(kanji);
  if (cached) return { status: "ready", data: cached };
  return hasStrokeGuide(kanji) ? { status: "loading", data: null } : { status: "unavailable", data: null };
}
