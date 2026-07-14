import type React from "react";
import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowBigRight, ChevronLeft, ChevronRight, Flame, Info, Volume2 } from "lucide-react";
import type { HiraganaItem, KatakanaItem } from "../types";

type QuizMode = "choice" | "romaji" | "survival";
type SelectedDifficulty = "relax" | "medium" | "hard" | "legend";
type CurrentScreen = "menu" | "quiz" | "kanji-scroll" | "profile" | "results" | "online-multiplayer" | "review-deck" | "vocab-quiz" | "kanji-quiz" | "charts" | "grammar-dojo";
type QuizAnswerStatus = "correct" | "incorrect" | null;
type QuizQuestion = HiraganaItem | KatakanaItem;

interface QuizScreenProps {
  currentQuestion: QuizQuestion | null;
  quizMode: QuizMode;
  quizIndex: number;
  quizPool: QuizQuestion[];
  survivalScore: number;
  survivalTimeLeft: number;
  selectedDifficulty: SelectedDifficulty;
  timeLeft: number;
  timerMax: number;
  answerStatus: QuizAnswerStatus;
  typedInput: string;
  choices: string[];
  selectedAnswer: string | null;
  waitingForNext: boolean;
  speakJapanese: (phrase: string) => void;
  setCurrentScreen: React.Dispatch<React.SetStateAction<CurrentScreen>>;
  setTypedInput: React.Dispatch<React.SetStateAction<string>>;
  handleTypedSubmit: () => void;
  handleSelectChoice: (romaji: string) => void;
  advanceQuizIndex: () => void;
}

export default function QuizScreen({
  currentQuestion,
  quizMode,
  quizIndex,
  quizPool,
  survivalScore,
  survivalTimeLeft,
  selectedDifficulty,
  timeLeft,
  timerMax,
  answerStatus,
  typedInput,
  choices,
  selectedAnswer,
  waitingForNext,
  speakJapanese,
  setCurrentScreen,
  setTypedInput,
  handleTypedSubmit,
  handleSelectChoice,
  advanceQuizIndex,
}: QuizScreenProps) {
  const romajiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quizMode !== "romaji" || !currentQuestion) return;
    const t = setTimeout(() => {
      romajiInputRef.current?.focus({ preventScroll: true });
    }, 80);
    return () => clearTimeout(t);
  }, [currentQuestion, quizMode]);

  if (!currentQuestion) return null;

  return (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-natural-card border border-natural-border/70 p-6 rounded-3xl flex flex-col items-center shadow-lg backdrop-blur"
            >
              {/* Quiz Session details */}
              <div className="flex items-center justify-between w-full mb-4 pb-2 border-b border-natural-border">
                <button
                  type="button"
                  onClick={() => setCurrentScreen("menu")}
                  className="px-3 py-1.5 rounded-lg border border-natural-border text-natural-forest-light text-xs hover:border-natural-forest hover:text-natural-forest bg-natural-bg/40 font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Escape Session
                </button>

                {quizMode === "survival" ? (
                  <div className="text-center">
                    <span className="block text-[10px] text-natural-forest-light uppercase font-mono tracking-wider font-bold">
                      CANDLE ROOMS SURVIVED
                    </span>
                    <span className="text-sm font-bold text-natural-terracotta font-mono flex items-center justify-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-current text-natural-terracotta" />
                      {survivalScore} ROOMS
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs text-natural-forest font-mono tracking-wider font-bold">
                      MATCH {quizIndex + 1} OF {quizPool.length}
                    </span>
                  </div>
                )}

                {/* Speaker pronunciation voice guide button */}
                <button
                  type="button"
                  id="quiz-speak-symbol"
                  onClick={() => speakJapanese(currentQuestion.kana)}
                  className="p-1.5 bg-natural-bg hover:bg-natural-forest/10 text-natural-forest border border-natural-border rounded-lg transition shadow-sm cursor-pointer"
                  title="Pronounce Character"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* ACTIVE TIMER LEVEL LINE */}
              {quizMode === "survival" ? (
                <div className="w-full bg-natural-bg h-3.5 rounded-full overflow-hidden mb-6 border border-natural-border relative">
                  <div
                    className="h-full bg-gradient-to-r from-natural-terracotta to-natural-clay transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(202,94,75,0.3)]"
                    style={{ width: `${Math.min(100, (survivalTimeLeft / 60) * 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[9px] font-mono text-natural-charcoal select-none uppercase font-extrabold tracking-widest leading-none">
                    Candle Life: {Math.ceil(survivalTimeLeft)}s
                  </span>
                </div>
              ) : (
                selectedDifficulty !== "relax" && (
                  <div className="w-full bg-natural-bg h-2 rounded-full overflow-hidden mb-6 border border-natural-border relative">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear ${(timeLeft / timerMax) < 0.35 ? "bg-natural-terracotta" : "bg-natural-forest"
                        }`}
                      style={{ width: `${(timeLeft / timerMax) * 100}%` }}
                    />
                  </div>
                )
              )}

              {/* INTERACTIVE CARDS PLATFORM */}
              <div className="my-3 flex flex-col items-center">
                <motion.div
                  key={currentQuestion.kana}
                  animate={
                    answerStatus === "correct"
                      ? { scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }
                      : answerStatus === "incorrect"
                        ? { x: [-12, 12, -8, 8, 0] }
                        : {}
                  }
                  transition={{ duration: 0.4 }}
                  className={`w-44 h-44 border-2 rounded-3xl flex items-center justify-center bg-natural-bg/50 transition shadow-sm relative ${answerStatus === "correct"
                    ? "border-natural-forest bg-natural-forest/10"
                    : answerStatus === "incorrect"
                      ? "border-natural-terracotta bg-natural-terracotta/10"
                      : "border-natural-border hover:border-natural-forest/45"
                    }`}
                >
                  <span className="text-7xl font-bold font-serif text-natural-forest tracking-wider selection:bg-transparent">
                    {currentQuestion.kana}
                  </span>
                </motion.div>
              </div>

              {/* QUIZ INTERFACE MODALS SUBMISSIONS */}
              {quizMode === "romaji" ? (
                // INPUT TYPING PRACTICE MODE
                <div className="w-full max-w-sm mt-3 flex flex-col gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      ref={romajiInputRef}
                      value={typedInput}
                      onChange={(e) => setTypedInput(e.target.value)}
                      placeholder="Type readings..."
                      disabled={answerStatus !== null}
                      id="quiz-typed-input"
                      className="w-full p-3 bg-natural-bg text-center font-mono text-lg rounded-xl border border-natural-border focus:border-natural-forest outline-none text-natural-charcoal uppercase tracking-wider font-bold"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTypedSubmit();
                      }}
                      autoComplete="off"
                    />

                    {answerStatus === "incorrect" && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-natural-terracotta font-extrabold uppercase">
                        Correct: {currentQuestion.romaji}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleTypedSubmit}
                    disabled={answerStatus !== null}
                    className="w-full p-2.5 bg-natural-forest hover:bg-[#3d4d3e] text-natural-bg rounded-xl font-bold tracking-wide transition shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Cast Spelling Spell
                    <ArrowBigRight className="w-4 h-4 text-natural-bg" />
                  </button>
                </div>
              ) : (
                // MULTIPLE CHOICE OPTIONS GRID (choice AND survival mode)
                <div className={`grid gap-3 w-full max-w-md mt-4 ${choices.length === 6 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {choices.map((ch, idx) => {
                    let btnColorClass = "bg-natural-bg/50 border-natural-border/70 hover:border-natural-forest text-natural-charcoal/80";
                    if (selectedAnswer === ch || answerStatus !== null) {
                      if (ch === currentQuestion.romaji) {
                        btnColorClass = "bg-natural-forest/20 border-natural-forest text-natural-forest font-black";
                      } else if (selectedAnswer === ch) {
                        btnColorClass = "bg-natural-terracotta/20 border-natural-terracotta text-natural-terracotta font-black";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectChoice(ch)}
                        disabled={answerStatus !== null}
                        className={`p-3 rounded-xl border font-mono text-base font-bold tracking-widest transition uppercase cursor-pointer ${btnColorClass}`}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* USAGE EXAMPLE SECTION (Visible once the answer state completes) */}
              {answerStatus !== null && currentQuestion.examples && currentQuestion.examples.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-md mt-5 p-3.5 bg-natural-bg rounded-2xl border border-natural-border flex flex-col gap-2"
                >
                  <p className="text-[10px] text-natural-clay font-mono uppercase tracking-widest flex items-center gap-1 leading-none font-bold">
                    <Info className="w-3 h-3 text-natural-clay" />
                    Usage Example Details
                  </p>

                  {currentQuestion.examples.map((ex, exIdx) => (
                    <div key={exIdx} className="flex justify-between items-center text-xs border-b border-natural-border/40 pb-1.5 last:border-none last:pb-0">
                      <div>
                        <span className="block text-natural-charcoal font-bold font-serif">{ex.japanese}</span>
                        <span className="text-[10px] text-natural-forest-light font-mono uppercase font-semibold">Romaji: {ex.romaji}</span>
                      </div>
                      <span className="text-natural-charcoal font-medium font-serif italic">{ex.english}</span>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Next -> button shown after answering in offline non-survival mode */}
              {waitingForNext && quizMode !== "survival" && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={advanceQuizIndex}
                  className="mt-4 px-8 py-3 bg-natural-forest text-natural-bg font-serif font-bold text-sm rounded-2xl hover:opacity-90 transition shadow-sm flex items-center gap-2 mx-auto"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
  );
}
