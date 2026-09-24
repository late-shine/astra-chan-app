/**
 * Phase A4 — local adapter for the word-family "reading map".
 *
 * Turns the flat `KanjiWordEntry[]` of one kanji into ordered reading lanes,
 * filter categories and highlight segments. It is pure (no React, no app state)
 * so B1a/B5/B6 can swap the input shape without touching the panel's layout.
 *
 * Nothing here guesses linguistics: every label is derived from fields that
 * already exist on `KanjiWordEntry` (`readingType`, `commonness`, `note`).
 * The two optional fields on `MapEntry` are for later phases and are unused
 * by the current data.
 */
import type { KanjiWordEntry } from "../types";

/** Entry as consumed by the map. The two extras do not exist in real data yet. */
export type MapEntry = KanjiWordEntry & {
  /** B5: kanjiReading of the base lane this reading modifies (places it next to that lane). */
  variantOf?: string;
  /** B5/B6: reviewed one-line pattern statement for the lane (first entry that has one wins). */
  patternNote?: string;
};

export type LaneKind = "onyomi" | "kunyomi" | "variant" | "irregular";
export type Usefulness = "core" | "next" | "recognition";
export type MapFilter = "all" | "on" | "kun" | "sound" | "exception";

export interface ReadingLane {
  /** The kana this kanji contributes (the entries' `kanjiReading`). */
  reading: string;
  kind: LaneKind;
  /** Ordered common/pattern-revealing → exceptional. `entries[0]` is the featured example. */
  entries: MapEntry[];
  commonCount: number;
  usefulness: Usefulness;
  /** One short line, derived from data or from a reviewed `patternNote`. */
  pattern: string;
  /** Set only when an entry supplies `variantOf` and that base lane exists. */
  variantOf?: string;
}

export interface FilterOption {
  id: MapFilter;
  label: string;
  count: number;
}

export interface ReadingSegment {
  text: string;
  /** True for the part of the word's reading that this kanji contributes. */
  hit: boolean;
}

export const LANE_KIND_LABEL: Record<LaneKind, string> = {
  onyomi: "On reading",
  kunyomi: "Kun reading",
  variant: "On variant",
  irregular: "Irregular",
};

export const USEFULNESS_LABEL: Record<Usefulness, string> = {
  core: "Core",
  next: "Useful next",
  recognition: "Recognition only",
};

const FILTER_LABEL: Record<MapFilter, string> = {
  all: "All",
  on: "On",
  kun: "Kun",
  sound: "Sound changes",
  exception: "Exceptions",
};

const FILTER_ORDER: MapFilter[] = ["on", "kun", "sound", "exception"];

const COMMON_RANK: Record<KanjiWordEntry["commonness"], number> = { common: 0, moderate: 1, rare: 2 };
const TYPE_RANK: Record<KanjiWordEntry["readingType"], number> = {
  onyomi: 0,
  kunyomi: 0,
  "onyomi-variant": 1,
  irregular: 2,
};
const KIND_RANK: Record<LaneKind, number> = { onyomi: 0, kunyomi: 0, variant: 1, irregular: 2 };

export function kindOfType(type: KanjiWordEntry["readingType"]): LaneKind {
  if (type === "onyomi-variant") return "variant";
  return type;
}

/** Which filter chips a single word belongs to. Variants are still on readings. */
export function entryFilters(entry: KanjiWordEntry): MapFilter[] {
  switch (entry.readingType) {
    case "onyomi":
      return ["on"];
    case "onyomi-variant":
      return ["on", "sound"];
    case "kunyomi":
      return ["kun"];
    case "irregular":
      return ["exception"];
  }
}

/**
 * Filter chips for a family. Returns [] (hide the bar) unless at least one
 * category is a real subset of the family — a chip that would show everything
 * is noise. A category that has no words is never offered.
 */
export function availableFilters(entries: KanjiWordEntry[]): FilterOption[] {
  const total = entries.length;
  const options: FilterOption[] = [];
  for (const id of FILTER_ORDER) {
    const count = entries.filter((entry) => entryFilters(entry).includes(id)).length;
    if (count > 0 && count < total) options.push({ id, label: FILTER_LABEL[id], count });
  }
  if (options.length === 0) return [];
  return [{ id: "all", label: FILTER_LABEL.all, count: total }, ...options];
}

export function wordsForFilter(lane: ReadingLane, filter: MapFilter): MapEntry[] {
  if (filter === "all") return lane.entries;
  return lane.entries.filter((entry) => entryFilters(entry).includes(filter));
}

function dominantKind(items: { entry: MapEntry }[]): LaneKind {
  const counts = new Map<LaneKind, number>();
  for (const { entry } of items) {
    const kind = kindOfType(entry.readingType);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  let best = kindOfType(items[0].entry.readingType);
  let bestCount = counts.get(best) ?? 0;
  for (const [kind, count] of counts) {
    if (count > bestCount) {
      best = kind;
      bestCount = count;
    }
  }
  return best;
}

function patternFor(kind: LaneKind, entries: MapEntry[], commonCount: number): string {
  const reviewed = entries.find((entry) => entry.patternNote)?.patternNote;
  if (reviewed) return reviewed;
  if (kind === "irregular") {
    return entries.length > 1
      ? "Special whole-word readings. Learn each word as a unit."
      : "Special whole-word reading. Learn the word as a unit.";
  }
  if (kind === "variant") return "A variant on reading of this kanji.";
  if (commonCount >= 2) return `Shows up in ${commonCount} common words.`;
  if (entries.length === 1) return "One example so far.";
  return `${entries.length} examples, ${commonCount} common.`;
}

/**
 * Group a family into reading lanes.
 *
 * Lane order: regular readings first (most common words, then most words, then
 * curated order), variants after them, irregular readings last — so common
 * patterns dominate and exceptions trail. A lane whose entries carry
 * `variantOf` is then moved to sit directly after its base lane.
 *
 * Word order inside a lane: common → less common, regular → variant →
 * irregular, then curated order.
 */
export function buildLanes(entries: MapEntry[]): ReadingLane[] {
  const byReading = new Map<string, { entry: MapEntry; index: number }[]>();
  entries.forEach((entry, index) => {
    const bucket = byReading.get(entry.kanjiReading);
    if (bucket) bucket.push({ entry, index });
    else byReading.set(entry.kanjiReading, [{ entry, index }]);
  });

  const drafts = Array.from(byReading, ([reading, items]) => {
    const ordered = [...items].sort(
      (a, b) =>
        COMMON_RANK[a.entry.commonness] - COMMON_RANK[b.entry.commonness] ||
        TYPE_RANK[a.entry.readingType] - TYPE_RANK[b.entry.readingType] ||
        a.index - b.index,
    );
    const kind = dominantKind(items);
    const laneEntries = ordered.map((item) => item.entry);
    const commonCount = laneEntries.filter((entry) => entry.commonness === "common").length;
    return {
      reading,
      kind,
      entries: laneEntries,
      commonCount,
      firstIndex: items[0].index,
      variantOf: laneEntries.find((entry) => entry.variantOf)?.variantOf,
    };
  });

  drafts.sort(
    (a, b) =>
      KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
      b.commonCount - a.commonCount ||
      b.entries.length - a.entries.length ||
      a.firstIndex - b.firstIndex,
  );

  const lanes: ReadingLane[] = drafts.map((draft, position) => ({
    reading: draft.reading,
    kind: draft.kind,
    entries: draft.entries,
    commonCount: draft.commonCount,
    usefulness:
      draft.commonCount === 0
        ? "recognition"
        : draft.commonCount >= 2 || position === 0
          ? "core"
          : "next",
    pattern: patternFor(draft.kind, draft.entries, draft.commonCount),
    variantOf: draft.variantOf,
  }));

  // Move hinted variants next to their base lane (only when the base exists).
  const isAttached = (lane: ReadingLane) =>
    Boolean(lane.variantOf) &&
    lane.variantOf !== lane.reading &&
    lanes.some((other) => other.reading === lane.variantOf);
  const placed = lanes.filter((lane) => !isAttached(lane));
  for (const lane of lanes.filter(isAttached)) {
    let at = placed.findIndex((other) => other.reading === lane.variantOf);
    while (at + 1 < placed.length && placed[at + 1].variantOf === lane.variantOf) at += 1;
    placed.splice(at + 1, 0, lane);
  }
  return placed.map((lane) => (isAttached(lane) ? lane : { ...lane, variantOf: undefined }));
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

/**
 * Split a word's reading into the part this kanji contributes and the rest.
 *
 * Highlights only when it is unambiguous; otherwise returns the reading
 * unmarked rather than guess:
 *  - contribution equals the whole reading (e.g. 今日 きょう) → all highlighted;
 *  - it appears once → that part;
 *  - it appears several times and the kanji occurs the same number of times in
 *    the word (五分五分 ごぶごぶ) → every part;
 *  - anything else → no highlight.
 */
export function splitReading(entry: KanjiWordEntry, kanji: string): ReadingSegment[] {
  const { reading, kanjiReading: part } = entry;
  const unmarked: ReadingSegment[] = [{ text: reading, hit: false }];
  if (!part) return unmarked;
  if (part === reading) return [{ text: reading, hit: true }];

  const starts: number[] = [];
  let from = 0;
  while (from <= reading.length - part.length) {
    const at = reading.indexOf(part, from);
    if (at < 0) break;
    starts.push(at);
    from = at + part.length;
  }
  if (starts.length === 0) return unmarked;
  if (starts.length > 1 && starts.length !== countOccurrences(entry.word, kanji)) return unmarked;

  const segments: ReadingSegment[] = [];
  let cursor = 0;
  for (const at of starts) {
    if (at > cursor) segments.push({ text: reading.slice(cursor, at), hit: false });
    segments.push({ text: part, hit: true });
    cursor = at + part.length;
  }
  if (cursor < reading.length) segments.push({ text: reading.slice(cursor), hit: false });
  return segments;
}
