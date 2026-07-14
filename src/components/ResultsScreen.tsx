import { motion } from "motion/react";
import type { HiraganaItem, KatakanaItem } from "../types";

type ScreenType =
  | "menu"
  | "quiz"
  | "kanji-scroll"
  | "profile"
  | "results"
  | "online-multiplayer"
  | "review-deck"
  | "vocab-quiz"
  | "kanji-quiz"
  | "charts"
  | "grammar-dojo";

type QuizMode = "choice" | "romaji" | "survival";

type MascotMood =
  | "welcome"
  | "streak"
  | "success"
  | "failure"
  | "kanji"
  | "idle"
  | "clicked"
  | "learn-flashcard"
  | "learn-vocabs"
  | "survival-danger"
  | "wondering"
  | "afk"
  | "excited";

interface ResultsScreenProps {
  sessionCorrect: number;
  quizPool: (HiraganaItem | KatakanaItem)[];
  sessionXpEarned: number;
  sessionWrongChars: Array<{ kana: string; romaji: string }>;
  quizMode: QuizMode;
  speakJapanese: (phrase: string) => void;
  openCharPicker: (mode: QuizMode) => void;
  setCurrentScreen: React.Dispatch<React.SetStateAction<ScreenType>>;
  setMascotMood: React.Dispatch<React.SetStateAction<MascotMood>>;
  setArchiveFilter: React.Dispatch<React.SetStateAction<string>>;
}

export default function ResultsScreen({
  sessionCorrect,
  quizPool,
  sessionXpEarned,
  sessionWrongChars,
  quizMode,
  speakJapanese,
  openCharPicker,
  setCurrentScreen,
  setMascotMood,
  setArchiveFilter,
}: ResultsScreenProps) {
  return (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-5"
            >
              {/* Results header card */}
              <div className="bg-natural-card border border-natural-border/70 p-6 rounded-3xl shadow-sm flex flex-col items-center gap-3 text-center relative overflow-hidden">
                {/* Decorative background glyph */}
                <span className="absolute text-[120px] font-serif text-natural-forest/5 select-none pointer-events-none top-1/2 -translate-y-1/2">学</span>

                <div className="relative z-10">
                  <p className="text-4xl mb-1">
                    {sessionCorrect === quizPool.length ? "🎉" : sessionCorrect >= quizPool.length * 0.7 ? "✨" : sessionCorrect >= quizPool.length * 0.5 ? "📖" : "🌱"}
                  </p>
                  <h3 className="font-serif font-extrabold text-natural-forest text-xl tracking-wide">
                    {sessionCorrect === quizPool.length ? "Perfect Session!" : sessionCorrect >= quizPool.length * 0.7 ? "Great Work!" : sessionCorrect >= quizPool.length * 0.5 ? "Good Effort!" : "Keep Practicing!"}
                  </h3>
                  <p className="text-xs text-natural-forest-light font-mono mt-1">Saved to your profile</p>
                </div>

                {/* Score row */}
                <div className="flex items-center gap-4 mt-1 relative z-10">
                  <div className="flex flex-col items-center px-5 py-3 bg-natural-bg border border-natural-border rounded-2xl shadow-sm">
                    <span className="text-3xl font-mono font-extrabold text-natural-forest">{sessionCorrect}<span className="text-natural-forest-light text-xl">/{quizPool.length}</span></span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-natural-forest-light mt-0.5 font-bold">Correct</span>
                  </div>
                  <div className="flex flex-col items-center px-5 py-3 bg-natural-bg border border-natural-border rounded-2xl shadow-sm">
                    <span className="text-3xl font-mono font-extrabold text-natural-clay">+{sessionXpEarned}</span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-natural-forest-light mt-0.5 font-bold">XP Earned</span>
                  </div>
                  <div className="flex flex-col items-center px-5 py-3 bg-natural-bg border border-natural-border rounded-2xl shadow-sm">
                    <span className="text-3xl font-mono font-extrabold text-natural-forest">
                      {quizPool.length > 0 ? Math.round((sessionCorrect / quizPool.length) * 100) : 0}%
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-natural-forest-light mt-0.5 font-bold">Accuracy</span>
                  </div>
                </div>
              </div>

              {/* Wrong characters review */}
              {sessionWrongChars.length > 0 && (
                <div className="bg-natural-card border border-natural-border/70 p-4 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3 border-b border-natural-border/40 pb-2">
                    <span className="text-sm">📝</span>
                    <p className="text-xs font-serif font-extrabold text-natural-forest tracking-wider uppercase">Review These Characters</p>
                    <span className="ml-auto text-[9px] font-mono bg-natural-terracotta/10 text-natural-terracotta px-2 py-0.5 rounded font-bold uppercase">
                      {sessionWrongChars.length} missed
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sessionWrongChars.map((c, i) => (
                      <button
                        key={`${c.kana}-${i}`}
                        type="button"
                        onClick={() => speakJapanese(c.kana)}
                        className="flex flex-col items-center px-3 py-2 bg-natural-terracotta/8 border border-natural-terracotta/25 rounded-xl hover:bg-natural-terracotta/15 transition cursor-pointer group"
                        title={`Click to hear: ${c.kana}`}
                      >
                        <span className="text-2xl font-serif font-bold text-natural-terracotta">{c.kana}</span>
                        <span className="text-[9px] font-mono uppercase text-natural-terracotta/80 font-bold mt-0.5">{c.romaji}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-natural-forest-light font-mono italic mt-2 text-center">Click any character to hear pronunciation</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  type="button"
                  onClick={() => openCharPicker(quizMode)}
                  className="px-6 py-3 bg-natural-forest text-natural-bg rounded-2xl text-sm font-serif font-extrabold tracking-wider hover:bg-natural-forest/90 transition shadow-sm cursor-pointer flex items-center gap-2"
                >
                  ↻ Play Again
                </button>
                <button
                  type="button"
                  onClick={() => { setCurrentScreen("menu"); setMascotMood("idle"); }}
                  className="px-6 py-3 bg-natural-card border border-natural-border text-natural-forest rounded-2xl text-sm font-serif font-bold tracking-wider hover:border-natural-forest transition cursor-pointer"
                >
                  ← Back to Menu
                </button>
                <button
                  type="button"
                  onClick={() => { setCurrentScreen("profile"); setArchiveFilter("all"); }}
                  className="px-6 py-3 bg-natural-clay/10 border border-natural-clay/30 text-natural-clay rounded-2xl text-sm font-serif font-bold tracking-wider hover:bg-natural-clay/20 transition cursor-pointer"
                >
                  📊 View Profile
                </button>
              </div>
            </motion.div>
  );
}
