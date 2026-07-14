import type React from "react";
import { motion } from "motion/react";
import { ChevronLeft, Info, Play, Volume2 } from "lucide-react";
import type { StudentStats, VocabularyItem } from "../types";

type VocabQuizMode = "meaning" | "reading";
type VocabQuizLength = 10 | 20 | "all";
type VocabQuizScope = "all" | "category" | "learned" | "custom";
type VocabQuizPhase = "config" | "quiz" | "results";
type VocabQuizAnswerStatus = "correct" | "incorrect" | null;

interface VocabQuizScreenProps {
  vocabQuizPhase: VocabQuizPhase;
  vocabQuizMode: VocabQuizMode;
  vocabQuizScope: VocabQuizScope;
  vocabQuizLength: VocabQuizLength;
  vocabQuizCustomWords: Set<string>;
  vocabQuizPool: VocabularyItem[];
  vocabQuizIndex: number;
  vocabQuizItem: VocabularyItem | null;
  vocabQuizChoices: string[];
  vocabQuizSelectedAnswer: string | null;
  vocabQuizAnswerStatus: VocabQuizAnswerStatus;
  vocabQuizCorrect: number;
  vocabQuizWrong: VocabularyItem[];
  vocabQuizXp: number;
  vocabularyData: VocabularyItem[];
  vocabsCategory: string;
  stats: StudentStats;
  speakJapanese: (phrase: string) => void;
  setVocabQuizPhase: React.Dispatch<React.SetStateAction<VocabQuizPhase>>;
  setVocabQuizMode: React.Dispatch<React.SetStateAction<VocabQuizMode>>;
  setVocabQuizScope: React.Dispatch<React.SetStateAction<VocabQuizScope>>;
  setVocabQuizLength: React.Dispatch<React.SetStateAction<VocabQuizLength>>;
  setVocabQuizCustomWords: React.Dispatch<React.SetStateAction<Set<string>>>;
  getVocabQuizScopeLabel: () => string;
  getVocabQuizKey: (item: VocabularyItem) => string;
  toggleVocabQuizCustomWord: (item: VocabularyItem) => void;
  startVocabQuiz: () => void;
  returnToPracticeHub: () => void;
  handleVocabAnswer: (answer: string) => void;
}

export default function VocabQuizScreen({
  vocabQuizPhase,
  vocabQuizMode,
  vocabQuizScope,
  vocabQuizLength,
  vocabQuizCustomWords,
  vocabQuizPool,
  vocabQuizIndex,
  vocabQuizItem,
  vocabQuizChoices,
  vocabQuizSelectedAnswer,
  vocabQuizAnswerStatus,
  vocabQuizCorrect,
  vocabQuizWrong,
  vocabQuizXp,
  vocabularyData,
  vocabsCategory,
  stats,
  speakJapanese,
  setVocabQuizPhase,
  setVocabQuizMode,
  setVocabQuizScope,
  setVocabQuizLength,
  setVocabQuizCustomWords,
  getVocabQuizScopeLabel,
  getVocabQuizKey,
  toggleVocabQuizCustomWord,
  startVocabQuiz,
  returnToPracticeHub,
  handleVocabAnswer,
}: VocabQuizScreenProps) {
  return (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-0"
            >
              {/* ── CONFIG PHASE ── */}
              {vocabQuizPhase === "config" && (
                <div className="bg-natural-card border border-natural-border/70 p-6 rounded-3xl shadow-lg flex flex-col items-center gap-5 max-w-sm mx-auto w-full">
                  <div className="text-center">
                    <p className="text-4xl mb-2">📝</p>
                    <h3 className="font-serif font-extrabold text-xl text-natural-forest tracking-wide">Vocabulary Quiz</h3>
                    <p className="text-xs text-natural-forest-light font-mono mt-1 uppercase tracking-wider">
                      {getVocabQuizScopeLabel()}
                    </p>
                  </div>

                  {/* Pool selector */}
                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">Practice Pool</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: "all" as const, label: "All", desc: `${vocabularyData.length} words` },
                        { key: "category" as const, label: "Category", desc: vocabsCategory === "all" ? "Current: all" : vocabsCategory },
                        { key: "learned" as const, label: "Learned", desc: `${vocabularyData.filter(v => !!stats.vocabularyProgress[v.word]).length} words` },
                        { key: "custom" as const, label: "Custom", desc: `${vocabQuizCustomWords.size} selected` },
                      ]).map(opt => (
                        <button key={opt.key} type="button" onClick={() => setVocabQuizScope(opt.key)}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${vocabQuizScope === opt.key
                            ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-bold"
                            : "bg-natural-bg border-natural-border text-natural-charcoal hover:border-natural-forest/40"}`}>
                          <span className="block text-xs font-bold">{opt.label}</span>
                          <span className="block text-[9px] font-mono opacity-70 mt-0.5 uppercase">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                    {vocabQuizScope === "category" && (
                      <p className="text-[10px] text-natural-forest-light font-mono mt-2">
                        Uses the category currently selected in Learn &gt; Words.
                      </p>
                    )}
                  </div>

                  {vocabQuizScope === "custom" && (
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider">Select Words</label>
                        <button type="button" onClick={() => setVocabQuizCustomWords(new Set())}
                          className="text-[10px] font-mono text-natural-clay hover:text-natural-terracotta transition cursor-pointer">
                          Clear
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                        {vocabularyData.map((v) => {
                          const key = getVocabQuizKey(v);
                          const isSelected = vocabQuizCustomWords.has(key);
                          return (
                            <button key={key} type="button" onClick={() => toggleVocabQuizCustomWord(v)}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer ${isSelected
                                ? "bg-natural-clay/10 border-natural-clay text-natural-clay"
                                : "bg-natural-bg border-natural-border text-natural-charcoal hover:border-natural-clay/40"}`}>
                              <span className="block text-xs font-serif font-extrabold">{v.word} <span className="font-mono text-[9px] opacity-70">{v.hiragana}</span></span>
                              <span className="block text-[10px] font-serif italic opacity-80 truncate">{v.english}</span>
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
                        { key: "meaning" as const, label: "Meaning", desc: "JP → English" },
                        { key: "reading" as const, label: "Reading", desc: "English → Hiragana" },
                      ]).map(opt => (
                        <button key={opt.key} type="button" onClick={() => setVocabQuizMode(opt.key)}
                          className={`p-3 rounded-xl border text-center transition cursor-pointer ${vocabQuizMode === opt.key
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
                        <button key={String(len)} type="button" onClick={() => setVocabQuizLength(len)}
                          className={`py-2.5 rounded-xl border text-xs font-bold font-mono transition cursor-pointer ${vocabQuizLength === len
                            ? "bg-natural-forest/10 border-natural-forest text-natural-forest"
                            : "bg-natural-bg border-natural-border text-natural-charcoal hover:border-natural-forest/40"}`}>
                          {len === "all" ? "All" : `${len} Q`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="button" onClick={startVocabQuiz}
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
              {vocabQuizPhase === "quiz" && vocabQuizItem && (
                <div className="bg-natural-card border border-natural-border/70 p-6 rounded-3xl flex flex-col items-center shadow-lg backdrop-blur">
                  {/* Header */}
                  <div className="flex items-center justify-between w-full mb-4 pb-2 border-b border-natural-border">
                    <button type="button" onClick={returnToPracticeHub}
                      className="px-3 py-1.5 rounded-lg border border-natural-border text-natural-forest-light text-xs hover:border-natural-forest hover:text-natural-forest bg-natural-bg/40 font-semibold transition flex items-center gap-1.5 cursor-pointer">
                      <ChevronLeft className="w-3.5 h-3.5" /> Escape Session
                    </button>
                    <span className="text-xs text-natural-forest font-mono tracking-wider font-bold">
                      WORD {vocabQuizIndex + 1} OF {vocabQuizPool.length}
                    </span>
                    <button type="button" onClick={() => speakJapanese(vocabQuizItem.word)}
                      className="p-1.5 bg-natural-bg hover:bg-natural-forest/10 text-natural-forest border border-natural-border rounded-lg transition shadow-sm cursor-pointer">
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Question card */}
                  <div className="my-4 flex flex-col items-center gap-2 w-full">
                    <motion.div
                      key={vocabQuizItem.word + vocabQuizMode}
                      animate={
                        vocabQuizAnswerStatus === "correct" ? { scale: [1, 1.07, 1], rotate: [0, 2, -2, 0] }
                          : vocabQuizAnswerStatus === "incorrect" ? { x: [-10, 10, -7, 7, 0] }
                          : {}
                      }
                      transition={{ duration: 0.4 }}
                      className={`w-full max-w-sm min-h-[120px] border-2 rounded-3xl flex flex-col items-center justify-center px-6 py-5 bg-natural-bg/50 transition shadow-sm relative ${
                        vocabQuizAnswerStatus === "correct" ? "border-natural-forest bg-natural-forest/10"
                          : vocabQuizAnswerStatus === "incorrect" ? "border-natural-terracotta bg-natural-terracotta/10"
                          : "border-natural-border"}`}
                    >
                      {vocabQuizMode === "meaning" ? (
                        <>
                          <span className="text-4xl font-serif font-extrabold text-natural-forest text-center leading-tight">
                            {vocabQuizItem.word}
                          </span>
                          {vocabQuizItem.hiragana !== vocabQuizItem.word && (
                            <span className="text-sm font-serif text-natural-forest-light mt-1">{vocabQuizItem.hiragana}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-2xl font-serif font-bold text-natural-charcoal text-center italic leading-snug">
                          "{vocabQuizItem.english}"
                        </span>
                      )}
                      <span className="mt-2 text-[9px] font-mono uppercase tracking-widest text-natural-clay/70 bg-natural-clay/10 px-2 py-0.5 rounded font-bold">
                        {vocabQuizItem.category}
                      </span>
                    </motion.div>
                    <p className="text-[10px] text-natural-forest-light font-mono uppercase tracking-wider">
                      {vocabQuizMode === "meaning" ? "Choose the English meaning" : "Choose the correct reading"}
                    </p>
                  </div>

                  {/* Answer grid */}
                  <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-2">
                    {vocabQuizChoices.map((ch, idx) => {
                      const correct = vocabQuizMode === "meaning" ? vocabQuizItem.english : vocabQuizItem.hiragana;
                      let cls = "bg-natural-bg/50 border-natural-border/70 hover:border-natural-forest text-natural-charcoal/80";
                      if (vocabQuizSelectedAnswer === ch || vocabQuizAnswerStatus !== null) {
                        if (ch === correct) cls = "bg-natural-forest/20 border-natural-forest text-natural-forest font-black";
                        else if (vocabQuizSelectedAnswer === ch) cls = "bg-natural-terracotta/20 border-natural-terracotta text-natural-terracotta font-black";
                      }
                      return (
                        <button key={idx} type="button" onClick={() => handleVocabAnswer(ch)}
                          disabled={vocabQuizAnswerStatus !== null}
                          className={`p-3.5 rounded-xl border font-serif text-sm font-bold transition cursor-pointer text-center leading-snug ${cls}`}>
                          {ch}
                        </button>
                      );
                    })}
                  </div>

                  {/* Post-answer example */}
                  {vocabQuizAnswerStatus !== null && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="w-full max-w-md mt-5 p-3.5 bg-natural-bg rounded-2xl border border-natural-border flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-natural-clay font-mono uppercase tracking-widest flex items-center gap-1 font-bold">
                          <Info className="w-3 h-3" /> Word Details
                        </p>
                        <span className="text-[9px] font-mono text-natural-forest-light">
                          {vocabQuizItem.romaji}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span><span className="text-natural-forest-light font-mono text-[9px] uppercase">JP: </span><span className="font-serif font-bold text-natural-forest">{vocabQuizItem.word}</span></span>
                        <span><span className="text-natural-forest-light font-mono text-[9px] uppercase">Reading: </span><span className="font-serif text-natural-charcoal">{vocabQuizItem.hiragana}</span></span>
                        <span><span className="text-natural-forest-light font-mono text-[9px] uppercase">EN: </span><span className="font-serif italic text-natural-charcoal">{vocabQuizItem.english}</span></span>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── RESULTS PHASE ── */}
              {vocabQuizPhase === "results" && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-5">
                  <div className="bg-natural-card border border-natural-border/70 p-6 rounded-3xl shadow-sm flex flex-col items-center gap-3 text-center relative overflow-hidden">
                    <span className="absolute text-[120px] font-serif text-natural-forest/5 select-none pointer-events-none top-1/2 -translate-y-1/2">語</span>
                    <div className="relative z-10">
                      <p className="text-4xl mb-1">
                        {vocabQuizCorrect === vocabQuizPool.length ? "🎉" : vocabQuizCorrect >= vocabQuizPool.length * 0.7 ? "✨" : vocabQuizCorrect >= vocabQuizPool.length * 0.5 ? "📖" : "🌱"}
                      </p>
                      <h3 className="font-serif font-extrabold text-natural-forest text-xl tracking-wide">
                        {vocabQuizCorrect === vocabQuizPool.length ? "Perfect Score!" : vocabQuizCorrect >= vocabQuizPool.length * 0.7 ? "Great Work!" : vocabQuizCorrect >= vocabQuizPool.length * 0.5 ? "Good Effort!" : "Keep Practicing!"}
                      </h3>
                      <p className="text-xs text-natural-forest-light font-mono mt-1">Vocabulary Quiz Complete</p>
                    </div>
                    <div className="flex items-center gap-4 mt-1 relative z-10">
                      <div className="flex flex-col items-center px-5 py-3 bg-natural-bg border border-natural-border rounded-2xl shadow-sm">
                        <span className="text-3xl font-mono font-extrabold text-natural-forest">{vocabQuizCorrect}<span className="text-natural-forest-light text-xl">/{vocabQuizPool.length}</span></span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-natural-forest-light mt-0.5 font-bold">Correct</span>
                      </div>
                      <div className="flex flex-col items-center px-5 py-3 bg-natural-bg border border-natural-border rounded-2xl shadow-sm">
                        <span className="text-3xl font-mono font-extrabold text-natural-clay">+{vocabQuizXp}</span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-natural-forest-light mt-0.5 font-bold">XP Earned</span>
                      </div>
                      <div className="flex flex-col items-center px-5 py-3 bg-natural-bg border border-natural-border rounded-2xl shadow-sm">
                        <span className="text-3xl font-mono font-extrabold text-natural-forest">
                          {vocabQuizPool.length > 0 ? Math.round((vocabQuizCorrect / vocabQuizPool.length) * 100) : 0}%
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-natural-forest-light mt-0.5 font-bold">Accuracy</span>
                      </div>
                    </div>
                  </div>

                  {vocabQuizWrong.length > 0 && (
                    <div className="bg-natural-card border border-natural-border/70 p-4 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-2 mb-3 border-b border-natural-border/40 pb-2">
                        <span className="text-sm">📝</span>
                        <p className="text-xs font-serif font-extrabold text-natural-forest tracking-wider uppercase">Review These Words</p>
                        <span className="ml-auto text-[9px] font-mono bg-natural-terracotta/10 text-natural-terracotta px-2 py-0.5 rounded font-bold uppercase">
                          {vocabQuizWrong.length} missed
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {vocabQuizWrong.map((v, i) => (
                          <div key={`${v.word}-${i}`} className="flex items-center justify-between p-2.5 bg-natural-terracotta/5 border border-natural-terracotta/20 rounded-xl">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => speakJapanese(v.word)}
                                className="p-1.5 bg-natural-card border border-natural-border text-natural-forest rounded-lg hover:bg-natural-forest/10 transition cursor-pointer">
                                <Volume2 className="w-3 h-3" />
                              </button>
                              <div>
                                <span className="text-sm font-serif font-bold text-natural-terracotta">{v.word}</span>
                                {v.hiragana !== v.word && <span className="text-[10px] text-natural-forest-light font-mono ml-1.5">{v.hiragana}</span>}
                              </div>
                            </div>
                            <span className="text-xs font-serif italic text-natural-charcoal/80">{v.english}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 justify-center flex-wrap">
                    <button type="button" onClick={() => { setVocabQuizPhase("config"); }}
                      className="px-6 py-3 bg-natural-forest text-natural-bg rounded-2xl text-sm font-serif font-extrabold tracking-wider hover:bg-natural-forest/90 transition shadow-sm cursor-pointer flex items-center gap-2">
                      ↻ Play Again
                    </button>
                    <button type="button" onClick={returnToPracticeHub}
                      className="px-6 py-3 bg-natural-card border border-natural-border text-natural-forest rounded-2xl text-sm font-serif font-bold tracking-wider hover:border-natural-forest transition cursor-pointer">
                      ← Back to Practice
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
  );
}
