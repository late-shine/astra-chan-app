// src/components/GrammarDojoPractice.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Dedicated Grammar Dojo Practice Arena (Phase 5)
// Supports chapter/studied scope filtering, Fill-in-the-Blank Cloze, and
// Tap-to-Arrange Sentence Word-Order Tiles with independent Show Romaji & Hint.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Volume2,
  Lightbulb,
  RotateCcw,
  Check,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import companionImg from "../assets/images/synthid-removed-Gemini_Generated_Image_csh1tcsh1tcsh1tc.png";
import {
  GRAMMAR_CHAPTERS,
  type PracticeFormatId,
  type PracticeScopeId,
} from "../grammar/grammarTypes";
import {
  buildPracticeSession,
  isTileSubmissionCorrect,
  resolvePracticeScopePatterns,
  type PracticeClozeQuestion,
  type PracticeQuestion,
  type PracticeTileQuestion,
  type ShuffledTileInstance,
} from "../grammar/grammarCurriculum";

export interface GrammarDojoPracticeProps {
  initialScope: PracticeScopeId;
  initialPatternId?: string | null;
  studiedIds: ReadonlySet<string>;
  showRomaji: boolean;
  speakJapanese: (phrase: string) => void;
  onAwardXP: (amount: number) => void;
  onMarkPatternStudied: (patternId: string) => void;
  onInspectPattern: (patternId: string) => void;
  onExitToStudy: () => void;
}

function ClozeSentenceDisplay({
  question,
  answeredChoice,
  showRomaji,
}: {
  question: PracticeClozeQuestion;
  answeredChoice: string | null;
  showRomaji: boolean;
}) {
  const parts = question.sentence.split("＿＿＿");
  const romajiParts = question.sentenceRomaji.split("___");
  const isCorrect = answeredChoice !== null && answeredChoice === question.blank;
  const answeredRomaji =
    answeredChoice !== null
      ? question.choiceRomaji[answeredChoice] ?? answeredChoice
      : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-serif text-2xl sm:text-3xl leading-relaxed tracking-wide text-natural-charcoal select-text">
        {parts[0]}
        <span
          className={`inline-flex items-center justify-center min-w-[4.25rem] px-3.5 py-0.5 mx-1.5 rounded-xl border-2 text-center font-bold align-middle transition-colors duration-200 ${
            answeredChoice === null
              ? "border-dashed border-natural-charcoal/35 bg-natural-bg/60 text-transparent min-h-[2.5rem]"
              : isCorrect
              ? "border-natural-forest bg-natural-forest/15 text-natural-forest"
              : "border-natural-terracotta bg-natural-terracotta/15 text-natural-terracotta"
          }`}
        >
          {answeredChoice ?? "　　"}
        </span>
        {parts[1]}
      </p>

      {showRomaji && (
        <p className="font-mono text-xs sm:text-sm text-natural-charcoal/65 tracking-wide select-text">
          {romajiParts[0]}
          {answeredRomaji === null ? (
            <span className="inline-block min-w-[2.5rem] mx-1 border-b border-dashed border-natural-charcoal/40 text-center text-natural-charcoal/45">
              ___
            </span>
          ) : (
            <span
              className={`font-bold px-1 rounded ${
                isCorrect ? "text-natural-forest" : "text-natural-terracotta"
              }`}
            >
              {answeredRomaji}
            </span>
          )}
          {romajiParts[1]}
        </p>
      )}
    </div>
  );
}

export default function GrammarDojoPractice({
  initialScope,
  initialPatternId = null,
  studiedIds,
  showRomaji,
  speakJapanese,
  onAwardXP,
  onMarkPatternStudied,
  onInspectPattern,
  onExitToStudy,
}: GrammarDojoPracticeProps) {
  const prefersReducedMotion = useReducedMotion();

  const [scope, setScope] = useState<PracticeScopeId>(initialScope);
  const [focusedPatternId, setFocusedPatternId] = useState<string | null>(initialPatternId);
  const [format, setFormat] = useState<PracticeFormatId>("mixed");

  const [questions, setQuestions] = useState<PracticeQuestion[]>(() =>
    buildPracticeSession({
      scope: initialScope,
      format: "mixed",
      studiedIds,
      singlePatternId: initialPatternId,
    })
  );
  const [qIdx, setQIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Cloze state
  const [clozeAnswered, setClozeAnswered] = useState<string | null>(null);

  // Tile builder state
  const [placedTiles, setPlacedTiles] = useState<ShuffledTileInstance[]>([]);
  const [tileSubmitted, setTileSubmitted] = useState(false);

  // Session score state
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [quizDone, setQuizDone] = useState(false);

  // Keep initial props synchronized if parent launches a specific chapter/pattern
  useEffect(() => {
    setScope(initialScope);
    setFocusedPatternId(initialPatternId);
    const nextQuestions = buildPracticeSession({
      scope: initialScope,
      format,
      studiedIds,
      singlePatternId: initialPatternId,
    });
    setQuestions(nextQuestions);
    setQIdx(0);
    setShowHint(false);
    setClozeAnswered(null);
    setPlacedTiles([]);
    setTileSubmitted(false);
    setScore(0);
    scoreRef.current = 0;
    setQuizDone(false);
    // Intentionally re-seed only when parent changes target scope or focused pattern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScope, initialPatternId]);

  const startNewSession = (
    nextScope: PracticeScopeId,
    nextFormat: PracticeFormatId,
    nextPatternId: string | null = null
  ) => {
    setScope(nextScope);
    setFormat(nextFormat);
    setFocusedPatternId(nextPatternId);

    const nextQuestions = buildPracticeSession({
      scope: nextScope,
      format: nextFormat,
      studiedIds,
      singlePatternId: nextPatternId,
    });
    setQuestions(nextQuestions);
    setQIdx(0);
    setShowHint(false);
    setClozeAnswered(null);
    setPlacedTiles([]);
    setTileSubmitted(false);
    setScore(0);
    scoreRef.current = 0;
    setQuizDone(false);
  };

  const currentQ = questions[qIdx] ?? null;
  const isLastQ = qIdx + 1 >= questions.length;

  const isAnswered =
    currentQ?.kind === "cloze"
      ? clozeAnswered !== null
      : currentQ?.kind === "tiles"
      ? tileSubmitted
      : false;

  const isCurrentCorrect =
    currentQ?.kind === "cloze"
      ? clozeAnswered !== null && clozeAnswered === currentQ.blank
      : currentQ?.kind === "tiles"
      ? tileSubmitted && isTileSubmissionCorrect(currentQ, placedTiles)
      : false;

  const handleSelectCloze = (choice: string) => {
    if (!currentQ || currentQ.kind !== "cloze" || clozeAnswered !== null) return;
    setClozeAnswered(choice);
    if (choice === currentQ.blank) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      onMarkPatternStudied(currentQ.patternId);
    }
  };

  const handlePlaceTile = (tile: ShuffledTileInstance) => {
    if (!currentQ || currentQ.kind !== "tiles" || tileSubmitted) return;
    if (placedTiles.some((t) => t.instanceId === tile.instanceId)) return;
    setPlacedTiles((prev) => [...prev, tile]);
  };

  const handleRemovePlacedTile = (instanceId: string) => {
    if (tileSubmitted) return;
    setPlacedTiles((prev) => prev.filter((t) => t.instanceId !== instanceId));
  };

  const handleResetTiles = () => {
    if (tileSubmitted) return;
    setPlacedTiles([]);
  };

  const handleSubmitTiles = () => {
    if (!currentQ || currentQ.kind !== "tiles" || tileSubmitted) return;
    if (placedTiles.length !== currentQ.bankTiles.length) return;
    setTileSubmitted(true);
    if (isTileSubmissionCorrect(currentQ, placedTiles)) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      onMarkPatternStudied(currentQ.patternId);
    }
  };

  const handleAdvance = () => {
    if (qIdx + 1 >= questions.length) {
      const earnedXP =
        scoreRef.current * 8 + (questions.length - scoreRef.current) * 2;
      onAwardXP(earnedXP);
      setQuizDone(true);
      return;
    }
    setQIdx((prev) => prev + 1);
    setShowHint(false);
    setClozeAnswered(null);
    setPlacedTiles([]);
    setTileSubmitted(false);
  };

  const solvedSentence =
    currentQ?.kind === "cloze"
      ? currentQ.sentence.replace("＿＿＿", currentQ.blank)
      : currentQ?.kind === "tiles"
      ? currentQ.japanese
      : "";

  const solvedRomaji =
    currentQ?.kind === "cloze"
      ? currentQ.sentenceRomaji.replace(
          "___",
          currentQ.choiceRomaji[currentQ.blank] ?? currentQ.blank
        )
      : currentQ?.kind === "tiles"
      ? currentQ.romaji
      : "";

  const scopeInfo = resolvePracticeScopePatterns(scope, studiedIds);

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ─── SCOPE & EXERCISE FORMAT CONTROL BAR ───────────────────────────── */}
      <div className="bg-natural-card/65 border border-natural-border/70 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Scope Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-sans font-semibold text-natural-charcoal/65">
              Practice Scope
              {focusedPatternId ? " · Focused Pattern" : ""}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all" as PracticeScopeId, label: "All N5" },
                  {
                    id: "studied" as PracticeScopeId,
                    label: `Studied (${studiedIds.size})`,
                  },
                  ...GRAMMAR_CHAPTERS.map((ch) => ({
                    id: ch.id as PracticeScopeId,
                    label: `Ch ${ch.number}`,
                  })),
                ] as const
              ).map((opt) => {
                const isActive = !focusedPatternId && scope === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => startNewSession(opt.id, format, null)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-sans font-semibold border transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                      isActive
                        ? "bg-natural-forest border-natural-forest text-natural-bg"
                        : "bg-natural-bg/65 border-natural-border/70 text-natural-charcoal/75 hover:border-natural-forest/50 hover:text-natural-forest"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exercise Format Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-sans font-semibold text-natural-charcoal/65">
              Exercise Format
            </span>
            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-natural-bg/70 border border-natural-border/60">
              {(
                [
                  { id: "mixed", label: "Mixed" },
                  { id: "cloze", label: "Fill-in-Blank" },
                  { id: "tiles", label: "Sentence Tiles" },
                ] as const
              ).map((fmt) => {
                const active = format === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => startNewSession(scope, fmt.id, focusedPatternId)}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-sans font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                      active
                        ? "bg-natural-clay text-natural-bg"
                        : "text-natural-charcoal/70 hover:text-natural-charcoal"
                    }`}
                  >
                    {fmt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── EMPTY STUDIED SET RECOVERY ────────────────────────────────────── */}
      {questions.length === 0 ? (
        <div className="bg-natural-card border border-natural-border rounded-3xl p-8 text-center flex flex-col items-center gap-4">
          <BookOpen className="w-10 h-10 text-natural-forest/60" />
          <div className="max-w-md">
            <h3 className="font-serif font-bold text-lg text-natural-charcoal">
              No Studied Patterns Marked Yet
            </h3>
            <p className="text-sm font-sans text-natural-charcoal/70 mt-1.5 leading-relaxed">
              Mark grammar patterns as studied on the Study Desk—or answer questions in any chapter—to build your personal review pool.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => startNewSession("ch1-identity", format, null)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-natural-forest text-natural-bg text-sm font-sans font-semibold cursor-pointer hover:opacity-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest"
            >
              Start Chapter 01 Practice
            </button>
            <button
              type="button"
              onClick={onExitToStudy}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-natural-bg border border-natural-border text-natural-charcoal text-sm font-sans font-semibold cursor-pointer hover:border-natural-forest/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest"
            >
              Open Study Desk
            </button>
          </div>
        </div>
      ) : quizDone ? (
        /* ─── COMPLETION CERTIFICATE ────────────────────────────────────────── */
        <div className="flex flex-col items-center gap-5 py-2">
          <motion.div
            initial={prefersReducedMotion ? false : { scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-xl rounded-3xl border-2 border-natural-clay/60 bg-natural-card p-6 sm:p-8 text-center shadow-md"
          >
            <p className="text-xs font-mono text-natural-charcoal/60 uppercase tracking-widest">
              修了証 · Grammar Dojo Practice Complete
            </p>

            <h3 className="font-serif font-black text-2xl sm:text-3xl text-natural-forest mt-2">
              {score >= Math.ceil(questions.length * 0.8)
                ? "素晴らしい！ Splendid Mastery"
                : score >= Math.ceil(questions.length * 0.5)
                ? "合格！ Steady Progress"
                : "継続は力なり！ Keep Going"}
            </h3>

            <p className="text-xs font-sans text-natural-charcoal/65 mt-1">
              {scopeInfo.scopeLabel}
            </p>

            <div className="my-6 inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-natural-clay/50 bg-natural-card-light">
              <span className="font-mono font-bold text-3xl text-natural-clay leading-none">
                {score}/{questions.length}
              </span>
              <span className="text-[11px] font-sans text-natural-charcoal/60 mt-1">
                Correct
              </span>
            </div>

            <div className="w-full bg-natural-bg/60 border border-natural-border/70 rounded-2xl p-4 flex flex-col gap-2 text-left">
              <div className="flex justify-between text-xs font-sans">
                <span className="text-natural-charcoal/70">
                  Correct Answers ({score} × 8 XP)
                </span>
                <span className="font-mono font-bold text-natural-forest">
                  +{score * 8} XP
                </span>
              </div>
              <div className="flex justify-between text-xs font-sans">
                <span className="text-natural-charcoal/70">
                  Practice Effort ({questions.length - score} × 2 XP)
                </span>
                <span className="font-mono font-bold text-natural-charcoal/60">
                  +{(questions.length - score) * 2} XP
                </span>
              </div>
              <div className="border-t border-natural-border/60 pt-2 flex justify-between text-sm font-sans font-bold">
                <span>Total Dojo XP Earned</span>
                <span className="font-mono text-natural-forest">
                  +{score * 8 + (questions.length - score) * 2} XP
                </span>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
            <button
              type="button"
              onClick={() => startNewSession(scope, format, focusedPatternId)}
              className="min-h-[46px] py-3 px-5 rounded-2xl bg-natural-clay text-natural-bg font-sans font-bold text-sm cursor-pointer hover:opacity-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-clay"
            >
              Practice Again
            </button>
            <button
              type="button"
              onClick={onExitToStudy}
              className="min-h-[46px] py-3 px-5 rounded-2xl bg-natural-card border border-natural-border text-natural-charcoal hover:border-natural-forest/50 hover:text-natural-forest font-sans font-bold text-sm cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest"
            >
              Return to Study Desk
            </button>
          </div>
        </div>
      ) : (
        /* ─── ACTIVE QUESTION STAGE ─────────────────────────────────────────── */
        currentQ && (
          <div className="flex flex-col gap-4">
            {/* Progress Bar & Clean Unboxed Metadata */}
            <div className="flex flex-col gap-2">
              <div className="w-full bg-natural-border/45 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-natural-forest rounded-full"
                  initial={false}
                  animate={{
                    width: `${((qIdx + (isAnswered ? 1 : 0)) / questions.length) * 100}%`,
                  }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-natural-charcoal/65 font-sans">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span>Chapter {currentQ.chapterNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-serif font-bold text-natural-forest">
                    {currentQ.patternLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {currentQ.kind === "cloze"
                      ? "Fill in the Blank"
                      : "Sentence Word Order"}
                  </span>
                </div>

                <div className="font-mono">
                  <span>
                    Question {qIdx + 1} of {questions.length}
                  </span>
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    Score{" "}
                    <strong className="text-natural-forest">{score}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ.id + "-" + qIdx}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                className="bg-natural-card border border-natural-border/80 rounded-3xl p-5 sm:p-7 flex flex-col gap-5 shadow-sm"
              >
                {/* Prompt & English Meaning */}
                <div className="flex flex-col gap-1 border-b border-natural-border/50 pb-4">
                  <span className="text-xs font-sans font-semibold text-natural-charcoal/60">
                    {currentQ.kind === "cloze"
                      ? "Choose the particle or form that completes this sentence:"
                      : "Tap the blocks in order to build this Japanese sentence:"}
                  </span>
                  <p className="font-sans text-base sm:text-lg font-bold text-natural-charcoal">
                    “{currentQ.english}”
                  </p>
                </div>

                {/* ── FORMAT A: CLOZE QUESTION ─────────────────────────────── */}
                {currentQ.kind === "cloze" && (
                  <>
                    <div className="py-1">
                      <ClozeSentenceDisplay
                        question={currentQ}
                        answeredChoice={clozeAnswered}
                        showRomaji={showRomaji}
                      />
                    </div>

                    {/* Independent Per-Question Hint Toggle */}
                    <div className="flex flex-col gap-2">
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowHint((v) => !v)}
                          aria-expanded={showHint}
                          className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-sans font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                            showHint
                              ? "bg-natural-clay/15 border-natural-clay/50 text-natural-clay"
                              : "bg-natural-bg/65 border-natural-border/70 text-natural-charcoal/70 hover:border-natural-clay/45 hover:text-natural-clay"
                          }`}
                        >
                          <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                          <span>{showHint ? "Hide Hint" : "Show Hint"}</span>
                        </button>
                      </div>

                      {showHint && (
                        <div className="flex gap-2 text-xs text-natural-charcoal/80 bg-natural-bg/60 border border-natural-border/50 p-3 rounded-xl">
                          <Lightbulb className="w-3.5 h-3.5 text-natural-clay shrink-0 mt-0.5" />
                          <span>{currentQ.hint}</span>
                        </div>
                      )}
                    </div>

                    {/* 4 Choice Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      {currentQ.choices.map((choice) => {
                        const isChosen = clozeAnswered === choice;
                        const isRight = choice === currentQ.blank;
                        const choiceRomaji = currentQ.choiceRomaji[choice];

                        let btnCls =
                          "min-h-[54px] py-3 px-4 rounded-2xl border-2 font-serif text-base font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ";

                        if (clozeAnswered === null) {
                          btnCls +=
                            "bg-natural-card-light border-natural-border text-natural-charcoal hover:border-natural-forest hover:bg-natural-forest/5";
                        } else if (isRight) {
                          btnCls +=
                            "bg-natural-forest border-natural-forest text-natural-bg shadow-sm";
                        } else if (isChosen) {
                          btnCls +=
                            "bg-natural-terracotta border-natural-terracotta text-natural-bg";
                        } else {
                          btnCls +=
                            "bg-natural-bg/40 border-natural-border/35 text-natural-charcoal/30 cursor-default";
                        }

                        return (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => handleSelectCloze(choice)}
                            disabled={clozeAnswered !== null}
                            className={btnCls}
                          >
                            <span className="block leading-tight">{choice}</span>
                            {showRomaji && choiceRomaji && (
                              <span
                                className={`block font-mono text-[11px] font-medium mt-0.5 tracking-wide ${
                                  clozeAnswered === null
                                    ? "text-natural-charcoal/60"
                                    : isRight || isChosen
                                    ? "text-natural-bg/85"
                                    : "text-natural-charcoal/25"
                                }`}
                              >
                                {choiceRomaji}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ── FORMAT B: SENTENCE WORD-ORDER TILE BUILDER ───────────── */}
                {currentQ.kind === "tiles" && (
                  <>
                    {/* Answer Assembly Tray */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-sans font-semibold text-natural-charcoal/60">
                          Your Sentence
                        </span>
                        {!tileSubmitted && placedTiles.length > 0 && (
                          <button
                            type="button"
                            onClick={handleResetTiles}
                            className="inline-flex items-center gap-1 text-xs font-sans font-semibold text-natural-charcoal/65 hover:text-natural-terracotta transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Tiles</span>
                          </button>
                        )}
                      </div>

                      <div
                        className={`min-h-[4.5rem] rounded-2xl border-2 p-3 flex flex-wrap items-center gap-2 transition-colors ${
                          !tileSubmitted
                            ? "border-dashed border-natural-border bg-natural-bg/55"
                            : isCurrentCorrect
                            ? "border-natural-forest bg-natural-forest/10"
                            : "border-natural-terracotta bg-natural-terracotta/10"
                        }`}
                      >
                        {placedTiles.length === 0 ? (
                          <span className="text-xs font-sans text-natural-charcoal/45 px-1">
                            Tap Japanese blocks below in sentence order...
                          </span>
                        ) : (
                          placedTiles.map((tile: ShuffledTileInstance) => (
                            <button
                              key={tile.instanceId}
                              type="button"
                              disabled={tileSubmitted}
                              onClick={() => handleRemovePlacedTile(tile.instanceId)}
                              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl border text-left transition ${
                                tileSubmitted
                                  ? isCurrentCorrect
                                    ? "bg-natural-forest text-natural-bg border-natural-forest cursor-default"
                                    : "bg-natural-terracotta text-natural-bg border-natural-terracotta cursor-default"
                                  : "bg-natural-card-light border-natural-forest/60 text-natural-charcoal hover:border-natural-terracotta cursor-pointer shadow-xs"
                              }`}
                              title={tileSubmitted ? undefined : "Tap to remove block"}
                            >
                              <span className="block font-serif font-bold text-base leading-tight">
                                {tile.text}
                              </span>
                              {showRomaji && (
                                <span
                                  className={`block font-mono text-[10px] mt-0.5 ${
                                    tileSubmitted
                                      ? "text-natural-bg/85"
                                      : "text-natural-charcoal/60"
                                  }`}
                                >
                                  {tile.romaji}
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Available Tile Bank */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-sans font-semibold text-natural-charcoal/60">
                        Available Blocks
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        {currentQ.bankTiles.map((tile) => {
                          const isPlaced = placedTiles.some(
                            (p) => p.instanceId === tile.instanceId
                          );
                          return (
                            <button
                              key={tile.instanceId}
                              type="button"
                              disabled={isPlaced || tileSubmitted}
                              onClick={() => handlePlaceTile(tile)}
                              className={`min-h-[46px] px-3.5 py-2 rounded-xl border-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                                isPlaced
                                  ? "bg-natural-bg/30 border-dashed border-natural-border/40 text-transparent select-none cursor-default"
                                  : tileSubmitted
                                  ? "bg-natural-bg/40 border-natural-border/40 text-natural-charcoal/35 cursor-default"
                                  : "bg-natural-card-light border-natural-border text-natural-charcoal hover:border-natural-forest hover:bg-natural-forest/5 cursor-pointer shadow-xs"
                              }`}
                            >
                              <span className="block font-serif font-bold text-base leading-tight">
                                {tile.text}
                              </span>
                              {showRomaji && (
                                <span
                                  className={`block font-mono text-[10px] mt-0.5 ${
                                    isPlaced
                                      ? "text-transparent"
                                      : "text-natural-charcoal/60"
                                  }`}
                                >
                                  {tile.romaji}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hint + Check Sentence Row */}
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setShowHint((v) => !v)}
                          aria-expanded={showHint}
                          className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-sans font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                            showHint
                              ? "bg-natural-clay/15 border-natural-clay/50 text-natural-clay"
                              : "bg-natural-bg/65 border-natural-border/70 text-natural-charcoal/70 hover:border-natural-clay/45 hover:text-natural-clay"
                          }`}
                        >
                          <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                          <span>{showHint ? "Hide Hint" : "Show Hint"}</span>
                        </button>

                        {!tileSubmitted && (
                          <button
                            type="button"
                            disabled={placedTiles.length !== currentQ.bankTiles.length}
                            onClick={handleSubmitTiles}
                            className={`min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-sans font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest ${
                              placedTiles.length === currentQ.bankTiles.length
                                ? "bg-natural-forest text-natural-bg cursor-pointer hover:opacity-95 shadow-xs"
                                : "bg-natural-border/40 text-natural-charcoal/40 cursor-not-allowed"
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>Check Sentence</span>
                          </button>
                        )}
                      </div>

                      {showHint && (
                        <div className="flex gap-2 text-xs text-natural-charcoal/80 bg-natural-bg/60 border border-natural-border/50 p-3 rounded-xl">
                          <Lightbulb className="w-3.5 h-3.5 text-natural-clay shrink-0 mt-0.5" />
                          <span>{currentQ.hint}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── POST-ANSWER FEEDBACK & AUDIO PANEL ───────────────────── */}
                <AnimatePresence>
                  {isAnswered && (
                    <motion.div
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="border-t border-natural-border/60 pt-4 flex flex-col gap-4"
                    >
                      <div
                        className={`flex flex-col sm:flex-row gap-3.5 rounded-2xl p-4 border ${
                          isCurrentCorrect
                            ? "bg-natural-forest/10 border-natural-forest/35"
                            : "bg-natural-terracotta/10 border-natural-terracotta/35"
                        }`}
                      >
                        <div className="flex sm:flex-col items-center sm:justify-center gap-2 shrink-0">
                          <span
                            className={`text-2xl font-serif font-black border-2 px-2.5 py-0.5 rounded-lg ${
                              isCurrentCorrect
                                ? "border-natural-forest text-natural-forest"
                                : "border-natural-terracotta text-natural-terracotta"
                            }`}
                          >
                            {isCurrentCorrect ? "正" : "誤"}
                          </span>
                          <span
                            className={`text-[11px] font-sans font-bold uppercase tracking-wider ${
                              isCurrentCorrect
                                ? "text-natural-forest"
                                : "text-natural-terracotta"
                            }`}
                          >
                            {isCurrentCorrect ? "Correct" : "Review"}
                          </span>
                        </div>

                        <div className="flex-1 flex gap-3 items-start min-w-0">
                          <div className="w-9 h-9 rounded-full border border-natural-forest/25 bg-natural-bg overflow-hidden shrink-0">
                            <img
                              src={companionImg}
                              alt="Astra-chan"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover scale-105"
                            />
                          </div>

                          <div className="flex-1 min-w-0 text-xs text-natural-charcoal">
                            <p className="font-sans font-medium leading-relaxed">
                              {isCurrentCorrect
                                ? "素晴らしい！ Clean sentence structure—marked as studied in your Dojo progress."
                                : `Almost! Compare your answer with the natural pattern for ${currentQ.patternLabel} below:`}
                            </p>

                            <div className="mt-2.5 bg-natural-bg/80 border border-natural-border/60 p-3 rounded-xl flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-serif font-bold text-base text-natural-charcoal select-text">
                                  {solvedSentence}
                                </p>
                                {showRomaji && (
                                  <p className="font-mono text-[11px] text-natural-charcoal/65 mt-0.5 select-text">
                                    {solvedRomaji}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => speakJapanese(solvedSentence)}
                                className="min-h-[40px] min-w-[40px] p-2 bg-natural-card border border-natural-border hover:border-natural-forest text-natural-forest rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest"
                                title="Listen to full sentence"
                                aria-label="Listen to full sentence"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="mt-2 flex items-center">
                              <button
                                type="button"
                                onClick={() => onInspectPattern(currentQ.patternId)}
                                className="text-xs font-sans font-semibold text-natural-forest hover:underline cursor-pointer"
                              >
                                Open lesson for {currentQ.patternLabel} →
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAdvance}
                        className="min-h-[46px] w-full py-3 px-5 rounded-2xl bg-natural-forest hover:opacity-95 text-natural-bg font-sans font-bold text-sm cursor-pointer transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest"
                      >
                        <span>
                          {isLastQ ? "View Practice Summary" : "Next Question"}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
        )
      )}
    </div>
  );
}
