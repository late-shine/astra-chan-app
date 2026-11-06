// Quiz Remake QZ1: the view contracts shared by every studio component.
//
// These are PRESENTATION types only: plain data and callbacks that a screen hands to a component.
// No component in src/components/quiz/ reads stats, SRS, storage or the network. Later phases
// (QZ5+) build these view objects from the real engine; the components do not change shape.
// Refine a contract here (add a field, widen a union) instead of forking a second component set.

import type { SyntheticEvent } from "react";
import type { ThemeId } from "../../preferences";

/** The same ids the app already stores for the saved theme. The studio maps them to light/dark tokens in CSS. */
export type QuizThemeId = ThemeId;

export type QuizSubject = "kana" | "words" | "kanji";

export interface SubjectOption {
  id: QuizSubject;
  label: string;
}

/* ───────────────────────────── Practice home ───────────────────────────── */

export interface ResumeBannerView {
  /** e.g. "Words" */
  subjectLabel: string;
  /** e.g. "Question 4 of 10" */
  positionLabel: string;
}

export interface RecommendationView {
  /** "Your next practice" */
  eyebrow: string;
  /** "10 questions · Kana · Untimed" */
  summary: string;
  /** "A little extra practice on recent mistakes." or "Start with the basics." */
  note: string;
  /** "Start practice" */
  cta: string;
}

export type ChallengeId = "timed" | "survival" | "friend";

export interface ChallengeLauncherView {
  id: ChallengeId;
  title: string;
  description: string;
}

export interface ReviewDeckLinkView {
  title: string;
  detail: string;
  /** Short count badge such as "5 today". */
  badge: string;
}

export interface PracticeHomeView {
  resume?: ResumeBannerView;
  recommendation: RecommendationView;
  subjects: SubjectOption[];
  subject: QuizSubject;
  /** Only implemented launchers are listed (S1.2). */
  challenges: ChallengeLauncherView[];
  reviewDeck: ReviewDeckLinkView;
}

export interface PracticeHomeActions {
  onSelectSubject: (subject: QuizSubject) => void;
  onStart: () => void;
  onCustomize: () => void;
  onChallenge: (id: ChallengeId) => void;
  onOpenReviewDeck: () => void;
  onResume?: () => void;
  onDiscardResume?: () => void;
}

/* ───────────────────────────── Setup sheet ───────────────────────────── */

export interface SegmentOption<T extends string | number = string> {
  id: T;
  label: string;
  /** Optional second line, e.g. "46 characters". */
  hint?: string;
}

export interface PoolOptionView {
  id: string;
  label: string;
  /** Items in that pool (after the other choices are applied). */
  count: number;
}

export type KanaScript = "hiragana" | "katakana" | "both";

export interface KanaStageView {
  id: string;
  label: string;
  hint: string;
  on: boolean;
}

export interface KanaSetupView {
  script: KanaScript;
  scripts: SegmentOption<KanaScript>[];
  stages: KanaStageView[];
  choices: 4 | 6;
}

export interface QuizSetupView {
  subject: QuizSubject;
  subjects: SubjectOption[];
  poolId: string;
  pools: PoolOptionView[];
  kindId: string;
  kinds: SegmentOption[];
  length: number;
  lengths: number[];
  /** Kana only. */
  kana?: KanaSetupView;
  autoNext: boolean;
  /** How many items match the current choices. Drives the shrink / empty messages. */
  matchCount: number;
  /** Offered when the pool is empty, e.g. "Include Voiced kana". */
  emptyAlternative?: { id: string; label: string; reason: string };
}

export interface QuizSetupActions {
  onSubjectChange: (subject: QuizSubject) => void;
  onPoolChange: (poolId: string) => void;
  onKindChange: (kindId: string) => void;
  onLengthChange: (length: number) => void;
  onScriptChange?: (script: KanaScript) => void;
  onToggleStage?: (stageId: string) => void;
  onChoicesChange?: (choices: 4 | 6) => void;
  onAutoNextChange: (on: boolean) => void;
  onUseAlternative?: (id: string) => void;
  onStart: () => void;
  onClose: () => void;
}

/* ───────────────────────────── Player ───────────────────────────── */

export type QuizChoiceLayout = "short" | "meaning" | "long";

export interface QuizChoiceView {
  id: string;
  label: string;
  /** True when the label is Japanese (kana / kanji / a word), so it gets the Japanese face and lang="ja". */
  ja?: boolean;
}

export interface QuizPromptView {
  /** The big text. Japanese uses the learner's font toggle through var(--font-serif). */
  text: string;
  /** "glyph" = one character at 88 px (64 px in typed mode); "word" = 36 px with wrapping. */
  size: "glyph" | "word";
  /** A reading shown only when it is NOT the tested answer. Never set it on a reading question. */
  reading?: string;
  /** A short context line, e.g. "as in 学生 (student)". */
  helper?: string;
}

/** Timed practice shows exact seconds; Survival shows a budget on a 60 s scale. */
export interface QuizTimerView {
  /** "12 s" or "45s / 60s" */
  label: string;
  /** 0..1, how full the bar is. Survival's 45 of 60 is 0.75 on purpose. */
  fraction: number;
  kind: "question" | "budget";
}

export interface QuizQuestionView {
  id: string;
  /** Zero-based. The header shows `index + 1 / total`. */
  index: number;
  total: number;
  /** "Kana" */
  subjectLabel: string;
  /** "Read the character" */
  kindLabel: string;
  /** "Choose the reading" */
  instruction: string;
  prompt: QuizPromptView;
  mode: "choice" | "typed";
  choices: QuizChoiceView[];
  choiceLayout: QuizChoiceLayout;
  typedPlaceholder?: string;
  timer?: QuizTimerView;
}

/** What the learner did with the current question. */
export type QuizAnswerState =
  | { status: "unanswered" }
  | { status: "answered"; outcome: QuizOutcome; selectedId?: string; correctId?: string; typedValue?: string };

export type QuizOutcome = "correct" | "wrong" | "timeout";

export interface QuizWhyView {
  mnemonic?: string;
  example?: { ja: string; reading?: string; en: string };
  comparison?: {
    left: { glyph: string; label: string };
    right: { glyph: string; label: string };
    note: string;
  };
}

export interface QuizFeedbackView {
  outcome: QuizOutcome;
  /** "Correct" / "Not quite" / "Time is up" */
  verdict: string;
  /** What the right answer is, in words. */
  correctAnswer: string;
  /** What the learner typed or chose when it was wrong. */
  yourAnswer?: string;
  /** One useful sentence. */
  sentence: string;
  why?: QuizWhyView;
  /** Hear the Japanese. Appears here, never before grading. */
  canListen: boolean;
  /** Text for the one polite live region. Never a countdown. */
  announcement: string;
}

export type AutoNextPhase = "counting" | "paused" | "cancelled";

export interface AutoNextView {
  phase: AutoNextPhase;
  /** "Next in 1.6s" */
  label: string;
  /** Test / preview hook: show the line and bar without running the bar animation (the owner also holds the timer). */
  frozen?: boolean;
}

export interface QuizPlayerActions {
  onChoose: (choiceId: string) => void;
  onTypedChange: (value: string) => void;
  /** Called by the typed Check button and by Enter in the field. The event lets the caller mark it handled. */
  onSubmitTyped: (event?: SyntheticEvent) => void;
  onNext: () => void;
  onExit: () => void;
  onAutoNextChange: (on: boolean) => void;
}

/* ───────────────────────────── Results ───────────────────────────── */

export interface XpLineView {
  label: string;
  value: string;
}

export interface MissedItemView {
  id: string;
  prompt: string;
  promptSize: "glyph" | "word";
  yourAnswer: string;
  correctAnswer: string;
}

export interface QuizResultsView {
  /** "7 of 10 correct first try" */
  headline: string;
  /** "70%" secondary text */
  percentLabel: string;
  /** "Kana · Untimed" */
  contextLabel: string;
  xpLines: XpLineView[];
  xpTotal: string;
  streakLine?: string;
  /** Shown after a repair round: "2 corrected in the repair round". */
  repairLine?: string;
  missed: MissedItemView[];
  /** Primary label: "Practice your misses", or "Try another round" when nothing was missed. */
  primaryLabel: string;
  /** Shown only when all answers were right. */
  encouragement?: string;
  /** "Add up to 5 to Review Deck" */
  reviewDeckLabel?: string;
}

export interface QuizResultsActions {
  onPrimary: () => void;
  onAddToReviewDeck?: () => void;
  onAnotherRound: () => void;
  onBackToPractice: () => void;
}
