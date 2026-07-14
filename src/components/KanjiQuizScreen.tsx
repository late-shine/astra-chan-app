import type React from "react";
import { motion } from "motion/react";
import { ChevronLeft, Info, Play, Volume2 } from "lucide-react";
import type { KanjiItem, StudentStats } from "../types";

type KanjiQuizMode = "meaning" | "reading";
type KanjiQuizLength = 10 | 20 | "all";
type KanjiQuizScope = "all" | "studied" | "custom";
type KanjiQuizPhase = "config" | "quiz" | "results";
type KanjiQuizAnswerStatus = "correct" | "incorrect" | null;

interface KanjiQuizScreenProps {
  kanjiQuizPhase: KanjiQuizPhase;
  kanjiQuizMode: KanjiQuizMode;
  kanjiQuizScope: KanjiQuizScope;
  kanjiQuizLength: KanjiQuizLength;
  kanjiQuizCustomItems: Set<string>;
  kanjiQuizPool: KanjiItem[];
  kanjiQuizIndex: number;
  kanjiQuizItem: KanjiItem | null;
  kanjiQuizChoices: string[];
  kanjiQuizSelectedAnswer: string | null;
  kanjiQuizAnswerStatus: KanjiQuizAnswerStatus;
  kanjiQuizCorrect: number;
  kanjiQuizWrong: KanjiItem[];
  kanjiQuizXp: number;
  kanjiData: KanjiItem[];
  stats: StudentStats;
  speakJapanese: (phrase: string) => void;
  setKanjiQuizPhase: React.Dispatch<React.SetStateAction<KanjiQuizPhase>>;
  setKanjiQuizMode: React.Dispatch<React.SetStateAction<KanjiQuizMode>>;
  setKanjiQuizScope: React.Dispatch<React.SetStateAction<KanjiQuizScope>>;
  setKanjiQuizLength: React.Dispatch<React.SetStateAction<KanjiQuizLength>>;
  setKanjiQuizCustomItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  getKanjiQuizScopeLabel: () => string;
  toggleKanjiQuizCustomItem: (item: KanjiItem) => void;
  startKanjiQuiz: () => void;
  returnToPracticeHub: () => void;
  handleKanjiAnswer: (answer: string) => void;
}

export default function KanjiQuizScreen({
  kanjiQuizPhase,
  kanjiQuizMode,
  kanjiQuizScope,
  kanjiQuizLength,
  kanjiQuizCustomItems,
  kanjiQuizPool,
  kanjiQuizIndex,
  kanjiQuizItem,
  kanjiQuizChoices,
  kanjiQuizSelectedAnswer,
  kanjiQuizAnswerStatus,
  kanjiQuizCorrect,
  kanjiQuizWrong,
  kanjiQuizXp,
  kanjiData,
  stats,
  speakJapanese,
  setKanjiQuizPhase,
  setKanjiQuizMode,
  setKanjiQuizScope,
  setKanjiQuizLength,
  setKanjiQuizCustomItems,
  getKanjiQuizScopeLabel,
  toggleKanjiQuizCustomItem,
  startKanjiQuiz,
  returnToPracticeHub,
  handleKanjiAnswer,
}: KanjiQuizScreenProps) {
  return (            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-0"
            >
              {/* ── CONFIG PHASE ── */}
              {kanjiQuizPhase === "config" && (
                <div className="bg-natural-card border border-natural-border/70 p-6 rounded-3xl shadow-lg flex flex-col items-center gap-5 max-w-sm mx-auto w-full">
                  <div className="text-center">
                    <p className="text-4xl mb-2">漢</p>
                    <h3 className="font-serif font-extrabold text-xl text-natural-forest tracking-wide">Kanji Quiz</h3>
                    <p className="text-xs text-natural-forest-light font-mono mt-1 uppercase tracking-wider">{getKanjiQuizScopeLabel()}</p>
                  </div>

                  {/* Pool selector */}
                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">Practice Pool</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { key: "all" as const, label: "All", desc: `${kanjiData.length}` },
                        { key: "studied" as const, label: "Studied", desc: `${kanjiData.filter(k => (stats.characterProgress[k.kanji]?.total || 0) > 0).length}` },
                        { key: "custom" as const, label: "Custom", desc: `${kanjiQuizCustomItems.size}` },
                      ]).map(opt => (
                        <button key={opt.key} type="button" onClick={() => setKanjiQuizScope(opt.key)}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${kanjiQuizScope === opt.key
                            ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-bold"
                            : "bg-natural-bg border-natural-border text-natural-charcoal hover:border-natural-forest/40"}`}>
                          <span className="block text-xs font-bold">{opt.label}</span>
                          <span className="block text-[9px] font-mono opacity-70 mt-0.5 uppercase">{opt.desc} kanji</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {kanjiQuizScope === "custom" && (
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider">Select Kanji</label>
                        <button type="button" onClick={() => setKanjiQuizCustomItems(new Set())}
                          className="text-[10px] font-mono text-natural-clay hover:text-natural-terracotta transition cursor-pointer">
                          Clear
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1">
                        {kanjiData.map((k) => {
                          const isSelected = kanjiQuizCustomItems.has(k.kanji);
                          return (
                            <button key={k.kanji} type="button" onClick={() => toggleKanjiQuizCustomItem(k)}
                              className={`p-2 rounded-xl border text-center transition cursor-pointer ${isSelected
                                ? "bg-natural-clay/10 border-natural-clay text-natural-clay"
                                : "bg-natural-bg border-natural-border text-natural-charcoal hover:border-natural-clay/40"}`}>
                              <span className="block text-xl font-serif font-extrabold leading-none">{k.kanji}</span>
                              <span className="block text-[9px] font-serif italic opacity-75 truncate mt-1">{k.meaning}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mode toggle */}
                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">Quiz Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: "meaning" as const, label: "Meaning", desc: "Kanji → English" },
                        { key: "reading" as const, label: "Reading", desc: "Kanji → Onyomi" },
                      ]).map(opt => (
                        <button key={opt.key} type="button" onClick={() => setKanjiQuizMode(opt.key)}
                          className={`p-3 rounded-xl border text-center transition cursor-pointer ${kanjiQuizMode === opt.key
                            ? "bg-natural-clay/10 border-natural-clay text-natural-clay font-bold"
                            : "bg-natural-bg border-natural-border text-natural-charcoal hover:border-natural-clay/40"}`}>
                          <span className="block text-xs font-bold">{opt.label}</span>
                          <span className="block text-[10px] font-mono opacity-70 mt-0.5">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Length selector */}
                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">Question Count</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([10, 20, "all"] as const).map(len => (
                        <button key={String(len)} type="button" onClick={() => setKanjiQuizLength(len)}
                          className={`py-2.5 rounded-xl border text-xs font-bold font-mono transition cursor-pointer ${kanjiQuizLength === len
                            ? "bg-natural-forest/10 border-natural-forest text-natural-forest"
                            : "bg-natural-bg border-natural-border text-natural-charcoal hover:border-natural-forest/40"}`}>
                          {len === "all" ? "All" : `${len} Q`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="button" onClick={startKanjiQuiz}
                    className="w-full py-3 bg-natural-forest text-natural-bg rounded-2xl font-serif font-extrabold text-sm tracking-wider hover:bg-natural-forest/90 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                    <Play className="w-4 h-4" /> Start Quiz
                  </button>
                  <button type="button" onClick={returnToPracticeHub}
                    className="text-xs text-natural-forest-light hover:text-natural-forest font-mono transition cursor-pointer">
                    ← Back to Practice
                  </button>
                </div>
              )}

              {/* ── QUIZ PHASE ── */}
              {kanjiQuizPhase === "quiz" && kanjiQuizItem && (
                <div className="bg-natural-card border border-natural-border/70 p-6 rounded-3xl flex flex-col items-center shadow-lg backdrop-blur">
                  {/* Header */}
                  <div className="flex items-center justify-between w-full mb-4 pb-2 border-b border-natural-border">
                    <button type="button" onClick={returnToPracticeHub}
                      className="px-3 py-1.5 rounded-lg border border-natural-border text-natural-forest-light text-xs hover:border-natural-forest hover:text-natural-forest bg-natural-bg/40 font-semibold transition flex items-center gap-1.5 cursor-pointer">
                      <ChevronLeft className="w-3.5 h-3.5" /> Escape Session
                    </button>
                    <span className="text-xs text-natural-forest font-mono tracking-wider font-bold">
                      KANJI {kanjiQuizIndex + 1} OF {kanjiQuizPool.length}
                    </span>
                    <button type="button" onClick={() => speakJapanese(kanjiQuizItem.kanji)}
                      className="p-1.5 bg-natural-bg hover:bg-natural-forest/10 text-natural-forest border border-natural-border rounded-lg transition shadow-sm cursor-pointer">
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Big kanji card — no row/category label */}
                  <div className="my-3 flex flex-col items-center">
                    <motion.div
                      key={kanjiQuizItem.kanji}
                      animate={
                        kanjiQuizAnswerStatus === "correct" ? { scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }
                          : kanjiQuizAnswerStatus === "incorrect" ? { x: [-12, 12, -8, 8, 0] }
                          : {}
                      }
                      transition={{ duration: 0.4 }}
                      className={`w-44 h-44 border-2 rounded-3xl flex items-center justify-center bg-natural-bg/50 transition shadow-sm ${
                        kanjiQuizAnswerStatus === "correct" ? "border-natural-forest bg-natural-forest/10"
                          : kanjiQuizAnswerStatus === "incorrect" ? "border-natural-terracotta bg-natural-terracotta/10"
                          : "border-natural-border hover:border-natural-forest/45"}`}
                    >
                      <span className="text-7xl font-bold font-serif text-natural-forest tracking-wider select-none">
                        {kanjiQuizItem.kanji}
                      </span>
                    </motion.div>
                    <p className="text-[10px] text-natural-forest-light font-mono uppercase tracking-wider mt-2">
                      {kanjiQuizMode === "meaning" ? "Choose the English meaning" : "Choose the onyomi reading"}
                    </p>
                  </div>

                  {/* 2×2 answer grid */}
                  <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-2">
                    {kanjiQuizChoices.map((ch, idx) => {
                      const correct = kanjiQuizMode === "meaning" ? kanjiQuizItem.meaning : kanjiQuizItem.onyomi;
                      let cls = "bg-natural-bg/50 border-natural-border/70 hover:border-natural-forest text-natural-charcoal/80";
                      if (kanjiQuizSelectedAnswer === ch || kanjiQuizAnswerStatus !== null) {
                        if (ch === correct) cls = "bg-natural-forest/20 border-natural-forest text-natural-forest font-black";
                        else if (kanjiQuizSelectedAnswer === ch) cls = "bg-natural-terracotta/20 border-natural-terracotta text-natural-terracotta font-black";
                      }
                      return (
                        <button key={idx} type="button" onClick={() => handleKanjiAnswer(ch)}
                          disabled={kanjiQuizAnswerStatus !== null}
                          className={`p-3 rounded-xl border font-mono text-base font-bold tracking-widest transition uppercase cursor-pointer text-center ${cls}`}>
                          {ch}
                        </button>
                      );
                    })}
                  </div>

                  {/* Post-answer reveal: meaning + readings + strokes */}
                  {kanjiQuizAnswerStatus !== null && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="w-full max-w-md mt-5 p-3.5 bg-natural-bg rounded-2xl border border-natural-border flex flex-col gap-2">
                      <p className="text-[10px] text-natural-clay font-mono uppercase tracking-widest flex items-center gap-1 font-bold leading-none">
                        <Info className="w-3 h-3 text-natural-clay" /> Kanji Details
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[9px] text-natural-forest-light font-mono uppercase tracking-wider block font-bold">Meaning</span>
                          <span className="font-serif font-bold text-natural-charcoal">{kanjiQuizItem.meaning}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-natural-forest-light font-mono uppercase tracking-wider block font-bold">Strokes</span>
                          <span className="font-mono font-bold text-natural-clay">{kanjiQuizItem.strokeCount}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-natural-clay font-mono uppercase tracking-wider block font-bold">Onyomi</span>
                          <span className="font-serif font-bold text-natural-charcoal">{kanjiQuizItem.onyomi}</span>
                          <span className="text-[9px] text-natural-forest-light font-mono block">{kanjiQuizItem.onyomiRomaji}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-natural-forest font-mono uppercase tracking-wider block font-bold">Kunyomi</span>
                          <span className="font-serif font-bold text-natural-forest">{kanjiQuizItem.kunyomi}</span>
                          <span className="text-[9px] text-natural-forest-light font-mono block">{kanjiQuizItem.kunyomiRomaji}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── RESULTS PHASE ── */}
              {kanjiQuizPhase === "results" && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-5">
                  <div className="bg-natural-card border border-natural-border/70 p-6 rounded-3xl shadow-sm flex flex-col items-center gap-3 text-center relative overflow-hidden">
                    <span className="absolute text-[120px] font-serif text-natural-forest/5 select-none pointer-events-none top-1/2 -translate-y-1/2">漢</span>
                    <div className="relative z-10">
                      <p className="text-4xl mb-1">
                        {kanjiQuizCorrect === kanjiQuizPool.length ? "🎉" : kanjiQuizCorrect >= kanjiQuizPool.length * 0.7 ? "✨" : kanjiQuizCorrect >= kanjiQuizPool.length * 0.5 ? "📖" : "🌱"}
                      </p>
                      <h3 className="font-serif font-extrabold text-natural-forest text-xl tracking-wide">
                        {kanjiQuizCorrect === kanjiQuizPool.length ? "Master Scholar!" : kanjiQuizCorrect >= kanjiQuizPool.length * 0.7 ? "Great Reading!" : kanjiQuizCorrect >= kanjiQuizPool.length * 0.5 ? "Good Effort!" : "Keep Studying!"}
                      </h3>
                      <p className="text-xs text-natural-forest-light font-mono mt-1">Kanji Quiz Complete</p>
                    </div>
                    <div className="flex items-center gap-4 mt-1 relative z-10">
                      <div className="flex flex-col items-center px-5 py-3 bg-natural-bg border border-natural-border rounded-2xl shadow-sm">
                        <span className="text-3xl font-mono font-extrabold text-natural-forest">{kanjiQuizCorrect}<span className="text-natural-forest-light text-xl">/{kanjiQuizPool.length}</span></span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-natural-forest-light mt-0.5 font-bold">Correct</span>
                      </div>
                      <div className="flex flex-col items-center px-5 py-3 bg-natural-bg border border-natural-border rounded-2xl shadow-sm">
                        <span className="text-3xl font-mono font-extrabold text-natural-clay">+{kanjiQuizXp}</span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-natural-forest-light mt-0.5 font-bold">XP Earned</span>
                      </div>
                      <div className="flex flex-col items-center px-5 py-3 bg-natural-bg border border-natural-border rounded-2xl shadow-sm">
                        <span className="text-3xl font-mono font-extrabold text-natural-forest">
                          {kanjiQuizPool.length > 0 ? Math.round((kanjiQuizCorrect / kanjiQuizPool.length) * 100) : 0}%
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-natural-forest-light mt-0.5 font-bold">Accuracy</span>
                      </div>
                    </div>
                  </div>

                  {kanjiQuizWrong.length > 0 && (
                    <div className="bg-natural-card border border-natural-border/70 p-4 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-2 mb-3 border-b border-natural-border/40 pb-2">
                        <span className="text-sm">📝</span>
                        <p className="text-xs font-serif font-extrabold text-natural-forest tracking-wider uppercase">Review These Kanji</p>
                        <span className="ml-auto text-[9px] font-mono bg-natural-terracotta/10 text-natural-terracotta px-2 py-0.5 rounded font-bold uppercase">
                          {kanjiQuizWrong.length} missed
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {kanjiQuizWrong.map((k, i) => (
                          <button key={`${k.kanji}-${i}`} type="button" onClick={() => speakJapanese(k.kanji)}
                            className="flex flex-col items-center px-3 py-2 bg-natural-terracotta/8 border border-natural-terracotta/25 rounded-xl hover:bg-natural-terracotta/15 transition cursor-pointer">
                            <span className="text-2xl font-serif font-bold text-natural-terracotta">{k.kanji}</span>
                            <span className="text-[9px] font-mono uppercase text-natural-terracotta/80 font-bold mt-0.5">{k.meaning}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-natural-forest-light font-mono italic mt-2 text-center">Click any kanji to hear pronunciation</p>
                    </div>
                  )}

                  <div className="flex gap-3 justify-center flex-wrap">
                    <button type="button" onClick={() => setKanjiQuizPhase("config")}
                      className="px-6 py-3 bg-natural-forest text-natural-bg rounded-2xl text-sm font-serif font-extrabold tracking-wider hover:bg-natural-forest/90 transition shadow-sm cursor-pointer flex items-center gap-2">
                      ↻ Play Again
                    </button>
                    <button type="button" onClick={returnToPracticeHub}
                      className="px-6 py-3 bg-natural-card border border-natural-border text-natural-forest rounded-2xl text-sm font-serif font-bold tracking-wider hover:border-natural-forest transition cursor-pointer">
                      ← Back to Practice
                    </button>
                    <button type="button" onClick={returnToPracticeHub}
                      className="px-6 py-3 bg-natural-clay/10 border border-natural-clay/30 text-natural-clay rounded-2xl text-sm font-serif font-bold tracking-wider hover:bg-natural-clay/20 transition cursor-pointer">
                      Practice Menu
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
  );
}
