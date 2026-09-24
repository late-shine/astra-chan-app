import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Plus, Volume2, X } from "lucide-react";
import { VOCABULARY_DATA } from "../data";
import type { KanjiItem, SRSCard } from "../types";
import {
  LANE_KIND_LABEL,
  USEFULNESS_LABEL,
  availableFilters,
  buildLanes,
  kindOfType,
  splitReading,
  wordsForFilter,
  type LaneKind,
  type MapEntry,
  type MapFilter,
  type ReadingLane,
  type Usefulness,
} from "./wordFamilyMap";

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

/** Dot before the lane label. The text label always carries the meaning; colour is a hint. */
const KIND_DOT: Record<LaneKind, string> = {
  onyomi: "bg-natural-clay",
  kunyomi: "bg-natural-sage",
  variant: "bg-natural-clay",
  irregular: "bg-natural-forest-light/75",
};

const USEFULNESS_STYLE: Record<Usefulness, string> = {
  core: "border-natural-clay bg-natural-clay kz-on-accent",
  next: "border-natural-clay/30 bg-transparent text-natural-charcoal",
  recognition: "border-dashed border-natural-border bg-transparent text-natural-forest-light",
};

/** Shared icon-button shape. Border colour and hover styles are added per use so classes never compete. */
const ACTION_BASE =
  "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest/40";

/** Ghost button: no border until hovered or focused. Colour is inherited, so the row can dim/brighten it. */
const ACTION_GHOST =
  "cursor-pointer border-transparent hover:border-natural-forest hover:bg-natural-forest/10 focus-visible:border-natural-forest";

const CHIP = "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-bold leading-none";

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
    <div className="flex shrink-0 items-center gap-1 text-natural-forest-light/75 group-hover/row:text-natural-forest-light group-focus-within/row:text-natural-forest-light">
      <button
        type="button"
        onClick={() => speak(entry.word)}
        className={`${ACTION_BASE} ${ACTION_GHOST} hover:text-natural-forest`}
        aria-label={`Speak ${entry.word}`}
        title="Speak"
      >
        <Volume2 className="h-4 w-4" />
      </button>

      {inVocabulary ? (
        <button
          type="button"
          onClick={() => onAdd(entry)}
          className={`${ACTION_BASE} ${ACTION_GHOST} ${inDeck ? "text-natural-clay" : "hover:text-natural-clay"}`}
          aria-label={inDeck ? `${entry.word} is in your Review Deck` : `Add ${entry.word} to Review Deck`}
          title={inDeck ? "Already in Review Deck" : "Add to Review Deck"}
        >
          {inDeck ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      ) : (
        <button
          type="button"
          disabled
          className={`${ACTION_BASE} cursor-not-allowed border-transparent opacity-40`}
          aria-label={`${entry.word} is not in the vocab deck yet`}
          title="Not in vocab deck yet"
        >
          <Plus className="h-4 w-4" />
        </button>
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

function NoteLine({ note }: { note: string }) {
  return (
    <p className="mt-2 border-l-2 border-natural-clay/30 pl-3 text-xs leading-relaxed text-natural-forest-light">
      {note}
    </p>
  );
}

function FeaturedWord({
  entry,
  kanji,
  laneKind,
  ...actions
}: ActionProps & { entry: MapEntry; kanji: string; laneKind: LaneKind }) {
  return (
    <div className="group/row flex items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h4 className="font-serif text-3xl font-extrabold leading-tight text-natural-charcoal">{entry.word}</h4>
          <ReadingText entry={entry} kanji={kanji} className="text-lg font-bold" />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-serif text-base font-bold text-natural-charcoal">
          {entry.meaning}
          <WordTags entry={entry} laneKind={laneKind} />
        </p>
        {entry.note && <NoteLine note={entry.note} />}
      </div>
      <WordActions entry={entry} {...actions} />
    </div>
  );
}

function SupportingWord({
  entry,
  kanji,
  laneKind,
  ...actions
}: ActionProps & { entry: MapEntry; kanji: string; laneKind: LaneKind }) {
  return (
    <div className="group/row flex items-center justify-between gap-2 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-serif text-lg font-extrabold text-natural-charcoal">{entry.word}</span>
          <ReadingText entry={entry} kanji={kanji} className="text-sm font-bold" />
          <span className="font-serif text-sm font-bold text-natural-charcoal">{entry.meaning}</span>
          <WordTags entry={entry} laneKind={laneKind} />
        </div>
        {entry.note && <NoteLine note={entry.note} />}
      </div>
      <WordActions entry={entry} {...actions} />
    </div>
  );
}

function LaneSummary({ lane, visibleCount }: { lane: ReadingLane; visibleCount: number }) {
  return (
    <div>
      <p className="font-serif text-3xl font-extrabold leading-none text-natural-charcoal">{lane.reading}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`${CHIP} border-natural-border/70 text-natural-charcoal`}>
          <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[lane.kind]}`} aria-hidden="true" />
          {LANE_KIND_LABEL[lane.kind]}
        </span>
        <span className={`${CHIP} ${USEFULNESS_STYLE[lane.usefulness]}`}>{USEFULNESS_LABEL[lane.usefulness]}</span>
      </div>
      <p className="mt-2 text-xs font-bold text-natural-forest-light">
        {lane.entries.length} example{lane.entries.length === 1 ? "" : "s"}
        {visibleCount !== lane.entries.length ? ` (${visibleCount} shown)` : ""}
        {lane.variantOf ? ` · variant of ${lane.variantOf}` : ""}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-natural-forest-light">{lane.pattern}</p>
    </div>
  );
}

function ReadingLaneView({
  lane,
  words,
  kanji,
  ...actions
}: ActionProps & { lane: ReadingLane; words: MapEntry[]; kanji: string }) {
  const [featured, ...supporting] = words;
  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-[12rem_minmax(0,1fr)] md:items-start md:gap-5">
      <LaneSummary lane={lane} visibleCount={words.length} />
      <div className="kz-inset overflow-hidden">
        <FeaturedWord entry={featured} kanji={kanji} laneKind={lane.kind} {...actions} />
        {supporting.length > 0 && (
          <ul className="divide-y divide-natural-border/50 border-t border-natural-border/50">
            {supporting.map((entry) => (
              <li key={`${entry.word}-${entry.reading}`}>
                <SupportingWord entry={entry} kanji={kanji} laneKind={lane.kind} {...actions} />
              </li>
            ))}
          </ul>
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

  const family = kanji.kanjiWords;
  const lanes = useMemo(() => buildLanes(family ?? []), [family]);
  const filters = useMemo(() => availableFilters(family ?? []), [family]);
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center kz-scrim backdrop-blur-sm p-4"
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
        className="kz-panel flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-natural-border/70 bg-natural-bg/60 p-4 md:p-5">
          <div className="flex items-center gap-3 md:gap-4">
            <span
              className="w-12 shrink-0 text-center font-serif text-5xl font-extrabold leading-none text-natural-forest md:w-[3.75rem] md:text-6xl"
              aria-hidden="true"
            >
              {kanji.kanji}
            </span>
            <div className="min-w-0">
              <p className="kz-label">Word family</p>
              <h3 id="word-family-title" className="font-serif text-2xl font-extrabold text-natural-charcoal">
                <span className="sr-only">{kanji.kanji}, </span>
                {kanji.meaning}
              </h3>
              <p className="mt-1 text-xs font-medium text-natural-forest-light">
                {wordCount} word{wordCount === 1 ? "" : "s"} · {lanes.length} reading{lanes.length === 1 ? "" : "s"}.
                Highlighted kana are the part {kanji.kanji} plays.
              </p>
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`${ACTION_BASE} shrink-0 cursor-pointer border-natural-border bg-natural-card text-natural-forest-light hover:border-natural-forest hover:text-natural-forest`}
            aria-label="Close word family panel"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          {filters.length > 0 && (
            <div
              role="group"
              aria-label="Filter readings"
              className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex gap-2 overflow-x-auto border-b border-natural-border/50 bg-natural-card px-4 py-3 md:-mx-5 md:-mt-5 md:px-5"
            >
              {filters.map((option) => {
                const active = option.id === activeFilter;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(option.id)}
                    className={`shrink-0 cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest/40 ${
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

          <p className="sr-only" aria-live="polite">
            Showing {visibleWordCount} word{visibleWordCount === 1 ? "" : "s"} in {visibleLanes.length} reading
            {visibleLanes.length === 1 ? "" : "s"}.
          </p>

          {visibleLanes.length === 0 ? (
            <p className="kz-inset p-4 text-sm font-medium text-natural-forest-light">
              No word family is available for {kanji.kanji} yet.
            </p>
          ) : (
            <ol className="relative flex flex-col gap-6 pl-8 before:absolute before:bottom-3 before:left-3 before:top-3 before:w-px before:bg-natural-border before:content-[''] md:pl-[3.25rem] md:before:left-[1.875rem]">
              {visibleLanes.map(({ lane, words }) => (
                <li key={lane.reading} className="relative">
                  <span
                    className={`absolute -left-[1.5625rem] top-3 h-2.5 w-2.5 rounded-full border-2 bg-natural-card md:-left-[1.6875rem] ${
                      lane.usefulness === "core" ? "border-natural-clay" : "border-natural-border"
                    }`}
                    aria-hidden="true"
                  />
                  <ReadingLaneView lane={lane} words={words} kanji={kanji.kanji} {...actions} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
