import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BookmarkCheck, ChevronDown, ListPlus, Volume2, X } from "lucide-react";
import { VOCABULARY_DATA } from "../data";
import type { KanjiItem, SRSCard } from "../types";
import {
  LANE_KIND_LABEL,
  availableFilters,
  buildLanes,
  kindOfType,
  shouldOfferFilters,
  splitReading,
  wordsForFilter,
  type LaneKind,
  type MapEntry,
  type MapFilter,
  type ReadingLane,
} from "./wordFamilyMap";

/**
 * Word-family panel — Phase UI-1 / UI-1b layout.
 *
 * Hierarchy, in reading order:
 *   1. hero: the kanji tile, its meaning, "N words · M readings";
 *   2. reading index: one chip per reading (jumps to its lane) — only when there are 2+;
 *   3. numbered lanes, one per reading: the sound first, then its type, a label only when the
 *      reading is special (Core / Recognition only / Irregular), and a word count when 2+;
 *   4. example words as flat rows under each reading — no box per lane, no box per word.
 * Filter chips appear only for long families (see FILTER_MIN_WORDS in wordFamilyMap.ts).
 *
 * Nothing in here is data-driven beyond the A4 adapter (wordFamilyMap.ts); props, the
 * dialog behaviour (focus, Escape, Tab trap) and the add-to-deck / speech paths are
 * unchanged from A4.
 */
interface KanjiWordFamilyPanelProps {
  kanji: KanjiItem;
  onClose: () => void;
  speakJapanese: (phrase: string) => void;
  hasCard: (itemKey: string) => boolean;
  addCard: (itemKey: string, type: SRSCard["type"]) => void;
  showToast: (message: string) => void;
}

const vocabularyWords = new Set(VOCABULARY_DATA.map((item) => item.word));

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/** A lane longer than this folds to LANE_FOLDED_COUNT rows behind one "Show more" control. */
const LANE_FOLD_AFTER = 5;
const LANE_FOLDED_COUNT = 4;

/** Dot before the lane type. The text label always carries the meaning; colour is a hint. */
const KIND_DOT: Record<LaneKind, string> = {
  onyomi: "bg-natural-clay",
  kunyomi: "bg-natural-sage",
  variant: "bg-natural-clay",
  irregular: "bg-natural-forest-light/75",
};

/** Shared icon-button shape (40px: comfortable on touch). Colours are added per use. */
const ICON_BUTTON =
  "flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-transparent text-natural-forest-light transition-colors motion-reduce:transition-none hover:border-natural-forest/40 hover:bg-natural-forest/10 hover:text-natural-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest/40";

interface ActionProps {
  speak: (phrase: string) => void;
  hasCard: (itemKey: string) => boolean;
  onAdd: (entry: MapEntry) => void;
}

/** The reading with the part this kanji contributes marked (weight + underline + tint, not colour alone). */
function ReadingText({ entry, kanji, className }: { entry: MapEntry; kanji: string; className: string }) {
  const segments = splitReading(entry, kanji);
  return (
    <span className={`font-serif ${className}`}>
      {segments.map((segment, index) =>
        segment.hit ? (
          <span
            key={index}
            title={`${kanji} is read ${entry.kanjiReading} here`}
            className="rounded-sm border-b-2 border-natural-clay bg-natural-clay/15 px-0.5 font-extrabold text-natural-charcoal"
          >
            {segment.text}
          </span>
        ) : (
          <span key={index} className="text-natural-forest-light">
            {segment.text}
          </span>
        ),
      )}
    </span>
  );
}

function WordActions({ entry, speak, hasCard, onAdd }: ActionProps & { entry: MapEntry }) {
  const inVocabulary = vocabularyWords.has(entry.word);
  const inDeck = hasCard(entry.word);

  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={() => speak(entry.word)}
        className={ICON_BUTTON}
        aria-label={`Speak ${entry.word}`}
        title="Speak"
      >
        <Volume2 className="h-[1.125rem] w-[1.125rem]" />
      </button>

      {inVocabulary ? (
        <button
          type="button"
          onClick={() => onAdd(entry)}
          className={`${ICON_BUTTON} ${inDeck ? "text-natural-clay hover:text-natural-clay" : "hover:text-natural-clay"}`}
          aria-label={inDeck ? `${entry.word} is in your Review Deck` : `Add ${entry.word} to Review Deck`}
          title={inDeck ? "Already in Review Deck" : "Add to Review Deck"}
        >
          {inDeck ? <BookmarkCheck className="h-[1.125rem] w-[1.125rem]" /> : <ListPlus className="h-[1.125rem] w-[1.125rem]" />}
        </button>
      ) : (
        // No dead, disabled button: the slot keeps the speak buttons aligned down the list, and
        // screen readers still hear why there is no add action.
        <span className="relative block h-10 w-10">
          <span className="sr-only">{entry.word} is not in the vocab deck yet</span>
        </span>
      )}
    </div>
  );
}

/** Small tags that only appear when they add information (a type that differs from the lane, less-common words). */
function WordTags({ entry, laneKind }: { entry: MapEntry; laneKind: LaneKind }) {
  const kind = kindOfType(entry.readingType);
  const differs = kind !== laneKind;
  const uncommon = entry.commonness !== "common";
  if (!differs && !uncommon) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {differs && (
        <span className="rounded-md border border-natural-border/70 px-1.5 py-0.5 text-[11px] font-bold leading-none text-natural-forest-light">
          {LANE_KIND_LABEL[kind]}
        </span>
      )}
      {uncommon && (
        <span className="text-[11px] font-bold leading-none text-natural-forest-light">
          {entry.commonness === "rare" ? "rare" : "less common"}
        </span>
      )}
    </span>
  );
}

/** One example word: the word and its marked reading, the meaning, then at most one quiet note. */
function WordRow({
  entry,
  kanji,
  laneKind,
  ...actions
}: ActionProps & { entry: MapEntry; kanji: string; laneKind: LaneKind }) {
  return (
    <div className="flex items-center justify-between gap-1 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-serif text-xl font-extrabold leading-tight text-natural-charcoal">{entry.word}</span>
          <ReadingText entry={entry} kanji={kanji} className="text-base font-bold" />
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-natural-charcoal">
          {entry.meaning}
          <WordTags entry={entry} laneKind={laneKind} />
        </p>
        {entry.note && <p className="mt-1.5 text-xs leading-relaxed text-natural-forest-light">{entry.note}</p>}
      </div>
      <WordActions entry={entry} {...actions} />
    </div>
  );
}

/**
 * The reading itself is the headline. A small number gives each reading a place in the list
 * (shown only when there is more than one). Underneath: its type, a word count when there are
 * several, and a label only for readings that deserve one. "Useful next" is the unremarkable
 * default, so it is never printed.
 */
function LaneHeader({ lane, number, headingId }: { lane: ReadingLane; number: string | null; headingId: string }) {
  const wordCount = lane.entries.length;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 md:block">
      <div className="flex items-baseline gap-2.5">
        {number && <span className="kz-label tabular-nums" aria-hidden="true">{number}</span>}
        <h4
          id={headingId}
          tabIndex={-1}
          className="scroll-mt-16 font-serif text-3xl font-extrabold leading-none text-natural-charcoal focus:outline-none focus-visible:underline"
        >
          {lane.reading}
        </h4>
      </div>
      <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-natural-forest-light md:mt-2.5 ${number ? "md:pl-[1.85rem]" : ""}`}>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[lane.kind]}`} aria-hidden="true" />
          {LANE_KIND_LABEL[lane.kind]}
        </span>
        {wordCount > 1 && <span className="font-medium">{wordCount} words</span>}
        {lane.usefulness === "core" && (
          <span className="rounded-md border border-natural-clay bg-natural-clay px-1.5 py-0.5 text-[11px] leading-none kz-on-accent">
            Core
          </span>
        )}
        {lane.usefulness === "recognition" && (
          <span className="rounded-md border border-dashed border-natural-border px-1.5 py-0.5 text-[11px] leading-none">
            Recognition only
          </span>
        )}
        {lane.variantOf && <span className="font-medium">variant of {lane.variantOf}</span>}
      </p>
      {lane.pattern && (
        <p className={`basis-full text-xs font-medium leading-relaxed text-natural-forest-light md:mt-1.5 ${number ? "md:pl-[1.85rem]" : ""}`}>
          {lane.pattern}
        </p>
      )}
    </div>
  );
}

function ReadingLaneView({
  lane,
  words,
  kanji,
  number,
  headingId,
  expanded,
  onToggleExpanded,
  ...actions
}: ActionProps & {
  lane: ReadingLane;
  words: MapEntry[];
  kanji: string;
  number: string | null;
  headingId: string;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const foldable = words.length > LANE_FOLD_AFTER;
  const shown = foldable && !expanded ? words.slice(0, LANE_FOLDED_COUNT) : words;
  const hiddenCount = words.length - shown.length;

  return (
    <div className="flex flex-col gap-1 md:grid md:grid-cols-[11rem_minmax(0,1fr)] md:items-start md:gap-6">
      <LaneHeader lane={lane} number={number} headingId={headingId} />
      <div>
        <ul className="divide-y divide-natural-border/40">
          {shown.map((entry) => (
            <li key={`${entry.word}-${entry.reading}`}>
              <WordRow entry={entry} kanji={kanji} laneKind={lane.kind} {...actions} />
            </li>
          ))}
        </ul>
        {foldable && (
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            className="mt-1 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-natural-clay transition-colors motion-reduce:transition-none hover:bg-natural-clay/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest/40"
          >
            <ChevronDown className={`h-4 w-4 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
            {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function KanjiWordFamilyPanel({
  kanji,
  onClose,
  speakJapanese,
  hasCard,
  addCard,
  showToast,
}: KanjiWordFamilyPanelProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const [filter, setFilter] = useState<MapFilter>("all");
  const [expandedLanes, setExpandedLanes] = useState<Record<string, boolean>>({});

  const family = kanji.kanjiWords;
  const lanes = useMemo(() => buildLanes(family ?? []), [family]);
  // UI-1b: chips only for long families; a short family is fully visible without them.
  const filters = useMemo(() => (shouldOfferFilters(family ?? []) ? availableFilters(family ?? []) : []), [family]);
  const activeFilter: MapFilter = filters.some((option) => option.id === filter) ? filter : "all";
  const visibleLanes = lanes
    .map((lane) => ({ lane, words: wordsForFilter(lane, activeFilter) }))
    .filter((item) => item.words.length > 0);
  const wordCount = family?.length ?? 0;
  const visibleWordCount = visibleLanes.reduce((sum, item) => sum + item.words.length, 0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Dialog behaviour: focus in, Escape closes, Tab stays inside, focus returns on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Cast on purpose: this project has no React typings, so the ref's type can't be trusted here.
      const root = dialogRef.current as HTMLElement | null;
      if (event.key !== "Tab" || !root) return;
      const focusable = Array.from(root.querySelectorAll(FOCUSABLE)) as HTMLElement[];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !root.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, []);

  const handleAdd = (entry: MapEntry) => {
    if (hasCard(entry.word)) {
      showToast("Already in your Review Deck!");
    } else {
      addCard(entry.word, "vocab");
      showToast("Added word to Review Deck!");
    }
  };
  const actions: ActionProps = { speak: speakJapanese, hasCard, onAdd: handleAdd };

  const laneId = (index: number) => `wf-lane-${index}`;
  // Reading index → lane. Focus moves to the lane's heading so keyboard and screen-reader users land there too.
  const jumpToLane = (index: number) => {
    const heading = document.getElementById(laneId(index));
    if (!heading) return;
    heading.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    heading.focus({ preventScroll: true });
  };
  const numbered = visibleLanes.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center kz-scrim backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-family-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
        className="kz-panel flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Hero: tile + meaning + counts in one compact row (about 88px tall at 360px). */}
        <div className="flex items-start justify-between gap-3 border-b border-natural-border/70 px-4 py-3 md:px-5 md:py-4">
          <div className="flex min-w-0 items-center gap-3.5 md:gap-4">
            <span
              className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[var(--kz-border-soft)] bg-[var(--kz-surface-specimen)] font-serif text-4xl font-extrabold leading-none text-natural-charcoal md:h-[4.5rem] md:w-[4.5rem] md:text-5xl"
              aria-hidden="true"
            >
              {kanji.kanji}
            </span>
            <div className="min-w-0">
              <p className="kz-label">Word family</p>
              <h3 id="word-family-title" className="font-serif text-xl font-extrabold leading-snug text-natural-charcoal md:text-3xl">
                <span className="sr-only">{kanji.kanji}, </span>
                {kanji.meaning}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-natural-forest-light">
                {wordCount} word{wordCount === 1 ? "" : "s"} · {lanes.length} reading{lanes.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`${ICON_BUTTON} shrink-0`}
            aria-label="Close word family panel"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filters.length > 0 && (
            <div
              role="group"
              aria-label="Filter readings"
              className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-natural-border/50 bg-natural-card px-4 py-2.5 md:px-5"
            >
              {filters.map((option) => {
                const active = option.id === activeFilter;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(option.id)}
                    className={`min-h-9 shrink-0 cursor-pointer rounded-xl border px-3 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest/40 ${
                      active
                        ? "border-natural-clay bg-natural-clay kz-on-accent"
                        : "border-natural-border bg-transparent text-natural-forest-light hover:border-natural-clay hover:text-natural-charcoal"
                    }`}
                  >
                    {option.label} <span className="font-medium">{option.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="px-4 pb-2 pt-3 md:px-5">
            <p className="sr-only" aria-live="polite">
              Showing {visibleWordCount} word{visibleWordCount === 1 ? "" : "s"} in {visibleLanes.length} reading
              {visibleLanes.length === 1 ? "" : "s"}.
            </p>

            {visibleLanes.length === 0 ? (
              <p className="kz-inset p-4 text-sm font-medium text-natural-forest-light">
                No curated word family yet for {kanji.kanji} — recognition only for now, never a guessed reading.
              </p>
            ) : (
              <>
                {/* Reading summary: every sound this kanji makes, at a glance. Each chip jumps to its lane. */}
                {visibleLanes.length > 1 && (
                  <nav aria-label="Jump to a reading" className="flex flex-wrap items-center gap-2 pb-3">
                    {visibleLanes.map(({ lane }, index) => (
                      <button
                        key={lane.reading}
                        type="button"
                        onClick={() => jumpToLane(index)}
                        aria-label={`Jump to ${lane.reading}, reading ${index + 1} of ${visibleLanes.length}`}
                        className={`inline-flex min-h-10 cursor-pointer items-center rounded-xl border px-3.5 font-serif text-lg font-bold leading-none transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest/40 ${
                          lane.usefulness === "core"
                            ? "border-natural-clay/60 bg-natural-clay/10 text-natural-charcoal hover:bg-natural-clay/20"
                            : "border-natural-border text-natural-charcoal hover:border-natural-clay"
                        }`}
                      >
                        {lane.reading}
                      </button>
                    ))}
                  </nav>
                )}

                {/* The two things every row relies on, said once. */}
                <p className="pb-1 text-xs leading-relaxed text-natural-forest-light">
                  Underlined kana show how <span className="font-serif font-bold text-natural-charcoal">{kanji.kanji}</span>{" "}
                  sounds in each word. Use{" "}
                  <ListPlus className="inline h-3.5 w-3.5 align-[-0.2em] text-natural-clay" aria-hidden="true" /> to add a
                  word to your Review Deck.
                </p>
                <ol className="divide-y divide-natural-border/60">
                  {visibleLanes.map(({ lane, words }, index) => (
                    <li key={lane.reading} className="py-4 md:py-5">
                      <ReadingLaneView
                        lane={lane}
                        words={words}
                        kanji={kanji.kanji}
                        number={numbered ? String(index + 1).padStart(2, "0") : null}
                        headingId={laneId(index)}
                        expanded={Boolean(expandedLanes[lane.reading])}
                        onToggleExpanded={() =>
                          setExpandedLanes((current) => ({ ...current, [lane.reading]: !current[lane.reading] }))
                        }
                        {...actions}
                      />
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
