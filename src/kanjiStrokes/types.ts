/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Types only. The stroke DATA under ./data/ is derived from KanjiVG and is licensed
 * separately (CC BY-SA 3.0) — see ./NOTICE.md. This file contains no KanjiVG content.
 */

/** [x, y] in the KanjiVG coordinate space (viewBox 0 0 109 109, y grows downward). */
export type StrokePoint = [number, number];

export interface KanjiStroke {
  /** 1-based stroke number = position in the canonical stroke order. */
  n: number;
  /** SVG path data, exactly as published by KanjiVG (absolute/relative commands preserved). */
  d: string;
  /** KanjiVG stroke type (kvg:type), e.g. "㇐" or "㇑a". Kept for B3 shape checks; not shown to learners. */
  type?: string;
  /** Where the pen touches down. */
  start: StrokePoint;
  /** Where the pen lifts. */
  end: StrokePoint;
  /** Chord direction start→end in whole degrees. 0 = right, 90 = down, 180 = left, -90 = up (SVG y-down). */
  dir: number;
  /** Tangent direction at the end of the path (arrowhead / hook direction), same convention as `dir`. */
  endDir: number;
  /** Approximate path length in viewBox units (32-sample polyline per curve). Drives animation timing. */
  len: number;
  /** Where KanjiVG places this stroke's number label (text baseline-left). */
  num?: StrokePoint;
  /** Index into `parts` of the innermost component group containing this stroke. */
  part?: number;
}

/** A component group from KanjiVG's stroke-order tree (e.g. the 氵 in 海). Optional metadata. */
export interface KanjiStrokePart {
  element?: string;
  /** kvg:position — left, right, top, bottom, kamae, tare, nyo, etc. */
  position?: string;
  radical?: string;
  /** kvg:part — which part of a split component this is (1, 2, ...). */
  part?: string;
  /** Index of the enclosing group in `parts`, when nested. */
  parent?: number;
}

export interface KanjiStrokeData {
  kanji: string;
  /** Five-digit lowercase hex code point, KanjiVG's file name stem. */
  code: string;
  /** KanjiVG release the data came from, e.g. "20260714". */
  release: string;
  /** Side of the square coordinate space. Always 109 for KanjiVG. */
  viewBox: number;
  strokes: KanjiStroke[];
  parts: KanjiStrokePart[];
}
