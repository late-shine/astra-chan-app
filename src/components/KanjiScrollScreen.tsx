import type React from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Sparkles, Volume2 } from "lucide-react";
import DrawingCanvas from "./DrawingCanvas";
import type { KanjiItem } from "../types";
import companionImg from "../assets/images/synthid-removed-Gemini_Generated_Image_csh1tcsh1tcsh1tc.png";

type CurrentScreen = "menu" | "quiz" | "kanji-scroll" | "profile" | "results" | "online-multiplayer" | "review-deck" | "vocab-quiz" | "kanji-quiz" | "charts" | "grammar-dojo";
type AnalysisResult = { score: number; feedbackTitle: string; advice: string } | null;

interface KanjiScrollScreenProps {
  currentKanjiIndex: number;
  kanjiData: KanjiItem[];
  isAnalyzing: boolean;
  analysisResult: AnalysisResult;
  analysisError: string | null;
  speakJapanese: (phrase: string) => void;
  setCurrentScreen: React.Dispatch<React.SetStateAction<CurrentScreen>>;
  hasCard: (itemKey: string) => boolean;
  addCard: (itemKey: string, type: "vocab" | "kanji" | "hiragana" | "katakana") => void;
  showToast: (message: string) => void;
  handleKanjiNav: (dir: "prev" | "next") => void;
  handleContemplateKanji: () => void;
  handleEvaluateKanjiDrawing: () => void;
}

export default function KanjiScrollScreen({
  currentKanjiIndex,
  kanjiData,
  isAnalyzing,
  analysisResult,
  analysisError,
  speakJapanese,
  setCurrentScreen,
  hasCard,
  addCard,
  showToast,
  handleKanjiNav,
  handleContemplateKanji,
  handleEvaluateKanjiDrawing,
}: KanjiScrollScreenProps) {
  return (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-5 gap-6"
            >
              {/* Left Column: Kanji Scripture Slide details */}
              <div className="md:col-span-3 flex flex-col bg-natural-card border border-natural-border/70 p-5 rounded-3xl shadow-sm self-start">
                <div className="flex items-center justify-between mb-4 border-b border-natural-border pb-3">
                  <button
                    type="button"
                    onClick={() => setCurrentScreen("menu")}
                    className="px-3 py-1 bg-natural-bg/40 border border-natural-border text-natural-forest-light text-xs rounded-lg hover:border-natural-forest hover:text-natural-forest font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="text-[10px] text-natural-clay font-mono tracking-widest uppercase font-extrabold">
                    DAILY PARADIGM · {currentKanjiIndex + 1} OF {kanjiData.length}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  {/* Big massive glow reference character */}
                  <span className="text-80px font-serif font-extrabold text-natural-forest my-4 tracking-normal">
                    {kanjiData[currentKanjiIndex].kanji}
                  </span>

                  <h3 className="text-xl font-bold font-serif text-natural-charcoal mb-1">
                    {kanjiData[currentKanjiIndex].meaning}
                  </h3>

                  <div className="flex items-center gap-2 mb-4">
                    <button
                      type="button"
                      id="kanji-pronounce-speaker"
                      onClick={() => speakJapanese(kanjiData[currentKanjiIndex].kanji)}
                      className="px-4 py-1.5 bg-natural-bg hover:bg-natural-forest/10 border border-natural-border rounded-lg text-xs font-mono font-bold text-natural-forest tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-natural-forest" />
                      PRONOUNCE VOICE
                    </button>

                    {/* ➕ Add to SRS Review Deck */}
                    <button
                      type="button"
                      onClick={() => {
                        const k = kanjiData[currentKanjiIndex];
                        if (hasCard(k.kanji)) {
                          showToast("Already in your Review Deck!");
                        } else {
                          addCard(k.kanji, "kanji");
                          showToast("Added to Review Deck! ✨");
                        }
                      }}
                      className={`px-4 py-1.5 border rounded-lg text-xs font-mono font-bold tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        hasCard(kanjiData[currentKanjiIndex].kanji)
                          ? "bg-natural-clay/10 border-natural-clay/40 text-natural-clay/60"
                          : "bg-natural-bg hover:bg-natural-clay/10 border-natural-border hover:border-natural-clay text-natural-forest-light hover:text-natural-clay"
                      }`}
                      title={hasCard(kanjiData[currentKanjiIndex].kanji) ? "Already in Review Deck" : "Add to Review Deck"}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {hasCard(kanjiData[currentKanjiIndex].kanji) ? "IN DECK" : "ADD TO DECK"}
                    </button>
                  </div>

                  {/* Onyomi / Kunyomi matrix */}
                  <div className="grid grid-cols-2 gap-3 w-full p-3.5 bg-natural-bg rounded-2xl border border-natural-border text-xs">
                    <div>
                      <span className="text-[10px] text-natural-clay font-mono uppercase tracking-wider block mb-1 font-bold">
                        Onyomi (Chinese)
                      </span>
                      <span className="font-serif font-bold text-sm block text-natural-charcoal">
                        {kanjiData[currentKanjiIndex].onyomi}
                      </span>
                      <span className="text-[10px] text-natural-forest-light font-mono opacity-80 uppercase font-bold block mt-0.5">
                        {kanjiData[currentKanjiIndex].onyomiRomaji}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-natural-clay font-mono uppercase tracking-wider block mb-1 font-bold">
                        Kunyomi (Japanese)
                      </span>
                      <span className="font-serif font-bold text-sm block text-natural-forest">
                        {kanjiData[currentKanjiIndex].kunyomi}
                      </span>
                      <span className="text-[10px] text-natural-forest-light font-mono opacity-80 uppercase block mt-0.5 font-bold">
                        {kanjiData[currentKanjiIndex].kunyomiRomaji}
                      </span>
                    </div>
                  </div>

                  {/* Mnemonics explanation details */}
                  <div className="w-full mt-4 p-3 bg-natural-bg border-l-2 border-natural-clay rounded-r-xl text-[12px] text-natural-charcoal/80 leading-relaxed font-medium">
                    <span className="font-serif font-bold text-natural-clay uppercase text-[10px] tracking-wider block mb-1">
                      Mnemonic Device
                    </span>
                    "{kanjiData[currentKanjiIndex].mnemonic}"
                  </div>

                  {/* Examples usage section */}
                  {kanjiData[currentKanjiIndex].examples && kanjiData[currentKanjiIndex].examples.length > 0 && (
                    <div className="flex flex-col gap-2 w-full mt-4">
                      <p className="text-[10px] text-natural-clay font-mono uppercase tracking-widest leading-none font-bold">
                        Correct Word Form Usage Examples
                      </p>

                      {kanjiData[currentKanjiIndex].examples.map((ex, exIdx) => (
                        <div key={exIdx} className="flex justify-between items-center text-xs bg-natural-bg/40 border border-natural-border p-2.5 rounded-xl">
                          <div>
                            <span className="block text-natural-charcoal font-bold font-serif">{ex.japanese}</span>
                            <span className="text-[10px] text-natural-forest-light font-mono tracking-wide uppercase font-semibold">Romaji: {ex.romaji}</span>
                          </div>
                          <span className="text-natural-charcoal font-medium font-serif italic">{ex.english}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Next / Prior buttons footer */}
                  <div className="flex justify-between items-center gap-3 w-full mt-5 pt-3 border-t border-natural-border">
                    <button
                      type="button"
                      onClick={() => handleKanjiNav("prev")}
                      className="px-3 py-2 border border-natural-border rounded-lg text-xs hover:border-natural-forest hover:text-natural-forest transition flex items-center gap-1 font-semibold text-natural-forest-light cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    <button
                      type="button"
                      onClick={handleContemplateKanji}
                      className="p-2 px-4 bg-natural-clay text-natural-bg hover:bg-natural-clay/90 border border-transparent rounded-lg text-xs font-serif font-extrabold tracking-wider transition hover:shadow-md cursor-pointer"
                    >
                      Record Study (+40 XP)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleKanjiNav("next")}
                      className="px-3 py-2 border border-natural-border rounded-lg text-xs hover:border-natural-forest hover:text-natural-forest transition flex items-center gap-1 font-semibold text-natural-forest-light cursor-pointer"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic drawing practice area workspace */}
              <div className="md:col-span-2 flex flex-col justify-start gap-4 animate-fade-in">
                <DrawingCanvas referenceChar={kanjiData[currentKanjiIndex].kanji} />

                {/* Astra-Chan Calligraphy Analysis Station */}
                <div className="bg-natural-card border border-natural-border/70 p-4 rounded-3xl shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-natural-border/40 pb-2">
                    <span className="text-[10px] font-mono text-natural-clay uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-natural-clay" />
                      ASTRA-CHAN'S INK STATION
                    </span>
                    <span className="text-[9px] font-mono text-natural-forest bg-natural-forest/10 px-2 py-0.5 rounded font-extrabold uppercase">
                      AI Accuracy Engine
                    </span>
                  </div>

                  {/* Submit Button or Loading State */}
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-natural-bg/50 border border-dashed border-natural-border/80 rounded-2xl text-center gap-3">
                      <RefreshCw className="w-8 h-8 text-natural-clay animate-spin" />
                      <div>
                        <p className="text-xs font-serif font-bold text-natural-charcoal">Astra-chan is scanning your strokes...</p>
                        <p className="text-[10.5px] text-natural-forest-light mt-1 font-medium italic">"Checking brush weights, alignment, and spiritual canvas balance!"</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEvaluateKanjiDrawing}
                      className="w-full py-3 bg-natural-forest text-natural-bg hover:bg-natural-forest/90 border border-transparent rounded-2xl text-xs font-serif font-extrabold tracking-wider transition hover:shadow-md cursor-pointer flex items-center justify-center gap-2 uppercase"
                    >
                      ✨ Check Stroke Accuracy with Astra-chan
                    </button>
                  )}

                  {/* Rendering Assessment Errors — prominent fallback with offline hint */}
                  {analysisError && (
                    <div className="p-4 bg-natural-terracotta/10 border border-natural-terracotta/30 rounded-2xl text-left flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚠️</span>
                        <span className="text-xs font-serif font-extrabold text-natural-terracotta">AI Checker Unavailable</span>
                      </div>
                      <p className="text-xs text-natural-charcoal leading-relaxed font-sans">{analysisError}</p>
                      <div className="mt-1 p-2.5 bg-natural-bg/70 rounded-xl border border-natural-border/50">
                        <p className="text-[10px] font-mono text-natural-forest-light font-semibold uppercase tracking-wider mb-1">✏️ Offline Self-Check Tips</p>
                        <ul className="text-[11px] text-natural-charcoal/80 leading-relaxed space-y-0.5 font-sans">
                          <li>• Does your stroke count match the reference ghost character?</li>
                          <li>• Are strokes flowing top-to-bottom and left-to-right?</li>
                          <li>• Does it fit neatly inside the grid square?</li>
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={handleEvaluateKanjiDrawing}
                        className="mt-1 py-2 bg-natural-forest/10 hover:bg-natural-forest/20 text-natural-forest border border-natural-forest/20 rounded-xl text-xs font-serif font-bold tracking-wider transition cursor-pointer"
                      >
                        ↻ Retry with AI
                      </button>
                    </div>
                  )}

                  {/* Rendering Astra-chan's Success / Critique Report Card */}
                  {analysisResult && (
                    <div className="flex flex-col gap-3">
                      {/* Score Badge Header */}
                      <div className="flex items-center gap-3 p-3 bg-natural-bg rounded-2xl border border-natural-border/50">
                        <div className="w-12 h-12 rounded-full border-2 border-natural-clay flex items-center justify-center bg-natural-card font-mono text-base font-extrabold text-natural-charcoal shadow-inner shrink-0 relative">
                          {Number(analysisResult.score) || "?"}%
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-[#D26E40] uppercase tracking-wider font-extrabold">VERDICT ACCURACY</span>
                          <h5 className="font-serif font-extrabold text-xs text-natural-forest leading-tight mt-0.5">
                            {analysisResult.feedbackTitle}
                          </h5>
                        </div>
                      </div>

                      {/* Mascot Speech Bubble containing actual tips */}
                      <div className="relative bg-natural-bg/60 border border-natural-border p-3.5 rounded-2xl text-left shadow-sm">
                        {/* Little triangle for bubble pointing upwards */}
                        <div className="absolute top-[-6px] left-8 w-3 h-3 bg-natural-card border-t border-l border-natural-border rotate-45"></div>

                        <div className="flex gap-2.5 items-start relative z-10">
                          <div className="w-8 h-8 rounded-full border border-natural-forest/20 bg-natural-bg overflow-hidden shrink-0 shadow-sm relative">
                            <img
                              src={companionImg}
                              alt="Astra-chan"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover scale-105"
                            />
                          </div>
                          <div className="text-xs text-natural-charcoal/90 leading-relaxed font-sans font-medium whitespace-pre-wrap flex-grow">
                            <span className="font-serif font-extrabold text-natural-forest block mb-1">Astra-chan says:</span>
                            {analysisResult.advice}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-natural-forest-light text-center leading-normal italic px-2 font-medium">
                    Tip: Be sure to draw inside the grid guidelines frame, trace accurately, and clear previous brushmarks before evaluating new ones!
                  </p>
                </div>
              </div>
            </motion.div>
  );
}
