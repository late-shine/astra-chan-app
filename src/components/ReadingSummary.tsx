import { Layers } from "lucide-react";
import type { KanjiItem } from "../types";
import RecallMask from "./RecallMask";

/**
 * ReadingSummary — separate On / Kun rows, kana first, romaji as a quiet aid,
 * one token per reading, marked by learning priority.
 *
 * DATA CONTRACT (Phase A2). Until B1a ships a real schema, tokens are derived from the
 * legacy comma-packed strings (`onyomi`, `kunyomi`, `*Romaji`). B1a can supply the
 * optional `readings` field below and this component will use it as-is.
 */
export type ReadingPriority = "core" | "next" | "recognition";

export interface KanjiReadingToken {
  /** Kana as written, e.g. "セイ" or "い-きる" ("-" marks the okurigana boundary). */
  kana: string;
  /** Optional romaji aid for this one reading. */
  romaji?: string;
  /** Learning priority. Defaults: first token "core", the rest "next". */
  priority?: ReadingPriority;
}

export interface KanjiReadingSet {
  on: KanjiReadingToken[];
  kun: KanjiReadingToken[];
}

/** KanjiItem plus the optional structured field this component understands. */
export type KanjiWithReadings = KanjiItem & { readings?: Partial<KanjiReadingSet> };

interface ResolvedRow {
  tokens: KanjiReadingToken[];
}

// ── Adapter: legacy strings → tokens ────────────────────────────────────────
const LIST_SEPARATORS = /[、,，;／/]/;
const OKURIGANA_MARKERS = /[-–—－]/;
const HAS_KANA = /[\u3040-\u30ff]/;
const HAS_LATIN = /[a-z]/i;

const splitList = (raw: string) =>
  (raw || "")
    .split(LIST_SEPARATORS)
    .map((part) => part.trim())
    .filter(Boolean);

function rowFromStrings(kanaRaw: string, romajiRaw: string): ResolvedRow {
  const kana = splitList(kanaRaw).filter((part) => HAS_KANA.test(part));
  const romaji = splitList(romajiRaw).filter((part) => HAS_LATIN.test(part));
  // Legacy romaji is not always one-per-reading (e.g. 行 lists two kun readings but one romaji).
  // Only pair when counts agree; otherwise show no romaji rather than a partial/misleading one.
  const paired = kana.length > 0 && romaji.length === kana.length;
  return {
    tokens: kana.map((value, index) => ({
      kana: value,
      romaji: paired ? romaji[index] : undefined,
      priority: index === 0 ? "core" : "next",
    })),
  };
}

function withDefaultPriority(tokens: KanjiReadingToken[]): KanjiReadingToken[] {
  return tokens.map((token, index) => ({
    ...token,
    priority: token.priority ?? (index === 0 ? "core" : "next"),
  }));
}

/** Exported so other consumers (B1d) can reuse the same tokenising rules. */
export function resolveReadings(kanji: KanjiWithReadings): { on: ResolvedRow; kun: ResolvedRow } {
  const structured = kanji.readings;
  return {
    on: structured?.on
      ? { tokens: withDefaultPriority(structured.on) }
      : rowFromStrings(kanji.onyomi, kanji.onyomiRomaji),
    kun: structured?.kun
      ? { tokens: withDefaultPriority(structured.kun) }
      : rowFromStrings(kanji.kunyomi, kanji.kunyomiRomaji),
  };
}

// ── Presentation ────────────────────────────────────────────────────────────
type Tone = "on" | "kun";

const TOKEN_STYLES: Record<Tone, Record<ReadingPriority, string>> = {
  on: {
    core: "border-natural-clay/60 bg-natural-clay/10 text-natural-charcoal",
    next: "border-natural-border bg-transparent text-natural-charcoal",
    recognition: "border-dashed border-natural-border bg-transparent text-natural-forest-light/75",
  },
  kun: {
    core: "border-natural-sage/60 bg-natural-sage/10 text-natural-charcoal",
    next: "border-natural-border bg-transparent text-natural-charcoal",
    recognition: "border-dashed border-natural-border bg-transparent text-natural-forest-light/75",
  },
};

const PRIORITY_LABELS: Record<ReadingPriority, string> = {
  core: "core",
  next: "useful next",
  recognition: "recognition only",
};

const PRIORITY_HINTS: Record<ReadingPriority, string> = {
  core: "Core reading: learn this first",
  next: "Useful next: learn after the core reading",
  recognition: "Recognition only: know it when you see it, no need to memorise",
};

function splitOkurigana(kana: string): { root: string; okurigana: string } {
  const index = kana.search(OKURIGANA_MARKERS);
  if (index < 0) return { root: kana, okurigana: "" };
  return {
    root: kana.slice(0, index),
    okurigana: kana.slice(index + 1).replace(new RegExp(OKURIGANA_MARKERS, "g"), ""),
  };
}

function ReadingToken({ token, tone }: { token: KanjiReadingToken; tone: Tone }) {
  const priority = token.priority ?? "next";
  const { root, okurigana } = splitOkurigana(token.kana);
  return (
    <span
      className={`inline-flex flex-col items-center rounded-xl border px-3 py-1.5 ${TOKEN_STYLES[tone][priority]}`}
      title={PRIORITY_HINTS[priority]}
    >
      <span className="font-serif text-[17px] font-bold leading-tight">
        {root}
        {okurigana && <span className="font-medium text-natural-forest-light">・{okurigana}</span>}
      </span>
      {token.romaji && (
        <span className="font-mono text-[10px] leading-tight text-natural-forest-light/75">{token.romaji}</span>
      )}
    </span>
  );
}

function ReadingRow({ label, tone, row }: { label: string; tone: Tone; row: ResolvedRow }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`kz-label ${tone === "on" ? "text-natural-clay" : "text-natural-sage"}`}>{label}</span>
      {row.tokens.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {row.tokens.map((token, index) => (
            <span key={`${token.kana}-${index}`}>
              <ReadingToken token={token} tone={tone} />
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs font-medium italic text-natural-forest-light/75">None listed</span>
      )}
    </div>
  );
}

interface ReadingSummaryProps {
  kanji: KanjiWithReadings;
  /** Recall mode: hide both rows until revealed. Layout is reserved either way. */
  masked?: boolean;
  onReveal?: () => void;
}

export default function ReadingSummary({ kanji, masked = false, onReveal }: ReadingSummaryProps) {
  const { on, kun } = resolveReadings(kanji);
  const present = new Set<ReadingPriority>(
    [...on.tokens, ...kun.tokens].map((token) => token.priority ?? "next"),
  );
  const legend = (["core", "next", "recognition"] as const).filter((level) => present.has(level));
  // A legend only helps once there is something other than "core" to tell apart.
  const showLegend = legend.some((level) => level !== "core");

  return (
    <RecallMask
      masked={masked}
      onReveal={onReveal ?? (() => {})}
      label="Reveal Readings"
      icon={<Layers className="h-3.5 w-3.5" />}
      tone="sage"
      className="min-h-[6.5rem]"
    >
      <div className="flex flex-col gap-3 text-left">
        <ReadingRow label="On readings" tone="on" row={on} />
        <ReadingRow label="Kun readings" tone="kun" row={kun} />
        {showLegend && (
          <p className="text-[10px] font-medium leading-snug text-natural-forest-light/75">
            {legend.map((level, index) => (
              <span key={level}>
                {index > 0 && " · "}
                <span
                  className={`mr-1 inline-block h-2 w-2 rounded-sm border align-middle ${
                    level === "core"
                      ? "border-natural-clay/60 bg-natural-clay/20"
                      : level === "next"
                        ? "border-natural-border"
                        : "border-dashed border-natural-border"
                  }`}
                />
                {PRIORITY_LABELS[level]}
              </span>
            ))}
          </p>
        )}
      </div>
    </RecallMask>
  );
}
