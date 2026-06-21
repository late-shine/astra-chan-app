import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Search, Volume2, Lightbulb, CheckCircle2, XCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GrammarDojoProps {
  onBack: () => void;
  onAwardXP: (amount: number) => void; // NEW
}

interface GrammarExample {
  japanese: string;
  reading: string;
  english: string;
}

// NEW
interface QuizBlank {
  sentence: string;  // contains ＿＿＿
  blank: string;     // correct answer
  choices: string[]; // exactly 4, includes correct
  hint: string;
}

// NEW (runtime, built from patterns)
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
  quizBlanks: QuizBlank[]; // NEW
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
    tip: "は is written as 'ha' but pronounced 'wa' as a particle",
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
    tip: "が not は! The thing you like/dislike takes が, not を",
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
    tip: "Also used for states: 結婚しています = I am married (ongoing state)",
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
    tip: "たい conjugates like an い-adjective: たくない (don't want to), たかった (wanted to)",
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
    tip: "Group 1: replace う with あない. Group 2: replace る with ない. する→しない、くる→こない",
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
    tip: "Same pattern as て-form but use た/だ instead of て/で",
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
    tip: "て-form has many uses: connecting actions (〜て〜て), permission (〜てもいい), prohibition (〜てはいけない)",
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
    tip: "から is more direct/casual. ので is softer and more polite. Both mean 'because'",
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
    tip: "The sentence before と must be in plain form, not ます/です form",
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
    tip: "Rising intonation (でしょう?) turns it into a confirmation question: 'Right?'",
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
    tip: "より = 'than'. の方が = 'the one that is more'. Always: [less preferred] より [more preferred] の方が",
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
    tip: "Opposite: ～てはいけない = must not do. ～なければならない = must do",
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
      // Shuffle choices so correct answer isn't always in same slot
      choices: [...b.choices].sort(() => Math.random() - 0.5),
      patternId: p.id,
      patternLabel: p.pattern,
    }))
  );
  return [...pool].sort(() => Math.random() - 0.5).slice(0, QUIZ_LENGTH);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExampleRow({ example }: { example: GrammarExample }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <div>
        <p className="font-serif text-base text-natural-charcoal">{example.japanese}</p>
        <p className="font-serif text-xs text-natural-charcoal/60">{example.reading}</p>
        <p className="font-sans text-xs text-natural-charcoal/50 italic">{example.english}</p>
      </div>
      <button
        type="button"
        onClick={() => speak(example.japanese)}
        className="p-1.5 rounded-lg hover:bg-natural-forest/10 text-natural-forest/60 hover:text-natural-forest transition shrink-0 cursor-pointer"
        title={`Pronounce: ${example.japanese}`}
      >
        <Volume2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Renders the quiz sentence with the blank slot highlighted */
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
  const isWrong = answered !== null && answered !== blank;
  return (
    <span className="font-serif text-xl leading-loose tracking-wide text-natural-charcoal">
      {parts[0]}
      <span
        className={`inline-block min-w-[3rem] px-2 mx-0.5 rounded-lg border-b-2 text-center font-bold align-middle transition-all duration-300 ${
          answered === null
            ? "border-natural-charcoal/30 bg-natural-bg text-transparent"
            : isCorrect
            ? "border-natural-forest bg-natural-forest/10 text-natural-forest"
            : "border-natural-terracotta bg-natural-terracotta/10 text-natural-terracotta"
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
    <div className="flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-natural-bg/95 backdrop-blur border-b border-natural-border/70 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={mode === "practice" ? () => setMode("study") : onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-natural-forest-light hover:text-natural-forest transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          {mode === "practice" ? "Back to Patterns" : "Back to Room"}
        </button>
        <div className="text-center">
          <h2 className="font-serif font-extrabold text-lg text-natural-forest leading-none">Grammar Dojo</h2>
          <p className="text-[10px] font-mono text-natural-forest-light uppercase tracking-wider mt-0.5">
            {mode === "practice" ? (quizDone ? "Results" : `Question ${qIdx + 1} / ${quiz.length}`) : "N5 Grammar Patterns"}
          </p>
        </div>
        <div className="w-24" />
      </div>

      <div className="px-4 py-4">
        {/* Mode buttons — always visible */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setMode("study")}
            className={`py-3 rounded-2xl font-serif font-bold text-sm transition cursor-pointer ${
              mode === "study"
                ? "bg-natural-forest text-natural-bg shadow-sm"
                : "bg-natural-card border border-natural-border text-natural-charcoal/70 hover:border-natural-forest/40"
            }`}
          >
            📖 Study Patterns
          </button>
          <button
            type="button"
            onClick={startPractice}
            className={`py-3 rounded-2xl font-serif font-bold text-sm transition cursor-pointer ${
              mode === "practice"
                ? "bg-natural-clay text-natural-bg shadow-sm"
                : "bg-natural-card border border-natural-border text-natural-charcoal/70 hover:border-natural-clay/40"
            }`}
          >
            ✏️ Practice
          </button>
        </div>

        {/* ─── STUDY MODE ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {mode === "study" && (
            <motion.div
              key="study"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              {/* Search bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-natural-forest/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pattern, meaning, or example..."
                  className="w-full bg-natural-card border border-natural-border rounded-xl pl-9 pr-4 py-2 text-sm font-sans text-natural-charcoal placeholder:text-natural-charcoal/30 focus:outline-none focus:border-natural-forest/40"
                />
              </div>

              {/* Filter chips */}
              <div className="flex gap-2 mb-4">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "basic", label: "Basic" },
                    { key: "intermediate", label: "Intermediate" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setLevelFilter(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition cursor-pointer ${
                      levelFilter === f.key
                        ? "bg-natural-forest text-natural-bg"
                        : "bg-natural-card border border-natural-border text-natural-charcoal/60 hover:border-natural-forest/40"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Pattern cards */}
              <div className="flex flex-col gap-3 pb-6">
                {filteredPatterns.length === 0 && (
                  <p className="text-center text-xs text-natural-charcoal/40 font-mono py-10">
                    No patterns match your search.
                  </p>
                )}
                {filteredPatterns.map((p) => {
                  const isExpanded = expandedIds.has(p.id);
                  return (
                    <div key={p.id} className="bg-natural-card border border-natural-border rounded-2xl p-4">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(p.id)}
                        className="w-full flex items-start justify-between gap-3 cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif text-xl text-natural-forest font-bold">{p.pattern}</span>
                          <span
                            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                              p.level === "basic"
                                ? "bg-natural-forest/15 text-natural-forest"
                                : "bg-natural-clay/15 text-natural-clay"
                            }`}
                          >
                            {p.level}
                          </span>
                        </div>
                        <span className="text-natural-forest-light text-xs font-bold shrink-0 mt-1.5 select-none">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </button>

                      <p className="text-xs text-natural-charcoal/70 font-sans mt-1">{p.meaning}</p>

                      {!isExpanded && p.examples[0] && <ExampleRow example={p.examples[0]} />}

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-natural-forest/8 rounded-xl p-2 font-mono text-xs text-natural-forest mt-2">
                              {p.structure}
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              {p.examples.map((ex, i) => (
                                <ExampleRow key={i} example={ex} />
                              ))}
                            </div>
                            {p.tip && (
                              <div className="flex gap-2 bg-natural-clay/10 border border-natural-clay/20 rounded-xl p-2 text-xs text-natural-charcoal mt-2">
                                <Lightbulb className="w-3.5 h-3.5 text-natural-clay shrink-0 mt-0.5" />
                                <span>{p.tip}</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── PRACTICE MODE ──────────────────────────────────────────────── */}
          {mode === "practice" && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
            >
              {/* ── RESULTS SCREEN ─────────────────────────────────────────── */}
              {quizDone ? (
                <div className="flex flex-col items-center gap-5 py-6">
                  <div className="text-5xl">{score >= 8 ? "🏆" : score >= 5 ? "⭐" : "📖"}</div>
                  <div className="text-center">
                    <p className="font-serif font-black text-3xl text-natural-forest">
                      {score} / {quiz.length}
                    </p>
                    <p className="text-sm text-natural-charcoal/60 mt-1">
                      {score >= 8 ? "Excellent work!" : score >= 5 ? "Good effort!" : "Keep studying!"}
                    </p>
                  </div>

                  {/* XP breakdown */}
                  <div className="w-full bg-natural-card border border-natural-border rounded-2xl p-4 flex flex-col gap-2">
                    <p className="font-mono text-xs uppercase tracking-wider text-natural-forest mb-1">XP Earned</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-natural-charcoal/70">Correct ({score} × 8 XP)</span>
                      <span className="font-bold text-natural-forest">+{score * 8} XP</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-natural-charcoal/70">Attempted ({quiz.length - score} × 2 XP)</span>
                      <span className="font-bold text-natural-charcoal/60">+{(quiz.length - score) * 2} XP</span>
                    </div>
                    <div className="border-t border-natural-border/60 pt-2 flex justify-between text-sm font-bold">
                      <span>Total</span>
                      <span className="text-natural-forest">+{score * 8 + (quiz.length - score) * 2} XP</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      type="button"
                      onClick={startPractice}
                      className="py-3 rounded-2xl bg-natural-clay text-natural-bg font-serif font-bold text-sm cursor-pointer hover:opacity-90 transition"
                    >
                      🔄 Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("study")}
                      className="py-3 rounded-2xl bg-natural-card border border-natural-border text-natural-charcoal font-serif font-bold text-sm cursor-pointer hover:border-natural-forest/40 transition"
                    >
                      📖 Study Patterns
                    </button>
                  </div>
                </div>
              ) : (
                /* ── QUESTION SCREEN ─────────────────────────────────────── */
                currentQ && (
                  <div className="flex flex-col gap-4 pb-6">
                    {/* Progress bar */}
                    <div className="w-full bg-natural-border/50 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full bg-natural-forest rounded-full"
                        initial={false}
                        animate={{ width: `${((qIdx) / quiz.length) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>

                    {/* Pattern label */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-natural-forest/60 bg-natural-forest/8 px-2 py-0.5 rounded-full">
                        {currentQ.patternLabel}
                      </span>
                      <span className="font-mono text-xs text-natural-charcoal/40">
                        {score} correct
                      </span>
                    </div>

                    {/* Question card */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={qIdx}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                        className="bg-natural-card border border-natural-border rounded-2xl p-5 flex flex-col gap-3"
                      >
                        {/* Instruction */}
                        <p className="text-xs text-natural-charcoal/50 font-mono">Fill in the blank</p>

                        {/* Sentence with blank */}
                        <div className="min-h-[3.5rem] flex items-center">
                          <BlankSentence
                            sentence={currentQ.sentence}
                            answered={answered}
                            blank={currentQ.blank}
                          />
                        </div>

                        {/* Hint */}
                        <div className="flex gap-1.5 text-xs text-natural-charcoal/50">
                          <Lightbulb className="w-3.5 h-3.5 text-natural-clay/70 shrink-0 mt-0.5" />
                          <span>{currentQ.hint}</span>
                        </div>

                        {/* Answer choices */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {currentQ.choices.map((choice) => {
                            const isChosen = answered === choice;
                            const isRight = choice === currentQ.blank;
                            let cls =
                              "py-3 rounded-xl border font-serif text-sm font-bold transition cursor-pointer ";
                            if (answered === null) {
                              cls +=
                                "bg-natural-bg border-natural-border text-natural-charcoal hover:border-natural-forest/50 hover:bg-natural-forest/5";
                            } else if (isRight) {
                              cls += "bg-natural-forest/15 border-natural-forest text-natural-forest";
                            } else if (isChosen) {
                              cls += "bg-natural-terracotta/15 border-natural-terracotta text-natural-terracotta";
                            } else {
                              cls += "bg-natural-bg border-natural-border/40 text-natural-charcoal/30 cursor-default";
                            }
                            return (
                              <button
                                key={choice}
                                type="button"
                                onClick={() => handleAnswer(choice)}
                                disabled={answered !== null}
                                className={cls}
                              >
                                {choice}
                              </button>
                            );
                          })}
                        </div>

                        {/* Feedback row (shown after answering) */}
                        <AnimatePresence>
                          {answered !== null && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div
                                className={`flex items-start gap-2 rounded-xl p-3 text-xs mt-1 ${
                                  isCorrect
                                    ? "bg-natural-forest/10 border border-natural-forest/20 text-natural-forest"
                                    : "bg-natural-terracotta/10 border border-natural-terracotta/20 text-natural-terracotta"
                                }`}
                              >
                                {isCorrect ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <p className="font-bold">
                                    {isCorrect ? "Correct!" : `The answer is「${currentQ.blank}」`}
                                  </p>
                                  {/* Full sentence with reading */}
                                  <p className="font-serif text-sm mt-0.5 text-natural-charcoal/80">
                                    {currentQ.sentence.replace("＿＿＿", currentQ.blank)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    speak(currentQ.sentence.replace("＿＿＿", currentQ.blank))
                                  }
                                  className="ml-auto p-1 rounded-lg hover:bg-natural-forest/10 transition cursor-pointer shrink-0"
                                  title="Pronounce"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Next / Finish button */}
                              <button
                                type="button"
                                onClick={goNext}
                                className="w-full mt-3 py-3 rounded-2xl bg-natural-forest text-natural-bg font-serif font-bold text-sm cursor-pointer hover:opacity-90 transition"
                              >
                                {isLastQ ? "See Results →" : "Next Question →"}
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
    </div>
  );
}
