import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  LockKeyhole,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  BookMarked,
} from "lucide-react";
import { getPassageText, SEED_READING_PASSAGES, type ReadingPassage, type ReadingToken } from "../reading/readingData";
import astraReadingImg from "../assets/images/Astra-reading.png";
import astraReadingClickedImg from "../assets/images/Astra-reading-clicked.png";
import wonderingImg from "../assets/images/astra-wondering.jpeg";
import excitedImg from "../assets/images/astra-excited.png.jpeg";

interface ReadingRoomScreenProps {
  onBack: () => void;
  language: "en" | "ja";
  showRomaji?: boolean;
  speakJapanese: (phrase: string) => void;
  addCard: (itemKey: string, type: "vocab") => void;
  hasCard: (itemKey: string) => boolean;
  onRecordReadingMiss: (token: ReadingToken) => void;
  showToast: (message: string) => void;
  onReviewDeck: () => void;
  onReadingStarted: () => void;
  onReadingMiss: () => void;
  mascotMood?: string;
  onMascotClick?: () => void;
}

type ReadingMode = "guided" | "immersion";
type TimerOption = "off" | "1" | "3" | "5" | "10";
type PassageSource = "seed" | "deck" | "fresh";
type ScreenView = "reading" | "results";

const levels = ["N5", "N4", "N3", "N2", "N1"] as const;
const timerOptions: { value: TimerOption; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "1", label: "1 min" },
  { value: "3", label: "3 min" },
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
];

const comprehension: Record<string, { question: string; choices: string[]; answer: string }[]> = {
  "morning-walk": [
    { question: "主人公は毎朝何時に起きますか？", choices: ["五時", "六時", "七時"], answer: "六時" },
    { question: "起きた後、まず何を飲みますか？", choices: ["冷たい水", "熱いお茶", "ミルク"], answer: "冷たい水" },
    { question: "駅の前で何を買いますか？", choices: ["パン", "温かいお茶", "新聞"], answer: "温かいお茶" },
  ],
  "library-book": [
    { question: "いつ図書館へ行きますか？", choices: ["日曜日", "月曜日", "土曜日"], answer: "日曜日" },
    { question: "どんな本を読み始めましたか？", choices: ["小説", "日本語の歴史の本", "料理の本"], answer: "日本語の歴史の本" },
    { question: "帰る前に本を何冊借りましたか？", choices: ["一冊", "二冊", "三冊"], answer: "三冊" },
  ],
  "weather-and-tea": [
    { question: "今日の天気は何ですか？", choices: ["雪です", "雨です", "晴れです"], answer: "雨です" },
    { question: "雨の音を聴きながら何を練習しますか？", choices: ["漢字の練習", "歌の練習", "料理の練習"], answer: "漢字の練習" },
    { question: "アストラちゃんはどこで何をしていますか？", choices: ["机の横で本を読んでいる", "窓の外を見ている", "寝ている"], answer: "机の横で本を読んでいる" },
  ],
  "weekend-food": [
    { question: "いつどこで待ち合わせをしましたか？", choices: ["土曜の夕方に駅の広場", "日曜の朝に学校", "金曜の夜に公園"], answer: "土曜の夕方に駅の広場" },
    { question: "主人公は何を注文しましたか？", choices: ["天ぷらうどん", "ラーメン", "カレー"], answer: "天ぷらうどん" },
    { question: "最後に何を食べましたか？", choices: ["抹茶アイス", "ケーキ", "プリン"], answer: "抹茶アイス" },
  ],
  "new-class": [
    { question: "クラスには何人の学生が集まりましたか？", choices: ["十人", "十五人", "二十人"], answer: "十五人" },
    { question: "先生はどんな様子で教えてくれますか？", choices: ["親切で笑顔", "静かで厳しい", "忙しそう"], answer: "親切で笑顔" },
    { question: "授業の後、学生たちは何をしましたか？", choices: ["連絡先を交換した", "すぐ帰った", "掃除をした"], answer: "連絡先を交換した" },
  ],
};

function getSavedDeckKeys(): Set<string> {
  try {
    const raw = localStorage.getItem("hirachan_master_stats_v1");
    const cards = raw ? (JSON.parse(raw) as { srsCards?: Record<string, unknown> }).srsCards : undefined;
    return new Set(Object.keys(cards ?? {}));
  } catch {
    return new Set();
  }
}

function getSourcePassages(source: PassageSource): ReadingPassage[] {
  if (source !== "deck") return SEED_READING_PASSAGES;
  const deckKeys = getSavedDeckKeys();
  const matches = SEED_READING_PASSAGES.filter((passage) =>
    passage.tokens.some((token) => token.addToSrs && token.dictKey && deckKeys.has(token.dictKey))
  );
  return matches.length > 0 ? matches : SEED_READING_PASSAGES;
}

function TokenButton({
  token,
  mode,
  revealed,
  missed,
  onClick,
}: {
  token: ReadingToken;
  mode: ReadingMode;
  revealed: boolean;
  missed: boolean;
  onClick: () => void;
}) {
  if (!token.tappable) return <span className="text-natural-forest select-text">{token.surface}</span>;
  const isGrammar = token.type === "grammar";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Explain ${token.surface}`}
      className={`group relative mx-0.5 inline-flex flex-col items-center border-b-2 px-1 py-0.5 align-baseline transition cursor-pointer rounded-md hover:bg-natural-forest/10 ${
        missed
          ? "border-natural-clay text-natural-clay bg-natural-clay/10 font-bold"
          : isGrammar
          ? "border-natural-border/60 text-natural-forest/80 font-normal hover:text-natural-forest"
          : "border-natural-forest/40 text-natural-forest font-semibold hover:border-natural-forest"
      }`}
    >
      {mode === "guided" && revealed && token.reading && (
        <span className="absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-natural-forest px-2 py-0.5 text-[11px] font-mono font-bold text-natural-bg shadow-md">
          {token.reading}
        </span>
      )}
      <span className="leading-snug">{token.surface}</span>
      {revealed && token.meaning && (
        <span className="max-w-28 truncate text-[10px] font-mono text-natural-clay font-bold mt-0.5">
          {token.meaning}
        </span>
      )}
    </button>
  );
}

export default function ReadingRoomScreen({
  onBack,
  language,
  speakJapanese,
  addCard,
  hasCard,
  onRecordReadingMiss,
  showToast,
  onReviewDeck,
  onReadingStarted,
  onReadingMiss,
  mascotMood,
  onMascotClick,
}: ReadingRoomScreenProps) {
  const [mode, setMode] = useState<ReadingMode>("guided");
  const [timer, setTimer] = useState<TimerOption>("off");
  const [source, setSource] = useState<PassageSource>("seed");
  const [passageIndex, setPassageIndex] = useState(0);
  const [view, setView] = useState<ScreenView>("reading");
  const [startedAt, setStartedAt] = useState(Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [missedIds, setMissedIds] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activeSpeechTip, setActiveSpeechTip] = useState<string>(
    "Take your time and read along quietly with me! Tap any unfamiliar word to check its reading or collect it for your review deck."
  );
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);

  const isJapanese = language === "ja";

  useEffect(() => {
    onReadingStarted();
  }, []);

  const passages = useMemo(() => getSourcePassages(source), [source]);
  const passage = passages[passageIndex % passages.length];
  const missedTokens = passage.tokens.filter((token, index) => missedIds.has(index) && token.addToSrs);
  const questions = source === "seed" ? comprehension[passage.id] || [] : [];
  const timerSeconds = timer === "off" ? null : Number(timer) * 60;

  // Resolve Large Astra illustration
  const largeAstraImg = useMemo(() => {
    if (mascotMood === "clicked") return astraReadingClickedImg;
    if (mascotMood === "wondering" || mascotMood === "afk") return wonderingImg;
    if (mascotMood === "excited") return excitedImg;
    return astraReadingImg;
  }, [mascotMood]);

  const stopReadingAudio = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsAudioPlaying(false);
    setIsAudioPaused(false);
  };

  useEffect(() => {
    if (!isAudioPlaying) return;
    const interval = window.setInterval(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        setIsAudioPlaying(false);
        setIsAudioPaused(false);
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [isAudioPlaying]);

  useEffect(() => () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const toggleReadingAudio = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      showToast("Sound synthesis is not supported on your device.");
      return;
    }

    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsAudioPaused(true);
      return;
    }

    if (window.speechSynthesis.paused) {
      // Some browsers keep a paused utterance in a non-resumable state.
      // Restarting the passage is reliable and avoids a dead Resume button.
      window.speechSynthesis.cancel();
      speakJapanese(getPassageText(passage));
      setIsAudioPaused(false);
      setIsAudioPlaying(true);
      setActiveSpeechTip("Playing the full audio reading again. Listen closely to the flow and intonations!");
      return;
    }

    speakJapanese(getPassageText(passage));
    setIsAudioPlaying(true);
    setIsAudioPaused(false);
    setActiveSpeechTip("Playing the full audio reading. Listen closely to the flow and intonations!");
  };

  useEffect(() => {
    if (view !== "reading") return;
    setTimeLeft(timerSeconds);
    if (timerSeconds === null) return;
    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current === null || current <= 1) {
          window.clearInterval(interval);
          setFinishedAt(Date.now());
          setView("results");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [passage.id, timerSeconds, view]);

  const resetSession = () => {
    setRevealedIds(new Set());
    setMissedIds(new Set());
    setAnswers({});
  };

  const chooseSource = (nextSource: PassageSource) => {
    stopReadingAudio();
    setSource(nextSource);
    setPassageIndex(0);
    setView("reading");
    setStartedAt(Date.now());
    setFinishedAt(null);
    resetSession();
  };

  const handleTokenClick = (index: number, token: ReadingToken) => {
    if (mode === "guided" || token.type === "grammar") {
      setRevealedIds((previous) => {
        const next = new Set(previous);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
          if (token.reading) {
            setActiveSpeechTip(`"${token.surface}" is pronounced "${token.reading}" (${token.meaning || "grammar point"}). Great curiosity! 🌸`);
          }
        }
        return next;
      });
    }
    if (mode === "immersion" && token.addToSrs) {
      if (!missedIds.has(index)) {
        onRecordReadingMiss(token);
        onReadingMiss();
        setActiveSpeechTip(`Saved "${token.surface}" (${token.reading}) to your session notes for later review!`);
      }
      setMissedIds((previous) => new Set(previous).add(index));
    }
  };

  const nextPassage = () => {
    stopReadingAudio();
    setPassageIndex((index) => (index + 1) % passages.length);
    setView("reading");
    setStartedAt(Date.now());
    setFinishedAt(null);
    resetSession();
    onReadingStarted();
  };

  const finishReading = () => {
    stopReadingAudio();
    setFinishedAt(Date.now());
    setView("results");
  };

  const addToReviewDeck = (token: ReadingToken) => {
    if (!token.dictKey) return;
    if (hasCard(token.dictKey)) {
      showToast(`${token.surface} is already in your Review Deck.`);
      return;
    }
    addCard(token.dictKey, "vocab");
    showToast(`${token.surface} added to your Review Deck.`);
  };

  const addAllToReviewDeck = () => {
    const pending = missedTokens.filter((token) => token.dictKey && !hasCard(token.dictKey));
    pending.forEach((token) => addCard(token.dictKey!, "vocab"));
    showToast(
      pending.length > 0
        ? `${pending.length} item${pending.length === 1 ? "" : "s"} added to your Review Deck.`
        : "All missed items are already in your Review Deck."
    );
  };

  const readAnother = () => {
    nextPassage();
  };

  const elapsedSeconds = Math.max(0, Math.round(((finishedAt ?? Date.now()) - startedAt) / 1000));
  const correctAnswers = questions.filter((question, index) => answers[index] === question.answer).length;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full space-y-6 pb-8 max-w-6xl mx-auto"
    >
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            stopReadingAudio();
            onBack();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-natural-border/70 bg-natural-card/80 px-4 py-2 text-sm font-serif font-bold text-natural-forest transition hover:border-natural-forest hover:bg-natural-card shadow-sm cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          {isJapanese ? "メインメニューへ戻る" : "Back to Study Room"}
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-natural-forest/30 bg-natural-forest/10 px-3.5 py-1.5 text-xs font-bold text-natural-forest">
            <Sparkles className="h-3.5 w-3.5 text-natural-clay" /> N5 Reading Sanctuary
          </span>
        </div>
      </div>

      {/* ================= HERO COMPANION STUDY DESK BANNER ================= */}
      <div className="rounded-3xl border border-natural-border/70 bg-natural-card/90 p-5 shadow-sm sm:p-7 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Text & Controls */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-2xl border border-natural-forest/30 bg-natural-forest/10 p-2.5 text-natural-forest">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-natural-clay">
                  {isJapanese ? "読解の小部屋" : "Astra's Reading Room"}
                </p>
                <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-natural-forest tracking-wide">
                  {isJapanese ? "静かに日本語を読む" : "Gentle Story Reading"}
                </h1>
              </div>
            </div>

            <p className="text-sm text-natural-forest-light leading-relaxed">
              {isJapanese
                ? "アストラちゃんと一緒に、5〜10文の本格的なN5ストーリーを読み進めましょう。言葉をタップするとふりがなや意味を確認できます。"
                : "Read comfortable multi-sentence N5 passages alongside Astra-chan. Tap words for instant readings or mark them to study later in your review deck."}
            </p>

            {/* Astra's Live Companion Dialogue Box */}
            <div className="rounded-2xl border border-natural-clay/25 bg-natural-clay/10 p-4 shadow-sm relative">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-natural-clay text-natural-bg rounded-xl shrink-0 mt-0.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-natural-clay block">
                    Astra-chan's Reading Desk
                  </span>
                  <p className="text-xs sm:text-sm font-sans font-medium text-natural-charcoal mt-1 leading-relaxed">
                    "{activeSpeechTip}"
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Mode & Source Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-natural-forest-light block mb-1.5">
                  Reading Assistance Mode
                </label>
                <div className="grid grid-cols-2 rounded-xl border border-natural-border/70 bg-natural-bg/50 p-1">
                  {(["guided", "immersion"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMode(option)}
                      className={`rounded-lg py-1.5 text-xs font-serif font-bold transition cursor-pointer ${
                        mode === option ? "bg-natural-forest text-natural-bg shadow-sm" : "text-natural-forest-light hover:text-natural-forest"
                      }`}
                    >
                      {option === "guided" ? "Guided" : "Immersion"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-natural-forest-light block mb-1.5 flex items-center justify-between">
                  <span>Passage Source</span>
                  <span className="text-[10px] text-natural-clay font-bold">
                    {passageIndex + 1} / {passages.length}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-natural-border/70 bg-natural-bg/50 p-1">
                  {(["seed", "fresh", "deck"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => chooseSource(option)}
                      className={`rounded-lg py-1.5 text-[11px] font-serif font-bold transition cursor-pointer capitalize ${
                        source === option ? "bg-natural-forest text-natural-bg shadow-sm" : "text-natural-forest-light hover:text-natural-forest"
                      }`}
                    >
                      {option === "seed" ? "Stories" : option === "fresh" ? "Fresh" : "Deck"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              <fieldset>
                <legend className="mb-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase text-natural-forest-light">
                  <span>Reading Level</span>
                  <span className="text-[10px] text-natural-clay">N5 available</span>
                </legend>
                <div className="grid grid-cols-5 gap-1">
                  {levels.map((level) => {
                    const active = level === "N5";
                    return (
                      <button
                        key={level}
                        type="button"
                        disabled={!active}
                        title={active ? "N5" : `${level} coming soon`}
                        className={`relative min-h-11 rounded-lg border px-1 py-1 text-center text-[11px] font-bold transition ${
                          active
                            ? "border-natural-forest bg-natural-forest/15 text-natural-forest"
                            : "cursor-not-allowed border-natural-border/50 bg-natural-bg/40 text-natural-forest-light/45"
                        }`}
                      >
                        <span className="block">{level}</span>
                        {!active && <LockKeyhole className="mx-auto mt-0.5 h-2.5 w-2.5" />}
                        {active && <Check className="absolute right-1 top-1 h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-1.5 flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase text-natural-forest-light">
                  <Clock3 className="h-3.5 w-3.5" /> Optional Timer
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {timerOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTimer(option.value)}
                      aria-pressed={timer === option.value}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                        timer === option.value
                          ? "border-natural-clay bg-natural-clay/15 text-natural-clay"
                          : "border-natural-border/70 bg-natural-bg/45 text-natural-forest-light hover:border-natural-clay/60"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-natural-forest-light">
                  {timeLeft === null ? "No pressure. Take your time." : `Time remaining: ${formatTime(timeLeft)}`}
                </p>
              </fieldset>
            </div>
          </div>

          {/* Right Large Astra Illustration Panel */}
          <div className="lg:col-span-5 relative min-h-[290px] rounded-3xl border border-natural-border/70 bg-natural-bg/70 overflow-hidden p-6 flex flex-col items-center justify-center shadow-inner">
            <div className="absolute inset-x-8 top-6 h-28 rounded-b-[2.5rem] border border-natural-forest/20 bg-natural-forest/10" />
            <div className="absolute bottom-4 left-6 right-6 h-20 rounded-2xl border border-natural-clay/25 bg-natural-clay/10" />
            
            <motion.div
              key={largeAstraImg}
              initial={{ opacity: 0.8, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 flex flex-col items-center"
            >
              <button
                type="button"
                onClick={onMascotClick}
                aria-label="Talk to Astra-chan"
                className="cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-natural-clay"
              >
                <img
                  src={largeAstraImg}
                  alt="Astra-chan Reading"
                  referrerPolicy="no-referrer"
                  className="max-h-64 w-auto object-contain drop-shadow-xl transition-all duration-300 hover:scale-105"
                />
              </button>
              <div className="mt-2 text-center">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest bg-natural-card/85 border border-natural-border/60 px-3 py-1 rounded-full text-natural-forest shadow-sm inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-natural-clay" /> Reading with Astra-chan
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ================= MAIN READING PASSAGE WORKSPACE ================= */}
      {view === "reading" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.95fr)]">
          {/* Main Story Board */}
          <div className="rounded-3xl border border-natural-border/70 bg-natural-card/80 p-6 shadow-sm sm:p-8 flex flex-col justify-between">
            <div>
              {/* Header Bar with Audio & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-natural-border/60 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-natural-clay">
                      N5 Passage · {passage.titleJa}
                    </span>
                  </div>
                  <h2 className="mt-1 font-serif text-2xl font-extrabold text-natural-forest">
                    {passage.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={toggleReadingAudio}
                    title={isAudioPlaying && !isAudioPaused ? "Pause passage audio" : "Play passage audio"}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-natural-border/70 bg-natural-bg/60 px-3.5 py-2 text-xs font-serif font-bold text-natural-forest transition hover:border-natural-forest hover:bg-natural-card shadow-sm cursor-pointer"
                  >
                    {isAudioPlaying && !isAudioPaused ? <Pause className="h-4 w-4 text-natural-clay" /> : <Play className="h-4 w-4 text-natural-clay" />}
                    <span>{isAudioPlaying && !isAudioPaused ? "Pause" : isAudioPaused ? "Replay" : "Listen"}</span>
                  </button>

                  {isAudioPlaying && (
                    <button
                      type="button"
                      onClick={stopReadingAudio}
                      title="Stop passage audio"
                      className="inline-flex items-center rounded-xl border border-natural-border/70 bg-natural-bg/60 px-2.5 py-2 text-xs font-serif font-bold text-natural-forest transition hover:border-natural-clay hover:text-natural-clay shadow-sm cursor-pointer"
                    >
                      <span aria-hidden="true">■</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={nextPassage}
                    title="Next story"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-natural-border/70 bg-natural-bg/60 px-3.5 py-2 text-xs font-serif font-bold text-natural-forest transition hover:border-natural-forest hover:bg-natural-card shadow-sm cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Japanese Story Text Container */}
              <div className="mt-6 rounded-2xl border border-natural-border/60 bg-natural-bg/45 p-6 sm:p-8 shadow-inner">
                <p className="font-serif text-xl sm:text-2xl leading-[2.4] sm:leading-[2.6] text-natural-forest select-text">
                  {passage.tokens.map((token, index) => (
                    <span key={`${passage.id}-${index}`}>
                      <TokenButton
                        token={token}
                        mode={mode}
                        revealed={revealedIds.has(index)}
                        missed={missedIds.has(index)}
                        onClick={() => handleTokenClick(index, token)}
                      />
                    </span>
                  ))}
                </p>
              </div>

              {/* Translation & Explanations */}
              <div className="mt-5 rounded-2xl border border-natural-forest/20 bg-natural-forest/5 p-4 sm:p-5">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-natural-clay block mb-1">
                  English Meaning & Context
                </span>
                <p className="text-sm sm:text-base leading-relaxed text-natural-forest font-serif">
                  {passage.translation}
                </p>
              </div>
            </div>

            {/* Bottom Action Strip */}
            <div className="mt-6 pt-5 border-t border-natural-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-natural-forest-light">
                {mode === "guided"
                  ? "💡 Tap words to reveal furigana and translations."
                  : "💡 Tap unfamiliar words to mark them for SRS flashcard review."}
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={resetSession}
                  className="inline-flex items-center gap-1.5 text-xs font-serif font-bold text-natural-forest-light transition hover:text-natural-forest cursor-pointer px-3 py-2 rounded-xl border border-natural-border/50 hover:bg-natural-bg/60"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={finishReading}
                  className="rounded-xl bg-natural-forest px-5 py-2.5 text-xs font-serif font-extrabold text-natural-bg transition hover:bg-natural-forest/90 shadow-sm cursor-pointer"
                >
                  Finish Reading & Quiz
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Notes & Collected Words */}
          <aside className="rounded-3xl border border-natural-border/70 bg-natural-card/80 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-natural-border/60 pb-4">
                <div>
                  <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-natural-clay">
                    Study Notes
                  </p>
                  <h3 className="font-serif text-lg font-extrabold text-natural-forest mt-0.5">
                    {isJapanese ? "単語ノート" : "Collected Words"}
                  </h3>
                </div>
                <span className="rounded-full bg-natural-clay/15 px-3 py-1 text-xs font-mono font-extrabold text-natural-clay">
                  {missedTokens.length}
                </span>
              </div>

              {missedTokens.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-natural-border/80 bg-natural-bg/40 p-6 text-center">
                  <BookMarked className="w-8 h-8 text-natural-forest-light/50 mx-auto mb-2" />
                  <p className="text-sm font-serif font-bold text-natural-forest-light">
                    {isJapanese ? "まだありません" : "No saved words yet"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-natural-forest-light/80">
                    {mode === "immersion"
                      ? "Tap any vocabulary you want to add to your personal review deck."
                      : "Switch to Immersion mode to tag difficult words as you read!"}
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {missedTokens.map((token) => (
                    <div
                      key={token.dictKey}
                      className="rounded-2xl border border-natural-clay/30 bg-natural-clay/5 p-3.5 shadow-sm flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-serif text-base font-extrabold text-natural-forest">
                          {token.surface}
                        </p>
                        <p className="text-xs font-mono text-natural-forest-light">
                          {token.reading} · {token.meaning}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => addToReviewDeck(token)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-serif font-bold transition shadow-sm cursor-pointer ${
                          hasCard(token.dictKey || "")
                            ? "bg-natural-forest/10 text-natural-forest border border-natural-forest/20"
                            : "bg-natural-forest text-natural-bg hover:bg-natural-forest/90"
                        }`}
                      >
                        {hasCard(token.dictKey || "") ? "Saved" : "+ Add"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {missedTokens.length > 0 && (
              <div className="mt-6 pt-4 border-t border-natural-border/60">
                <button
                  type="button"
                  onClick={addAllToReviewDeck}
                  className="w-full rounded-2xl border border-natural-clay/40 bg-natural-clay/15 px-4 py-3 text-xs font-serif font-extrabold text-natural-clay transition hover:bg-natural-clay/20 shadow-sm cursor-pointer"
                >
                  Add All to Review Deck
                </button>
              </div>
            )}
          </aside>
        </div>
      ) : (
        /* Results & Comprehension View */
        <div className="rounded-3xl border border-natural-border/70 bg-natural-card/85 p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-natural-border/60 pb-5">
            <div>
              <p className="text-xs font-mono font-extrabold uppercase tracking-[0.18em] text-natural-clay">
                N5 · Reading Results
              </p>
              <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-extrabold text-natural-forest">
                Reading Session Complete
              </h1>
              <p className="mt-1 text-sm text-natural-forest-light">
                Here is a quiet review of what you have practiced with Astra-chan.
              </p>
            </div>
            <Sparkles className="h-8 w-8 text-natural-clay" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-natural-border/60 bg-natural-bg/50 p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-natural-forest-light">Reading Time</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-natural-forest">{formatTime(elapsedSeconds)}</p>
            </div>

            <div className="rounded-2xl border border-natural-border/60 bg-natural-bg/50 p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-natural-forest-light">Words Collected</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-natural-clay">{missedTokens.length}</p>
            </div>

            <div className="rounded-2xl border border-natural-border/60 bg-natural-bg/50 p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-natural-forest-light">Comprehension</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-natural-forest">
                {questions.length > 0 ? `${correctAnswers} / ${questions.length}` : "--"}
              </p>
            </div>
          </div>

          {questions.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="font-serif text-lg font-extrabold text-natural-forest">
                Story Comprehension Check
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {questions.map((question, index) => (
                  <fieldset
                    key={question.question}
                    className="rounded-2xl border border-natural-border/60 bg-natural-bg/40 p-5"
                  >
                    <legend className="px-2 text-sm font-serif font-bold text-natural-forest">
                      {index + 1}. {question.question}
                    </legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.choices.map((choice) => {
                        const isSelected = answers[index] === choice;
                        const isCorrect = isSelected && choice === question.answer;
                        return (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => setAnswers((previous) => ({ ...previous, [index]: choice }))}
                            className={`rounded-xl border px-3.5 py-2 text-xs font-serif font-bold transition cursor-pointer ${
                              isSelected
                                ? isCorrect
                                  ? "border-natural-forest bg-natural-forest text-natural-bg shadow"
                                  : "border-natural-clay bg-natural-clay text-natural-bg shadow"
                                : "border-natural-border/70 bg-natural-card/60 text-natural-forest-light hover:border-natural-forest/60 hover:text-natural-forest"
                            }`}
                          >
                            {choice}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-natural-border/60 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={readAnother}
              className="rounded-xl bg-natural-forest px-5 py-3 text-xs font-serif font-extrabold text-natural-bg transition hover:bg-natural-forest/90 shadow cursor-pointer"
            >
              Read Another Story
            </button>
            <button
              type="button"
              onClick={() => {
                setView("reading");
                setStartedAt(Date.now());
                setFinishedAt(null);
              }}
              className="rounded-xl border border-natural-border/70 bg-natural-bg/40 px-5 py-3 text-xs font-serif font-bold text-natural-forest-light transition hover:border-natural-forest cursor-pointer"
            >
              Review This Passage
            </button>
            <button
              type="button"
              onClick={() => {
                stopReadingAudio();
                onReviewDeck();
              }}
              className="rounded-xl border border-natural-clay/40 bg-natural-clay/10 px-5 py-3 text-xs font-serif font-bold text-natural-clay transition hover:bg-natural-clay/20 cursor-pointer"
            >
              Go to SRS Review Deck
            </button>
            <button
              type="button"
              onClick={() => {
                stopReadingAudio();
                onBack();
              }}
              className="rounded-xl border border-natural-border/70 px-5 py-3 text-xs font-serif font-bold text-natural-forest-light transition hover:border-natural-forest cursor-pointer"
            >
              Back to Study Room
            </button>
          </div>
        </div>
      )}
    </motion.section>
  );
}
