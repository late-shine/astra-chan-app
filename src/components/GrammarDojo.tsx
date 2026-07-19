import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  Search, 
  Volume2, 
  Lightbulb, 
  Sparkles, 
  Award, 
  HelpCircle, 
  BookOpen
} from "lucide-react";
import companionImg from "../assets/images/synthid-removed-Gemini_Generated_Image_csh1tcsh1tcsh1tc.png";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GrammarDojoProps {
  onBack: () => void;
  onAwardXP: (amount: number) => void;
}

interface GrammarExample {
  japanese: string;
  reading: string;
  english: string;
}

interface QuizBlank {
  sentence: string;  // contains ＿＿＿
  blank: string;     // correct answer
  choices: string[]; // exactly 4, includes correct
  hint: string;
}

interface QuizQuestion extends QuizBlank {
  patternId: string;
  patternLabel: string;
}

interface GrammarPattern {
  id: string;
  pattern: string;
  reading: string;
  meaning: string;
  structure: string;
  level: "basic" | "intermediate";
  examples: GrammarExample[];
  tip?: string;
  quizBlanks: QuizBlank[];
}

// ─── Speak Helper (mirrors ReferenceCharts.tsx) ───────────────────────────────

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const jpVoice = voices.find((v) => v.lang.startsWith("ja"));
  if (jpVoice) u.voice = jpVoice;
  window.speechSynthesis.speak(u);
}

// ─── Grammar Pattern Data ──────────────────────────────────────────────────────

const GRAMMAR_PATTERNS: GrammarPattern[] = [
  {
    id: "wa-desu",
    pattern: "～は～です",
    reading: "",
    meaning: "X is Y (basic identification)",
    structure: "Noun は Noun です",
    level: "basic",
    examples: [
      { japanese: "私は学生です", reading: "わたしはがくせいです", english: "I am a student" },
      { japanese: "これは本です", reading: "これはほんです", english: "This is a book" },
      { japanese: "田中さんは先生です", reading: "たなかさんはせんせいです", english: "Mr. Tanaka is a teacher" },
    ],
    tip: "は is written as 'ha' but pronounced 'wa' as a particle.",
    quizBlanks: [
      { sentence: "私＿＿＿学生です", blank: "は", choices: ["は", "が", "を", "に"], hint: "Topic marker particle" },
      { sentence: "これ＿＿＿本です", blank: "は", choices: ["は", "が", "で", "も"], hint: "What marks the topic?" },
      { sentence: "田中さんは先生＿＿＿", blank: "です", choices: ["です", "ます", "だ", "でした"], hint: "Polite copula ending" },
    ],
  },
  {
    id: "ga-suki",
    pattern: "～が好き/嫌い",
    reading: "～がすき/きらい",
    meaning: "Like or dislike something",
    structure: "Noun が 好き/嫌い です",
    level: "basic",
    examples: [
      { japanese: "猫が好きです", reading: "ねこがすきです", english: "I like cats" },
      { japanese: "勉強が嫌いです", reading: "べんきょうがきらいです", english: "I dislike studying" },
      { japanese: "音楽が大好きです", reading: "おんがくがだいすきです", english: "I love music" },
    ],
    tip: "が not は! The thing you like/dislike takes が, not を.",
    quizBlanks: [
      { sentence: "猫＿＿＿好きです", blank: "が", choices: ["が", "は", "を", "に"], hint: "Particle before 好き/嫌い" },
      { sentence: "勉強＿＿＿嫌いです", blank: "が", choices: ["が", "は", "を", "で"], hint: "Particle for likes/dislikes" },
      { sentence: "音楽が＿＿＿です", blank: "大好き", choices: ["大好き", "好き", "嫌い", "得意"], hint: "Love (emphatic like)" },
    ],
  },
  {
    id: "te-iru",
    pattern: "～ている",
    reading: "",
    meaning: "Currently doing / ongoing state",
    structure: "Verb て-form + いる",
    level: "intermediate",
    examples: [
      { japanese: "食べています", reading: "たべています", english: "I am eating (right now)" },
      { japanese: "本を読んでいます", reading: "ほんをよんでいます", english: "I am reading a book" },
      { japanese: "雨が降っています", reading: "あめがふっています", english: "It is raining" },
    ],
    tip: "Also used for states: 結婚しています = I am married (ongoing state).",
    quizBlanks: [
      { sentence: "食べて＿＿＿", blank: "います", choices: ["います", "いました", "ください", "あります"], hint: "Progressive helper verb (present)" },
      { sentence: "本を読んで＿＿＿", blank: "います", choices: ["います", "いました", "いません", "みます"], hint: "Currently doing (present form)" },
      { sentence: "雨が＿＿＿います", blank: "降って", choices: ["降って", "降りて", "降らて", "降いて"], hint: "て-form of 降る (to fall/rain)" },
    ],
  },
  {
    id: "tai",
    pattern: "～たい",
    reading: "",
    meaning: "Want to do something",
    structure: "Verb ます-stem + たい",
    level: "basic",
    examples: [
      { japanese: "日本に行きたい", reading: "にほんにいきたい", english: "I want to go to Japan" },
      { japanese: "すしを食べたいです", reading: "すしをたべたいです", english: "I want to eat sushi" },
      { japanese: "日本語を勉強したい", reading: "にほんごをべんきょうしたい", english: "I want to study Japanese" },
    ],
    tip: "たい conjugates like an い-adjective: たくない (don't want to), たかった (wanted to).",
    quizBlanks: [
      { sentence: "日本に行き＿＿＿", blank: "たい", choices: ["たい", "ない", "ます", "たく"], hint: "Want to do (attaches to verb stem)" },
      { sentence: "すしを食べ＿＿＿です", blank: "たい", choices: ["たい", "て", "ない", "ます"], hint: "Want to eat" },
      { sentence: "日本語＿＿＿勉強したい", blank: "を", choices: ["を", "が", "は", "に"], hint: "Object marker particle" },
    ],
  },
  {
    id: "nai",
    pattern: "～ない",
    reading: "",
    meaning: "Negative plain form — not doing",
    structure: "Verb negative plain form",
    level: "basic",
    examples: [
      { japanese: "食べない", reading: "たべない", english: "(I) don't eat / won't eat" },
      { japanese: "行かない", reading: "いかない", english: "(I) don't go" },
      { japanese: "わからない", reading: "わからない", english: "(I) don't understand" },
    ],
    tip: "Group 1: replace う with あない. Group 2: replace る with ない. する→しない、くる→こない.",
    quizBlanks: [
      { sentence: "食べ＿＿＿", blank: "ない", choices: ["ない", "たい", "ます", "て"], hint: "Plain negative (Group 2 verb)" },
      { sentence: "行か＿＿＿", blank: "ない", choices: ["ない", "ます", "て", "た"], hint: "Negative of 行く (Group 1)" },
      { sentence: "わから＿＿＿", blank: "ない", choices: ["ない", "ます", "ていない", "たい"], hint: "Don't understand" },
    ],
  },
  {
    id: "ta-past",
    pattern: "～た",
    reading: "",
    meaning: "Plain past tense",
    structure: "Verb て-form → replace て with た",
    level: "basic",
    examples: [
      { japanese: "食べた", reading: "たべた", english: "(I) ate" },
      { japanese: "学校に行った", reading: "がっこうにいった", english: "(I) went to school" },
      { japanese: "映画を見た", reading: "えいがをみた", english: "(I) watched a movie" },
    ],
    tip: "Same pattern as て-form but use た/だ instead of て/で.",
    quizBlanks: [
      { sentence: "食べ＿＿＿", blank: "た", choices: ["た", "て", "ない", "たい"], hint: "Plain past tense ending" },
      { sentence: "学校に行＿＿＿", blank: "った", choices: ["った", "きた", "かった", "いた"], hint: "Past of 行く (irregular て-form)" },
      { sentence: "映画を見＿＿＿", blank: "た", choices: ["た", "て", "ない", "ます"], hint: "Plain past (Group 2)" },
    ],
  },
  {
    id: "te-form-uses",
    pattern: "～てください",
    reading: "",
    meaning: "Please do ~ (polite request)",
    structure: "Verb て-form + ください",
    level: "basic",
    examples: [
      { japanese: "食べてください", reading: "たべてください", english: "Please eat" },
      { japanese: "ここに書いてください", reading: "ここにかいてください", english: "Please write here" },
      { japanese: "待ってください", reading: "まってください", english: "Please wait" },
    ],
    tip: "て-form has many uses: connecting actions (〜て〜て), permission (〜てもいい), prohibition (〜てはいけない).",
    quizBlanks: [
      { sentence: "食べて＿＿＿", blank: "ください", choices: ["ください", "います", "もいい", "みます"], hint: "Please do ~ (polite request)" },
      { sentence: "ここに書い＿＿＿", blank: "てください", choices: ["てください", "てあります", "ていました", "てもいい"], hint: "Please write here" },
      { sentence: "待＿＿＿ください", blank: "って", choices: ["って", "て", "いて", "きて"], hint: "て-form of 待つ (to wait)" },
    ],
  },
  {
    id: "kara-node",
    pattern: "～から / ～ので",
    reading: "",
    meaning: "Because / therefore (giving reason)",
    structure: "Sentence + から/ので + result",
    level: "intermediate",
    examples: [
      { japanese: "寒いから、コートを着ます", reading: "さむいから、コートをきます", english: "It's cold, so I wear a coat" },
      { japanese: "雨だから、家にいます", reading: "あめだから、いえにいます", english: "It's raining so I'm staying home" },
      { japanese: "時間がないので、急ぎます", reading: "じかんがないので、いそぎます", english: "I have no time, so I'll hurry" },
    ],
    tip: "から is more direct/casual. ので is softer and more polite. Both mean 'because'.",
    quizBlanks: [
      { sentence: "寒い＿＿＿、コートを着ます", blank: "から", choices: ["から", "ので", "けど", "が"], hint: "Because (direct/casual)" },
      { sentence: "時間がない＿＿＿、急ぎます", blank: "ので", choices: ["ので", "から", "けど", "のに"], hint: "Because (softer, polite)" },
      { sentence: "雨だ＿＿＿、家にいます", blank: "から", choices: ["から", "ので", "に", "と"], hint: "Casual 'because'" },
    ],
  },
  {
    id: "to-omou",
    pattern: "～と思う",
    reading: "～とおもう",
    meaning: "I think that ~",
    structure: "Plain form sentence + と思います",
    level: "intermediate",
    examples: [
      { japanese: "いいと思います", reading: "いいとおもいます", english: "I think it's good" },
      { japanese: "雨が降ると思います", reading: "あめがふるとおもいます", english: "I think it will rain" },
      { japanese: "彼は来ないと思います", reading: "かれはこないとおもいます", english: "I think he won't come" },
    ],
    tip: "The sentence before と must be in plain form, not ます/です form.",
    quizBlanks: [
      { sentence: "いい＿＿＿思います", blank: "と", choices: ["と", "が", "は", "を"], hint: "Quotation particle ('that')" },
      { sentence: "雨が降る＿＿＿思います", blank: "と", choices: ["と", "が", "は", "で"], hint: "I think that..." },
      { sentence: "彼は来ない＿＿＿思います", blank: "と", choices: ["と", "が", "は", "に"], hint: "Connects thought to 思う" },
    ],
  },
  {
    id: "deshou",
    pattern: "～でしょう",
    reading: "",
    meaning: "Probably / I suppose (conjecture)",
    structure: "Plain form + でしょう",
    level: "intermediate",
    examples: [
      { japanese: "明日は晴れでしょう", reading: "あしたははれでしょう", english: "It will probably be sunny tomorrow" },
      { japanese: "彼女は学生でしょう", reading: "かのじょはがくせいでしょう", english: "She is probably a student" },
      { japanese: "難しいでしょう", reading: "むずかしいでしょう", english: "It's probably difficult" },
    ],
    tip: "Rising intonation (でしょう?) turns it into a confirmation question: 'Right?'.",
    quizBlanks: [
      { sentence: "明日は晴れ＿＿＿", blank: "でしょう", choices: ["でしょう", "です", "だろう", "でした"], hint: "Probably (polite conjecture)" },
      { sentence: "彼女は学生＿＿＿", blank: "でしょう", choices: ["でしょう", "です", "でしたか", "ですか"], hint: "She is probably..." },
      { sentence: "難し＿＿＿", blank: "いでしょう", choices: ["いでしょう", "いですか", "かった", "くない"], hint: "Probably difficult (い-adj + でしょう)" },
    ],
  },
  {
    id: "yori-houga",
    pattern: "～より～の方が",
    reading: "～より～のほうが",
    meaning: "~ is more ~ than ~ (comparison)",
    structure: "A より B の方が adjective",
    level: "intermediate",
    examples: [
      { japanese: "犬より猫の方が好きです", reading: "いぬよりねこのほうがすきです", english: "I like cats more than dogs" },
      { japanese: "バスより電車の方が速い", reading: "バスよりでんしゃのほうがはやい", english: "Trains are faster than buses" },
      { japanese: "昨日より今日の方が暖かい", reading: "きのうよりきょうのほうがあたたかい", english: "Today is warmer than yesterday" },
    ],
    tip: "より = 'than'. の方が = 'the one that is more'. Always: [less preferred] より [more preferred] の方が.",
    quizBlanks: [
      { sentence: "犬＿＿＿猫の方が好きです", blank: "より", choices: ["より", "から", "ので", "けど"], hint: "'Than' in a comparison" },
      { sentence: "バスより電車の＿＿＿が速い", blank: "方", choices: ["方", "の", "もの", "こと"], hint: "の＿＿＿が = 'the one that is more'" },
      { sentence: "昨日より今日の方＿＿＿暖かい", blank: "が", choices: ["が", "は", "を", "で"], hint: "Subject marker after の方" },
    ],
  },
  {
    id: "mo-ii",
    pattern: "～てもいい",
    reading: "",
    meaning: "It's okay to do ~ / May I ~?",
    structure: "Verb て-form + もいい (です)",
    level: "basic",
    examples: [
      { japanese: "食べてもいいです", reading: "たべてもいいです", english: "It's okay to eat / You may eat" },
      { japanese: "ここに座ってもいいですか", reading: "ここにすわってもいいですか", english: "May I sit here?" },
      { japanese: "写真を撮ってもいいですか", reading: "しゃしんをとってもいいですか", english: "May I take a photo?" },
    ],
    tip: "Opposite: ～てはいけない = must not do. ～なければならない = must do.",
    quizBlanks: [
      { sentence: "食べて＿＿＿です", blank: "もいい", choices: ["もいい", "ください", "います", "ほしい"], hint: "May / It's okay to (permission)" },
      { sentence: "ここに座って＿＿＿ですか", blank: "もいい", choices: ["もいい", "ください", "います", "はいけない"], hint: "May I sit here?" },
      { sentence: "写真を撮って＿＿＿ですか", blank: "もいい", choices: ["もいい", "ください", "みます", "はいけない"], hint: "May I take a photo?" },
    ],
  },
];

// ─── Quiz Helpers ─────────────────────────────────────────────────────────────

const QUIZ_LENGTH = 10;

function buildQuiz(): QuizQuestion[] {
  const pool: QuizQuestion[] = GRAMMAR_PATTERNS.flatMap((p) =>
    p.quizBlanks.map((b) => ({
      ...b,
      choices: [...b.choices].sort(() => Math.random() - 0.5),
      patternId: p.id,
      patternLabel: p.pattern,
    }))
  );
  return [...pool].sort(() => Math.random() - 0.5).slice(0, QUIZ_LENGTH);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExampleRow({ example, showRomaji }: { example: GrammarExample; showRomaji: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-natural-bg/40 border border-natural-border/40 rounded-xl hover:bg-natural-card/50 hover:border-natural-border transition duration-200">
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[15px] font-extrabold text-natural-charcoal tracking-wide leading-relaxed">
          {example.japanese}
        </p>
        {showRomaji && (
          <p className="font-serif text-xs text-natural-charcoal/50 mt-0.5 tracking-wider">
            {example.reading}
          </p>
        )}
        <p className="font-sans text-xs text-natural-forest/80 italic mt-1 font-medium">
          {example.english}
        </p>
      </div>
      <button
        type="button"
        onClick={() => speak(example.japanese)}
        className="p-2 rounded-xl bg-natural-bg/80 border border-natural-border/50 hover:bg-natural-forest/10 hover:border-natural-forest text-natural-forest/60 hover:text-natural-forest transition shrink-0 cursor-pointer shadow-xs"
        title={`Pronounce: ${example.japanese}`}
      >
        <Volume2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function BlankSentence({
  sentence,
  answered,
  blank,
}: {
  sentence: string;
  answered: string | null;
  blank: string;
}) {
  const parts = sentence.split("＿＿＿");
  const isCorrect = answered !== null && answered === blank;
  return (
    <span className="font-serif text-2xl md:text-3xl leading-loose tracking-wide text-natural-charcoal select-text">
      {parts[0]}
      <span
        className={`inline-block min-w-[4rem] px-3.5 mx-1 rounded-2xl border-2 text-center font-bold align-middle transition-all duration-300 ${
          answered === null
            ? "border-dashed border-natural-charcoal/30 bg-natural-bg/50 text-transparent h-10 w-16"
            : isCorrect
            ? "border-natural-forest bg-natural-forest/15 text-natural-forest scale-105"
            : "border-natural-terracotta bg-natural-terracotta/15 text-natural-terracotta scale-105"
        }`}
      >
        {answered ?? "　　"}
      </span>
      {parts[1]}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function GrammarDojo({ onBack, onAwardXP }: GrammarDojoProps) {
  // ── Study mode state ────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"study" | "practice">("study");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "basic" | "intermediate">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ── Practice mode state ─────────────────────────────────────────────────────
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  // ref keeps score in sync for XP calc (avoids stale closure on last question)
  const scoreRef = useRef(0);

  // ── Romaji visibility (shared preference with Reference Charts) ────────────
  const [showRomaji, setShowRomaji] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("astra_show_romaji");
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (e) { }
    return true; // N5 beginners need it visible by default
  });

  useEffect(() => {
    try {
      localStorage.setItem("astra_show_romaji", String(showRomaji));
    } catch (e) { }
  }, [showRomaji]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const startPractice = () => {
    const q = buildQuiz();
    setQuiz(q);
    setQIdx(0);
    setAnswered(null);
    setScore(0);
    scoreRef.current = 0;
    setQuizDone(false);
    setMode("practice");
  };

  const handleAnswer = (choice: string) => {
    if (answered !== null) return;
    setAnswered(choice);
    if (choice === quiz[qIdx].blank) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
  };

  const goNext = () => {
    if (qIdx + 1 >= quiz.length) {
      const xp = scoreRef.current * 8 + (quiz.length - scoreRef.current) * 2;
      onAwardXP(xp);
      setQuizDone(true);
    } else {
      setQIdx((i) => i + 1);
      setAnswered(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredPatterns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GRAMMAR_PATTERNS.filter((p) => {
      if (levelFilter !== "all" && p.level !== levelFilter) return false;
      if (!q) return true;
      const haystack = [
        p.pattern,
        p.meaning,
        p.reading,
        ...p.examples.flatMap((e) => [e.japanese, e.reading, e.english]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery, levelFilter]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const currentQ = quiz[qIdx] ?? null;
  const isLastQ = qIdx + 1 >= quiz.length;
  const isCorrect = answered !== null && currentQ && answered === currentQ.blank;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: "spring", damping: 25, stiffness: 180 }}
      className="bg-natural-card/35 border-2 border-natural-border/30 rounded-3xl p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl hover:shadow-[0_20px_50px_rgba(188,163,240,0.15)] w-full flex flex-col gap-5 select-none transition-all duration-500"
    >
      
      {/* HEADER SECTION - IMMERSIVE WATERCOLOR BANNER */}
      <div className="border-b border-natural-border/60 pb-5">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={mode === "practice" ? () => setMode("study") : onBack}
              className="px-3 py-1.5 bg-natural-card border border-natural-border text-natural-forest hover:text-natural-forest hover:border-natural-forest text-xs font-mono font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              {mode === "practice" ? "Back to Scrolls" : "Exit to Room"}
            </button>
            
            <button
              type="button"
              onClick={() => setShowRomaji((v) => !v)}
              className={`rounded-full border px-3 py-1 text-xs font-mono font-bold transition cursor-pointer shadow-xs ${
                showRomaji
                  ? "bg-natural-forest/15 border-natural-forest text-natural-forest"
                  : "bg-natural-card border-natural-border text-natural-charcoal/50 hover:border-natural-forest/50"
              }`}
              title={showRomaji ? "Hide romaji readings" : "Show romaji readings"}
            >
              {showRomaji ? "A Hide Romaji" : "ふ Show Romaji"}
            </button>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <h2 className="font-serif font-black text-2xl text-natural-forest leading-none flex items-center sm:justify-end gap-1.5">
              <span>語法道場</span>
              <span className="text-xs bg-natural-clay/10 text-natural-clay border border-natural-clay/20 px-1.5 py-0.5 rounded-md font-mono uppercase tracking-wider font-extrabold">Grammar Dojo</span>
            </h2>
            <p className="text-[10px] font-mono text-natural-forest-light uppercase tracking-widest mt-1 font-bold">
              {mode === "practice" ? (quizDone ? "Examination Results" : `Scroll Question ${qIdx + 1} of ${quiz.length}`) : "Traditional N5 Grammar Scrolls"}
            </p>
          </div>

        </div>
      </div>

      <div className="w-full flex-grow">
        
        {/* TOOGLE NAVIGATION MODES */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setMode("study")}
            className={`py-3.5 rounded-2xl font-serif font-bold text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 border ${
              mode === "study"
                ? "bg-natural-forest text-natural-bg border-natural-forest shadow-[0_0_20px_rgba(167,136,255,0.55)] scale-102"
                : "bg-natural-card/45 border-natural-border/40 text-natural-charcoal/70 hover:border-natural-forest/40 backdrop-blur-xs"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📖 Study Scrolls</span>
          </button>
          <button
            type="button"
            onClick={startPractice}
            className={`py-3.5 rounded-2xl font-serif font-bold text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 border ${
              mode === "practice"
                ? "bg-natural-clay text-natural-bg border-natural-clay shadow-[0_0_20px_rgba(223,155,255,0.55)] scale-102"
                : "bg-natural-card/45 border-natural-border/40 text-natural-charcoal/70 hover:border-natural-clay/40 backdrop-blur-xs"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>✏️ Dojo Practice</span>
          </button>
        </div>

        {/* ─── STUDY MODE ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {mode === "study" && (
            <motion.div
              key="study"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col gap-4"
            >
              {/* Search Bar - Traditional Brush Style */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-forest/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type a grammar structure, meaning, or Japanese keyword..."
                  className="w-full bg-natural-card border-2 border-natural-border rounded-2xl pl-10 pr-4 py-3 text-sm font-sans text-natural-charcoal placeholder:text-natural-charcoal/40 focus:outline-none focus:border-natural-forest transition shadow-sm"
                />
              </div>

              {/* Filter Chips */}
              <div className="flex gap-2 flex-wrap">
                {(
                  [
                    { key: "all", label: "All Levels" },
                    { key: "basic", label: "Basic (初級)" },
                    { key: "intermediate", label: "Intermediate (中級)" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setLevelFilter(f.key)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold font-mono border transition shadow-xs cursor-pointer ${
                      levelFilter === f.key
                        ? "bg-natural-forest border-natural-forest text-natural-bg"
                        : "bg-natural-card border-natural-border text-natural-charcoal/60 hover:border-natural-forest/40"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Scrolls List */}
              <div className="flex flex-col gap-5 mt-2 pb-12">
                {filteredPatterns.length === 0 ? (
                  <div className="text-center bg-natural-card border border-natural-border p-12 rounded-3xl">
                    <HelpCircle className="w-12 h-12 text-natural-forest-light/40 mx-auto mb-3" />
                    <p className="font-serif font-bold text-natural-charcoal text-base">No scrolls found</p>
                    <p className="text-xs text-natural-forest-light mt-1 font-sans">Try searching for a different keyword or check your spelling.</p>
                  </div>
                ) : (
                  filteredPatterns.map((p) => {
                    const isExpanded = expandedIds.has(p.id);
                    return (
                      <div 
                        key={p.id} 
                        className="relative overflow-hidden rounded-[2rem] border-2 border-natural-border/70 bg-natural-card-light p-5 md:p-6 shadow-sm hover:shadow-md hover:border-natural-clay/40 transition-all duration-300 select-none"
                      >
                        
                        {/* Scroll Watermark background under text */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center">
                          <div className="w-[12rem] h-[12rem] rounded-full border-[8px] border-natural-forest" />
                        </div>

                        {/* Traditional Seal stamp tag in background */}
                        <div className="absolute top-4 right-4 z-0 pointer-events-none opacity-[0.15]">
                          <span className="font-serif font-black text-4xl text-natural-clay border-2 border-double border-natural-clay px-2 py-0.5 rounded rotate-12 inline-block">
                            {p.level === "basic" ? "初" : "中"}
                          </span>
                        </div>

                        {/* Top pattern & toggle */}
                        <button
                          type="button"
                          onClick={() => toggleExpanded(p.id)}
                          className="w-full flex items-start justify-between gap-4 cursor-pointer text-left relative z-10"
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-serif text-2xl text-natural-forest font-black tracking-wide">
                              {p.pattern}
                            </span>
                            
                            <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md font-bold border ${
                              p.level === "basic"
                                ? "bg-natural-forest/10 border-natural-forest/20 text-natural-forest"
                                : "bg-natural-clay/10 border-natural-clay/20 text-natural-clay"
                            }`}>
                              {p.level === "basic" ? "Beginner" : "Intermediate"}
                            </span>
                          </div>

                          <span className="text-natural-forest-light hover:text-natural-forest text-xs font-bold shrink-0 mt-2 p-1 bg-natural-bg/80 border border-natural-border/50 rounded-lg">
                            {isExpanded ? "▲ Hide Details" : "▼ Expand Scroll"}
                          </span>
                        </button>

                        {/* Underline */}
                        <div className="w-full border-b border-natural-border/40 my-2 relative z-10" />

                        {/* Pattern Meaning */}
                        <p className="text-sm text-natural-charcoal font-serif font-bold relative z-10">
                          {p.meaning}
                        </p>

                        {/* Quick preview of 1st example if closed */}
                        {!isExpanded && p.examples[0] && (
                          <div className="mt-3 relative z-10">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-natural-forest-light/60 font-bold mb-1.5">Example Practice</p>
                            <ExampleRow example={p.examples[0]} showRomaji={showRomaji} />
                          </div>
                        )}

                        {/* Expanded details */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-3 relative z-10"
                            >
                              
                              {/* Formula box (Parchemnt Style) */}
                              <div className="relative overflow-hidden bg-natural-bg/70 border-2 border-dashed border-natural-border/60 rounded-2xl px-4 py-3.5 font-mono text-xs mt-1.5 shadow-inner">
                                <div className="absolute inset-0 bg-[radial-gradient(#e6ded4_1px,transparent_1px)] [background-size:12px_12px] opacity-25 pointer-events-none" />
                                <span className="relative z-10 font-mono font-extrabold text-[9px] uppercase tracking-wider text-natural-clay block mb-1">
                                  Grammar Structure Blueprint
                                </span>
                                <span className="relative z-10 font-serif font-black text-[14px] text-natural-charcoal">
                                  {p.structure}
                                </span>
                              </div>

                              {/* Example sentences list */}
                              <div className="flex flex-col gap-2 mt-4">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-natural-forest-light/60 font-bold">Standard Formulations</p>
                                {p.examples.map((ex, i) => (
                                  <ExampleRow key={i} example={ex} showRomaji={showRomaji} />
                                ))}
                              </div>

                              {/* Astra-chan's Tip Bubble */}
                              {p.tip && (
                                <div className="relative bg-natural-bg/60 border border-natural-border p-4 rounded-2xl text-left shadow-xs mt-4">
                                  {/* Little speech bubble triangle */}
                                  <div className="absolute bottom-[-6px] left-6 w-3 h-3 bg-natural-card border-b border-r border-natural-border rotate-45" />
                                  
                                  <div className="flex gap-2.5 items-start relative z-10">
                                    <div className="w-8 h-8 rounded-full border border-natural-forest/20 bg-natural-bg overflow-hidden shrink-0 shadow-xs relative">
                                      <img
                                        src={companionImg}
                                        alt="Astra-chan"
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover scale-105"
                                      />
                                    </div>
                                    <div className="text-xs text-natural-charcoal/90 leading-relaxed font-sans font-medium">
                                      <span className="font-serif font-extrabold text-natural-forest block mb-1">Astra's Memory Tip:</span>
                                      {p.tip}
                                    </div>
                                  </div>
                                </div>
                              )}

                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* ─── PRACTICE MODE ──────────────────────────────────────────────── */}
          {mode === "practice" && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col gap-4"
            >
              {/* ── RESULTS SCREEN (DOJO COMPLETION CERTIFICATE) ─────────────────── */}
              {quizDone ? (
                <div className="flex flex-col items-center gap-6 py-4">
                  
                  {/* Traditional Calligraphy Completion Certificate Frame */}
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative w-full max-w-xl rounded-[2.5rem] border-4 border-double border-natural-clay bg-natural-card p-6 md:p-8 text-center shadow-lg"
                  >
                    {/* Decorative traditional corner borders */}
                    <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-natural-clay/50" />
                    <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-natural-clay/50" />
                    <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-natural-clay/50" />
                    <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-natural-clay/50" />

                    <span className="text-4xl block mb-2 font-black">🏆</span>
                    
                    <span className="font-serif font-black text-xl md:text-2xl text-natural-charcoal tracking-widest block uppercase mb-1">
                      修了証
                    </span>
                    <span className="text-[10px] font-mono text-natural-forest-light font-extrabold uppercase tracking-widest block border-b border-natural-border/60 pb-3 mb-4">
                      Grammar Dojo Certificate
                    </span>

                    {/* Giant Brush Circle with Score */}
                    <div className="relative w-32 h-32 mx-auto flex items-center justify-center mb-4">
                      <div className="absolute inset-0 rounded-full border-[6px] border-dashed border-natural-clay/30 animate-spin-slow" />
                      <div className="absolute inset-2 rounded-full border-2 border-double border-natural-clay/50 flex flex-col items-center justify-center bg-natural-card-light shadow-inner">
                        <span className="font-serif font-black text-3xl text-natural-clay leading-none">{score}</span>
                        <span className="text-[10px] font-mono text-natural-charcoal/50 uppercase tracking-wider mt-0.5 font-bold">of {quiz.length}</span>
                      </div>
                    </div>

                    <h4 className="font-serif font-black text-lg text-natural-forest mt-2">
                      {score >= 8 ? "素晴らしい！ Splendid Performance!" : score >= 5 ? "合格！ Dojo Mastery Achieved!" : "どんまい！ Continuation is Strength!"}
                    </h4>
                    
                    <p className="text-xs text-natural-charcoal/75 leading-relaxed font-sans max-w-sm mx-auto mt-1.5">
                      This certificate validates your continuous effort in refining your Japanese grammar structures inside Astra's Temple.
                    </p>

                    {/* XP breakdown */}
                    <div className="w-full bg-natural-bg/50 border border-natural-border/70 rounded-2xl p-4 flex flex-col gap-2 text-left mt-5 shadow-inner">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-natural-clay font-bold mb-1">XP Breakdown Summary</p>
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-natural-charcoal/70 font-medium">Correct Formulations ({score} × 8 XP)</span>
                        <span className="font-bold text-natural-forest">+{score * 8} XP</span>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-natural-charcoal/70 font-medium">Attempted Challenges ({quiz.length - score} × 2 XP)</span>
                        <span className="font-bold text-natural-charcoal/50">+{(quiz.length - score) * 2} XP</span>
                      </div>
                      
                      <div className="border-t border-natural-border/60 pt-2 flex justify-between text-xs font-bold">
                        <span className="font-serif">Total Dojo XP Earned</span>
                        <span className="text-natural-forest font-mono text-[13px]">+{score * 8 + (quiz.length - score) * 2} XP</span>
                      </div>
                    </div>

                    {/* Astra Stamp Watermark in bottom right */}
                    <div className="absolute bottom-5 right-5 pointer-events-none opacity-[0.25]">
                      <span className="font-serif font-extrabold text-[11px] text-natural-clay border border-natural-clay px-1.5 py-1 rounded inline-block rotate-12">
                        極 seal
                      </span>
                    </div>

                  </motion.div>

                  <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                    <button
                      type="button"
                      onClick={startPractice}
                      className="py-3.5 rounded-2xl bg-natural-clay hover:bg-natural-clay/95 text-natural-bg font-serif font-bold text-sm cursor-pointer hover:shadow-md transition duration-200"
                    >
                      🔄 Re-enter Arena
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("study")}
                      className="py-3.5 rounded-2xl bg-natural-card border border-natural-border text-natural-charcoal hover:text-natural-forest hover:border-natural-forest/50 font-serif font-bold text-sm cursor-pointer shadow-xs hover:shadow-sm transition duration-200"
                    >
                      📖 Study Scrolls
                    </button>
                  </div>

                </div>
              ) : (
                /* ── QUESTION SCREEN (THE DOJO CHALLLENGE) ─────────────────────────── */
                currentQ && (
                  <div className="flex flex-col gap-4 pb-12">
                    
                    {/* Linear dynamic progress bar */}
                    <div className="w-full bg-natural-border/50 rounded-full h-2 overflow-hidden shadow-inner">
                      <motion.div
                        className="h-full bg-natural-forest rounded-full"
                        initial={false}
                        animate={{ width: `${((qIdx) / quiz.length) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>

                    {/* Progress tracking line */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-natural-clay bg-natural-clay/10 border border-natural-clay/20 px-2.5 py-0.5 rounded-md font-bold">
                        {currentQ.patternLabel}
                      </span>
                      <span className="font-mono text-xs text-natural-charcoal/50 font-bold">
                        Score: <span className="text-natural-forest font-bold">{score}</span> / {quiz.length}
                      </span>
                    </div>

                    {/* Question Card - styled like a scroll */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={qIdx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                        className="bg-natural-card border-2 border-natural-border/80 rounded-[2rem] p-5 md:p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden"
                      >
                        
                        {/* Question Hanko Seal */}
                        <div className="absolute top-4 right-4 pointer-events-none opacity-[0.2] z-0">
                          <span className="font-serif font-black text-2xl text-natural-clay border border-natural-clay rounded-full p-2 h-10 w-10 flex items-center justify-center">
                            問
                          </span>
                        </div>

                        {/* Top instruction info */}
                        <div className="flex items-center gap-1.5 text-xs text-natural-forest-light/60 font-mono font-bold z-10 relative">
                          <Award className="w-3.5 h-3.5 text-natural-clay" />
                          <span>Fill in the blank using the correct particle or copula</span>
                        </div>

                        {/* Large sentence display */}
                        <div className="min-h-[5rem] flex items-center py-2 z-10 relative">
                          <BlankSentence
                            sentence={currentQ.sentence}
                            answered={answered}
                            blank={currentQ.blank}
                          />
                        </div>

                        {/* Interactive Hint with romaji toggle */}
                        {showRomaji && (
                          <div className="flex gap-2 text-xs text-natural-charcoal/60 bg-natural-bg/50 border border-natural-border/40 p-3 rounded-xl z-10 relative">
                            <Lightbulb className="w-3.5 h-3.5 text-natural-clay/80 shrink-0 mt-0.5" />
                            <span>
                              <strong className="font-mono text-[9px] uppercase text-natural-clay block tracking-widest font-extrabold mb-0.5">Dojo Hint:</strong>
                              {currentQ.hint}
                            </span>
                          </div>
                        )}

                        {/* Tactile Choice Buttons */}
                        <div className="grid grid-cols-2 gap-3 mt-1 z-10 relative">
                          {currentQ.choices.map((choice) => {
                            const isChosen = answered === choice;
                            const isRight = choice === currentQ.blank;
                            let cls = "py-3.5 px-4 rounded-2xl border-2 font-serif text-base font-black transition-all shadow-xs cursor-pointer ";
                            
                            if (answered === null) {
                              cls += "bg-natural-card-light border-natural-border text-natural-charcoal hover:border-natural-forest hover:bg-natural-forest/5";
                            } else if (isRight) {
                              cls += "bg-natural-forest border-natural-forest text-natural-bg scale-102 shadow-md";
                            } else if (isChosen) {
                              cls += "bg-natural-terracotta border-natural-terracotta text-natural-bg scale-98";
                            } else {
                              cls += "bg-natural-bg/40 border-natural-border/30 text-natural-charcoal/20 cursor-default shadow-none";
                            }

                            return (
                              <motion.button
                                key={choice}
                                type="button"
                                whileHover={answered === null ? { scale: 1.02, translateY: -1 } : {}}
                                whileTap={answered === null ? { scale: 0.98 } : {}}
                                onClick={() => handleAnswer(choice)}
                                disabled={answered !== null}
                                className={cls}
                              >
                                {choice}
                              </motion.button>
                            );
                          })}
                        </div>

                        {/* Interactive reaction & explanation panel from Astra-chan after choice */}
                        <AnimatePresence>
                          {answered !== null && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-2 z-10 relative"
                            >
                              
                              <div className="border-t border-natural-border/50 my-3" />

                              <div className={`flex flex-col md:flex-row gap-3 rounded-2xl p-4 border shadow-xs ${
                                isCorrect
                                  ? "bg-natural-forest/10 border-natural-forest/35 text-natural-forest"
                                  : "bg-natural-terracotta/10 border-natural-terracotta/35 text-natural-terracotta"
                              }`}>
                                
                                {/* Correctness Stamp badge */}
                                <div className="flex items-center gap-2 md:flex-col md:justify-center md:items-center shrink-0">
                                  <span className={`text-3xl font-serif font-black border-2 border-double px-2.5 py-0.5 rounded-lg rotate-[-8deg] inline-block ${
                                    isCorrect ? "border-natural-forest text-natural-forest" : "border-natural-terracotta text-natural-terracotta"
                                  }`}>
                                    {isCorrect ? "正" : "誤"}
                                  </span>
                                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-center">
                                    {isCorrect ? "Correct" : "Incorrect"}
                                  </span>
                                </div>

                                {/* Mascot bubble commentary */}
                                <div className="flex-1 flex gap-3 items-start min-w-0">
                                  <div className="w-9 h-9 rounded-full border border-natural-forest/20 bg-natural-bg overflow-hidden shrink-0 shadow-xs relative">
                                    <img
                                      src={companionImg}
                                      alt="Astra-chan"
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover scale-105"
                                    />
                                  </div>
                                  <div className="text-xs text-natural-charcoal">
                                    <span className="font-serif font-black text-natural-forest block mb-0.5">
                                      Astra says:
                                    </span>
                                    <p className="italic leading-relaxed font-medium">
                                      {isCorrect 
                                        ? "「素晴らしい！」 (Splendid!) Perfect choice! That's exactly how it conjugates!" 
                                        : `「どんまい！」 (No worries!) The correct solution is「${currentQ.blank}」. Keep practicing!`
                                      }
                                    </p>
                                    
                                    {/* Full solution with pronunciation trigger */}
                                    <div className="mt-2.5 bg-natural-bg/80 border border-natural-border/50 p-2.5 rounded-xl flex items-center justify-between gap-2">
                                      <span className="font-serif font-extrabold text-[15px] text-natural-charcoal select-text">
                                        {currentQ.sentence.replace("＿＿＿", currentQ.blank)}
                                      </span>
                                      
                                      <button
                                        type="button"
                                        onClick={() => speak(currentQ.sentence.replace("＿＿＿", currentQ.blank))}
                                        className="p-1.5 bg-natural-card border border-natural-border/70 hover:bg-natural-forest/10 hover:text-natural-forest rounded-lg text-natural-forest-light transition cursor-pointer shadow-xs shrink-0"
                                        title="Hear full sentence"
                                      >
                                        <Volume2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                              </div>

                              {/* Progress Navigation Button */}
                              <button
                                type="button"
                                onClick={goNext}
                                className="w-full mt-4 py-3.5 rounded-2xl bg-natural-forest hover:bg-natural-forest/90 text-natural-bg font-serif font-extrabold text-sm cursor-pointer shadow-xs hover:shadow-sm transition duration-200 uppercase tracking-wider"
                              >
                                {isLastQ ? "Evaluate Dojo Score →" : "Advance to Next Scroll →"}
                              </button>

                            </motion.div>
                          )}
                        </AnimatePresence>

                      </motion.div>
                    </AnimatePresence>

                  </div>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
