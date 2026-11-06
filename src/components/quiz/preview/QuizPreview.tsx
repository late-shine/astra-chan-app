// Quiz Remake QZ1: the visual prototype page. DEVELOPMENT ONLY (reached with ?quiz-preview=1, see src/main.tsx).
//
// It renders the six studio components with hard-coded fixtures. It has no feature flag, no persistence,
// no stats, no XP, no SRS and no network: every bit of state is local React state, and the only thing it
// writes outside React is the page URL (so a screenshot setup survives a refresh).
//
// It also doubles as a small interactive harness for the behaviour rules the real engine must keep
// (QZ5 ports them): locked answers, one live region, 1,600 ms auto-next that any feedback interaction
// cancels, Enter / number-key shortcuts that can never advance in the same keydown that submitted, focus
// moving to the prompt after Next. The dock and keyboard here are STAND-INS drawn from the dock's source
// geometry, not the live components; QZ5 verifies the real dock on a device.
//
// QZ12 deletes this folder and the main.tsx hook.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";
import { Music, Palette } from "lucide-react";
import { PracticeHome } from "../PracticeHome";
import { QuizFeedback } from "../QuizFeedback";
import { LeavePracticeSheet, QuizPlayer } from "../QuizPlayer";
import { QuizResults } from "../QuizResults";
import { QuizSetupSheet } from "../QuizSetupSheet";
import { StudioHeader, StudioShell } from "../StudioShell";
import type {
  AutoNextPhase,
  AutoNextView,
  KanaScript,
  KanaStageView,
  QuizAnswerState,
  QuizQuestionView,
  QuizSetupView,
  QuizSubject,
  QuizThemeId,
  QuizTimerView,
} from "../viewTypes";
import {
  DuelLobbyFixture,
  KANA_STAGES,
  KINDS,
  POOLS,
  SUBJECTS,
  TYPED_SAMPLE,
  practiceHomeView,
  resultsView,
  sampleQuestions,
  type ResultsVariant,
} from "./fixtures";

/* ───────────────────────────── Control state ───────────────────────────── */

type FixtureId = "practice" | "setup" | "question" | "correct" | "wrong" | "typed" | "results" | "duel";
type DockMode = "off" | "quiet" | "full" | "open";
type TimerMode = "off" | "steady" | "survival";
type PoolMode = "normal" | "small" | "empty";
type WrongKind = "wrong" | "timeout";

const FIXTURES: { id: FixtureId; label: string }[] = [
  { id: "practice", label: "Practice home" },
  { id: "setup", label: "Customize sheet" },
  { id: "question", label: "Question, unanswered" },
  { id: "correct", label: "Correct feedback" },
  { id: "wrong", label: "Wrong, Why expanded" },
  { id: "typed", label: "Typed answer, keyboard open" },
  { id: "results", label: "Results" },
  { id: "duel", label: "Duel lobby" },
];
const THEMES: QuizThemeId[] = ["light", "dark", "dark-cosmic", "dark-emerald", "dark-maple", "dark-cyber"];
const TOTAL = 10;
const AUTO_NEXT_MS = 1600;

interface Controls {
  fixture: FixtureId;
  subject: QuizSubject;
  theme: QuizThemeId;
  reduced: boolean;
  text200: boolean;
  written: boolean;
  keyboard: boolean;
  dock: DockMode;
  guide: boolean;
  timer: TimerMode;
  resume: boolean;
  noHistory: boolean;
  pool: PoolMode;
  wrongKind: WrongKind;
  results: ResultsVariant;
  freeze: boolean;
}

const DEFAULT_CONTROLS: Controls = {
  fixture: "practice",
  subject: "kana",
  theme: "light",
  reduced: false,
  text200: false,
  written: false,
  keyboard: false,
  dock: "quiet",
  guide: false,
  timer: "off",
  resume: false,
  noHistory: false,
  pool: "normal",
  wrongKind: "wrong",
  results: "misses",
  freeze: true,
};

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function readControls(): Controls {
  const q = new URLSearchParams(window.location.search);
  const flag = (key: string, fallback: boolean) => (q.get(key) === null ? fallback : q.get(key) === "1");
  const fixture = pick(q.get("fixture"), FIXTURES.map((f) => f.id), "practice");
  return {
    fixture,
    subject: pick(q.get("subject"), ["kana", "words", "kanji"] as const, "kana"),
    theme: pick(q.get("theme"), THEMES, "light"),
    reduced: flag("reduced", false),
    text200: flag("text200", false),
    written: flag("written", false),
    // The typed fixture is the keyboard-open layout, so it defaults on there.
    keyboard: flag("kb", fixture === "typed"),
    dock: pick(q.get("dock"), ["off", "quiet", "full", "open"] as const, "quiet"),
    guide: flag("guide", false),
    timer: pick(q.get("timer"), ["off", "steady", "survival"] as const, "off"),
    resume: flag("resume", false),
    noHistory: flag("nohistory", false),
    pool: pick(q.get("pool"), ["normal", "small", "empty"] as const, "normal"),
    wrongKind: pick(q.get("wrong"), ["wrong", "timeout"] as const, "wrong"),
    results: pick(q.get("results"), ["misses", "perfect", "repair"] as const, "misses"),
    freeze: flag("freeze", true),
  };
}

/* ───────────────────────────── Session state ───────────────────────────── */

type Screen = "practice" | "player" | "typed" | "results" | "duel";

interface Session {
  screen: Screen;
  qIndex: number;
  answer: QuizAnswerState;
  typed: string;
  whyOpen: boolean;
  autoPhase: AutoNextPhase;
  setupOpen: boolean;
  leaveOpen: boolean;
  resumeShown: boolean;
}

const UNANSWERED: QuizAnswerState = { status: "unanswered" };

function fixtureSession(fixture: FixtureId, c: Controls, autoNextOn: boolean): Session {
  const base: Session = {
    screen: "practice",
    qIndex: 3,
    answer: UNANSWERED,
    typed: "",
    whyOpen: false,
    autoPhase: "cancelled",
    setupOpen: false,
    leaveOpen: false,
    resumeShown: c.resume,
  };
  const sample = sampleQuestions(c.subject)[3 % 3];
  switch (fixture) {
    case "setup":
      return { ...base, setupOpen: true };
    case "question":
      return { ...base, screen: "player" };
    case "correct":
      return {
        ...base,
        screen: "player",
        answer: { status: "answered", outcome: "correct", selectedId: sample.correctId, correctId: sample.correctId },
        autoPhase: autoNextOn ? "counting" : "cancelled",
      };
    case "wrong":
      return {
        ...base,
        screen: "player",
        answer: {
          status: "answered",
          outcome: c.wrongKind,
          selectedId: c.wrongKind === "wrong" ? sample.wrongId : undefined,
          correctId: sample.correctId,
        },
        whyOpen: true,
      };
    case "typed":
      return { ...base, screen: "typed" };
    case "results":
      return { ...base, screen: "results" };
    case "duel":
      return { ...base, screen: "duel" };
    default:
      return base;
  }
}

function timerView(mode: TimerMode): QuizTimerView | undefined {
  if (mode === "steady") return { label: "8 s", fraction: 8 / 12, kind: "question" };
  if (mode === "survival") return { label: "45s / 60s", fraction: 45 / 60, kind: "budget" };
  return undefined;
}

interface SetupSelection {
  poolId: string;
  kindId: string;
  length: number;
  script: KanaScript;
  stages: Record<string, boolean>;
  choices: 4 | 6;
}

const STAGE_COUNTS: Record<string, number> = { basic: 46, dakuon: 20, handakuon: 5, yoon: 33 };

/* ───────────────────────────── The page ───────────────────────────── */

export default function QuizPreview() {
  const initial = useMemo(readControls, []);
  const [c, setC] = useState<Controls>(initial);
  const [panelOpen, setPanelOpen] = useState(false);
  const showToggle = useMemo(() => new URLSearchParams(window.location.search).get("controls") !== "0", []);
  const [autoNextOn, setAutoNextOn] = useState(true);
  const [session, setSession] = useState<Session>(() => fixtureSession(initial.fixture, initial, true));
  const [setup, setSetup] = useState<SetupSelection>({
    poolId: "recommended",
    kindId: KINDS[initial.subject][0].id,
    length: 10,
    script: "hiragana",
    stages: { basic: true, dakuon: false, handakuon: false, yoon: false },
    choices: 4,
  });
  const [lastAction, setLastAction] = useState("none yet");
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  const promptRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const customizeRef = useRef<HTMLButtonElement>(null);
  const focusAfterAdvance = useRef(false);
  const consumedKeyRef = useRef<Event | null>(null);

  const typedMode = session.screen === "typed";
  const samples = useMemo(() => sampleQuestions(c.subject), [c.subject]);
  const sample = samples[session.qIndex % samples.length];
  const answered = session.answer.status === "answered";

  const patch = useCallback((next: Partial<Controls>) => setC((prev) => ({ ...prev, ...next })), []);
  const patchSession = useCallback((next: Partial<Session>) => setSession((prev) => ({ ...prev, ...next })), []);
  const note = useCallback((text: string) => setLastAction(text), []);

  /* Jump: a fixture, or any control that changes what a fixture means, re-applies the session. */
  const jump = useCallback(
    (fixture: FixtureId, controls: Controls) => {
      setSession(fixtureSession(fixture, controls, autoNextOn));
      focusAfterAdvance.current = false;
      if (fixture === "typed") setC((prev) => ({ ...prev, keyboard: true }));
    },
    [autoNextOn],
  );

  /* ── chrome side effects (all undone on unmount) ── */
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.fontSize;
    root.style.fontSize = c.text200 ? "200%" : previous;
    return () => {
      root.style.fontSize = previous;
    };
  }, [c.text200]);
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("font-written");
    root.classList.toggle("font-written", c.written);
    return () => {
      root.classList.toggle("font-written", had);
    };
  }, [c.written]);
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    // Keep the URL in step with the controls so a refresh (or a shared dev link) restores the same setup.
    const q = new URLSearchParams();
    q.set("quiz-preview", "1");
    q.set("fixture", c.fixture);
    q.set("subject", c.subject);
    q.set("theme", c.theme);
    if (c.reduced) q.set("reduced", "1");
    if (c.text200) q.set("text200", "1");
    if (c.written) q.set("written", "1");
    q.set("kb", c.keyboard ? "1" : "0");
    q.set("dock", c.dock);
    if (c.guide) q.set("guide", "1");
    if (c.timer !== "off") q.set("timer", c.timer);
    if (c.resume) q.set("resume", "1");
    if (c.noHistory) q.set("nohistory", "1");
    if (c.pool !== "normal") q.set("pool", c.pool);
    if (c.wrongKind !== "wrong") q.set("wrong", c.wrongKind);
    if (c.results !== "misses") q.set("results", c.results);
    q.set("freeze", c.freeze ? "1" : "0");
    if (!showToggle) q.set("controls", "0");
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}`);
  }, [c, showToggle]);

  /* ── answering ── */
  const startPractice = useCallback(
    (screen: Screen, timer?: TimerMode) => {
      if (timer) patch({ timer });
      setSession((prev) => ({ ...prev, screen, qIndex: 0, answer: UNANSWERED, typed: "", whyOpen: false, autoPhase: "cancelled", setupOpen: false, leaveOpen: false }));
      focusAfterAdvance.current = true;
    },
    [patch],
  );

  const choose = useCallback(
    (id: string) => {
      setSession((prev) => {
        if (prev.answer.status === "answered") return prev;
        const correct = id === sample.correctId;
        return {
          ...prev,
          answer: { status: "answered", outcome: correct ? "correct" : "wrong", selectedId: id, correctId: sample.correctId },
          whyOpen: false,
          autoPhase: correct && autoNextOn ? "counting" : "cancelled",
        };
      });
    },
    [sample.correctId, autoNextOn],
  );

  const submitTyped = useCallback(
    (event?: SyntheticEvent) => {
      if (event) {
        // Mark the very keydown that submitted: the window shortcut must never also advance on it.
        event.preventDefault();
        consumedKeyRef.current = event.nativeEvent;
      }
      setSession((prev) => {
        if (prev.answer.status === "answered") return prev;
        const correct = TYPED_SAMPLE.accepted.includes(prev.typed.trim().toLowerCase());
        return {
          ...prev,
          answer: { status: "answered", outcome: correct ? "correct" : "wrong", typedValue: prev.typed },
          whyOpen: false,
          autoPhase: correct && autoNextOn ? "counting" : "cancelled",
        };
      });
    },
    [autoNextOn],
  );

  const advance = useCallback(() => {
    setSession((prev) => {
      if (prev.answer.status !== "answered") return prev;
      if (prev.qIndex >= TOTAL - 1) return { ...prev, screen: "results", answer: UNANSWERED, typed: "", whyOpen: false, autoPhase: "cancelled" };
      focusAfterAdvance.current = true;
      return { ...prev, qIndex: prev.qIndex + 1, answer: UNANSWERED, typed: "", whyOpen: false, autoPhase: "cancelled" };
    });
  }, []);

  const cancelAuto = useCallback(() => {
    setSession((prev) => (prev.autoPhase === "counting" ? { ...prev, autoPhase: "cancelled" } : prev));
  }, []);

  // Newest handlers for the window listener and the timer, without re-subscribing every render.
  const live = useRef({ advance, choose, session, sample, typedMode });
  live.current = { advance, choose, session, sample, typedMode };

  /* Auto-next: one deadline per correct answer. It is cancelled (never restarted) by Why, Listen, Pause,
     pointer or focus on the feedback, and by any open sheet. Frozen = shown but not run (for screenshots). */
  useEffect(() => {
    if (session.autoPhase !== "counting" || c.freeze || session.setupOpen || session.leaveOpen) return;
    const timer = window.setTimeout(() => live.current.advance(), AUTO_NEXT_MS);
    return () => window.clearTimeout(timer);
  }, [session.autoPhase, session.qIndex, session.setupOpen, session.leaveOpen, c.freeze]);
  useEffect(() => {
    if ((session.setupOpen || session.leaveOpen) && session.autoPhase === "counting") cancelAuto();
  }, [session.setupOpen, session.leaveOpen, session.autoPhase, cancelAuto]);

  /* Focus: after Next (manual or automatic) the prompt or typed field takes focus. */
  useEffect(() => {
    if (!focusAfterAdvance.current) return;
    focusAfterAdvance.current = false;
    (typedMode ? inputRef.current : promptRef.current)?.focus({ preventScroll: true });
  }, [session.qIndex, session.screen, typedMode]);

  /* Keyboard shortcuts: 1-9 picks an answer, Enter advances after feedback. Native Enter/Space on a focused
     button, link or switch keeps its own meaning, and a keydown that already submitted is never reused. */
  useEffect(() => {
    if (session.screen !== "player" && session.screen !== "typed") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (consumedKeyRef.current === event) return;
      const s = live.current.session;
      if (s.setupOpen || s.leaveOpen) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (inField && !(target as HTMLInputElement).readOnly) return;
      const isLockedChoice = !!target?.closest("[data-quiz-choice]");

      if (!live.current.typedMode && s.answer.status === "unanswered" && /^[1-9]$/.test(event.key)) {
        const choices = live.current.sample.build(0, TOTAL, undefined).choices;
        const picked = choices[Number(event.key) - 1];
        if (picked) {
          event.preventDefault();
          live.current.choose(picked.id);
        }
        return;
      }
      if (event.key === "Enter" && s.answer.status === "answered") {
        const ownsEnter = !!target?.closest('button, a, [role="switch"], select') && !isLockedChoice;
        if (ownsEnter) return;
        event.preventDefault();
        live.current.advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session.screen]);

  /* ── view models ── */
  const timer = timerView(c.timer);
  const question: QuizQuestionView = typedMode ? { ...TYPED_SAMPLE.question(session.qIndex, TOTAL), timer } : sample.build(session.qIndex, TOTAL, timer);
  const feedbackOutcome = session.answer.status === "answered" ? session.answer.outcome : "correct";
  const feedbackView = typedMode ? TYPED_SAMPLE.feedback(feedbackOutcome, session.typed) : sample.feedback(feedbackOutcome);

  const autoNextView: AutoNextView | undefined =
    answered && feedbackOutcome === "correct" && autoNextOn
      ? session.autoPhase === "counting"
        ? { phase: "counting", label: "Next in 1.6s", frozen: c.freeze }
        : session.autoPhase === "paused"
          ? { phase: "paused", label: "Paused. Press Next when you are ready." }
          : undefined
      : undefined;

  const stageViews: KanaStageView[] = KANA_STAGES.map((stage) => ({ ...stage, on: !!setup.stages[stage.id] }));
  const stagesTotal = Object.keys(setup.stages).reduce((sum, id) => sum + (setup.stages[id] ? STAGE_COUNTS[id] ?? 0 : 0), 0);
  const poolCount = POOLS[c.subject].find((p) => p.id === setup.poolId)?.count ?? 0;
  const matchCount = c.pool === "empty" ? 0 : c.pool === "small" ? 6 : c.subject === "kana" ? stagesTotal : poolCount;
  const kanaNoStages = c.subject === "kana" && stagesTotal === 0;

  const setupView: QuizSetupView = {
    subject: c.subject,
    subjects: SUBJECTS,
    poolId: setup.poolId,
    pools: POOLS[c.subject],
    kindId: KINDS[c.subject].some((k) => k.id === setup.kindId) ? setup.kindId : KINDS[c.subject][0].id,
    kinds: KINDS[c.subject],
    length: setup.length,
    lengths: [5, 10, 20, 30],
    kana:
      c.subject === "kana"
        ? {
            script: setup.script,
            scripts: [
              { id: "hiragana", label: "Hiragana" },
              { id: "katakana", label: "Katakana" },
              { id: "both", label: "Both" },
            ],
            stages: stageViews,
            choices: setup.choices,
          }
        : undefined,
    autoNext: autoNextOn,
    matchCount,
    emptyAlternative:
      matchCount === 0
        ? kanaNoStages
          ? { id: "basic", label: "Include Core kana", reason: "No kana groups are selected." }
          : { id: "reset", label: "Use the recommended pool", reason: "Nothing in this pool matches the chosen question type." }
        : undefined,
  };

  const setupSheet = session.setupOpen ? (
    <QuizSetupSheet
      view={setupView}
      returnFocusRef={customizeRef}
      actions={{
        onSubjectChange: (subject) => {
          patch({ subject });
          setSetup((prev) => ({ ...prev, poolId: "recommended", kindId: KINDS[subject][0].id }));
        },
        onPoolChange: (poolId) => setSetup((prev) => ({ ...prev, poolId })),
        onKindChange: (kindId) => setSetup((prev) => ({ ...prev, kindId })),
        onLengthChange: (length) => setSetup((prev) => ({ ...prev, length })),
        onScriptChange: (script) => setSetup((prev) => ({ ...prev, script })),
        onToggleStage: (id) => setSetup((prev) => ({ ...prev, stages: { ...prev.stages, [id]: !prev.stages[id] } })),
        onChoicesChange: (choices) => setSetup((prev) => ({ ...prev, choices })),
        onAutoNextChange: setAutoNextOn,
        onUseAlternative: (id) => {
          if (id === "basic") setSetup((prev) => ({ ...prev, stages: { ...prev.stages, basic: true } }));
          else patch({ pool: "normal" });
          setSetup((prev) => ({ ...prev, poolId: id === "reset" ? "recommended" : prev.poolId }));
          note(`Setup alternative applied: ${id}`);
        },
        onStart: () => {
          note("Setup: Start pressed");
          startPractice(c.subject === "kana" && setup.kindId === "type" ? "typed" : "player");
        },
        onClose: () => patchSession({ setupOpen: false }),
      }}
    />
  ) : undefined;

  const shell = { themeId: c.theme, reducedMotion: c.reduced, keyboardOpen: c.keyboard } as const;

  /* ── screens ── */
  let screenEl: ReactNode;
  if (session.screen === "practice") {
    screenEl = (
      <StudioShell
        label="Practice"
        width="home"
        {...shell}
        modalOpen={session.setupOpen}
        overlay={setupSheet}
        header={
          <StudioHeader backLabel="Back to Study Room" onBack={() => note("Back to Study Room (not wired)")}>
            <p className="quiz-header__progress">Practice</p>
          </StudioHeader>
        }
      >
        <PracticeHome
          view={practiceHomeView(c.subject, { resume: session.resumeShown, noHistory: c.noHistory })}
          customizeRef={customizeRef}
          actions={{
            onSelectSubject: (subject) => {
              patch({ subject });
              setSetup((prev) => ({ ...prev, poolId: "recommended", kindId: KINDS[subject][0].id }));
            },
            onStart: () => startPractice("player"),
            onCustomize: () => patchSession({ setupOpen: true }),
            onChallenge: (id) => {
              if (id === "friend") setSession((prev) => ({ ...prev, screen: "duel" }));
              else startPractice("player", id === "survival" ? "survival" : "steady");
            },
            onOpenReviewDeck: () => note("Review Deck opened (not wired)"),
            onResume: () => {
              setSession((prev) => ({ ...prev, screen: "player", qIndex: 3, answer: UNANSWERED, resumeShown: false }));
              focusAfterAdvance.current = true;
            },
            onDiscardResume: () => patchSession({ resumeShown: false }),
          }}
        />
      </StudioShell>
    );
  } else if (session.screen === "player" || session.screen === "typed") {
    const answeredCount = session.qIndex + (answered ? 1 : 0);
    screenEl = (
      <QuizPlayer
        question={question}
        answer={session.answer}
        typedValue={session.typed}
        autoNextEnabled={autoNextOn}
        announcement={answered ? feedbackView.announcement : ""}
        promptRef={promptRef}
        inputRef={inputRef}
        shell={{
          ...shell,
          modalOpen: session.leaveOpen,
          overlay: session.leaveOpen ? (
            <LeavePracticeSheet
              answeredCount={answeredCount}
              onKeepPracticing={() => patchSession({ leaveOpen: false })}
              onSaveAndLeave={() => {
                setSession((prev) => ({ ...prev, screen: "practice", leaveOpen: false, resumeShown: true }));
                note("Saved and left; resume banner shown");
              }}
              onFinish={() => setSession((prev) => ({ ...prev, screen: "results", leaveOpen: false }))}
              onDiscard={() => setSession((prev) => ({ ...prev, screen: "practice", leaveOpen: false }))}
            />
          ) : undefined,
        }}
        feedback={
          <QuizFeedback
            view={feedbackView}
            whyOpen={session.whyOpen}
            onToggleWhy={() => setSession((prev) => ({ ...prev, whyOpen: !prev.whyOpen, autoPhase: prev.autoPhase === "counting" ? "cancelled" : prev.autoPhase }))}
            onListen={() => {
              cancelAuto();
              note("Listen pressed (no audio in the preview)");
            }}
            onInteract={cancelAuto}
            autoNext={autoNextView}
            onPauseAutoNext={() => patchSession({ autoPhase: "paused" })}
          />
        }
        actions={{
          onChoose: choose,
          onTypedChange: (value) => patchSession({ typed: value }),
          onSubmitTyped: submitTyped,
          onNext: advance,
          onExit: () => patchSession({ leaveOpen: true }),
          onAutoNextChange: setAutoNextOn,
        }}
      />
    );
  } else if (session.screen === "results") {
    screenEl = (
      <QuizResults
        view={resultsView(c.subject, c.results)}
        shell={shell}
        actions={{
          onPrimary: () => startPractice("player"),
          onAddToReviewDeck: () => note("Add to Review Deck (not wired)"),
          onAnotherRound: () => startPractice("player"),
          onBackToPractice: () => patchSession({ screen: "practice" }),
        }}
      />
    );
  } else {
    screenEl = <DuelLobbyFixture subject={c.subject} shell={shell} onBack={() => patchSession({ screen: "practice" })} />;
  }

  /* ── panel ── */
  const setFixture = (fixture: FixtureId) => {
    const next = { ...c, fixture, keyboard: fixture === "typed" ? true : c.keyboard };
    setC(next);
    jump(fixture, next);
  };
  const setAndRejump = (next: Partial<Controls>) => {
    const merged = { ...c, ...next };
    setC(merged);
    jump(c.fixture, merged);
  };
  const radios = <T extends string>(name: string, options: readonly T[], value: T, onChange: (v: T) => void) =>
    options.map((option) => (
      <label key={option}>
        <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
        {option}
      </label>
    ));
  const check = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <label>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );

  const rem = typeof window !== "undefined" ? getComputedStyle(document.documentElement).fontSize : "16px";

  return (
    <div className="quiz-preview-root" style={c.keyboard ? ({ ["--quiz-studio-height" as string]: "calc(100dvh - min(42dvh, 21rem))" } as CSSProperties) : undefined}>
      {screenEl}

      {c.dock !== "off" && !c.keyboard && (
        <div className="quiz-preview-dock" aria-hidden="true">
          {c.dock === "open" && <div className="quiz-preview-dock__panel">Music panel stand-in (opens up to 70dvh tall)</div>}
          <div className="quiz-preview-dock__row">
            {c.dock !== "quiet" && (
              <span className="quiz-preview-dock__btn">
                <Palette />
              </span>
            )}
            <span className="quiz-preview-dock__btn" data-quiet={c.dock === "quiet" ? "true" : undefined}>
              <Music />
            </span>
          </div>
        </div>
      )}
      {c.guide && (
        <div className="quiz-preview-guide" aria-hidden="true">
          <span>dock clearance: max(88px, footprint + 16px) + safe area</span>
        </div>
      )}
      {c.keyboard && (
        <div className="quiz-preview-keyboard" aria-hidden="true">
          Simulated on-screen keyboard (about 42% of the screen). Open with the typed fixture; the real one behaves differently per browser.
        </div>
      )}

      {showToggle && (
        <>
          <div className="quiz-preview-readout" aria-hidden="true">
            {viewport.w}×{viewport.h} · root {rem}
          </div>
          <button type="button" className="quiz-preview-toggle" aria-expanded={panelOpen} onClick={() => setPanelOpen((v) => !v)}>
            {panelOpen ? "Hide preview controls" : "Preview controls"}
          </button>
          {panelOpen && (
            <div className="quiz-preview-panel" role="region" aria-label="Quiz preview controls">
              <h2>Quiz studio preview (dev only)</h2>
              <p>Fixed sample data. Nothing is saved. Resize the window or use device mode for 320 / 390 / 768 / 1280.</p>

              <fieldset>
                <legend>Fixture</legend>
                <select value={c.fixture} onChange={(e) => setFixture(e.target.value as FixtureId)} aria-label="Fixture">
                  {FIXTURES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <div>
                  <button type="button" onClick={() => jump(c.fixture, c)}>
                    Reset this fixture
                  </button>{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setSession((prev) => ({ ...prev, screen: prev.screen === "typed" ? "typed" : "player", qIndex: TOTAL - 1, answer: UNANSWERED, typed: "", whyOpen: false, autoPhase: "cancelled" }));
                      focusAfterAdvance.current = true;
                    }}
                  >
                    Jump to question 10
                  </button>
                </div>
              </fieldset>

              <fieldset>
                <legend>Subject</legend>
                {radios("subject", ["kana", "words", "kanji"] as const, c.subject, (subject) => {
                  setSetup((prev) => ({ ...prev, poolId: "recommended", kindId: KINDS[subject][0].id }));
                  setAndRejump({ subject });
                })}
              </fieldset>

              <fieldset>
                <legend>Look</legend>
                <label>
                  Theme{" "}
                  <select value={c.theme} onChange={(e) => patch({ theme: e.target.value as QuizThemeId })}>
                    {THEMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  {check("Reduced motion", c.reduced, (reduced) => patch({ reduced }))}
                  {check("Text 200%", c.text200, (text200) => patch({ text200 }))}
                  {check("Written font", c.written, (written) => patch({ written }))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Viewport stand-ins</legend>
                {check("Keyboard open", c.keyboard, (keyboard) => patch({ keyboard }))}
                {check("Clearance line", c.guide, (guide) => patch({ guide }))}
                <div>{radios("dock", ["off", "quiet", "full", "open"] as const, c.dock, (dock) => patch({ dock }))}</div>
              </fieldset>

              <fieldset>
                <legend>Session</legend>
                <div>Timer {radios("timer", ["off", "steady", "survival"] as const, c.timer, (t) => patch({ timer: t }))}</div>
                <div>Wrong fixture {radios("wrong", ["wrong", "timeout"] as const, c.wrongKind, (wrongKind) => setAndRejump({ wrongKind }))}</div>
                <div>Results {radios("results", ["misses", "perfect", "repair"] as const, c.results, (results) => patch({ results }))}</div>
                <div>Setup pool {radios("pool", ["normal", "small", "empty"] as const, c.pool, (pool) => patch({ pool }))}</div>
                <div>
                  {check("Resume banner", c.resume, (resume) => {
                    patch({ resume });
                    patchSession({ resumeShown: resume });
                  })}
                  {check("No history", c.noHistory, (noHistory) => patch({ noHistory }))}
                  {check("Freeze auto-next", c.freeze, (freeze) => patch({ freeze }))}
                  {check("Auto-next on", autoNextOn, setAutoNextOn)}
                </div>
              </fieldset>

              <p>
                Last action: <strong>{lastAction}</strong>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
