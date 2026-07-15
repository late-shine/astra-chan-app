import type React from "react";
import { motion } from "motion/react";
import { CheckCircle2, ChevronLeft, X } from "lucide-react";
import { KANJI_DATA, VOCABULARY_DATA } from "../data";
import type { SRSCard } from "../types";

type CurrentScreen = "menu" | "quiz" | "kanji-scroll" | "profile" | "results" | "online-multiplayer" | "review-deck" | "vocab-quiz" | "kanji-quiz" | "charts" | "grammar-dojo";

interface ReviewDeckScreenProps {
  srsQueue: SRSCard[];
  srsQueueIndex: number;
  setSrsQueueIndex: React.Dispatch<React.SetStateAction<number>>;
  srsRevealed: boolean;
  setSrsRevealed: React.Dispatch<React.SetStateAction<boolean>>;
  answerCard: (itemKey: string, wasCorrect: boolean) => void;
  awardSRSXP: (xp: number) => void;
  playChime: (success: boolean) => void;
  setCurrentScreen: React.Dispatch<React.SetStateAction<CurrentScreen>>;
  totalCount: number;
}

export default function ReviewDeckScreen({
  srsQueue,
  srsQueueIndex,
  setSrsQueueIndex,
  srsRevealed,
  setSrsRevealed,
  answerCard,
  awardSRSXP,
  playChime,
  setCurrentScreen,
  totalCount,
}: ReviewDeckScreenProps) {
            const isDone = srsQueue.length === 0 || srsQueueIndex >= srsQueue.length;
            const currentCard = isDone ? null : srsQueue[srsQueueIndex];
            const vocabData  = currentCard?.type === "vocab"  ? VOCABULARY_DATA.find(v => v.word  === currentCard.itemKey) ?? null : null;
            const kanjiData  = currentCard?.type === "kanji"  ? KANJI_DATA.find(k => k.kanji === currentCard.itemKey) ?? null : null;
            const remaining  = srsQueue.length - srsQueueIndex;
            const pct        = srsQueue.length > 0 ? (srsQueueIndex / srsQueue.length) * 100 : 100;


  return (<motion.div
                key="review-deck-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-5 max-w-lg mx-auto w-full"
              >
                {/* ── Header ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentScreen("menu")}
                    className="px-3 py-1.5 bg-natural-bg/40 border border-natural-border text-natural-forest-light text-xs rounded-lg hover:border-natural-forest hover:text-natural-forest font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <div className="text-center">
                    <h3 className="font-serif font-extrabold text-natural-forest tracking-wider">
                      📦 Review Deck
                    </h3>
                    {!isDone && (
                      <span className="text-[10px] font-mono text-natural-forest-light uppercase tracking-widest font-bold">
                        {remaining} remaining
                      </span>
                    )}
                  </div>
                  {/* Spacer to keep header centred */}
                  <div className="w-16" />
                </div>

                {/* ── Progress bar ──────────────────────────────────────── */}
                <div className="w-full bg-natural-border/30 rounded-full h-1.5">
                  <div
                    className="bg-natural-forest h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {isDone ? (
                  /* ── Completion / empty-deck state ──────────────────────── */
                  <div className="bg-natural-card border border-natural-border/70 rounded-3xl p-10 flex flex-col items-center gap-5 text-center shadow-sm">
                    <span className="text-6xl">🌸</span>
                    <div>
                      <h4 className="font-serif font-extrabold text-xl text-natural-forest mb-2">
                        All caught up!
                      </h4>
                      <p className="text-sm text-natural-forest-light font-medium leading-relaxed">
                        Check back tomorrow for new reviews.
                      </p>
                      {srsQueue.length > 0 && (
                        <p className="mt-3 text-xs font-mono font-bold text-natural-clay bg-natural-clay/10 px-3 py-1.5 rounded-lg inline-block">
                          +{srsQueue.length * 5} XP earned this session ✨
                        </p>
                      )}
                      {totalCount === 0 && (
                        <p className="mt-3 text-xs text-natural-forest-light/70 font-medium">
                          Head to the Learn tab and tap ➕ on any word or kanji to add cards!
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentScreen("menu")}
                      className="px-6 py-2.5 bg-natural-forest text-natural-bg rounded-xl text-sm font-serif font-bold hover:bg-natural-forest/90 transition cursor-pointer shadow-sm"
                    >
                      Back to Menu
                    </button>
                  </div>
                ) : (
                  /* ── Active card review ───────────────────────────────── */
                  <>
                    {/* Card type badge */}
                    <div className="flex justify-center">
                      <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-natural-clay bg-natural-clay/10 px-3 py-1 rounded-full">
                        {currentCard!.type === "vocab" ? "Vocabulary" : "Kanji"} — Recall the meaning
                      </span>
                    </div>

                    {/* ── Flash card ──────────────────────────────────── */}
                    <div className="bg-natural-card border border-natural-border/70 p-8 rounded-3xl shadow-sm flex flex-col items-center gap-3 text-center min-h-[220px] justify-center">
                      {currentCard!.type === "vocab" && vocabData ? (
                        <>
                          <span className="text-5xl font-serif font-extrabold text-natural-forest leading-tight">
                            {vocabData.word}
                          </span>
                          {vocabData.hiragana !== vocabData.word && (
                            <span className="text-xl font-serif text-natural-forest/70">
                              {vocabData.hiragana}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-natural-forest-light uppercase tracking-widest font-bold">
                            {vocabData.romaji}
                          </span>
                          {srsRevealed && (
                            <div className="mt-3 pt-4 border-t border-natural-border w-full">
                              <span className="text-base font-serif italic text-natural-charcoal font-medium">
                                {vocabData.english}
                              </span>
                            </div>
                          )}
                        </>
                      ) : currentCard!.type === "kanji" && kanjiData ? (
                        <>
                          <span className="text-[80px] font-serif font-extrabold text-natural-forest my-1 tracking-normal leading-none">
                            {kanjiData.kanji}
                          </span>
                          <span className="text-xs font-mono text-natural-forest-light uppercase tracking-wide font-bold">
                            {kanjiData.strokeCount} strokes
                          </span>
                          {srsRevealed && (
                            <div className="mt-3 pt-4 border-t border-natural-border w-full">
                              <span className="text-base font-serif font-bold text-natural-charcoal block">
                                {kanjiData.meaning}
                              </span>
                              <span className="text-xs font-mono text-natural-forest-light block mt-1">
                                {kanjiData.kunyomi && `kun: ${kanjiData.kunyomi}`}{kanjiData.kunyomi && kanjiData.onyomi ? " · " : ""}{kanjiData.onyomi && `on: ${kanjiData.onyomi}`}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-natural-forest-light font-mono italic">
                          Card not found: {currentCard!.itemKey}
                        </span>
                      )}
                    </div>

                    {/* ── Action buttons ───────────────────────────────── */}
                    {!srsRevealed ? (
                      <button
                        type="button"
                        onClick={() => setSrsRevealed(true)}
                        className="w-full py-3.5 bg-natural-forest/10 border border-natural-forest/40 rounded-xl text-sm font-serif font-bold text-natural-forest hover:bg-natural-forest/20 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        👁 Reveal Answer
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            answerCard(currentCard!.itemKey, false);
                            awardSRSXP(5);
                            setSrsQueueIndex((prev) => prev + 1);
                            setSrsRevealed(false);
                            playChime(false);
                          }}
                          className="py-3.5 bg-natural-terracotta/10 border border-natural-terracotta/40 text-natural-terracotta rounded-xl text-sm font-bold hover:bg-natural-terracotta/20 transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" /> I forgot
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            answerCard(currentCard!.itemKey, true);
                            awardSRSXP(5);
                            setSrsQueueIndex((prev) => prev + 1);
                            setSrsRevealed(false);
                            playChime(true);
                          }}
                          className="py-3.5 bg-natural-forest/10 border border-natural-forest/40 text-natural-forest rounded-xl text-sm font-bold hover:bg-natural-forest/20 transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" /> I knew it
                        </button>
                      </div>
                    )}

                    {/* Card level indicator */}
                    <p className="text-center text-[10px] font-mono text-natural-forest-light/60 font-bold uppercase tracking-widest">
                      SRS Level {currentCard!.level} · {srsQueueIndex + 1} of {srsQueue.length}
                    </p>
                  </>
                )}
              </motion.div>
  );
}