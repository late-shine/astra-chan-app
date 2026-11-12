import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { UserRound } from "lucide-react";
import { useQuizCompanion } from "../../quiz/useQuizCompanion";
import { questionView } from "../../quiz/grade";
import { encodeId } from "../../quiz/ids";
import { buildQuestions, getEligibility } from "../../quiz/pool";
import { quizKanaStages, type QuizPreferences } from "../../quiz/preferences";
import { seededRandom } from "../../quiz/random";
import { timedLimitMs } from "../../quiz/session";
import { summarize } from "../../quiz/summary";
import { SESSION_LIMITS, type ActiveSession, type AnswerRecord, type BuildConfig, type Catalogs, type ChallengeTier,
  type QuestionKind, type QuizHistory, type Response } from "../../quiz/types";
import { quizClock, quizDeviceId, type QuizSessionController } from "../../quiz/useQuizSession";
import { QuizFeedback } from "./QuizFeedback";
import { LeavePracticeSheet, QuizPlayer } from "./QuizPlayer";
import { QuizResults } from "./QuizResults";
import { QuizSetupSheet } from "./QuizSetupSheet";
import { StudioHeader, StudioSegmented, StudioShell, type StudioPresentation } from "./StudioShell";
import type { AutoNextView, KanaScript, QuizAnswerState, QuizFeedbackView, QuizQuestionView, QuizResultsView, QuizWhyView } from "./viewTypes";

export type KanaLaunch = "practice" | "typed" | "timed" | "survival" | "customize" | "resume";
type KanaMode = "practice" | "timed" | "survival";
type KanaKind = QuizPreferences["quizKanaKind"];

interface Props {
  owner: string | null;
  speechEnabled: boolean;
  onSpeechChange: (enabled: boolean) => void;
  controller: QuizSessionController;
  ready: boolean;
  unavailable: boolean;
  launch: KanaLaunch;
  catalogs: Catalogs;
  history: QuizHistory;
  preferences: QuizPreferences;
  onPreferenceChange: (patch: Partial<QuizPreferences>) => void;
  onReadCustom: () => string[];
  onSaveCustom: (ids: readonly string[]) => void;
  previousBest: number;
  streak: number;
  cloudPending: boolean;
  autoPronounce: boolean;
  exampleFor: (glyph: string) => QuizWhyView["example"];
  speak: (text: string) => void;
  chime: (correct: boolean) => void;
  onBack: () => void;
  onProfile: () => void;
}

const KIND_LABELS = { "kana-read": "Read the kana", "kana-pick": "Pick the kana", "kana-type": "Type romaji" } as const;
const KINDS = [
  { id: "read", label: "Read the kana" }, { id: "pick", label: "Pick the kana" },
  { id: "type", label: "Type romaji" }, { id: "mixed", label: "Mixed" },
] as const;
const STAGES = [
  { id: "basic", label: "Core", hint: "あ・か・さ" }, { id: "dakuon", label: "Dakuten", hint: "が・ざ・だ" },
  { id: "handakuon", label: "Handakuten", hint: "ぱ・ぴ・ぷ" }, { id: "yoon", label: "Yōon", hint: "きゃ・しゅ・ちょ" },
] as const;
const SCRIPTS: { id: KanaScript; label: string }[] = [
  { id: "hiragana", label: "Hiragana" }, { id: "katakana", label: "Katakana" }, { id: "both", label: "Both" },
];
const TIERS: { id: ChallengeTier; label: string }[] = [
  { id: "steady", label: "Steady · 12 s" }, { id: "quick", label: "Quick · 6 s" }, { id: "lightning", label: "Lightning · 3 s" },
];
const LENGTHS = [5, 10, 20, 30] as const;
const modeName = (mode: ActiveSession["config"]["origin"]) => mode === "timed" ? "Timed practice" : mode === "survival" ? "Survival" : "Untimed practice";

function configFor(preferences: QuizPreferences, mode: KanaMode, kind: KanaKind, customIds: readonly string[] | undefined,
  sessionId: string, now: number): BuildConfig {
  const kinds: QuestionKind[] = kind === "mixed" ? ["kana-read", "kana-pick", ...(mode === "survival" ? [] : ["kana-type" as const])]
    : [mode === "survival" && kind === "type" ? "kana-read" : `kana-${kind}`];
  return { sessionId, now, subject: "kana", kinds, length: preferences.quizLength, choiceCount: preferences.quizChoiceCount,
    pool: { script: preferences.quizKanaScript, stages: quizKanaStages(preferences.quizKanaStagesMask),
      ...(customIds ? { filter: "custom", itemIds: customIds } : {}) } };
}

function answerFor(state: ActiveSession): AnswerRecord | undefined {
  const last = state.records.at(-1);
  return last?.type === "answer" && last.questionId === state.current.id ? last :
    state.records.find((r): r is AnswerRecord => r.type === "answer" && r.questionId === state.current.id);
}

function questionModel(state: ActiveSession): QuizQuestionView {
  const question = questionView(state.current);
  const survival = state.survivalRemainingMs;
  const limit = timedLimitMs(state.config);
  const remain = state.remainingMs;
  const timer = survival !== null ? { kind: "budget" as const, label: `${Math.ceil(survival / 1000)}s / 60s`, fraction: survival / SESSION_LIMITS.survivalCapMs }
    : remain !== null && limit ? { kind: "question" as const, label: `${Math.ceil(remain / 1000)} s`, fraction: remain / limit } : undefined;
  const pick = question.kind === "kana-pick";
  return { id: question.id, index: state.index, total: state.questions.length, subjectLabel: "Kana",
    kindLabel: KIND_LABELS[question.kind as keyof typeof KIND_LABELS] ?? "Practice",
    instruction: pick ? "Choose the character for this reading." : question.instruction,
    prompt: { text: question.face, size: pick ? "word" : "glyph", ja: !pick }, mode: question.responseType,
    choices: (question.choices ?? []).map(choice => ({ ...choice, ja: pick })), choiceLayout: "short",
    typedPlaceholder: "Type in romaji", timer,
    ...(survival !== null ? { positionLabel: `Question ${state.index + 1}`, finalQuestion: false } : {}) };
}

function feedbackModel(state: ActiveSession, record: AnswerRecord, question: QuizQuestionView, exampleFor: Props["exampleFor"]): QuizFeedbackView | undefined {
  const { outcome } = record;
  if (outcome === "unattempted") return;
  const { reveal, speechText } = state.current;
  const verdict = outcome === "correct" ? "Correct" : outcome === "timeout" ? "Time is up" : "Not quite";
  const reading = reveal.reading ?? reveal.answer;
  const glyph = record.target.kanaGlyph ?? question.prompt.text;
  const example = exampleFor(glyph);
  const alias = state.current.responseType === "typed" && state.current.acceptedTyped.length > 1
    ? `Also accepted: ${state.current.acceptedTyped.filter(value => value !== reading).join(", ")}.` : undefined;
  return { outcome, verdict, correctAnswer: reveal.answer, canListen: !!speechText,
    sentence: `${glyph} is read “${reading}”.`, announcement: `${verdict}. Answer: ${reveal.answer}.`,
    ...(outcome === "wrong" ? { yourAnswer: record.typedValue ?? question.choices.find(choice => choice.id === record.responseId)?.label } : {}),
    why: { example, mnemonic: reveal.note ?? alias ?? (example ? undefined : `Say “${reading}” as you trace ${glyph} in the air.`) } };
}

function resultsModel(state: ActiveSession, streak: number, cloudPending: boolean): QuizResultsView {
  const summary = summarize(state);
  const { firstPass, survival, xp } = summary;
  const missed = summary.misses.flatMap(miss => {
    const question = state.questions.find(row => row.skillKey === miss.skillKey);
    const record = state.records.find((row): row is AnswerRecord => row.type === "answer" && row.questionId === miss.questionId);
    if (!question || !record) return [];
    return [{ id: miss.skillKey, prompt: miss.face, promptSize: question.kind === "kana-pick" ? "word" as const : "glyph" as const,
      correctAnswer: question.reveal.answer,
      yourAnswer: record.outcome === "timeout" ? "Time ran out" : record.typedValue ?? question.choices?.find(row => row.id === record.responseId)?.label ?? "No response" }];
  });
  return { headline: survival ? `${survival.score} correct in Survival` : firstPass.attempted ? `${firstPass.correct} of ${firstPass.attempted} correct first try` : "No answers recorded",
    companion: { expression: summary.complete && firstPass.accuracy === 1 ? "celebrate" : summary.partial ? "intro" : "encouraging",
      speech: summary.complete && firstPass.accuracy === 1 ? "A lovely moment of progress." : "A little practice is time well spent." },
    percentLabel: firstPass.accuracy === null ? "Ready for another round when you are." : `${Math.round(firstPass.accuracy * 100)}% first-try accuracy`,
    contextLabel: `Kana · ${modeName(state.config.origin)}`, detail: survival ? `Personal best · ${survival.best}` : summary.partial ? `Partial round · ${summary.unattempted} unanswered` : undefined,
    xpLines: [{ label: "Answer XP", value: `+${xp.base}` }, { label: "Challenge bonus", value: `+${xp.challenge}` }, { label: "Completion bonus", value: `+${xp.completion}` }],
    xpTotal: `+${xp.total} XP`, streakLine: streak && firstPass.attempted ? `${streak}-day study streak` : undefined,
    saveLabel: state.pending ? `${xp.durablyAcknowledged} XP saved on this device. Other progress is pending.` : summary.recordSaveStatus === "acknowledged"
      ? cloudPending ? "Saved on this device. Cloud sync is pending." : "Saved on this device." : undefined,
    missed, primaryLabel: "Try another round",
    encouragement: firstPass.accuracy === 1 ? "Ready for a different question type?" : undefined };
}

function useKeyboardViewport(input: RefObject<HTMLInputElement | null>, typed: boolean) {
  const [frame, setFrame] = useState<{ height: number; offsetTop: number }>();
  useEffect(() => {
    if (!typed) { setFrame(undefined); return; }
    const viewport = window.visualViewport;
    if (!viewport) return;
    let fullHeight = window.innerHeight;
    const update = () => {
      const focused = document.activeElement === input.current;
      if (!focused) fullHeight = window.innerHeight;
      const covered = Math.max(fullHeight, window.innerHeight) - viewport.height;
      const next = focused && viewport.scale === 1 && covered > 100 ? { height: Math.round(viewport.height), offsetTop: Math.round(viewport.offsetTop) } : undefined;
      setFrame(previous => previous?.height === next?.height && previous?.offsetTop === next?.offsetTop ? previous : next);
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    update();
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, [input, typed]);
  return typed ? frame : undefined;
}

export function QuizFlow({ speechEnabled, onSpeechChange, owner, controller, ready, unavailable, launch, catalogs, history, preferences, onPreferenceChange, onReadCustom, onSaveCustom, previousBest,
  streak, cloudPending, autoPronounce, exampleFor, speak, chime, onBack, onProfile }: Props) {
  const { state, dispatch, recoveryError, otherTab } = controller;
  const active = state.phase !== "idle" && state.config.subject === "kana" ? state : null;
  const [companionPause, setCompanionPause] = useState(0);
  const companion = useQuizCompanion(owner, active, !ready || otherTab || unavailable || !!recoveryError || active?.pending?.status === "failed", !speechEnabled, companionPause);
  const [mode, setMode] = useState<KanaMode>(launch === "timed" ? "timed" : launch === "survival" ? "survival" : "practice");
  const [kindOverride, setKindOverride] = useState<KanaKind | null>(launch === "typed" ? "type" : null);
  const [setup, setSetup] = useState(launch === "customize" || launch === "timed");
  const [exit, setExit] = useState(false);
  const [whyFor, setWhyFor] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [custom, setCustom] = useState<string[] | null>(null);
  const consumedLaunch = useRef(false);
  const resumeOnClose = useRef(false);
  const promptRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const customizeRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef(false);
  const inputCounter = useRef(0);
  const inputSource = useRef<string | undefined>(undefined);
  const latestAnswer = active ? answerFor(active) : undefined;
  const heard = useRef(latestAnswer?.questionId);
  const kind = mode === "survival" && (kindOverride ?? preferences.quizKanaKind) === "type" ? "read" : kindOverride ?? preferences.quizKanaKind;
  const frame = useKeyboardViewport(inputRef, active?.current.responseType === "typed" && (active.phase === "asking" || active.phase === "feedback" || active.phase === "committing"));
  const preflight = useMemo(() => state.phase === "idle" ? getEligibility(catalogs, configFor(preferences, mode, kind, custom ?? undefined, "kana-setup", 0)) : null,
    [catalogs, state.phase, preferences, mode, kind, custom]);

  function start(acceptFallback: boolean, newMode = mode, newKind = kind, selected = custom) {
    if (!ready || otherTab) return false;
    const clock = quizClock();
    const sessionId = quizDeviceId();
    const config = configFor(preferences, newMode, newKind, selected ?? undefined, sessionId, clock.epochMs);
    const result = buildQuestions(catalogs, { ...config, acceptFourChoiceFallback: acceptFallback }, history, seededRandom(parseInt(sessionId.slice(0, 8), 16)));
    if (!result.questions.length) { setSetup(true); return false; }
    const started = dispatch({ type: "START", questions: result.questions, clock, config: { sessionId, subject: "kana", origin: newMode,
      challenge: newMode === "timed" ? preferences.quizChallengeTier : "steady", autoNext: preferences.quizAutoNext,
      previousSurvivalBest: Number.isSafeInteger(previousBest) && previousBest >= 0 ? previousBest : 0, rewardVersion: 1 } });
    if (started) { setSetup(false); setMessage(undefined); }
    return started;
  }

  useEffect(() => {
    if (consumedLaunch.current || !ready) return;
    consumedLaunch.current = true;
    if (state.phase !== "idle" || otherTab || setup || launch === "resume") return;
    if (!preflight || preflight.eligibleTargets < preferences.quizLength || preflight.requiresFourChoiceAcknowledgement) setSetup(true);
    else start(false);
  }, [ready, state.phase, otherTab, setup, launch, preflight, preferences.quizLength]);

  const questionId = active?.current.id;
  useLayoutEffect(() => {
    if (!questionId) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const shouldFocusTypedInput = active?.current.responseType === "typed" && active.phase === "asking";
    if (focusNext.current || shouldFocusTypedInput) {
      focusNext.current = false;
      (inputRef.current ?? promptRef.current)?.focus({ preventScroll: true });
    }
  }, [questionId, active?.phase === "paused", active?.current.responseType, active?.phase]);

  useEffect(() => {
    if (!latestAnswer || heard.current === latestAnswer.questionId) return;
    heard.current = latestAnswer.questionId;
    if (document.visibilityState === "hidden" || !active || otherTab) return;
    chime(latestAnswer.outcome === "correct");
    if (autoPronounce && active.current.speechText) speak(active.current.speechText);
  }, [latestAnswer, active, otherTab, chime, speak, autoPronounce]);

  const scope = () => active ? { sessionId: active.config.sessionId, questionId: active.current.id, clock: quizClock() } : null;
  const nextInput = () => `${inputSource.current ??= quizDeviceId()}:${++inputCounter.current}`;
  const respond = (response: Response) => {
    const event = scope();
    if (event && active?.phase === "asking") dispatch({ ...event, type: "ANSWER", response, inputId: nextInput() });
  };
  const next = () => {
    const event = scope();
    if (event && active?.phase === "feedback") focusNext.current = dispatch({ ...event, type: "NEXT", inputId: nextInput() });
  };
  const simpleEvent = (type: "PAUSE" | "RESUME" | "FINISH") => {
    const event = scope();
    const accepted = !!event && dispatch({ ...event, type });
    if (accepted && type === "PAUSE") setCompanionPause(value => value + 1);
    return accepted;
  };
  const cancelAuto = (reason: "expand" | "listen" | "pointer" | "focus" | "manual") => {
    const event = scope();
    if (event && active?.phase === "feedback") dispatch({ ...event, type: "CANCEL_AUTO_NEXT", reason });
  };
  const openExit = () => {
    if (otherTab || !active) { onBack(); return; }
    resumeOnClose.current = active.phase === "asking" || active.phase === "feedback";
    if (active.phase !== "paused" && controller.suspend()) setCompanionPause(value => value + 1);
    setMessage(undefined);
    setExit(true);
  };
  const closeExit = () => {
    setExit(false);
    if (resumeOnClose.current) simpleEvent("RESUME");
    resumeOnClose.current = false;
  };

  useEffect(() => {
    if (!active || !ready || otherTab || setup || exit || active.phase === "results") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (event.key === "Escape") { event.preventDefault(); openExit(); return; }
      if (target?.closest("[contenteditable], select, textarea, input") && (target !== inputRef.current || active.phase !== "feedback")) return;
      if (event.key === "Enter" && active.phase === "feedback" && !target?.closest("button:not([aria-disabled=true]), a")) {
        event.preventDefault(); next();
      }
      if (active.phase === "asking" && active.current.responseType === "choice" && /^[1-6]$/u.test(event.key)) {
        const choice = active.current.choices[Number(event.key) - 1];
        if (choice) { event.preventDefault(); respond({ type: "choice", choiceId: choice.id }); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, ready, otherTab, setup, exit]);

  const status = active?.pending ? (
    <div className="quiz-stack quiz-save-status">
      <p className="quiz-notice" role="status">{active.pending.status === "failed" ? recoveryError ?? "Progress is waiting to save." : "Saving your progress…"}</p>
      {active.pending.status === "failed" && <div className="quiz-stack">
        <button type="button" className="quiz-btn quiz-btn--secondary" onClick={() => dispatch({ type: "RETRY_COMMIT",
          sessionId: active.config.sessionId, seq: active.pending!.record.seq, attempt: active.pending!.attempt, clock: quizClock() })}>Retry save</button>
        {active.phase === "committing" && <button type="button" className="quiz-btn quiz-btn--quiet" onClick={() => dispatch({ type: "CONTINUE_VOLATILE",
          sessionId: active.config.sessionId, seq: active.pending!.record.seq, attempt: active.pending!.attempt, clock: quizClock() })}>Continue without recovery</button>}
        <p className="quiz-help">Closing this page can lose answers that have not been saved.</p>
      </div>}
    </div>
  ) : recoveryError ? <p className="quiz-notice" role="status">{recoveryError}</p> : undefined;

  const leaveSheet = exit && active && active.phase !== "results" ? <LeavePracticeSheet
    answeredCount={active.records.filter(record => record.type === "answer").length} hasPending={!!active.pending} offerEmptyFinish
    offerDiscardSaved={active.phase === "paused" && !resumeOnClose.current}
    onKeepPracticing={closeExit} saveError={message}
    onSaveAndLeave={() => { if (controller.saveForLater()) onBack(); else setMessage("This practice position could not be saved. You can stay here and retry."); }}
    onFinish={() => { if (simpleEvent("FINISH")) setExit(false); }}
    onDiscard={() => { if (controller.discard()) onBack(); else setMessage("This practice could not be discarded. Try again."); }} /> : undefined;
  const shell: StudioPresentation = { speechEnabled, onSpeechChange, companion, scrollRef, liveViewport: frame ?? {}, keyboardOpen: !!frame, overlay: leaveSheet, modalOpen: !!leaveSheet };
  const header = <StudioHeader backLabel="Back to Practice" onBack={onBack}
    trailing={<button className="quiz-icon-btn" type="button" aria-label="Open profile" onClick={() => {
      if (!active || otherTab || controller.saveForLater()) onProfile();
      else setMessage("This practice position could not be saved.");
    }}><UserRound aria-hidden="true" /></button>}>
    <p className="quiz-header__progress">Kana practice</p>
  </StudioHeader>;

  if (!ready || otherTab || (active?.phase === "paused" && !leaveSheet)) {
    return <StudioShell {...shell} label="Kana practice" header={header} width="player"
      companion={companion}>
      <section className="quiz-card quiz-stack">
        <h1 className="quiz-title">{otherTab ? "Practice is open in another tab" : unavailable ? "Device progress is unavailable" : active?.phase === "paused" ? "Practice paused" : "Getting your practice ready"}</h1>
        {active?.phase === "paused" && !otherTab && ready ? <>
          <p className="quiz-body">Kana · {active.config.origin === "survival" ? `Question ${active.index + 1}` : `Question ${active.index + 1} of ${active.questions.length}`}</p>
          <p className="quiz-body">Continue when you’re ready.</p>
          {status}
          <button type="button" className="quiz-btn quiz-btn--primary" onClick={() => { focusNext.current = true; simpleEvent("RESUME"); }}>Resume</button>
          <button type="button" className="quiz-btn quiz-btn--secondary" onClick={openExit}>Leave, finish or discard</button>
        </> : <p className="quiz-body">{otherTab ? "Return to that tab to continue." : recoveryError ?? (unavailable ? "Open Profile to check your account or restore a backup." : "Your device progress is loading.")}</p>}
        {message && <p className="quiz-notice" role="status">{message}</p>}
      </section>
    </StudioShell>;
  }

  if (active?.phase === "results") {
    const another = () => {
      if (!controller.discard()) { setMessage("Save the remaining progress before starting another round."); return; }
      const again = active.config.origin === "repair" ? "practice" : active.config.origin;
      setMode(again);
      start(false, again);
    };
    const back = () => { if (active.pending ? controller.saveForLater() : controller.discard()) onBack(); else setMessage("This practice still needs attention before leaving."); };
    return <QuizResults shell={{ ...shell, modalOpen: false, overlay: undefined }} view={resultsModel(active, streak, cloudPending)}
      status={<>{status}{message && <p className="quiz-notice" role="status">{message}</p>}</>}
      actions={{ onPrimary: another, onBackToPractice: back }} />;
  }

  if (active) {
    const question = questionModel(active);
    const result = latestAnswer && feedbackModel(active, latestAnswer, question, exampleFor);
    const answered: QuizAnswerState = result && latestAnswer ? { status: "answered", outcome: result.outcome, selectedId: latestAnswer.responseId,
      correctId: active.current.correctChoiceId, typedValue: latestAnswer.typedValue } : { status: "unanswered" };
    const duration = active.config.origin === "survival" ? SESSION_LIMITS.survivalFeedbackMs : SESSION_LIMITS.autoNextMs;
    const autoNext: AutoNextView | undefined = active.runtime.autoNextDeadlineMonoMs !== null ? { phase: "counting", label: `Next in ${duration / 1000}s`, durationMs: duration }
      : result?.outcome === "correct" && active.config.autoNext && active.autoNextCanceled ? { phase: "paused", label: "Auto-next paused" } : undefined;
    return <QuizPlayer shell={shell} question={question} answer={answered} typedValue={latestAnswer?.typedValue ?? active.draft}
      announcement={result?.announcement ?? ""} status={status} blocked={active.phase === "committing" || active.phase === "paused"}
      promptRef={promptRef} inputRef={inputRef} autoNextEnabled={active.config.autoNext}
      feedback={result ? <QuizFeedback view={result} whyOpen={whyFor === question.id} onToggleWhy={() => { cancelAuto("expand"); setWhyFor(previous => previous === question.id ? undefined : question.id); }}
        onListen={() => { cancelAuto("listen"); if (active.current.speechText) speak(active.current.speechText); }}
        onInteract={() => cancelAuto("pointer")} autoNext={autoNext} onPauseAutoNext={() => cancelAuto("manual")} /> : undefined}
      actions={{ onChoose: choiceId => respond({ type: "choice", choiceId }), onTypedChange: value => {
        const event = scope(); if (event) dispatch({ ...event, type: "DRAFT", value });
      }, onSubmitTyped: event => { event?.stopPropagation(); if (active.draft.trim()) respond({ type: "typed", value: active.draft }); },
      onNext: next, onExit: openExit, onPause: () => { simpleEvent("PAUSE"); }, onFeedbackFocus: () => cancelAuto("focus"), onAutoNextChange: enabled => {
        const event = scope();
        if (event && dispatch({ ...event, type: "SET_AUTO_NEXT", enabled })) onPreferenceChange({ quizAutoNext: enabled });
      } }} />;
  }

  const selectedStages = quizKanaStages(preferences.quizKanaStagesMask);
  const customItems = setup && custom ? (["hiragana", "katakana"] as const).flatMap(script => {
    if (preferences.quizKanaScript !== "both" && preferences.quizKanaScript !== script) return [];
    return catalogs[script].filter(item => selectedStages.includes(item.category)).map(item => ({ glyph: item.kana,
      id: encodeId(script === "hiragana" ? "h" : "k", [script, item.kana]) }));
  }) : [];
  const updateCustom = (ids: string[]) => {
    setCustom(ids);
    onSaveCustom(ids);
  };
  const openSetup = (nextMode: KanaMode) => { setMode(nextMode); setSetup(true); setMessage(undefined); };
  const setupSheet = setup && preflight ? <QuizSetupSheet returnFocusRef={customizeRef}
    view={{ subject: "kana", subjects: [{ id: "kana", label: "Kana" }], poolId: "all", pools: [], kindId: kind,
      kinds: KINDS.filter(option => mode !== "survival" || option.id !== "type").map(option => ({ ...option })),
      length: preferences.quizLength, lengths: [...LENGTHS], autoNext: preferences.quizAutoNext, matchCount: preflight.eligibleTargets,
      emptyAlternative: custom ? { id: "all", label: "Use all matching kana", reason: "Your custom selection has no matching targets." } : undefined,
      startLabel: preflight.requiresFourChoiceAcknowledgement ? "Start with four choices" : undefined,
      notice: preflight.requiresFourChoiceAcknowledgement ? preflight.notices[0] : undefined,
      kana: { script: preferences.quizKanaScript, scripts: SCRIPTS, choices: preferences.quizChoiceCount,
        stages: STAGES.map(stage => ({ ...stage, on: selectedStages.includes(stage.id) })) } }}
    actions={{ onSubjectChange: () => {}, onPoolChange: () => {}, onClose: () => setSetup(false), onStart: () => start(preflight.requiresFourChoiceAcknowledgement),
      onUseAlternative: () => setCustom(null),
      onKindChange: id => { const chosen = KINDS.find(option => option.id === id); if (chosen) { setKindOverride(null); onPreferenceChange({ quizKanaKind: chosen.id }); } },
      onLengthChange: n => { const length = LENGTHS.find(candidate => candidate === n); if (length) onPreferenceChange({ quizLength: length }); },
      onScriptChange: quizKanaScript => onPreferenceChange({ quizKanaScript }), onToggleStage: id => {
        const bit = STAGES.findIndex(stage => stage.id === id);
        const mask = preferences.quizKanaStagesMask ^ (1 << bit);
        if (bit >= 0 && mask) onPreferenceChange({ quizKanaStagesMask: mask });
      }, onChoicesChange: quizChoiceCount => onPreferenceChange({ quizChoiceCount }), onAutoNextChange: quizAutoNext => onPreferenceChange({ quizAutoNext }) }}
    modeOptions={<div className="quiz-stack"><StudioSegmented<KanaMode> label="Practice mode" value={mode} onChange={setMode} columns={3}
      options={[{ id: "practice", label: "Untimed" }, { id: "timed", label: "Timed" }, { id: "survival", label: "Survival" }]} />
      {mode === "timed" && <StudioSegmented label="Time per question" value={preferences.quizChallengeTier} options={TIERS} columns={3}
        onChange={quizChallengeTier => onPreferenceChange({ quizChallengeTier })} />}
      {mode === "survival" && <p className="quiz-help">45 s to start. Correct answers add 5 s. Wrong answers cost 8 s.</p>}
    </div>}
    customSelection={<div className="quiz-field">
      <button type="button" className="quiz-btn quiz-btn--secondary" aria-pressed={custom !== null} onClick={() => {
        setCustom(custom ? null : onReadCustom());
      }}>{custom ? "Use all matching kana" : "Choose specific kana"}</button>
      {custom && <>
        <p className="quiz-help">{customItems.filter(item => custom.includes(item.id)).length} selected in these groups</p>
        <button type="button" className="quiz-btn quiz-btn--quiet" onClick={() => updateCustom(customItems.map(item => item.id))}>Select all matching kana</button>
        <button type="button" className="quiz-btn quiz-btn--quiet" onClick={() => updateCustom([])}>Clear selection</button>
        <div className="quiz-chips" role="group" aria-label="Select kana targets">{customItems.map(item => <button type="button" key={item.id}
          className="quiz-chip-toggle quiz-jp" lang="ja" aria-pressed={custom.includes(item.id)} onClick={() => updateCustom(custom.includes(item.id) ? custom.filter(id => id !== item.id) : [...custom, item.id])}>{item.glyph}</button>)}</div>
      </>}
      {message && <p className="quiz-help" role="status">{message}</p>}
    </div>} /> : undefined;

  return <StudioShell {...shell} label="Kana practice" header={header} width="setup" overlay={setupSheet} modalOpen={!!setupSheet}>
    <section className="quiz-card quiz-stack">
      <h1 className="quiz-title">Kana practice</h1>
      <p className="quiz-body">Read, recognize, or type kana at your own pace.</p>
      {status}
      <button type="button" className="quiz-btn quiz-btn--primary" onClick={() => {
        setMode("practice");
        const report = getEligibility(catalogs, configFor(preferences, "practice", preferences.quizKanaKind, undefined, "kana-setup", 0));
        if (report.eligibleTargets < preferences.quizLength || report.requiresFourChoiceAcknowledgement) openSetup("practice");
        else start(false, "practice", preferences.quizKanaKind, null);
      }}>Start practice</button>
      <button ref={customizeRef} type="button" className="quiz-btn quiz-btn--secondary" onClick={() => openSetup("practice")}>Customize</button>
      <button type="button" className="quiz-btn quiz-btn--quiet" onClick={() => openSetup("timed")}>Timed practice</button>
      <button type="button" className="quiz-btn quiz-btn--quiet" onClick={() => openSetup("survival")}>Survival</button>
    </section>
  </StudioShell>;
}
