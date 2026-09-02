import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Clock3, Headphones, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import { getPassageText, SEED_READING_PASSAGES, type ReadingPassage, type ReadingToken } from "../reading/readingData";

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
}

type ReadingMode = "guided" | "immersion";
type TimerOption = "off" | "1" | "3" | "5" | "10";
type PassageSource = "seed" | "deck" | "fresh";
type ScreenView = "reading" | "results";

const levels = ["N5", "N4", "N3", "N2", "N1"] as const;
const timerOptions: { value: TimerOption; label: string }[] = [
  { value: "off", label: "Off" }, { value: "1", label: "1 min" }, { value: "3", label: "3 min" },
  { value: "5", label: "5 min" }, { value: "10", label: "10 min" },
];
const comprehension: Record<string, { question: string; choices: string[]; answer: string }[]> = {
  "morning-walk": [{ question: "何時に起きますか？", choices: ["五時", "六時", "七時"], answer: "六時" }, { question: "どこまで歩きますか？", choices: ["学校", "家", "駅"], answer: "駅" }],
  "library-book": [{ question: "いつ図書館へ行きますか？", choices: ["日曜日", "月曜日", "土曜日"], answer: "日曜日" }, { question: "何を読みますか？", choices: ["新聞", "日本語の本", "手紙"], answer: "日本語の本" }],
  "weather-and-tea": [{ question: "今日は何ですか？", choices: ["雪です", "雨です", "晴れです"], answer: "雨です" }, { question: "家で何を飲みますか？", choices: ["水", "コーヒー", "お茶"], answer: "お茶" }],
  "weekend-food": [{ question: "いつ食事をしますか？", choices: ["土曜日", "日曜日", "金曜日"], answer: "土曜日" }, { question: "どこで食べますか？", choices: ["学校", "レストラン", "図書館"], answer: "レストラン" }],
  "new-class": [{ question: "先生はどんな人ですか？", choices: ["親切です", "忙しいです", "静かです"], answer: "親切です" }, { question: "学生は何をしますか？", choices: ["食べます", "歩きます", "勉強します"], answer: "勉強します" }],
};

function getSavedDeckKeys(): Set<string> {
  try {
    const raw = localStorage.getItem("hirachan_master_stats_v1");
    const cards = raw ? (JSON.parse(raw) as { srsCards?: Record<string, unknown> }).srsCards : undefined;
    return new Set(Object.keys(cards ?? {}));
  } catch { return new Set(); }
}

function getSourcePassages(source: PassageSource): ReadingPassage[] {
  if (source !== "deck") return SEED_READING_PASSAGES;
  const deckKeys = getSavedDeckKeys();
  const matches = SEED_READING_PASSAGES.filter((passage) => passage.tokens.some((token) => token.addToSrs && token.dictKey && deckKeys.has(token.dictKey)));
  return matches.length > 0 ? matches : SEED_READING_PASSAGES;
}

function TokenButton({ token, mode, revealed, missed, onClick }: { token: ReadingToken; mode: ReadingMode; revealed: boolean; missed: boolean; onClick: () => void }) {
  if (!token.tappable) return <span>{token.surface}</span>;
  const isGrammar = token.type === "grammar";
  return <button type="button" onClick={onClick} aria-label={`Explain ${token.surface}`} className={`group relative mx-0.5 inline-flex flex-col items-center border-b-2 px-0.5 align-baseline transition cursor-pointer ${missed ? "border-natural-clay text-natural-clay" : isGrammar ? "border-natural-border/60 text-natural-forest" : "border-natural-forest/35 text-natural-forest hover:border-natural-forest"}`}>
    {mode === "guided" && revealed && token.reading && <span className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-natural-bg px-1.5 py-0.5 text-[10px] text-natural-forest-light shadow-sm">{token.reading}</span>}
    <span>{token.surface}</span>{revealed && token.meaning && <span className="max-w-24 truncate text-[9px] text-natural-forest-light">{token.meaning}</span>}
  </button>;
}

export default function ReadingRoomScreen({ onBack, language, speakJapanese, addCard, hasCard, onRecordReadingMiss, showToast, onReviewDeck, onReadingStarted, onReadingMiss }: ReadingRoomScreenProps) {
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

  const isJapanese = language === "ja";
  useEffect(() => { onReadingStarted(); }, []);
  const passages = useMemo(() => getSourcePassages(source), [source]);
  const passage = passages[passageIndex % passages.length];
  const missedTokens = passage.tokens.filter((token, index) => missedIds.has(index) && token.addToSrs);
  const questions = source === "seed" ? (comprehension[passage.id] || []) : [];
  const timerSeconds = timer === "off" ? null : Number(timer) * 60;

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

  const resetSession = () => { setRevealedIds(new Set()); setMissedIds(new Set()); setAnswers({}); };
  const chooseSource = (nextSource: PassageSource) => { setSource(nextSource); setPassageIndex(0); setView("reading"); setStartedAt(Date.now()); setFinishedAt(null); resetSession(); };
  const handleTokenClick = (index: number, token: ReadingToken) => {
    if (mode === "guided" || token.type === "grammar") setRevealedIds((previous) => { const next = new Set(previous); next.has(index) ? next.delete(index) : next.add(index); return next; });
    if (mode === "immersion" && token.addToSrs) {
      if (!missedIds.has(index)) { onRecordReadingMiss(token); onReadingMiss(); }
      setMissedIds((previous) => new Set(previous).add(index));
    }
  };
  const nextPassage = () => { setPassageIndex((index) => (index + 1) % passages.length); setView("reading"); setStartedAt(Date.now()); setFinishedAt(null); resetSession(); onReadingStarted(); };
  const finishReading = () => { setFinishedAt(Date.now()); setView("results"); };
  const addToReviewDeck = (token: ReadingToken) => {
    if (!token.dictKey) return;
    if (hasCard(token.dictKey)) { showToast(`${token.surface} is already in your Review Deck.`); return; }
    addCard(token.dictKey, "vocab");
    showToast(`${token.surface} added to your Review Deck.`);
  };
  const addAllToReviewDeck = () => {
    const pending = missedTokens.filter((token) => token.dictKey && !hasCard(token.dictKey));
    pending.forEach((token) => addCard(token.dictKey!, "vocab"));
    showToast(pending.length > 0 ? `${pending.length} item${pending.length === 1 ? "" : "s"} added to your Review Deck.` : "All missed items are already in your Review Deck.");
  };
  const readAnother = () => { nextPassage(); };
  const elapsedSeconds = Math.max(0, Math.round(((finishedAt ?? Date.now()) - startedAt) / 1000));
  const correctAnswers = questions.filter((question, index) => answers[index] === question.answer).length;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full space-y-5 pb-6">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-natural-border/70 bg-natural-card/70 px-3 py-2 text-sm font-semibold text-natural-forest-light transition hover:border-natural-forest hover:text-natural-forest cursor-pointer"><ChevronLeft className="h-4 w-4" />{isJapanese ? "Study Roomへ戻る" : "Back to Study Room"}</button>
    {view === "reading" ? <>
      <div className="rounded-2xl border border-natural-border/70 bg-natural-card/65 p-4 shadow-sm sm:p-6"><div className="flex flex-col gap-4 border-b border-natural-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-xl border border-natural-forest/30 bg-natural-forest/10 p-2.5 text-natural-forest"><BookOpen className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-natural-clay">{isJapanese ? "読解の間" : "Reading Room"}</p><h1 className="mt-1 font-serif text-2xl font-extrabold text-natural-forest">{isJapanese ? "静かに読む" : "A quiet place to read"}</h1><p className="mt-1 max-w-xl text-sm leading-relaxed text-natural-forest-light">{isJapanese ? "短い文章を読みながら、日本語を少しずつ身につけましょう。" : "Read a little Japanese at a time, and notice what you are ready to learn next."}</p></div></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-natural-forest/30 bg-natural-forest/10 px-3 py-1.5 text-xs font-bold text-natural-forest"><Sparkles className="h-3.5 w-3.5" /> N5 ready</span></div>
        <div className="mt-5 space-y-5"><div><div className="mb-2 flex items-center justify-between gap-3"><h2 className="font-serif text-sm font-bold text-natural-forest">{isJapanese ? "レベル" : "Reading level"}</h2><span className="text-xs text-natural-forest-light">N5 is available</span></div><div className="grid grid-cols-5 gap-2">{levels.map((level) => { const active = level === "N5"; return <button key={level} type="button" disabled={!active} className={`relative min-h-14 rounded-xl border px-2 py-2 text-center transition ${active ? "border-natural-forest bg-natural-forest/15 text-natural-forest shadow-sm" : "cursor-not-allowed border-natural-border/50 bg-natural-bg/40 text-natural-forest-light/45"}`}><span className="block text-sm font-bold">{level}</span>{!active && <span className="mt-0.5 flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider"><LockKeyhole className="h-2.5 w-2.5" /> Soon</span>}{active && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />}</button>; })}</div></div>
          <div><div className="mb-2 flex items-center justify-between gap-3"><h2 className="font-serif text-sm font-bold text-natural-forest">{isJapanese ? "文章の出典" : "Passage source"}</h2><span className="text-xs text-natural-forest-light">{passageIndex + 1} / {passages.length}</span></div><div className="grid gap-2 sm:grid-cols-3">{(["seed", "fresh", "deck"] as const).map((option) => { const labels = { seed: "Seed passages", fresh: "Fresh practice", deck: "From your deck" }; return <button key={option} type="button" onClick={() => chooseSource(option)} aria-pressed={source === option} className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition cursor-pointer ${source === option ? "border-natural-forest bg-natural-forest/15 text-natural-forest" : "border-natural-border/70 bg-natural-bg/40 text-natural-forest-light hover:border-natural-forest/60"}`}>{labels[option]}<span className="mt-0.5 block text-[10px] font-normal opacity-75">{option === "deck" ? "Matches saved cards when possible" : option === "fresh" ? "Another N5 reading" : "Hand-tuned N5 stories"}</span></button>; })}</div>{source === "deck" && passages.length === SEED_READING_PASSAGES.length && <p className="mt-2 text-xs text-natural-clay">No matching saved cards yet, so seed passages are being shown.</p>}</div>
          <div className="grid gap-4 md:grid-cols-2"><fieldset><legend className="mb-2 font-serif text-sm font-bold text-natural-forest">{isJapanese ? "サポート" : "Assistance"}</legend><div className="grid grid-cols-2 rounded-xl border border-natural-border/70 bg-natural-bg/45 p-1">{(["guided", "immersion"] as const).map((option) => <button key={option} type="button" onClick={() => setMode(option)} aria-pressed={mode === option} className={`rounded-lg px-3 py-2 text-sm font-semibold transition cursor-pointer ${mode === option ? "bg-natural-forest text-natural-bg" : "text-natural-forest-light hover:bg-natural-card/70"}`}>{option === "guided" ? "Guided" : "Immersion"}</button>)}</div><p className="mt-2 text-xs leading-relaxed text-natural-forest-light">{mode === "guided" ? "Tap a word for reading and meaning help." : "Tap a word when you want to mark it for review."}</p></fieldset><fieldset><legend className="mb-2 flex items-center gap-1.5 font-serif text-sm font-bold text-natural-forest"><Clock3 className="h-4 w-4" /> {isJapanese ? "時間制限" : "Optional timer"}</legend><div className="flex flex-wrap gap-2">{timerOptions.map((option) => <button key={option.value} type="button" onClick={() => setTimer(option.value)} aria-pressed={timer === option.value} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer ${timer === option.value ? "border-natural-clay bg-natural-clay/15 text-natural-clay" : "border-natural-border/70 bg-natural-bg/45 text-natural-forest-light hover:border-natural-clay/60"}`}>{option.label}</button>)}</div><p className="mt-2 text-xs leading-relaxed text-natural-forest-light">{timeLeft === null ? "No pressure. Take your time." : `Time remaining: ${formatTime(timeLeft)}`}</p></fieldset></div>
        </div></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(250px,0.85fr)]"><div className="rounded-2xl border border-natural-border/70 bg-natural-card/55 p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between gap-3 border-b border-natural-border/60 pb-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-natural-clay">N5 · {passage.titleJa}</p><h2 className="mt-1 font-serif text-xl font-extrabold text-natural-forest">{passage.title}</h2></div><div className="flex items-center gap-2"><button type="button" onClick={() => speakJapanese(getPassageText(passage))} title="Listen to passage" className="rounded-lg border border-natural-border/70 bg-natural-bg/50 p-2 text-natural-forest-light transition hover:border-natural-forest hover:text-natural-forest cursor-pointer"><Headphones className="h-4 w-4" /></button><button type="button" onClick={nextPassage} title="Next passage" className="rounded-lg border border-natural-border/70 bg-natural-bg/50 p-2 text-natural-forest-light transition hover:border-natural-forest hover:text-natural-forest cursor-pointer"><ChevronRight className="h-4 w-4" /></button></div></div><div className="mt-6 rounded-xl border border-natural-border/50 bg-natural-bg/30 p-5 sm:p-7"><p className="font-serif text-xl leading-[2.2] text-natural-forest">{passage.tokens.map((token, index) => <span key={`${passage.id}-${index}`}><TokenButton token={token} mode={mode} revealed={revealedIds.has(index)} missed={missedIds.has(index)} onClick={() => handleTokenClick(index, token)} /></span>)}</p></div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-relaxed text-natural-forest-light">{mode === "guided" ? "Guided help appears above tapped words." : "Tapped vocabulary is marked in your session notes."}</p><div className="flex items-center gap-3"><button type="button" onClick={resetSession} className="inline-flex items-center gap-1.5 text-xs font-semibold text-natural-forest-light transition hover:text-natural-forest cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /> Reset notes</button><button type="button" onClick={finishReading} className="rounded-xl bg-natural-forest px-4 py-2 text-xs font-bold text-natural-bg transition hover:bg-natural-forest/90 cursor-pointer">Finish reading</button></div></div><p className="mt-4 rounded-lg border border-natural-forest/15 bg-natural-forest/5 p-3 text-sm leading-relaxed text-natural-forest-light"><span className="font-semibold text-natural-forest">Meaning:</span> {passage.translation}</p></div><aside className="rounded-2xl border border-natural-border/70 bg-natural-card/45 p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em] text-natural-clay">Your notes</p><div className="flex items-start justify-between gap-3"><h2 className="mt-1 font-serif text-xl font-extrabold text-natural-forest">{isJapanese ? "見つけた言葉" : "Missed items"}</h2><span className="rounded-full bg-natural-clay/15 px-2 py-1 text-xs font-bold text-natural-clay">{missedTokens.length}</span></div>{missedTokens.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-natural-border/70 bg-natural-bg/35 p-4 text-center"><p className="text-sm font-semibold text-natural-forest-light">{isJapanese ? "まだありません" : "Nothing here yet"}</p><p className="mt-1 text-xs leading-relaxed text-natural-forest-light/75">{mode === "immersion" ? "Tap a word you want to remember." : "Try Immersion mode to collect unfamiliar words."}</p></div> : <div className="mt-5 space-y-2">{missedTokens.map((token) => <div key={token.dictKey} className="rounded-xl border border-natural-clay/25 bg-natural-clay/5 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-serif text-lg font-bold text-natural-forest">{token.surface}</p><p className="text-xs text-natural-forest-light">{token.reading} · {token.meaning}</p></div><button type="button" onClick={() => addToReviewDeck(token)} className="rounded-lg border border-natural-forest/25 bg-natural-forest/10 px-2 py-1 text-[10px] font-semibold text-natural-forest transition hover:border-natural-forest cursor-pointer">{hasCard(token.dictKey || "") ? "Added" : "Add"}</button></div><p className="mt-1 text-[10px] uppercase tracking-wider text-natural-clay">Review later</p></div>)}</div>}{missedTokens.length > 0 && <button type="button" onClick={addAllToReviewDeck} className="mt-4 w-full rounded-xl border border-natural-clay/30 bg-natural-clay/10 px-3 py-2 text-xs font-bold text-natural-clay transition hover:bg-natural-clay/15 cursor-pointer">Add all to Review Deck</button>}</aside></div>
    </> : <div className="rounded-2xl border border-natural-border/70 bg-natural-card/65 p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between gap-4 border-b border-natural-border/60 pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-natural-clay">N5 · Results</p><h1 className="mt-1 font-serif text-2xl font-extrabold text-natural-forest">Reading complete</h1><p className="mt-1 text-sm text-natural-forest-light">A calm review of this reading session.</p></div><Sparkles className="h-7 w-7 text-natural-clay" /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-natural-border/60 bg-natural-bg/40 p-4"><p className="text-xs text-natural-forest-light">Reading time</p><p className="mt-1 font-mono text-2xl font-bold text-natural-forest">{formatTime(elapsedSeconds)}</p></div><div className="rounded-xl border border-natural-border/60 bg-natural-bg/40 p-4"><p className="text-xs text-natural-forest-light">Missed items</p><p className="mt-1 font-mono text-2xl font-bold text-natural-clay">{missedTokens.length}</p></div><div className="rounded-xl border border-natural-border/60 bg-natural-bg/40 p-4"><p className="text-xs text-natural-forest-light">Comprehension</p><p className="mt-1 font-mono text-2xl font-bold text-natural-forest">{questions.length > 0 ? `${correctAnswers}/${questions.length}` : "--"}</p></div></div>{questions.length > 0 && <div className="mt-6 space-y-4"><h2 className="font-serif text-lg font-extrabold text-natural-forest">Quick comprehension</h2>{questions.map((question, index) => <fieldset key={question.question} className="rounded-xl border border-natural-border/60 bg-natural-bg/30 p-4"><legend className="px-1 text-sm font-semibold text-natural-forest">{question.question}</legend><div className="mt-2 flex flex-wrap gap-2">{question.choices.map((choice) => <button key={choice} type="button" onClick={() => setAnswers((previous) => ({ ...previous, [index]: choice }))} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer ${answers[index] === choice ? "border-natural-forest bg-natural-forest/15 text-natural-forest" : "border-natural-border/70 bg-natural-card/50 text-natural-forest-light hover:border-natural-forest/60"}`}>{choice}</button>)}</div></fieldset>)}</div>}<div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={readAnother} className="rounded-xl bg-natural-forest px-4 py-2.5 text-sm font-bold text-natural-bg transition hover:bg-natural-forest/90 cursor-pointer">Read another passage</button><button type="button" onClick={() => { setView("reading"); setStartedAt(Date.now()); setFinishedAt(null); }} className="rounded-xl border border-natural-border/70 bg-natural-bg/40 px-4 py-2.5 text-sm font-semibold text-natural-forest-light transition hover:border-natural-forest cursor-pointer">Review this passage</button><button type="button" onClick={onBack} className="rounded-xl border border-natural-border/70 px-4 py-2.5 text-sm font-semibold text-natural-forest-light transition hover:border-natural-forest cursor-pointer">Back to Study Room</button></div></div>}
    {view === "results" && <button type="button" onClick={onReviewDeck} className="mx-auto inline-flex rounded-xl border border-natural-clay/30 bg-natural-clay/10 px-4 py-2.5 text-sm font-semibold text-natural-clay transition hover:bg-natural-clay/15 cursor-pointer">Review missed items in Deck</button>}
    </motion.section>;
}
