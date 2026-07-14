/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import {
  Flame,
  Volume2,
  BookOpen,
  Award,
  ChevronLeft,
  BookMarked,
  Info,
  PenTool,
  Play,
  Search,
  CheckCircle2,
  HelpCircle,
  Activity,
  BookOpenCheck,
  Globe,
  Clock,
  Plus,
  Table2,
  GraduationCap,
  User,
} from "lucide-react";

import { HIRAGANA_DATA, KATAKANA_DATA, KANJI_DATA, VOCABULARY_DATA } from "../data";
import { HiraganaItem, KatakanaItem, StudentStats, SRSCard } from "../types";
import wonderingImg from "../assets/images/astra-wondering.jpeg";
import excitedImg from "../assets/images/astra-excited.png.jpeg";
import companionImg from "../assets/images/synthid-removed-Gemini_Generated_Image_csh1tcsh1tcsh1tc.png";

// ─── Local screen/state type aliases (mirror the unions declared inline via
// useState<...> in App.tsx — kept local to this component's props, per the
// prop-passing pattern already used for GrammarDojo.tsx) ──────────────────
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

// ─── Local audio helpers (mirror the module-scope helpers in App.tsx;
// duplicated here rather than imported/passed as props since they are pure,
// stateless, side-effect-only functions with no App state dependency —
// same approach GrammarDojo.tsx takes with its local `speak` helper) ──────
function playClickTick() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.01);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.008, now + 0.002); // Absolute whisper-quiet faint tick
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.012); // Fades completely over 12 milliseconds

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.015);
  } catch (err) { }
}

function playChime(success: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (success) {
      // Gentle, faint satisfying digital tick (like a soft organic water bubble or mechanical keyboard stroke)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.03); // Extremely fast organic pitch slide

      // Micro envelope to prevent popping while remaining a faint, rapid tactile tick
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.012, now + 0.003); // Super faint peak (reduced from 0.03)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.035); // Rapid 35ms decay to absolute silence

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } else {
      // Gentle soft warm low mechanical 'tuck'
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.015, now + 0.004); // Faint feedback
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch (err) {
    console.warn("Audio Context block or unsupported browser", err);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────

interface MenuScreenProps {
  // Navigation
  setCurrentScreen: React.Dispatch<React.SetStateAction<ScreenType>>;
  setCurrentKanjiIndex: React.Dispatch<React.SetStateAction<number>>;
  setVocabQuizPhase: React.Dispatch<React.SetStateAction<"config" | "quiz" | "results">>;
  setKanjiQuizPhase: React.Dispatch<React.SetStateAction<"config" | "quiz" | "results">>;
  openOnlineMultiplayer: () => void;
  openCharPicker: (mode: "choice" | "romaji" | "survival") => void;

  // Study room / hub tab state
  showStudyRoom: boolean;
  setShowStudyRoom: React.Dispatch<React.SetStateAction<boolean>>;
  activeHubTab: "learn" | "practice";
  setActiveHubTab: React.Dispatch<React.SetStateAction<"learn" | "practice">>;
  mascotMood: MascotMood;
  setMascotMood: React.Dispatch<React.SetStateAction<MascotMood>>;
  setIsMusicExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAtmosphereExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  // SRS / Review Deck
  dueCount: number;
  totalCount: number;
  getDueCards: () => SRSCard[];
  setSrsQueue: React.Dispatch<React.SetStateAction<SRSCard[]>>;
  setSrsQueueIndex: React.Dispatch<React.SetStateAction<number>>;
  setSrsRevealed: React.Dispatch<React.SetStateAction<boolean>>;

  // Learn tab: sub-tabs, character picking, archive filter
  subLearnTab: "hiragana" | "katakana" | "kanji" | "vocabulary";
  setSubLearnTab: React.Dispatch<React.SetStateAction<"hiragana" | "katakana" | "kanji" | "vocabulary">>;
  archiveFilter: string;
  setArchiveFilter: React.Dispatch<React.SetStateAction<string>>;
  selectedLearnChar: HiraganaItem | KatakanaItem | null;
  setSelectedLearnChar: React.Dispatch<React.SetStateAction<HiraganaItem | KatakanaItem | null>>;
  speakJapanese: (phrase: string) => void;

  // Learn tab: vocabulary garden
  vocabsSearch: string;
  setVocabsSearch: React.Dispatch<React.SetStateAction<string>>;
  vocabsCategory: string;
  setVocabsCategory: React.Dispatch<React.SetStateAction<string>>;
  stats: StudentStats;
  setStats: React.Dispatch<React.SetStateAction<StudentStats>>;
  showToast: (message: string) => void;
  hasCard: (word: string) => boolean;
  addCard: (word: string, type: SRSCard["type"]) => void;

  // Practice tab: quiz settings
  quizAlphabet: "hiragana" | "katakana" | "both";
  setQuizAlphabet: React.Dispatch<React.SetStateAction<"hiragana" | "katakana" | "both">>;
  selectedStages: string[];
  handleToggleStage: (stageCode: string) => void;
  selectedDifficulty: "relax" | "medium" | "hard" | "legend";
  setSelectedDifficulty: React.Dispatch<React.SetStateAction<"relax" | "medium" | "hard" | "legend">>;
  selectedJapaneseVoiceURI: string;
  handleSelectJapaneseVoice: (voiceURI: string) => void;
  availableJapaneseVoices: SpeechSynthesisVoice[];
  autoPronounce: boolean;
  setAutoPronounce: React.Dispatch<React.SetStateAction<boolean>>;
  numChoices: 4 | 6;
  setNumChoices: React.Dispatch<React.SetStateAction<4 | 6>>;
}

// Handler moved here from App.tsx: >15 lines, used only by the menu screen
// (vocabulary "mark as mastered" toggle in the Learn > Vocabulary tab).
function useHandleToggleVocabularyLearned(
  stats: StudentStats,
  setStats: React.Dispatch<React.SetStateAction<StudentStats>>,
  showToast: (message: string) => void,
) {
  return (word: string) => {
    // FIX: Use functional state update to avoid stale-closure XP loss
    setStats((prev) => {
      const isLearned = !!prev.vocabularyProgress[word];
      const newProgress = { ...prev.vocabularyProgress };
      let xpGain = 0;

      if (!isLearned) {
        newProgress[word] = true;
        xpGain = 5;
      } else {
        delete newProgress[word];
      }

      const updated = {
        ...prev,
        xp: prev.xp + xpGain,
        vocabularyProgress: newProgress,
      };
      localStorage.setItem("hirachan_master_stats_v1", JSON.stringify(updated));
      return updated;
    });

    // Show toast outside the functional update so it reflects the action
    const wasLearned = !!stats.vocabularyProgress[word];
    if (!wasLearned) {
      showToast(`Mastered word "${word}". +5 XP Garden Reward!`);
      playChime(true);
    } else {
      showToast(`Returned "${word}" to the study lists.`);
    }
  };
}

export default function MenuScreen(props: MenuScreenProps) {
  const {
    setCurrentScreen,
    setCurrentKanjiIndex,
    setVocabQuizPhase,
    setKanjiQuizPhase,
    openOnlineMultiplayer,
    openCharPicker,
    showStudyRoom,
    setShowStudyRoom,
    activeHubTab,
    setActiveHubTab,
    mascotMood,
    setMascotMood,
    setIsMusicExpanded,
    setIsAtmosphereExpanded,
    dueCount,
    totalCount,
    getDueCards,
    setSrsQueue,
    setSrsQueueIndex,
    setSrsRevealed,
    subLearnTab,
    setSubLearnTab,
    archiveFilter,
    setArchiveFilter,
    selectedLearnChar,
    setSelectedLearnChar,
    speakJapanese,
    vocabsSearch,
    setVocabsSearch,
    vocabsCategory,
    setVocabsCategory,
    stats,
    setStats,
    showToast,
    hasCard,
    addCard,
    quizAlphabet,
    setQuizAlphabet,
    selectedStages,
    handleToggleStage,
    selectedDifficulty,
    setSelectedDifficulty,
    selectedJapaneseVoiceURI,
    handleSelectJapaneseVoice,
    availableJapaneseVoices,
    autoPronounce,
    setAutoPronounce,
    numChoices,
    setNumChoices,
  } = props;

  const handleToggleVocabularyLearned = useHandleToggleVocabularyLearned(stats, setStats, showToast);

  return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              {showStudyRoom ? (
                <div className="relative overflow-hidden rounded-3xl border border-natural-border/70 bg-natural-card/80 shadow-lg backdrop-blur p-5 sm:p-7">
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_15%,rgba(141,116,82,0.16),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(69,102,80,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.35),rgba(255,255,255,0))]" />
                  <div className="relative z-10 flex flex-col gap-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5 items-stretch">
                      <div className="flex flex-col justify-between gap-5 min-h-[270px] rounded-2xl border border-natural-border/70 bg-natural-bg/55 p-5">
                        <div>
                          <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.22em] text-natural-clay">
                            Astra's Study Room
                          </span>
                          <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-extrabold text-natural-forest tracking-wide">
                            Choose a corner to study from.
                          </h2>
                          <p className="mt-2 max-w-xl text-sm text-natural-forest-light leading-relaxed">
                            A quieter home for the same tools. Pick one place, focus there, and return whenever you need another path.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-natural-clay/25 bg-natural-clay/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-natural-clay">Today's Spell</p>
                              <p className="mt-1 text-sm font-serif font-bold text-natural-forest">
                                {dueCount > 0
                                  ? `Review ${dueCount} due card${dueCount === 1 ? "" : "s"}`
                                  : "Practice one short round"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (dueCount > 0) {
                                  setSrsQueue(getDueCards());
                                  setSrsQueueIndex(0);
                                  setSrsRevealed(false);
                                  setCurrentScreen("review-deck");
                                } else {
                                  setShowStudyRoom(false);
                                  setActiveHubTab("practice");
                                  setMascotMood("idle");
                                }
                              }}
                              className="shrink-0 px-4 py-2 rounded-xl bg-natural-forest text-natural-bg text-xs font-serif font-extrabold tracking-wide shadow-sm hover:bg-natural-forest/90 transition cursor-pointer"
                            >
                              Begin
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="relative min-h-[270px] rounded-2xl border border-natural-border/70 bg-natural-bg/60 overflow-hidden p-5 flex items-center justify-center">
                        <div className="absolute inset-x-8 top-7 h-24 rounded-b-[2rem] border border-natural-forest/20 bg-natural-forest/10" />
                        <div className="absolute bottom-5 left-8 right-8 h-16 rounded-2xl border border-natural-clay/25 bg-natural-clay/10" />
                        <img
  src={mascotMood === "wondering" || mascotMood === "afk" ? wonderingImg : mascotMood === "excited" ? excitedImg : companionImg}
  alt=""
  className="relative z-10 max-h-60 object-contain drop-shadow-xl transition-opacity duration-500"
/>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {[
                        {
                          title: "Bookshelf",
                          desc: "Learn kana, kanji, and vocabulary.",
                          icon: BookOpen,
                          accent: "forest",
                          action: () => {
                            setShowStudyRoom(false);
                            setActiveHubTab("learn");
                            setMascotMood("learn-flashcard");
                          },
                        },
                        {
                          title: "Writing Desk",
                          desc: "Practice quizzes and timed rounds.",
                          icon: PenTool,
                          accent: "clay",
                          action: () => {
                            setShowStudyRoom(false);
                            setActiveHubTab("practice");
                            setMascotMood("idle");
                          },
                        },
                        {
                          title: "Star Window",
                          desc: "Online duel with a friend.",
                          icon: Globe,
                          accent: "forest",
                          action: openOnlineMultiplayer,
                        },
                        {
                          title: "Mirror",
                          desc: "Profile, stats, and progress archive.",
                          icon: User,
                          accent: "clay",
                          action: () => setCurrentScreen("profile"),
                        },
                        {
                          title: "Review Box",
                          desc: totalCount === 0 ? "Add cards from Learn." : `${dueCount} due today.`,
                          icon: BookMarked,
                          accent: dueCount > 0 ? "forest" : "quiet",
                          action: () => {
                            setSrsQueue(getDueCards());
                            setSrsQueueIndex(0);
                            setSrsRevealed(false);
                            setCurrentScreen("review-deck");
                          },
                        },
                        {
                          title: "Record Player",
                          desc: "Open music and atmosphere controls.",
                          icon: Volume2,
                          accent: "quiet",
                          action: () => {
                                              setIsMusicExpanded(true);
                                              setIsAtmosphereExpanded(true);
                                              showToast("Music and atmosphere controls opened.");
                                            },
                                          },
                                          {
                                            title: "Reference Charts",
                                            desc: "Grammar, counters & tables",
                                            icon: Table2,
                                            accent: "clay",
                                            action: () => setCurrentScreen("charts"),
                                          },
                                          {
                                            title: "Grammar Dojo",
                                            desc: "N5 grammar patterns & practice",
                                            icon: GraduationCap,
                                            accent: "forest",
                                            action: () => setCurrentScreen("grammar-dojo"),
                                          },
                                        ].map((roomItem) => {
                        const Icon = roomItem.icon;
                        const activeClass = roomItem.accent === "forest"
                          ? "hover:border-natural-forest/70 hover:bg-natural-forest/10 text-natural-forest"
                          : roomItem.accent === "clay"
                            ? "hover:border-natural-clay/70 hover:bg-natural-clay/10 text-natural-clay"
                            : "hover:border-natural-border hover:bg-natural-bg text-natural-forest-light";
                        return (
                          <button
                            key={roomItem.title}
                            type="button"
                            onClick={roomItem.action}
                            className={`group min-h-28 rounded-2xl border border-natural-border/70 bg-natural-card/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 cursor-pointer ${activeClass}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="block font-serif text-base font-extrabold text-natural-forest group-hover:text-current">
                                  {roomItem.title}
                                </span>
                                <span className="mt-1 block text-xs leading-relaxed text-natural-forest-light">
                                  {roomItem.desc}
                                </span>
                              </div>
                              <span className="rounded-xl border border-natural-border/70 bg-natural-bg/70 p-2 text-current">
                                <Icon className="w-4 h-4" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowStudyRoom(true)}
                    className="self-start px-3 py-1.5 rounded-xl border border-natural-border bg-natural-card/70 text-natural-forest-light hover:text-natural-forest hover:border-natural-forest/50 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back to Study Room
                  </button>
              {/* ── REVIEW DECK ENTRY BUTTON ───────────────────────────────── */}
              <button
                type="button"
                onClick={() => {
                  setSrsQueue(getDueCards());
                  setSrsQueueIndex(0);
                  setSrsRevealed(false);
                  setCurrentScreen("review-deck");
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition hover:-translate-y-0.5 duration-300 shadow-sm cursor-pointer ${
                  dueCount > 0
                    ? "bg-natural-forest text-natural-bg border-natural-forest/80 hover:bg-natural-forest/90"
                    : "bg-natural-card text-natural-charcoal border-natural-border/70 hover:border-natural-forest/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl leading-none">📦</span>
                  <div className="text-left">
                    <span className="block font-serif font-bold text-base leading-tight">Review Deck</span>
                    <span className={`text-xs font-mono font-bold tracking-wide ${dueCount > 0 ? "text-natural-bg/70" : "text-natural-forest-light"}`}>
                      {totalCount === 0
                        ? "No cards yet — add some from Learn!"
                        : dueCount > 0
                          ? `${dueCount} card${dueCount === 1 ? "" : "s"} due today`
                          : "All caught up ✨"}
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold tabular-nums ${
                  dueCount > 0 ? "bg-natural-bg/20 text-natural-bg" : "bg-natural-forest/10 text-natural-forest"
                }`}>
                  {dueCount} due
                </span>
              </button>

              {/* STUDY & PRACTICE DESK SWITCHER HEADER */}
              <div className="flex border border-natural-border/60 bg-natural-card/85 p-1.5 rounded-2xl shadow-sm w-full relative z-10">
                <button
                  type="button"
                  id="tab-study-chamber"
                  onClick={() => {
                    setActiveHubTab("learn");
                    setMascotMood("learn-flashcard");
                  }}
                  className={`flex-1 py-3.5 text-center rounded-xl font-serif text-sm tracking-wider font-bold transition flex items-center justify-center gap-2 cursor-pointer ${activeHubTab === "learn"
                    ? "bg-natural-forest text-natural-bg shadow-sm font-semibold"
                    : "text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40"
                    }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Learn
                </button>
                <button
                  type="button"
                  id="tab-practice-arena"
                  onClick={() => {
                    setActiveHubTab("practice");
                    setMascotMood("idle");
                  }}
                  className={`flex-1 py-3.5 text-center rounded-xl font-serif text-sm tracking-wider font-bold transition flex items-center justify-center gap-2 cursor-pointer ${activeHubTab === "practice"
                    ? "bg-natural-forest text-natural-bg shadow-sm font-semibold"
                    : "text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40"
                    }`}
                >
                  <Activity className="w-4 h-4" />
                  Practice
                </button>
              </div>

              {/* ================= TAB CONTENT 1: STUDY CHAMBER (LEARN) ================= */}
              {activeHubTab === "learn" && (
                <div className="flex flex-col gap-5">
                  {/* Internal Sub navigation chips */}
                  <div className="flex items-center gap-2 border-b border-natural-border/50 pb-2 overflow-x-auto">
                    {[
                      { code: "hiragana" as const, label: "Hiragana ひ" },
                      { code: "katakana" as const, label: "Katakana カ" },
                      { code: "kanji" as const, label: "Kanji 漢" },
                      { code: "vocabulary" as const, label: "Words 言" }
                    ].map((st) => (
                      <button
                        key={st.code}
                        type="button"
                        onClick={() => {
                          playClickTick();
                          setSubLearnTab(st.code);
                          if (st.code === "vocabulary") setMascotMood("learn-vocabs");
                          else if (st.code === "kanji") setMascotMood("kanji");
                          else setMascotMood("learn-flashcard");
                        }}
                        className={`px-4 py-2 text-xs font-serif font-bold tracking-wider rounded-full transition whitespace-nowrap cursor-pointer ${subLearnTab === st.code
                          ? "bg-natural-clay text-natural-bg"
                          : "bg-natural-card/50 text-natural-forest-light border border-natural-border hover:bg-natural-card hover:text-natural-forest"
                          }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* SUB-STUDY-TAB I: HIRAGANA SANCTUARY */}
                  {subLearnTab === "hiragana" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Grid lists with categories and character lookups */}
                      <div className="lg:col-span-2 bg-natural-card border border-natural-border/70 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-serif font-extrabold text-base text-natural-forest">Hiragana Characters</h4>

                          </div>
                          <p className="text-xs text-natural-forest-light/80 mt-1">Click any character to see examples and hear pronunciation.</p>
                        </div>

                        {/* Stage Selector Pills */}
                        <div className="flex gap-2 overflow-x-auto pb-1 mt-1">
                          {["all", "basic", "dakuon", "handakuon", "yoon"].map((filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setArchiveFilter(filter)}
                              className={`px-3 py-1 text-[11px] font-serif font-bold tracking-wide rounded-lg capitalize cursor-pointer border ${archiveFilter === filter
                                ? "bg-natural-forest/10 border-natural-forest text-natural-forest"
                                : "bg-natural-bg/40 border-natural-border/60 text-natural-charcoal hover:bg-natural-bg"
                                }`}
                            >
                              {filter === "all" ? "A-Z Catalog" : filter}
                            </button>
                          ))}
                        </div>

                        {/* Interactive Grid Map */}
                        <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                          {HIRAGANA_DATA.filter((item) => archiveFilter === "all" || item.category === archiveFilter).map((item) => {
                            const isSelected = selectedLearnChar?.kana === item.kana;
                            return (
                              <button
                                key={item.kana}
                                type="button"
                                onClick={() => {
                                  setSelectedLearnChar(item);
                                  speakJapanese(item.kana);
                                }}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer relative group ${isSelected
                                  ? "bg-natural-forest border-natural-forest text-natural-bg shadow"
                                  : "bg-natural-bg/50 border-natural-border/50 hover:bg-natural-card hover:border-natural-forest"
                                  }`}
                              >
                                <span className={`text-2xl font-serif font-bold ${isSelected ? "text-natural-bg" : "text-natural-forest"}`}>
                                  {item.kana}
                                </span>
                                <span className={`text-[9px] font-mono font-bold mt-1 uppercase ${isSelected ? "text-natural-bg/80" : "text-natural-forest-light"}`}>
                                  {item.romaji}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Panel: Selected Hiragana detail tracer */}
                      <div className="flex flex-col gap-4">
                        {selectedLearnChar ? (
                          <motion.div
                            key={selectedLearnChar.kana}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-natural-card border border-natural-border/70 p-5 rounded-3xl shadow-sm flex flex-col items-center text-center"
                          >


                            <div className="w-24 h-24 my-3 border border-natural-border/60 rounded-2xl flex items-center justify-center bg-natural-bg/60 shadow-inner relative overflow-hidden">
                              <span className="text-5xl font-serif text-natural-forest leading-none select-none">
                                {selectedLearnChar.kana}
                              </span>

                            </div>

                            <p className="text-xl font-serif font-extrabold text-natural-charcoal uppercase tracking-wider mb-2">
                              {selectedLearnChar.romaji}
                            </p>

                            <button
                              type="button"
                              onClick={() => speakJapanese(selectedLearnChar.kana)}
                              className="px-4 py-1.5 bg-natural-bg hover:bg-natural-forest/10 border border-natural-border text-natural-forest rounded-xl text-xs font-mono font-bold tracking-wider transition uppercase flex items-center gap-1.5 cursor-pointer shadow-sm mb-4"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              ♪ Listen
                            </button>

                            {/* Exercises / Context */}
                            <div className="w-full text-left bg-natural-bg border border-natural-border/50 p-3.5 rounded-2xl flex flex-col gap-2.5">
                              <p className="text-[10px] text-natural-clay font-mono uppercase tracking-widest border-b border-natural-border/40 pb-1 font-bold">
                                Examples
                              </p>
                              {selectedLearnChar.examples && selectedLearnChar.examples.map((ex, exIdx) => (
                                <div key={exIdx} className="text-xs border-b border-natural-border/20 last:border-none last:pb-0 pb-1.5">
                                  <span className="block text-natural-charcoal font-serif font-extrabold">{ex.japanese}</span>
                                  <div className="flex justify-between items-center text-[10px] text-natural-forest-light font-mono mt-0.5">
                                    <span className="font-bold">{ex.romaji}</span>
                                    <span className="text-natural-charcoal font-serif font-medium">{ex.english}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ) : (
                          <div className="bg-natural-card/50 border border-dashed border-natural-border p-8 rounded-3xl text-center flex flex-col items-center justify-center h-full min-h-[220px]">
                            <BookOpenCheck className="w-10 h-10 text-natural-forest-light/60 mb-2.5" />
                            <p className="text-sm font-serif text-natural-forest-light font-bold">Pick a character</p>
                            <p className="text-xs text-natural-forest-light/70 max-w-[180px] mt-1">Tap a character to explore it.</p>
                          </div>
                        )}

                        {/* Quick Study Tip Card */}
                        <div className="bg-natural-clay/10 border border-natural-clay/20 p-4 rounded-3xl">
                          <span className="text-[9px] font-mono text-natural-clay tracking-widest uppercase font-extrabold flex items-center gap-1">
                            <Info className="w-3 h-3 text-natural-clay" />
                            Study Tip
                          </span>
                          <p className="text-xs text-natural-charcoal/80 leading-relaxed font-sans mt-1.5">
                            Say each character out loud as you tap it — speaking builds memory faster than reading alone.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-STUDY-TAB I.B: KATAKANA LIBRARY */}
                  {subLearnTab === "katakana" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Grid lists with categories and character lookups */}
                      <div className="lg:col-span-2 bg-natural-card border border-natural-border/70 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-serif font-extrabold text-base text-natural-forest">Katakana Characters</h4>
                            <span className="text-[10px] font-mono text-natural-clay bg-natural-clay/10 px-2 py-0.5 rounded font-bold uppercase">Alphabet index</span>
                          </div>
                          <p className="text-xs text-natural-forest-light/80 mt-1">Click any character to see examples and hear pronunciation.</p>
                        </div>

                        {/* Stage Selector Pills */}
                        <div className="flex gap-2 overflow-x-auto pb-1 mt-1">
                          {["all", "basic", "dakuon", "handakuon", "yoon"].map((filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => {
                                playClickTick();
                                setArchiveFilter(filter);
                              }}
                              className={`px-3 py-1 text-[11px] font-serif font-bold tracking-wide rounded-lg capitalize cursor-pointer border ${archiveFilter === filter
                                ? "bg-natural-forest/10 border-natural-forest text-natural-forest"
                                : "bg-natural-bg/40 border-natural-border/60 text-natural-charcoal hover:bg-natural-bg"
                                }`}
                            >
                              {filter === "all" ? "A-Z Catalog" : filter}
                            </button>
                          ))}
                        </div>

                        {/* Interactive Grid Map */}
                        <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                          {KATAKANA_DATA.filter((item) => archiveFilter === "all" || item.category === archiveFilter).map((item) => {
                            const isSelected = selectedLearnChar?.kana === item.kana;
                            return (
                              <button
                                key={item.kana}
                                type="button"
                                onClick={() => {
                                  playClickTick();
                                  setSelectedLearnChar(item);
                                  speakJapanese(item.kana);
                                }}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer relative group ${isSelected
                                  ? "bg-natural-forest border-natural-forest text-natural-bg shadow animate-pulse"
                                  : "bg-natural-bg/50 border-natural-border/50 hover:bg-natural-card hover:border-natural-forest"
                                  }`}
                              >
                                <span className={`text-2xl font-serif font-bold ${isSelected ? "text-natural-bg" : "text-natural-forest"}`}>
                                  {item.kana}
                                </span>
                                <span className={`text-[9px] font-mono font-bold mt-1 uppercase ${isSelected ? "text-natural-bg/80" : "text-natural-forest-light"}`}>
                                  {item.romaji}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Panel: Selected Katakana detail tracer */}
                      <div className="flex flex-col gap-4">
                        {selectedLearnChar && KATAKANA_DATA.some(k => k.kana === selectedLearnChar.kana) ? (
                          <motion.div
                            key={selectedLearnChar.kana}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-natural-card border border-natural-border/70 p-5 rounded-3xl shadow-sm flex flex-col items-center text-center"
                          >
                            <span className="text-[10px] font-mono text-natural-clay uppercase tracking-widest font-extrabold block">Selected Character Study</span>

                            <div className="w-24 h-24 my-3 border border-natural-border/60 rounded-2xl flex items-center justify-center bg-natural-bg/60 shadow-inner relative overflow-hidden">
                              <span className="text-5xl font-serif text-natural-forest leading-none select-none">
                                {selectedLearnChar.kana}
                              </span>
                              <span className="absolute top-1.5 left-1.5 text-[8px] font-mono tracking-widest text-natural-forest-light uppercase pointer-events-none font-bold">GRID TYPE</span>
                            </div>

                            <p className="text-xl font-serif font-extrabold text-natural-charcoal uppercase tracking-wider mb-2">
                              {selectedLearnChar.romaji} sound spectrum
                            </p>

                            <button
                              type="button"
                              onClick={() => speakJapanese(selectedLearnChar.kana)}
                              className="px-4 py-1.5 bg-natural-bg hover:bg-natural-forest/10 border border-natural-border text-natural-forest rounded-xl text-xs font-mono font-bold tracking-wider transition uppercase flex items-center gap-1.5 cursor-pointer shadow-sm mb-4"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              Hear Sound
                            </button>

                            {/* Exercises / Context */}
                            <div className="w-full text-left bg-natural-bg border border-natural-border/50 p-3.5 rounded-2xl flex flex-col gap-2.5">
                              <p className="text-[10px] text-natural-clay font-mono uppercase tracking-widest border-b border-natural-border/40 pb-1 font-bold flex items-center justify-between">
                                <span>Word usages (Foreign Origin)</span>
                                <span>Learn Chamber</span>
                              </p>
                              {selectedLearnChar.examples && selectedLearnChar.examples.map((ex, exIdx) => (
                                <div key={exIdx} className="text-xs border-b border-natural-border/20 last:border-none last:pb-0 pb-1.5">
                                  <span className="block text-natural-charcoal font-serif font-extrabold">{ex.japanese}</span>
                                  <div className="flex justify-between items-center text-[10px] text-natural-forest-light font-mono mt-0.5">
                                    <span className="uppercase font-bold">SOUND: {ex.romaji}</span>
                                    <span className="text-natural-charcoal font-serif font-medium">{ex.english}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ) : (
                          <div className="bg-natural-card/50 border border-dashed border-natural-border p-8 rounded-3xl text-center flex flex-col items-center justify-center h-full min-h-[220px]">
                            <BookOpenCheck className="w-10 h-10 text-natural-forest-light/60 mb-2.5" />
                            <p className="text-sm font-serif text-natural-forest-light font-bold">Select any character</p>
                            <p className="text-xs text-natural-forest-light/70 max-w-[180px] mt-1">Study Western adaptation accents, borrow structures, and phonetic scripts!</p>
                          </div>
                        )}

                        {/* Quick Study Tip Card */}
                        <div className="bg-natural-clay/10 border border-natural-clay/20 p-4 rounded-3xl">
                          <span className="text-[9px] font-mono text-natural-clay tracking-widest uppercase font-extrabold flex items-center gap-1">
                            <Info className="w-3 h-3 text-natural-clay" />
                            Katakana Application
                          </span>
                          <p className="text-xs text-natural-charcoal/80 leading-relaxed font-sans mt-1.5 font-medium">
                            Katakana is predominantly used for foreign loanwords, technical terminology, scientific descriptors, and dramatic sound effects (onomatopoeia)!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-STUDY-TAB II: DAILY KANJI SCROLL INDEX */}
                  {subLearnTab === "kanji" && (
                    <div className="bg-natural-card border border-natural-border/70 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif font-extrabold text-base text-natural-forest flex items-center gap-2">
                            <BookMarked className="w-4 h-4 text-natural-forest" />
                            Ancient N5 Kanji Catalog (100 Chars)
                          </h4>
                          <span className="text-[10px] font-mono text-natural-clay bg-natural-clay/10 px-2.5 py-0.5 rounded font-bold uppercase">Grid Trace Desk</span>
                        </div>
                        <p className="text-xs text-natural-forest-light/90 font-medium mt-1">
                          N5 fluency requires 100 core Kanji covering basic counts, celestial bodies, body positions, and core action verbs. Click any Kanji below to unlock its dedicated tracing guidelines board!
                        </p>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2.5 mt-2 max-h-[380px] overflow-y-auto pr-1">
                        {KANJI_DATA.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCurrentKanjiIndex(idx);
                              setCurrentScreen("kanji-scroll");
                              speakJapanese(item.kanji);
                            }}
                            className="p-3 bg-natural-bg/50 border border-natural-border/50 hover:bg-natural-card hover:border-natural-clay rounded-xl text-center group cursor-pointer transition"
                          >
                            <span className="block text-2xl font-serif text-natural-forest font-bold mb-1 group-hover:scale-110 transition duration-200">
                              {item.kanji}
                            </span>
                            <span className="text-[9px] font-mono text-natural-forest-light/80 uppercase font-bold truncate block">
                              {item.meaning}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-STUDY-TAB III: N5 VOCABULARY GARDEN */}
                  {subLearnTab === "vocabulary" && (
                    <div className="bg-natural-card border border-natural-border/70 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif font-extrabold text-base text-natural-forest flex items-center gap-2">
                            <Award className="w-4 h-4 text-natural-forest" />
                            N5 Vocabulary Garden Study List
                          </h4>
                          <span className="text-[10px] font-mono text-natural-clay bg-natural-clay/10 px-2.5 py-0.5 rounded font-bold uppercase">Garden library</span>
                        </div>
                        <p className="text-xs text-natural-forest-light/90 font-medium mt-1">
                          N5 level commands a robust garden of approximately 720 daily vocabulary elements (such as time, weather, food, pronouns, greetings, objects). Search words below, practice vocalization, and unlock XP rewards!
                        </p>
                      </div>

                      {/* Vocabulary search and filter tools */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
                        <div className="sm:col-span-2 relative">
                          <input
                            type="text"
                            value={vocabsSearch}
                            onChange={(e) => setVocabsSearch(e.target.value)}
                            placeholder="Search by english, romaji, kanji..."
                            className="w-full pl-9 pr-4 py-2 bg-natural-bg font-serif text-sm border border-natural-border focus:border-natural-forest rounded-xl outline-none text-natural-charcoal font-medium"
                          />
                          <Search className="w-4 h-4 text-natural-forest-light/60 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>

                        <div>
                          <select
                            value={vocabsCategory}
                            onChange={(e) => setVocabsCategory(e.target.value)}
                            className="w-full bg-natural-bg font-serif text-xs border border-natural-border focus:border-natural-forest py-2 px-3 rounded-xl outline-none text-natural-charcoal font-bold cursor-pointer"
                          >
                            <option value="all">🌾 All themes (690+)</option>
                            <option value="greetings">🌸 Greetings & Rituals</option>
                            <option value="time">⏱️ Time, Days & Seasons</option>
                            <option value="places">🏠 Places & Shrines</option>
                            <option value="food">🍵 Food & Tea Garden</option>
                            <option value="people">🎎 People, Family & Jobs</option>
                            <option value="actions">🚶 Actions & Core Verbs</option>
                            <option value="adjectives">🎨 Colors & Adjectives</option>
                            <option value="objects">🎒 Objects & Clothing</option>
                            <option value="school">📚 Studies & School Library</option>
                          </select>
                        </div>
                      </div>

                      {/* Vocabulary list display */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 mt-1">
                        {VOCABULARY_DATA.filter((v) => {
                          const categoryMatches = vocabsCategory === "all" || v.category === vocabsCategory;
                          const matchesQuery = !vocabsSearch ||
                            v.word.toLowerCase().includes(vocabsSearch.toLowerCase()) ||
                            v.hiragana.toLowerCase().includes(vocabsSearch.toLowerCase()) ||
                            v.romaji.toLowerCase().includes(vocabsSearch.toLowerCase()) ||
                            v.english.toLowerCase().includes(vocabsSearch.toLowerCase());
                          return categoryMatches && matchesQuery;
                        }).map((voc) => {
                          const isMastered = !!stats.vocabularyProgress[voc.word];
                          return (
                            <div
                              key={`${voc.category}-${voc.word}`}
                              className={`p-3 border rounded-2xl flex items-center justify-between transition ${isMastered
                                ? "bg-natural-forest/5 border-natural-forest/40"
                                : "bg-natural-bg/30 border-natural-border/50 hover:bg-natural-bg"
                                }`}
                            >
                              <div className="flex-grow select-text">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-base font-serif font-extrabold text-natural-forest">{voc.word}</span>
                                  {voc.hiragana !== voc.word && (
                                    <span className="text-[10px] bg-natural-forest/10 text-natural-forest px-1.5 py-0.5 rounded font-bold">{voc.hiragana}</span>
                                  )}
                                  <span className="text-[9px] font-mono text-[#7A8E7C] font-bold uppercase tracking-wider">{voc.romaji}</span>
                                </div>
                                <span className="text-xs text-natural-charcoal font-serif font-medium mt-1 block italic">{voc.english}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Speaker pronunciation assist */}
                                <button
                                  type="button"
                                  onClick={() => speakJapanese(voc.word)}
                                  className="p-1.5 bg-natural-card hover:bg-natural-forest/10 text-natural-forest border border-natural-border rounded-lg transition shadow-sm cursor-pointer"
                                  title="Listen Pronunciation"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Check completed checkmark */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleVocabularyLearned(voc.word)}
                                  className={`p-1.5 border rounded-lg transition shadow-sm cursor-pointer ${isMastered
                                    ? "bg-natural-forest border-natural-forest text-natural-bg"
                                    : "bg-natural-card border-natural-border text-natural-forest-light hover:border-natural-forest hover:text-natural-forest"
                                    }`}
                                  title={isMastered ? "Unmark Learned" : "Mark as Mastered (+5 XP!)"}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>

                                {/* ➕ Add to SRS Review Deck */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (hasCard(voc.word)) {
                                      showToast("Already in your Review Deck!");
                                    } else {
                                      addCard(voc.word, "vocab");
                                      showToast("Added to Review Deck! ✨");
                                    }
                                  }}
                                  className={`p-1.5 border rounded-lg transition shadow-sm cursor-pointer ${
                                    hasCard(voc.word)
                                      ? "bg-natural-clay/10 border-natural-clay/40 text-natural-clay/60"
                                      : "bg-natural-card border-natural-border text-natural-forest-light hover:border-natural-clay hover:text-natural-clay hover:bg-natural-clay/10"
                                  }`}
                                  title={hasCard(voc.word) ? "Already in Review Deck" : "Add to Review Deck"}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB CONTENT 2: PRACTICE ARENA (QUIZ) ================= */}
              {activeHubTab === "practice" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left checklist setup and settings panel */}
                  <div className="md:col-span-2 flex flex-col gap-4 bg-natural-card border border-natural-border/70 p-5 rounded-3xl shadow-sm">
                    <div>
                      <h3 className="font-serif text-lg text-natural-forest font-bold tracking-wide flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-natural-forest" />
                        Quiz Settings
                      </h3>
                    </div>

                    {/* Selected Alphabet options */}
                    <div className="flex flex-col gap-2 bg-natural-bg/50 border border-natural-border p-3.5 rounded-2xl">
                      <span className="text-xs font-semibold text-natural-forest-light">Script</span>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {[
                          { id: "hiragana" as const, label: "Hiragana" },
                          { id: "katakana" as const, label: "Katakana" },
                          { id: "both" as const, label: "Both Mixed" }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              playClickTick();
                              setQuizAlphabet(item.id);
                            }}
                            className={`py-2 text-xs font-serif font-bold rounded-lg border transition text-center cursor-pointer ${quizAlphabet === item.id
                              ? "bg-natural-forest border-natural-forest text-natural-bg font-semibold shadow-sm"
                              : "bg-natural-card border-natural-border/70 text-natural-charcoal hover:border-natural-forest-light"
                              }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStage("basic")}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition ${selectedStages.includes("basic")
                          ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-semibold shadow-sm"
                          : "bg-natural-bg/40 border-natural-border/40 text-natural-charcoal hover:border-natural-forest-light/40"
                          }`}
                      >
                        <div>
                          <span className="block font-bold text-sm">Core — Gojūon</span>
                          <span className="text-[10px] text-natural-forest-light/80">Standard vowels & core rows</span>
                        </div>
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 bg-natural-forest/10 rounded text-natural-forest">
                          46 Chars
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStage("dakuon")}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition ${selectedStages.includes("dakuon")
                          ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-semibold shadow-sm"
                          : "bg-natural-bg/40 border-natural-border/40 text-natural-charcoal hover:border-natural-forest-light/40"
                          }`}
                      >
                        <div>
                          <span className="block font-bold text-sm">Voiced — Dakuon</span>
                          <span className="text-[10px] text-natural-forest-light/80">Voiced letters using diacritic tacks</span>
                        </div>
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 bg-natural-forest/10 rounded text-natural-forest">
                          20 Chars
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStage("handakuon")}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition ${selectedStages.includes("handakuon")
                          ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-semibold shadow-sm"
                          : "bg-natural-bg/40 border-natural-border/40 text-natural-charcoal hover:border-natural-forest-light/40"
                          }`}
                      >
                        <div>
                          <span className="block font-bold text-sm">Semi-voiced</span>
                          <span className="text-[10px] text-natural-forest-light/80">Half-voiced P-Row bursts</span>
                        </div>
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 bg-natural-forest/10 rounded text-natural-forest">
                          5 Chars
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStage("yoon")}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition ${selectedStages.includes("yoon")
                          ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-semibold shadow-sm"
                          : "bg-natural-bg/40 border-natural-border/40 text-natural-charcoal hover:border-natural-forest-light/40"
                          }`}
                      >
                        <div>
                          <span className="block font-bold text-sm">Combos — Yōon</span>
                          <span className="text-[10px] text-natural-forest-light/80">Fused combination symbols</span>
                        </div>
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 bg-natural-forest/10 rounded text-natural-forest">
                          33 Chars
                        </span>
                      </button>
                    </div>

                    {/* Auto pronounce voice configuration assistant tracker (Mutes automatic cheat whispers!) */}
                    <div className="p-3 bg-natural-bg/50 border border-natural-border rounded-xl mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-natural-forest-light flex items-center gap-1.5">
                          🔊 Auto-pronounce on load
                        </span>
                        <span className="text-[10px] text-natural-forest-light/70 leading-snug">
                          Speaks the kana when each question appears.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <select
                          value={selectedJapaneseVoiceURI}
                          onChange={(e) => handleSelectJapaneseVoice(e.target.value)}
                          disabled={availableJapaneseVoices.length === 0}
                          className="bg-natural-card border border-natural-border/80 text-natural-forest text-[11px] font-bold font-serif px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:border-natural-forest transition disabled:opacity-50"
                          title="Japanese pronunciation voice"
                        >
                          <option value="">{availableJapaneseVoices.length ? "Default voice" : "Default voice only"}</option>
                          {availableJapaneseVoices.map((voice) => (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setAutoPronounce(!autoPronounce)}
                          className={`p-2 rounded-xl text-xs font-mono font-bold tracking-wider transition cursor-pointer ${autoPronounce
                            ? "bg-natural-forest text-natural-bg"
                            : "bg-natural-card border border-natural-border text-natural-forest hover:border-natural-forest animate-pulse"
                            }`}
                        >
                          {autoPronounce ? "ON (Auto-play)" : "OFF (Silent)"}
                        </button>
                      </div>
                    </div>

                    {/* Challenge Speed config selectors */}
                    <div className="mt-2 pt-3 border-t border-natural-border/60">
                      <h4 className="text-xs font-semibold text-natural-forest-light mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Timer per question
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { code: "relax" as const, desc: "Relaxed", time: "No Limit" },
                          { code: "medium" as const, desc: "Medium", time: "12s cap" },
                          { code: "hard" as const, desc: "Hard", time: "6s cap" },
                          { code: "legend" as const, desc: "Legendary", time: "3s cap" },
                        ].map((d) => (
                          <button
                            key={d.code}
                            type="button"
                            onClick={() => setSelectedDifficulty(d.code)}
                            className={`p-2.5 rounded-lg border text-center transition duration-200 cursor-pointer ${selectedDifficulty === d.code
                              ? "bg-natural-clay/10 border-natural-clay text-natural-clay font-bold"
                              : "bg-natural-bg/40 border-natural-border/60 text-natural-charcoal/80 text-xs hover:border-natural-clay/40"
                              }`}
                          >
                            <span className="block text-xs uppercase tracking-wide font-bold">{d.desc}</span>
                            <span className="text-[10px] opacity-75 font-mono mt-0.5 block font-bold">{d.time}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Number of Choices selector */}
                    <div className="mt-2 pt-3 border-t border-natural-border/60">
                      <h4 className="text-xs font-semibold text-natural-forest-light mb-2 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Answer choices
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { count: 4 as const, label: "4 Options", desc: "Standard" },
                          { count: 6 as const, label: "6 Options", desc: "Harder" },
                        ].map((opt) => (
                          <button
                            key={opt.count}
                            type="button"
                            onClick={() => {
                              setNumChoices(opt.count);
                              showToast(`Choice count set to ${opt.count} options!`);
                            }}
                            className={`p-2.5 rounded-lg border text-center transition duration-200 cursor-pointer ${numChoices === opt.count
                              ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-bold"
                              : "bg-natural-bg/40 border-natural-border/60 text-natural-charcoal/80 text-xs hover:border-natural-forest/40"
                              }`}
                          >
                            <span className="block text-xs uppercase tracking-wide font-bold">{opt.label}</span>
                            <span className="text-[10px] opacity-75 font-mono mt-0.5 block font-bold">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right side challenges launch panel */}
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      id="action-quiz-choice"
                      onClick={() => openCharPicker("choice")}
                      className="w-full text-left p-4 rounded-2xl bg-natural-card border border-natural-border/70 hover:border-natural-forest hover:-translate-y-0.5 duration-300 transition flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <div>
                        <span className="block text-natural-forest font-serif text-base font-bold">
                          Multiple Choice
                        </span>
                        <span className="text-xs text-natural-charcoal/60 block mt-0.5">
                          Match the kana to its romaji reading
                        </span>
                      </div>
                      <Play className="w-5 h-5 text-natural-forest animate-pulse" />
                    </button>

                    <button
                      type="button"
                      id="action-quiz-romaji"
                      onClick={() => openCharPicker("romaji")}
                      className="w-full text-left p-4 rounded-2xl bg-natural-card border border-natural-border/70 hover:border-natural-forest hover:-translate-y-0.5 duration-300 transition flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <div>
                        <span className="block text-natural-forest font-serif text-base font-bold">
                          Type the Answer
                        </span>
                        <span className="text-xs text-natural-charcoal/60 block mt-0.5">
                          Spell out the romaji on your keyboard
                        </span>
                      </div>
                      <PenTool className="w-5 h-5 text-natural-forest" />
                    </button>

                    <button
                      type="button"
                      id="action-survival"
                      onClick={() => openCharPicker("survival")}
                      className="w-full text-left p-4 rounded-2xl bg-natural-terracotta/10 border border-natural-terracotta/35 hover:bg-natural-terracotta/15 hover:border-natural-terracotta hover:-translate-y-0.5 duration-300 transition flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <div>
                        <span className="block text-natural-terracotta font-serif text-base font-bold">
                          🕯️ Survival Mode
                        </span>
                        <span className="text-xs text-natural-terracotta/70 block mt-0.5">
                          Race the clock — wrong answers cost time!
                        </span>
                      </div>
                      <Flame className="w-5 h-5 text-natural-terracotta fill-current" />
                    </button>

                    <button
                      type="button"
                      id="action-vocab-quiz"
                      onClick={() => {
                        setVocabQuizPhase("config");
                        setCurrentScreen("vocab-quiz");
                      }}
                      className="w-full text-left p-4 rounded-2xl bg-natural-card border border-natural-border/70 hover:border-natural-clay hover:-translate-y-0.5 duration-300 transition flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <div>
                        <span className="block text-natural-clay font-serif text-base font-bold">
                          Vocabulary Quiz
                        </span>
                        <span className="text-xs text-natural-charcoal/60 block mt-0.5">
                          Practice N5 words by meaning or reading
                        </span>
                      </div>
                      <Award className="w-5 h-5 text-natural-clay" />
                    </button>

                    <button
                      type="button"
                      id="action-kanji-quiz"
                      onClick={() => {
                        setKanjiQuizPhase("config");
                        setCurrentScreen("kanji-quiz");
                      }}
                      className="w-full text-left p-4 rounded-2xl bg-natural-card border border-natural-border/70 hover:border-natural-forest hover:-translate-y-0.5 duration-300 transition flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <div>
                        <span className="block text-natural-forest font-serif text-base font-bold">
                          Kanji Quiz
                        </span>
                        <span className="text-xs text-natural-charcoal/60 block mt-0.5">
                          Test N5 kanji meanings or readings
                        </span>
                      </div>
                      <BookMarked className="w-5 h-5 text-natural-forest" />
                    </button>

                    {/* Online Speed Duel button */}
                    <button
                      type="button"
                      id="action-online-duel"
                      onClick={openOnlineMultiplayer}
                      className="w-full text-left p-4 rounded-2xl bg-natural-forest/10 border border-natural-forest/35 hover:bg-natural-forest/15 hover:border-natural-forest hover:-translate-y-0.5 duration-300 transition flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <div>
                        <span className="block text-natural-forest font-serif text-base font-bold">
                          🌐 Speed Duel
                        </span>
                        <span className="text-xs text-natural-forest/70 block mt-0.5">
                          Race a friend online — first correct wins!
                        </span>
                      </div>
                      <Globe className="w-5 h-5 text-natural-forest" />
                    </button>
                  </div>
                </div>
              )}
                </>
              )}
            </motion.div>
  );
}
