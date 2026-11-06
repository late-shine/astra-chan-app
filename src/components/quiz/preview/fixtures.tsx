// Quiz Remake QZ1: static sample data for the visual prototype. DEVELOPMENT ONLY.
//
// Everything here is hard-coded. There is no stats read, no XP, no SRS, no storage and no network.
// The labels are deliberately "real sized": a Japanese word with a reading, long English meanings that
// must wrap, a curated confusion comparison. QZ12 removes the preview folder.

import { useState } from "react";
import { Copy } from "lucide-react";
import { StudioHeader, StudioSegmented, StudioShell, type StudioShellProps } from "../StudioShell";
import type {
  KanaStageView,
  PoolOptionView,
  PracticeHomeView,
  QuizFeedbackView,
  QuizOutcome,
  QuizQuestionView,
  QuizResultsView,
  QuizSubject,
  QuizWhyView,
  SegmentOption,
  SubjectOption,
} from "../viewTypes";

export const SUBJECTS: SubjectOption[] = [
  { id: "kana", label: "Kana" },
  { id: "words", label: "Words" },
  { id: "kanji", label: "Kanji" },
];

export const SUBJECT_LABEL: Record<QuizSubject, string> = { kana: "Kana", words: "Words", kanji: "Kanji" };

/* ───────────────────────────── Practice home ───────────────────────────── */

export function practiceHomeView(subject: QuizSubject, opts: { resume: boolean; noHistory: boolean }): PracticeHomeView {
  const label = SUBJECT_LABEL[subject];
  const challenges: PracticeHomeView["challenges"] = [
    {
      id: "timed",
      title: "Timed practice",
      description: subject === "kana" ? "Steady 12 s, Quick 6 s or Lightning 3 s per question." : "Steady 20 s or Quick 10 s per question.",
    },
  ];
  if (subject === "kana") challenges.push({ id: "survival", title: "Survival", description: "Start with 45 s. Correct answers add time." });
  challenges.push({ id: "friend", title: "Play with a friend", description: "Agree on a set and practice together." });

  return {
    resume: opts.resume ? { subjectLabel: "Words", positionLabel: "Question 4 of 10" } : undefined,
    recommendation: {
      eyebrow: "Your next practice",
      summary: `10 questions · ${label} · Untimed`,
      note: opts.noHistory ? "Start with the basics." : "A little extra practice on recent mistakes.",
      cta: "Start practice",
    },
    subjects: SUBJECTS,
    subject,
    challenges,
    reviewDeck: { title: "Review Deck", detail: "Today: 25 reviews · 5 new", badge: "5 today" },
  };
}

/* ───────────────────────────── Setup ───────────────────────────── */

export const POOLS: Record<QuizSubject, PoolOptionView[]> = {
  kana: [
    { id: "recommended", label: "Recommended", count: 46 },
    { id: "mistakes", label: "Recent mistakes", count: 12 },
    { id: "all", label: "All selected kana", count: 46 },
  ],
  words: [
    { id: "recommended", label: "Recommended", count: 24 },
    { id: "greetings", label: "Greetings", count: 18 },
    { id: "food", label: "Food and drink", count: 32 },
  ],
  kanji: [
    { id: "recommended", label: "Recommended", count: 20 },
    { id: "numbers", label: "Numbers", count: 10 },
    { id: "people", label: "People and school", count: 14 },
  ],
};

export const KINDS: Record<QuizSubject, SegmentOption[]> = {
  kana: [
    { id: "read", label: "Read the character" },
    { id: "pick", label: "Pick the character" },
    { id: "type", label: "Type the romaji" },
  ],
  words: [
    { id: "meaning", label: "Meaning" },
    { id: "reading", label: "Reading" },
  ],
  kanji: [
    { id: "meaning", label: "Meaning" },
    { id: "reading", label: "Reading in a word" },
  ],
};

export const KANA_STAGES: Omit<KanaStageView, "on">[] = [
  { id: "basic", label: "Core", hint: "46 characters" },
  { id: "dakuon", label: "Voiced", hint: "20 characters" },
  { id: "handakuon", label: "Semi-voiced", hint: "5 characters" },
  { id: "yoon", label: "Combos", hint: "33 characters" },
];

/* ───────────────────────────── Questions ───────────────────────────── */

interface SampleSpec {
  id: string;
  instruction: string;
  kindLabel: string;
  prompt: QuizQuestionView["prompt"];
  layout: QuizQuestionView["choiceLayout"];
  choices: { label: string; ja?: boolean }[];
  /** The correct choice is always index 0 here; the order shown is rotated per sample to look natural. */
  correctLabel: string;
  wrongLabel: string;
  sentence: string;
  why?: QuizWhyView;
  /** What gets spoken after grading. */
  listen: boolean;
}

const KANA_SPECS: SampleSpec[] = [
  {
    id: "kana-shi",
    instruction: "Choose the reading",
    kindLabel: "Read the character",
    prompt: { text: "し", size: "glyph" },
    layout: "short",
    choices: [{ label: "shi" }, { label: "chi" }, { label: "tsu" }, { label: "sa" }],
    correctLabel: "shi",
    wrongLabel: "tsu",
    sentence: "し is read shi, the sound in “she”.",
    why: {
      mnemonic: "し looks like a fishing hook. Say “she” while you reel in a fish.",
      example: { ja: "しお", reading: "shio", en: "salt" },
      comparison: {
        left: { glyph: "し", label: "shi" },
        right: { glyph: "つ", label: "tsu" },
        note: "し curves open on the right, like a hook. つ is a wave that closes back on itself.",
      },
    },
    listen: true,
  },
  {
    id: "kana-fu",
    instruction: "Choose the reading",
    kindLabel: "Read the character",
    prompt: { text: "ふ", size: "glyph" },
    layout: "short",
    choices: [{ label: "fu" }, { label: "ho" }, { label: "mu" }, { label: "he" }],
    correctLabel: "fu",
    wrongLabel: "mu",
    sentence: "ふ is read fu, a soft sound between “hu” and “fu”.",
    why: {
      mnemonic: "ふ looks like a small Mount Fuji with clouds drifting around it.",
      example: { ja: "ふね", reading: "fune", en: "boat" },
    },
    listen: true,
  },
  {
    id: "kana-tsu-kata",
    instruction: "Choose the reading",
    kindLabel: "Read the character",
    prompt: { text: "ツ", size: "glyph" },
    layout: "short",
    choices: [{ label: "tsu" }, { label: "shi" }, { label: "so" }, { label: "n" }],
    correctLabel: "tsu",
    wrongLabel: "shi",
    sentence: "ツ is the katakana for tsu.",
    why: {
      example: { ja: "ツアー", reading: "tsuā", en: "tour" },
      comparison: {
        left: { glyph: "ツ", label: "tsu" },
        right: { glyph: "シ", label: "shi" },
        note: "In ツ the two short strokes stand upright. In シ they lean sideways, like a smile on its side.",
      },
    },
    listen: true,
  },
];

const WORD_SPECS: SampleSpec[] = [
  {
    id: "word-daijoubu",
    instruction: "Choose the meaning",
    kindLabel: "Meaning",
    prompt: { text: "大丈夫", size: "word", reading: "だいじょうぶ" },
    layout: "meaning",
    choices: [
      { label: "all right; no problem; safe" },
      { label: "to be careful about something dangerous" },
      { label: "a large, important matter that needs attention" },
      { label: "to wait patiently without complaining" },
    ],
    correctLabel: "all right; no problem; safe",
    wrongLabel: "a large, important matter that needs attention",
    sentence: "大丈夫 is what you say to mean “I am fine” or “that is okay”.",
    why: {
      mnemonic: "Big + sturdy + man: a sturdy big person means everything is fine.",
      example: { ja: "大丈夫ですか。", reading: "だいじょうぶですか", en: "Are you all right?" },
    },
    listen: true,
  },
  {
    id: "word-toshokan",
    instruction: "Choose the meaning",
    kindLabel: "Meaning",
    prompt: { text: "図書館", size: "word", reading: "としょかん" },
    layout: "meaning",
    choices: [
      { label: "library; a building where books are kept for lending" },
      { label: "museum; a building that displays old and valuable objects" },
      { label: "bookstore; a shop that sells new books" },
      { label: "classroom; a room where lessons are taught" },
    ],
    correctLabel: "library; a building where books are kept for lending",
    wrongLabel: "bookstore; a shop that sells new books",
    sentence: "図書館 is a library: you borrow books there, you do not buy them.",
    why: { example: { ja: "図書館で勉強します。", reading: "としょかんでべんきょうします", en: "I study at the library." } },
    listen: true,
  },
  {
    id: "word-denwa",
    instruction: "Choose the meaning",
    kindLabel: "Meaning",
    prompt: { text: "電話", size: "word", reading: "でんわ" },
    layout: "meaning",
    choices: [{ label: "telephone; phone call" }, { label: "television" }, { label: "electric train" }, { label: "alarm clock" }],
    correctLabel: "telephone; phone call",
    wrongLabel: "television",
    sentence: "電 is electricity and 話 is talk, so 電話 is a phone.",
    listen: true,
  },
];

const KANJI_SPECS: SampleSpec[] = [
  {
    id: "kanji-gaku",
    instruction: "Choose the meaning",
    kindLabel: "Meaning",
    prompt: { text: "学", size: "glyph", helper: "as in 学生 (がくせい)" },
    layout: "meaning",
    choices: [{ label: "study; learning" }, { label: "school building" }, { label: "child; offspring" }, { label: "to meet; to see" }],
    correctLabel: "study; learning",
    wrongLabel: "child; offspring",
    sentence: "学 means study or learning.",
    why: {
      mnemonic: "A child (子) under a roof: learning happens indoors.",
      example: { ja: "学生", reading: "がくせい", en: "student" },
      comparison: {
        left: { glyph: "学", label: "study" },
        right: { glyph: "子", label: "child" },
        note: "子 sits inside 学 at the bottom, which is why they get mixed up.",
      },
    },
    listen: true,
  },
  {
    id: "kanji-kou",
    instruction: "Choose the meaning",
    kindLabel: "Meaning",
    prompt: { text: "校", size: "glyph", helper: "as in 学校 (がっこう)" },
    layout: "meaning",
    choices: [{ label: "school" }, { label: "tree" }, { label: "river" }, { label: "mouth" }],
    correctLabel: "school",
    wrongLabel: "tree",
    sentence: "校 means school.",
    why: { mnemonic: "The tree radical (木) on the left is a classic trap: 校 is not a tree." },
    listen: true,
  },
  {
    id: "kanji-sei",
    instruction: "Choose the meaning",
    kindLabel: "Meaning",
    prompt: { text: "生", size: "glyph", helper: "as in 先生 (せんせい)" },
    layout: "meaning",
    choices: [{ label: "life; to be born; raw" }, { label: "to enter" }, { label: "to go out" }, { label: "fire" }],
    correctLabel: "life; to be born; raw",
    wrongLabel: "to enter",
    sentence: "生 covers life, birth and “raw”.",
    listen: true,
  },
];

const SPECS: Record<QuizSubject, SampleSpec[]> = { kana: KANA_SPECS, words: WORD_SPECS, kanji: KANJI_SPECS };

export interface SampleQuestion {
  /** Stable id of the sample (the preview adds the question number when it builds the view). */
  specId: string;
  /** Builds the question view for a given zero-based position, total and optional timer. */
  build: (index: number, total: number, timer: QuizQuestionView["timer"]) => QuizQuestionView;
  correctId: string;
  wrongId: string;
  correctLabel: string;
  wrongLabel: string;
  feedback: (outcome: QuizOutcome) => QuizFeedbackView;
}

function toSample(subject: QuizSubject, spec: SampleSpec): SampleQuestion {
  const choices = spec.choices.map((c, i) => ({ id: `${spec.id}-${i}`, label: c.label, ja: c.ja }));
  const correctId = choices.find((c) => c.label === spec.correctLabel)!.id;
  const wrongId = choices.find((c) => c.label === spec.wrongLabel)!.id;
  return {
    specId: spec.id,
    correctId,
    wrongId,
    correctLabel: spec.correctLabel,
    wrongLabel: spec.wrongLabel,
    build: (index, total, timer) => ({
      id: `${spec.id}-${index}`,
      index,
      total,
      subjectLabel: SUBJECT_LABEL[subject],
      kindLabel: spec.kindLabel,
      instruction: spec.instruction,
      prompt: spec.prompt,
      mode: "choice",
      choices,
      choiceLayout: spec.layout,
      timer,
    }),
    feedback: (outcome) => ({
      outcome,
      verdict: outcome === "correct" ? "Correct" : outcome === "wrong" ? "Not quite" : "Time is up",
      correctAnswer: spec.correctLabel,
      yourAnswer: outcome === "wrong" ? spec.wrongLabel : undefined,
      sentence: spec.sentence,
      why: spec.why,
      canListen: spec.listen,
      announcement:
        outcome === "correct" ? "Correct." : `${outcome === "wrong" ? "Not quite." : "Time is up."} The answer is ${spec.correctLabel}.`,
    }),
  };
}

export function sampleQuestions(subject: QuizSubject): SampleQuestion[] {
  return SPECS[subject].map((spec) => toSample(subject, spec));
}

/* Typed practice is kana + romaji only (typed Japanese is deferred), so it ignores the subject control. */
export interface TypedSample {
  question: (index: number, total: number) => QuizQuestionView;
  accepted: string[];
  feedback: (outcome: QuizOutcome, typed: string) => QuizFeedbackView;
}

export const TYPED_SAMPLE: TypedSample = {
  accepted: ["shi", "si"],
  question: (index, total) => ({
    id: `typed-shi-${index}`,
    index,
    total,
    subjectLabel: "Kana",
    kindLabel: "Type the romaji",
    instruction: "Type the reading",
    prompt: { text: "し", size: "glyph" },
    mode: "typed",
    choices: [],
    choiceLayout: "short",
    typedPlaceholder: "romaji, for example ka",
  }),
  feedback: (outcome, typed) => ({
    outcome,
    verdict: outcome === "correct" ? "Correct" : outcome === "wrong" ? "Not quite" : "Time is up",
    correctAnswer: "shi",
    yourAnswer: outcome === "wrong" && typed.trim() ? typed.trim() : undefined,
    sentence: "し is read shi. Both shi and si are accepted when you type.",
    why: { mnemonic: "し looks like a fishing hook. Say “she” while you reel in a fish." },
    canListen: true,
    announcement: outcome === "correct" ? "Correct." : "Not quite. The answer is shi.",
  }),
};

/* ───────────────────────────── Results ───────────────────────────── */

export type ResultsVariant = "misses" | "perfect" | "repair";

export function resultsView(subject: QuizSubject, variant: ResultsVariant): QuizResultsView {
  const label = SUBJECT_LABEL[subject];
  const missedBySubject = {
    kana: [
      { id: "m1", prompt: "し", promptSize: "glyph" as const, yourAnswer: "tsu", correctAnswer: "shi" },
      { id: "m2", prompt: "ツ", promptSize: "glyph" as const, yourAnswer: "shi", correctAnswer: "tsu" },
      { id: "m3", prompt: "ぬ", promptSize: "glyph" as const, yourAnswer: "me", correctAnswer: "nu" },
    ],
    words: [
      { id: "m1", prompt: "大丈夫", promptSize: "word" as const, yourAnswer: "a large, important matter that needs attention", correctAnswer: "all right; no problem; safe" },
      { id: "m2", prompt: "図書館", promptSize: "word" as const, yourAnswer: "bookstore; a shop that sells new books", correctAnswer: "library; a building where books are kept for lending" },
      { id: "m3", prompt: "電話", promptSize: "word" as const, yourAnswer: "television", correctAnswer: "telephone; phone call" },
    ],
    kanji: [
      { id: "m1", prompt: "学", promptSize: "glyph" as const, yourAnswer: "child; offspring", correctAnswer: "study; learning" },
      { id: "m2", prompt: "校", promptSize: "glyph" as const, yourAnswer: "tree", correctAnswer: "school" },
      { id: "m3", prompt: "生", promptSize: "glyph" as const, yourAnswer: "to enter", correctAnswer: "life; to be born; raw" },
    ],
  };

  if (variant === "perfect") {
    return {
      headline: "10 of 10 correct first try",
      percentLabel: "100%",
      contextLabel: `${label} · Untimed`,
      xpLines: [
        { label: "Correct first try", value: "+50 XP" },
        { label: "Finished the practice", value: "+10 XP" },
      ],
      xpTotal: "+60 XP",
      streakLine: "3-day practice streak",
      missed: [],
      primaryLabel: "Try another round",
      encouragement: "Ready for a different question type?",
    };
  }
  return {
    headline: "7 of 10 correct first try",
    percentLabel: "70%",
    contextLabel: `${label} · Untimed`,
    xpLines:
      variant === "repair"
        ? [
            { label: "Repair round", value: "+10 XP" },
          ]
        : [
            { label: "Correct first try", value: "+35 XP" },
            { label: "Finished the practice", value: "+10 XP" },
          ],
    xpTotal: variant === "repair" ? "+10 XP" : "+45 XP",
    streakLine: "3-day practice streak",
    repairLine: variant === "repair" ? "2 corrected in the repair round" : undefined,
    missed: variant === "repair" ? missedBySubject[subject].slice(0, 1) : missedBySubject[subject],
    primaryLabel: "Practice your misses",
    reviewDeckLabel: "Add up to 5 to Review Deck",
  };
}

/* ───────────────────────────── Duel lobby (preview-only) ─────────────────────────────
   The packet's delivery list has no duel component, but S2.4 asks for a duel-lobby fixture. It is built
   from the same studio shell and classes here so the visual language is judged now. QZ10 promotes it
   into a real component under src/components/quiz/. Local state only: "Copied" and "friend is ready"
   are just preview toggles, and no room, friend or network exists. */

export interface DuelLobbyFixtureProps {
  subject: QuizSubject;
  shell?: Pick<StudioShellProps, "themeId" | "reducedMotion" | "keyboardOpen" | "modalOpen" | "overlay">;
  onBack: () => void;
}

export function DuelLobbyFixture({ subject, shell, onBack }: DuelLobbyFixtureProps) {
  const [copied, setCopied] = useState(false);
  const [friendReady, setFriendReady] = useState(false);
  const [mode, setMode] = useState<"race" | "rounds">("race");
  const setLine = `${SUBJECT_LABEL[subject]} · ${subject === "kana" ? "Hiragana · Core · " : ""}Meaning · 10 questions`;

  const header = (
    <StudioHeader backLabel="Back to Practice" onBack={onBack}>
      <p className="quiz-header__progress">Play with a friend</p>
      <p className="quiz-header__label">Lobby</p>
    </StudioHeader>
  );

  const footer = (
    <div className="quiz-footer">
      <div className="quiz-footer__inner">
        <button
          type="button"
          className="quiz-btn quiz-btn--primary quiz-btn--block"
          aria-disabled={friendReady ? undefined : true}
          onClick={() => {
            /* Preview only: no room exists, so nothing starts. */
          }}
        >
          {friendReady ? "Start together" : "Waiting for Mika"}
        </button>
      </div>
    </div>
  );

  return (
    <StudioShell label="Friend lobby" header={header} footer={footer} width="player" {...shell}>
      <div className="quiz-form">
        <h1 className="quiz-title">Play with a friend</h1>

        <section className="quiz-card quiz-form" aria-labelledby="duel-room-title">
          <div>
            <h2 id="duel-room-title" className="quiz-section-title">
              Room code
            </h2>
            <p className="quiz-help">Share this code. Your friend types it to join.</p>
          </div>
          <p className="quiz-title" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.2em" }} aria-label="K 7 Q F">
            K7QF
          </p>
          <button
            type="button"
            className="quiz-btn quiz-btn--secondary quiz-btn--block"
            onClick={() => {
              setCopied(true);
            }}
          >
            <Copy aria-hidden="true" />
            {copied ? "Copied" : "Copy code"}
          </button>
        </section>

        <section className="quiz-card quiz-form" aria-labelledby="duel-players-title">
          <h2 id="duel-players-title" className="quiz-section-title">
            Players
          </h2>
          <ul className="quiz-list">
            <li className="quiz-row" style={{ cursor: "default" }}>
              <span className="quiz-row__text">
                <span className="quiz-row__title">You</span>
                <span className="quiz-help">Host</span>
              </span>
              <span className="quiz-chip">Ready</span>
            </li>
            <li className="quiz-row" style={{ cursor: "default" }}>
              <span className="quiz-row__text">
                <span className="quiz-row__title">Mika</span>
                <span className="quiz-help">Joined</span>
              </span>
              <span className="quiz-chip">{friendReady ? "Ready" : "Getting ready"}</span>
            </li>
          </ul>
          <button type="button" className="quiz-btn quiz-btn--quiet" onClick={() => setFriendReady((v) => !v)}>
            Preview: toggle Mika ready
          </button>
        </section>

        <section className="quiz-card quiz-form" aria-labelledby="duel-set-title">
          <div>
            <h2 id="duel-set-title" className="quiz-section-title">
              Practice set
            </h2>
            <p className="quiz-body">{setLine}</p>
            <p className="quiz-help">Only the set is shared. Your learning history stays private.</p>
          </div>
          <StudioSegmented
            label="Duel mode"
            options={[
              { id: "race" as const, label: "Speed race" },
              { id: "rounds" as const, label: "Take turns" },
            ]}
            value={mode}
            onChange={setMode}
            columns={2}
          />
          <button type="button" className="quiz-btn quiz-btn--secondary quiz-btn--block">
            Change set
          </button>
        </section>
      </div>
    </StudioShell>
  );
}
