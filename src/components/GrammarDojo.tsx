// src/components/GrammarDojo.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Grammar Dojo — Full-Width Study Desk (Slim Header + Top Chapter/Pattern Bars)
// Layout:
//   1. Slim header row (Exit to Room, Romaji toggle, compact Study/Practice switch)
//   2. Horizontal Chapter tabs (01–05, non-wrapping scroll on mobile)
//   3. Horizontal Pattern strip for active chapter (non-wrapping scroll on mobile)
//   4. Pattern title, meaning & Mark Studied
//   5. Sentence Building Blocks (colored blueprint tiles)
//   6. Flowing Everyday Examples with accent grammar + optional per-row Break down
//   7. Common Mistake Comparison & Astra's Memory Note side by side (stacked mobile)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Volume2,
  Check,
  BookOpen,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import companionImg from "../assets/images/synthid-removed-Gemini_Generated_Image_csh1tcsh1tcsh1tc.png";
import {
  PREFERENCE_CHANGED_EVENT,
  notifyPreferenceChanged,
  readComponentPreferences,
} from "../preferences";
import {
  GRAMMAR_CHAPTERS,
  GRAMMAR_ROLE_META,
  readStudiedPatternIds,
  writeStudiedPatternIds,
  type GrammarChapterId,
  type GrammarExample,
  type GrammarPattern,
  type PracticeScopeId,
} from "../grammar/grammarTypes";
import {
  GRAMMAR_CHAPTER_BY_ID,
  GRAMMAR_PATTERNS,
  GRAMMAR_PATTERN_BY_ID,
  getAdjacentPatterns,
  getPatternsByChapter,
} from "../grammar/grammarCurriculum";
import GrammarDojoPractice from "./GrammarDojoPractice";

export interface GrammarDojoProps {
  onBack: () => void;
  onAwardXP: (amount: number) => void;
  speakJapanese: (phrase: string) => void;
}

const TARGET_GRAMMAR_MATCHERS: Record<string, RegExp> = {
  "wa-desu": /は|です/g,
  "janai-desu": /じゃないです|ではありません/g,
  "desu-ka": /ですか/g,
  "no-modifier": /(?<!あ|こ|そ|ど)の/g,
  "mo-also": /も/g,
  "kosoado": /これ|それ|あれ|この|その|あの/g,
  "wo-object": /を/g,
  "ni-e-destination-time": /に|へ/g,
  "de-location-means": /で/g,
  "to-and-with": /と/g,
  "ga-arimasu-imasu": /があります|がいます/g,
  "kara-made": /から|まで/g,
  "masu-polite": /ませんでした|ません|ました|ます/g,
  "nai-plain": /ないでください|ない/g,
  "ta-past": /たことがあります|った|(?<=寝|し|見)た/g,
  "te-iru": /(?:って|んで|て|で)います/g,
  "te-kudasai": /(?:って|んで|て|で)ください/g,
  "mashou-masenka": /ませんか|ましょう/g,
  "ga-suki-jouzu": /が|大好き|好き|嫌い|上手|下手|得意/g,
  "tai-desire": /たくないです|たかったです|たいです/g,
  "temo-ii": /(?:って|んで|て|で)もいいですか|(?:って|んで|て|で)もいいです/g,
  "tewa-ikemasen": /(?:って|んで|て|で)はいけません/g,
  "ni-iku-purpose": /に行きましょう|に行きました|に行きます|に来ます/g,
  "kara-node": /だから|なので|から|ので/g,
  "kedo-ga": /けど|が(?=、)/g,
  "to-omoimasu": /と思います/g,
  "deshou": /でしょう/g,
  "yori-houga": /より|の方が/g,
};

function renderHighlightedSentence(japanese: string, patternId: string): React.ReactNode {
  const matcher = TARGET_GRAMMAR_MATCHERS[patternId];
  if (!matcher) return japanese;

  const regex = new RegExp(matcher.source, matcher.flags);
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(japanese)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(japanese.slice(lastIndex, match.index));
    }
    nodes.push(
      <span
        key={`${patternId}-${match.index}`}
        className="text-natural-clay font-black"
      >
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) break;
  }

  if (lastIndex < japanese.length) {
    nodes.push(japanese.slice(lastIndex));
  }

  return nodes;
}

function ExampleRow({
  example,
  patternId,
  index,
  showRomaji,
  isExpanded,
  onToggleExpand,
  speakJapanese,
}: {
  example: GrammarExample;
  patternId: string;
  index: number;
  showRomaji: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  speakJapanese: (phrase: string) => void;
  key?: React.Key;
}) {
  return (
    <div className="p-4 rounded-2xl bg-natural-bg/55 border border-natural-border/60 hover:border-natural-border transition flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-[11px] text-natural-charcoal/45 select-none shrink-0">
              0{index + 1}
            </span>
            <p className="font-serif text-lg sm:text-xl font-bold text-natural-charcoal leading-relaxed tracking-wide select-text">
              {renderHighlightedSentence(example.japanese, patternId)}
            </p>
          </div>

          {showRomaji && (
            <p className="font-mono text-xs text-natural-charcoal/60 pl-6 tracking-wide select-text">
              {example.romaji}
            </p>
          )}

          <p className="font-sans text-sm text-natural-charcoal/85 font-medium pl-6">
            {example.english}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-xs font-sans font-semibold inline-flex items-center gap-1 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
              isExpanded
                ? "bg-natural-forest/15 border-natural-forest text-natural-forest"
                : "bg-natural-card/80 border-natural-border/70 text-natural-charcoal/70 hover:border-natural-forest/50 hover:text-natural-charcoal"
            }`}
          >
            <span>Break down</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => speakJapanese(example.japanese)}
            className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-natural-card border border-natural-border/70 hover:border-natural-forest text-natural-forest/75 hover:text-natural-forest transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest"
            title={`Listen: ${example.japanese}`}
            aria-label={`Listen to ${example.japanese}`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pl-6 pt-2.5 border-t border-natural-border/45 flex flex-wrap items-stretch gap-2">
          {example.segments.map((seg, segIdx) => {
            const roleMeta = GRAMMAR_ROLE_META[seg.role];
            return (
              <div
                key={`${seg.text}-${segIdx}`}
                className={`px-2.5 py-1.5 rounded-xl border flex flex-col ${roleMeta.chipClass}`}
              >
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider opacity-75">
                  {roleMeta.shortLabel}
                </span>
                <span className="font-serif text-sm font-bold leading-snug mt-0.5 select-text">
                  {seg.text}
                </span>
                <span className="font-mono text-[10px] opacity-75 mt-0.5 select-text">
                  {seg.romaji}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GrammarDojo({
  onBack,
  onAwardXP,
  speakJapanese,
}: GrammarDojoProps) {
  const prefersReducedMotion = useReducedMotion();
  const stageTopRef = useRef<HTMLDivElement | null>(null);

  // ── Mode & Curriculum Navigation State ──────────────────────────────────────
  const [mode, setMode] = useState<"study" | "practice">("study");
  const [activePatternId, setActivePatternId] = useState<string>(
    GRAMMAR_PATTERNS[0].id
  );
  const [expandedExamples, setExpandedExamples] = useState<Set<number>>(
    () => new Set()
  );

  // ── Practice Launch Target State ────────────────────────────────────────────
  const [practiceScope, setPracticeScope] = useState<PracticeScopeId>("all");
  const [practicePatternId, setPracticePatternId] = useState<string | null>(
    null
  );

  // ── Local Studied Progress State ────────────────────────────────────────────
  const [studiedIds, setStudiedIds] = useState<Set<string>>(() =>
    readStudiedPatternIds()
  );

  // ── Synced Show Romaji Preference (ACC-1) ───────────────────────────────────
  const [showRomaji, setShowRomaji] = useState<boolean>(
    () => readComponentPreferences().showRomaji
  );

  useEffect(() => {
    const syncFromStore = () => {
      setShowRomaji(readComponentPreferences().showRomaji);
    };
    window.addEventListener(PREFERENCE_CHANGED_EVENT, syncFromStore);
    return () => {
      window.removeEventListener(PREFERENCE_CHANGED_EVENT, syncFromStore);
    };
  }, []);

  const handleToggleRomaji = () => {
    setShowRomaji((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("astra_show_romaji", String(next));
      } catch {
        // Ignore storage errors; state still updates in memory.
      }
      notifyPreferenceChanged();
      return next;
    });
  };

  // ── Studied Progress Handlers ───────────────────────────────────────────────
  const handleToggleStudied = (patternId: string) => {
    setStudiedIds((prev) => {
      const next = new Set<string>(prev);
      if (next.has(patternId)) next.delete(patternId);
      else next.add(patternId);
      writeStudiedPatternIds(next);
      return next;
    });
  };

  const handleMarkStudied = (patternId: string) => {
    setStudiedIds((prev) => {
      if (prev.has(patternId)) return prev;
      const next = new Set<string>(prev);
      next.add(patternId);
      writeStudiedPatternIds(next);
      return next;
    });
  };

  // ── Pattern & Chapter Selection Handlers ────────────────────────────────────
  const selectPattern = (pattern: GrammarPattern) => {
    setActivePatternId(pattern.id);
    setExpandedExamples(new Set());
    setMode("study");
  };

  const selectChapter = (chapterId: GrammarChapterId) => {
    if (activePattern.chapterId === chapterId) return;
    const chapterPatterns = getPatternsByChapter(chapterId);
    if (chapterPatterns[0]) {
      setActivePatternId(chapterPatterns[0].id);
      setExpandedExamples(new Set());
      setMode("study");
    }
  };

  const toggleExampleBreakdown = (index: number) => {
    setExpandedExamples((prev) => {
      const next = new Set<number>(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const launchPractice = (
    scope: PracticeScopeId,
    singlePatternId: string | null = null
  ) => {
    setPracticeScope(scope);
    setPracticePatternId(singlePatternId);
    setMode("practice");
  };

  // ── Derived Curriculum Views ────────────────────────────────────────────────
  const activePattern =
    GRAMMAR_PATTERN_BY_ID[activePatternId] ?? GRAMMAR_PATTERNS[0];
  const activeChapter = GRAMMAR_CHAPTER_BY_ID[activePattern.chapterId];
  const activeChapterPatterns = useMemo(
    () => getPatternsByChapter(activePattern.chapterId),
    [activePattern.chapterId]
  );
  const { prev: prevPattern, next: nextPattern } = useMemo(
    () => getAdjacentPatterns(activePattern.id),
    [activePattern.id]
  );
  const isActiveStudied = studiedIds.has(activePattern.id);

  return (
    <div
      ref={stageTopRef}
      className="bg-natural-card/40 border border-natural-border/45 rounded-3xl p-4 sm:p-6 lg:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl w-full flex flex-col gap-5 transition-colors duration-300"
    >
      {/* ─── 1. SLIM HEADER ROW ────────────────────────────────────────────── */}
      <div className="border-b border-natural-border/60 pb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[38px] px-3 py-1.5 bg-natural-card border border-natural-border hover:border-natural-forest text-natural-forest text-xs font-sans font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Exit to Room</span>
          </button>

          <button
            type="button"
            onClick={handleToggleRomaji}
            className={`min-h-[38px] rounded-xl border px-3 py-1.5 text-xs font-mono font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
              showRomaji
                ? "bg-natural-forest/15 border-natural-forest text-natural-forest"
                : "bg-natural-card border-natural-border text-natural-charcoal/60 hover:border-natural-forest/50"
            }`}
            title={showRomaji ? "Hide romaji readings" : "Show romaji readings"}
          >
            {showRomaji ? "A Hide Romaji" : "ふ Show Romaji"}
          </button>
        </div>

        {/* Compact Study Desk / Practice Arena Segmented Switch */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-natural-bg/70 border border-natural-border/65">
          <button
            type="button"
            onClick={() => setMode("study")}
            className={`min-h-[34px] px-3.5 py-1.5 rounded-lg text-xs font-sans font-bold transition cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
              mode === "study"
                ? "bg-natural-forest text-natural-bg shadow-xs"
                : "text-natural-charcoal/70 hover:text-natural-charcoal"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Study Desk</span>
          </button>

          <button
            type="button"
            onClick={() => launchPractice(activePattern.chapterId, null)}
            className={`min-h-[34px] px-3.5 py-1.5 rounded-lg text-xs font-sans font-bold transition cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-clay ${
              mode === "practice"
                ? "bg-natural-clay text-natural-bg shadow-xs"
                : "text-natural-charcoal/70 hover:text-natural-charcoal"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Practice Arena</span>
          </button>
        </div>
      </div>

      {/* ─── MAIN WORKSPACE BODY ───────────────────────────────────────────── */}
      {mode === "study" ? (
        <div className="flex flex-col gap-4 w-full">
          {/* ─── 2. CHAPTER TABS (01–05, SINGLE HORIZONTAL ROW) ────────────── */}
          <nav
            aria-label="N5 Grammar Chapters"
            className="flex items-center gap-2 overflow-x-auto flex-nowrap pb-1"
          >
            {GRAMMAR_CHAPTERS.map((chapter) => {
              const isCurrent = chapter.id === activeChapter.id;
              const chapterList = getPatternsByChapter(chapter.id);
              const doneCount = chapterList.filter((p) =>
                studiedIds.has(p.id)
              ).length;

              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => selectChapter(chapter.id)}
                  className={`min-h-[40px] shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl border text-xs font-sans font-semibold transition cursor-pointer inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                    isCurrent
                      ? "bg-natural-forest text-natural-bg border-natural-forest shadow-xs"
                      : "bg-natural-card/75 border-natural-border/70 text-natural-charcoal/75 hover:border-natural-forest/45 hover:text-natural-charcoal"
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      isCurrent
                        ? "text-natural-bg/85"
                        : "text-natural-charcoal/50"
                    }`}
                  >
                    {chapter.number}
                  </span>
                  <span>{chapter.title}</span>
                  <span
                    className={`font-mono text-[10px] ${
                      isCurrent
                        ? "text-natural-bg/75"
                        : "text-natural-charcoal/45"
                    }`}
                  >
                    {doneCount}/{chapterList.length}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* ─── 3. PATTERN STRIP FOR CURRENT CHAPTER ──────────────────────── */}
          <div
            role="tablist"
            aria-label={`Patterns in Chapter ${activeChapter.number}`}
            className="flex items-center gap-1.5 overflow-x-auto flex-nowrap pb-1"
          >
            {activeChapterPatterns.map((pat) => {
              const isSelected = pat.id === activePattern.id;
              const isDone = studiedIds.has(pat.id);

              return (
                <button
                  key={pat.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => selectPattern(pat)}
                  className={`min-h-[38px] shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl border text-sm font-serif font-bold transition cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                    isSelected
                      ? "bg-natural-clay/18 border-natural-clay text-natural-clay"
                      : "bg-natural-bg/60 border-natural-border/65 text-natural-charcoal/80 hover:border-natural-clay/45 hover:text-natural-charcoal"
                  }`}
                >
                  <span>{pat.pattern}</span>
                  {isDone && (
                    <Check
                      className={`w-3.5 h-3.5 stroke-[2.75] ${
                        isSelected ? "text-natural-clay" : "text-natural-forest"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ─── FULL-WIDTH LESSON CARD ────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.article
              key={activePattern.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="bg-natural-card-light border border-natural-border/80 rounded-3xl p-5 sm:p-7 lg:p-8 flex flex-col gap-7 shadow-sm w-full"
            >
              {/* 4. Pattern Title & Meaning, with Mark Studied */}
              <header className="flex flex-col gap-3 border-b border-natural-border/60 pb-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-sans text-natural-charcoal/55 mb-1.5">
                      Chapter {activeChapter.number} · {activeChapter.title} ·
                      Pattern {activePattern.orderInChapter} of{" "}
                      {activeChapterPatterns.length}
                    </p>
                    <h2 className="font-serif text-3xl sm:text-4xl font-black text-natural-forest tracking-wide leading-tight select-text">
                      {activePattern.pattern}
                    </h2>
                    {showRomaji && (
                      <p className="font-mono text-xs sm:text-sm text-natural-charcoal/60 mt-1 select-text">
                        {activePattern.romaji}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleStudied(activePattern.id)}
                    aria-pressed={isActiveStudied}
                    className={`min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-sans font-bold transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                      isActiveStudied
                        ? "bg-natural-forest text-natural-bg border-natural-forest"
                        : "bg-natural-bg/70 border-natural-border text-natural-charcoal/75 hover:border-natural-forest/50 hover:text-natural-forest"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isActiveStudied ? "Studied" : "Mark Studied"}</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="font-sans text-lg font-bold text-natural-charcoal">
                    {activePattern.meaning}
                  </p>
                  <p className="font-sans text-sm text-natural-charcoal/75 leading-relaxed">
                    {activePattern.summary}
                  </p>
                </div>
              </header>

              {/* 5. Sentence Building Blocks (Only Place with Colored Tiles) */}
              <section className="flex flex-col gap-3">
                <div>
                  <h3 className="font-sans text-sm font-bold text-natural-charcoal">
                    Sentence Building Blocks
                  </h3>
                  <p className="font-mono text-xs text-natural-charcoal/60 mt-0.5">
                    {activePattern.structure}
                  </p>
                </div>

                <div className="rounded-2xl bg-natural-bg/75 border border-natural-border/70 p-4 flex flex-wrap items-center gap-2">
                  {activePattern.blueprint.map((blk, idx) => {
                    const roleMeta = GRAMMAR_ROLE_META[blk.role];
                    return (
                      <React.Fragment key={`${blk.label}-${idx}`}>
                        {idx > 0 && (
                          <span
                            aria-hidden="true"
                            className="font-mono text-xs font-bold text-natural-charcoal/40"
                          >
                            +
                          </span>
                        )}
                        <div
                          className={`px-3 py-2 rounded-xl border flex flex-col ${roleMeta.chipClass}`}
                        >
                          <span className="text-[10px] font-sans font-bold uppercase tracking-wider opacity-80">
                            {blk.label}
                          </span>
                          <span className="font-serif text-base font-bold leading-snug mt-0.5">
                            {blk.sample}
                          </span>
                          {showRomaji && blk.romaji && (
                            <span className="font-mono text-[10px] opacity-75">
                              {blk.romaji}
                            </span>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </section>

              {/* 6. Everyday Examples */}
              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-sans text-sm font-bold text-natural-charcoal">
                    Everyday Examples
                  </h3>
                  <span className="text-xs font-sans text-natural-charcoal/55">
                    Tap speaker to listen · Break down for word roles
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {activePattern.examples.map((ex, idx) => (
                    <ExampleRow
                      key={`${activePattern.id}-ex-${idx}`}
                      example={ex}
                      patternId={activePattern.id}
                      index={idx}
                      showRomaji={showRomaji}
                      isExpanded={expandedExamples.has(idx)}
                      onToggleExpand={() => toggleExampleBreakdown(idx)}
                      speakJapanese={speakJapanese}
                    />
                  ))}
                </div>
              </section>

              {/* 7. Common Mistake Comparison & Astra's Memory Note Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Common Mistake Comparison */}
                <section className="lg:col-span-8 rounded-2xl bg-natural-bg/65 border border-natural-border/75 p-4 sm:p-5 flex flex-col gap-3.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-natural-clay shrink-0" />
                    <h3 className="font-sans text-sm font-bold text-natural-charcoal">
                      Common Mistake Comparison · {activePattern.contrast.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        activePattern.contrast.left,
                        activePattern.contrast.right,
                      ] as const
                    ).map((side, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-natural-card-light border border-natural-border/70 p-3.5 flex items-start justify-between gap-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-sans font-bold text-natural-clay">
                            {side.label}
                          </p>
                          <p className="font-serif text-base font-bold text-natural-charcoal mt-1 select-text">
                            {side.japanese}
                          </p>
                          {showRomaji && (
                            <p className="font-mono text-[11px] text-natural-charcoal/60 mt-0.5 select-text">
                              {side.romaji}
                            </p>
                          )}
                          <p className="font-sans text-xs text-natural-charcoal/75 mt-1">
                            {side.english}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            speakJapanese(
                              side.japanese.split("→").pop()?.trim() ??
                                side.japanese
                            )
                          }
                          className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg bg-natural-bg border border-natural-border/60 hover:border-natural-forest text-natural-forest/75 hover:text-natural-forest transition cursor-pointer shrink-0 flex items-center justify-center"
                          title={`Listen: ${side.japanese}`}
                          aria-label={`Listen to ${side.japanese}`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="font-sans text-xs text-natural-charcoal/80 leading-relaxed pt-1 border-t border-natural-border/50 mt-auto">
                    <strong className="text-natural-forest font-bold">
                      Key Takeaway:{" "}
                    </strong>
                    {activePattern.contrast.takeaway}
                  </p>
                </section>

                {/* Astra's Memory Note */}
                <section className="lg:col-span-4 rounded-2xl bg-natural-card/65 border border-natural-border/65 p-4 sm:p-5 flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full border border-natural-forest/25 bg-natural-bg overflow-hidden shrink-0">
                      <img
                        src={companionImg}
                        alt="Astra-chan"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover scale-105"
                      />
                    </div>
                    <div className="text-xs font-sans text-natural-charcoal/90 leading-relaxed">
                      <span className="font-bold text-natural-forest block mb-1">
                        Astra’s Memory Note
                      </span>
                      <p>{activePattern.tip}</p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Lesson Footer: Practice Launchers & Prev/Next Pattern */}
              <footer className="border-t border-natural-border/60 pt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      launchPractice(activePattern.chapterId, activePattern.id)
                    }
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-natural-clay text-natural-bg text-xs font-sans font-bold cursor-pointer hover:opacity-95 transition inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-clay"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Practice This Pattern</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      launchPractice(activePattern.chapterId, null)
                    }
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-natural-bg border border-natural-border hover:border-natural-forest text-natural-charcoal hover:text-natural-forest text-xs font-sans font-bold cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest"
                  >
                    Practice Chapter {activeChapter.number}
                  </button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    disabled={!prevPattern}
                    onClick={() => {
                      if (!prevPattern) return;
                      selectPattern(prevPattern);
                      stageTopRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                    }}
                    className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-sans font-semibold inline-flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                      prevPattern
                        ? "bg-natural-bg border-natural-border text-natural-charcoal hover:border-natural-forest cursor-pointer"
                        : "bg-natural-bg/30 border-natural-border/35 text-natural-charcoal/30 cursor-not-allowed"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    disabled={!nextPattern}
                    onClick={() => {
                      if (!nextPattern) return;
                      selectPattern(nextPattern);
                      stageTopRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                    }}
                    className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-sans font-semibold inline-flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                      nextPattern
                        ? "bg-natural-forest border-natural-forest text-natural-bg hover:opacity-95 cursor-pointer"
                        : "bg-natural-bg/30 border-natural-border/35 text-natural-charcoal/30 cursor-not-allowed"
                    }`}
                  >
                    <span>Next Pattern</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </footer>
            </motion.article>
          </AnimatePresence>
        </div>
      ) : (
        /* ─── DEDICATED PRACTICE ARENA MODULE ─────────────────────────────── */
        <GrammarDojoPractice
          initialScope={practiceScope}
          initialPatternId={practicePatternId}
          studiedIds={studiedIds}
          showRomaji={showRomaji}
          speakJapanese={speakJapanese}
          onAwardXP={onAwardXP}
          onMarkPatternStudied={handleMarkStudied}
          onInspectPattern={(patternId) => {
            const target = GRAMMAR_PATTERN_BY_ID[patternId];
            if (target) selectPattern(target);
          }}
          onExitToStudy={() => setMode("study")}
        />
      )}
    </div>
  );
}
