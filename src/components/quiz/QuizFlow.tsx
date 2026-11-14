import { soloQuestionModel, soloFeedbackModel, soloSpeechText } from "../../quiz/soloViews";
import { remainingQuestions, repairQuestions, reviewChoices, reviewBatch, reviewAddedCopy } from "../../quiz/recommend";
import {useHomeRecommendation} from "../../quiz/useHomeRecommendation";
import { PracticeHome } from "./PracticeHome";
import { VOCAB_CATEGORY_META } from "../../vocab/vocabCategories";
import { vocabularyId } from "../../quiz/content/vocabulary";
import { createContextCandidates } from "../../quiz/content/context";
import { soloConfig, soloSubjectLabel, type SoloSubject } from "../../quiz/soloSetup";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { UserRound } from "lucide-react";
import { useQuizCompanion } from "../../quiz/useQuizCompanion";
import { encodeId } from "../../quiz/ids";
import { buildQuestions, getEligibility } from "../../quiz/pool";
import { QUIZ_LENGTH_OPTIONS, quizBuildLength, quizKanaStages, type QuizPreferences } from "../../quiz/preferences";
import { seededRandom } from "../../quiz/random";
import { summarize } from "../../quiz/summary";
import { SESSION_LIMITS, type ActiveSession, type AnswerRecord, type BuildConfig, type Catalogs, type ChallengeTier,
  type QuizHistory, type Response, type DeckTarget } from "../../quiz/types";
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
  home?: boolean;
  onEnterSession?: (subject: SoloSubject) => void;
  onResume?: () => void;
  onStudyRoom?: () => void;
  onFriend?: () => void;
  reviewDeck?: {title:string;detail:string;badge:string};
  reviewDue?: number;
  dailyNewCap?: number;
  hasReviewCard?: (key:string,type:DeckTarget['type']) => boolean;
  onAddReviewCard?: (key:string,type:DeckTarget['type']) => boolean;
  onOpenReviewDeck?: () => void;
  subject?: SoloSubject;
  learnedWords?: readonly string[];
  studiedKanji?: readonly string[];
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
  onSaveCustom: (ids: readonly string[]) => readonly string[] | void;
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

const VOCAB_KINDS = [{id:"meaning",label:"Meaning"},{id:"reading",label:"Reading"},{id:"reverse",label:"Reverse"},{id:"mixed",label:"Mixed"}];
const KANJI_KINDS = [{id:"meaning",label:"Meaning"},{id:"on",label:"On’yomi"},{id:"kun",label:"Kun’yomi"},{id:"mixed",label:"Mixed",hint:"Meaning · On · Kun"},{id:"word",label:"In words · Curated set"}];
const NO_LEARNED: readonly string[] = [];
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
const LENGTHS = QUIZ_LENGTH_OPTIONS;
const modeName = (mode: ActiveSession["config"]["origin"]) => mode === "timed" ? "Timed practice" : mode === "survival" ? "Survival" : "Untimed practice";


function answerFor(state: ActiveSession): AnswerRecord | undefined {
  const last = state.records.at(-1);
  return last?.type === "answer" && last.questionId === state.current.id ? last :
    state.records.find((r): r is AnswerRecord => r.type === "answer" && r.questionId === state.current.id);
}


function resultsModel(state: ActiveSession, streak: number, cloudPending: boolean, original: ActiveSession | null = null, repairs: readonly ActiveSession[] = []): QuizResultsView {
  const summary = original ? summarize(original,repairs) : summarize(state);
  const { firstPass, survival, xp } = summary;
  const missed = remainingQuestions(original ?? state, original ? repairs : []).map(question => {
    const record = [...state.records,...(original?.records ?? [])].find((row): row is AnswerRecord => row.type === "answer" && row.skillKey === question.skillKey);
    return { id: question.skillKey, prompt: question.face, promptJa: question.kind !== "vocab-reverse" && question.kind !== "kana-pick", promptSize: question.subject === "vocab" || question.kind === "kanji-word" || question.kind === "kana-pick" ? "word" as const : "glyph" as const,
      correctAnswer: question.reveal.answer,
      yourAnswer: record?.outcome === "timeout" ? "Time ran out" : record?.typedValue ?? question.choices?.find(row => row.id === record?.responseId)?.label ?? "Not answered in this repair" };
  });
  const standaloneRepair = state.config.origin === "repair" && !original;
  return { headline: standaloneRepair ? "Repair round" : survival ? `${survival.score} correct in Survival` : firstPass.attempted ? `${firstPass.correct} of ${firstPass.attempted} correct first try` : "No answers recorded",
    percentLabel: standaloneRepair ? "Your original first-try accuracy is unchanged." : firstPass.accuracy === null ? "Ready for another round when you are." : `${Math.round(firstPass.accuracy * 100)}% first-try accuracy`,
    repairLine: state.config.origin === "repair" ? `${original ? summary.repair.correctedMisses : summary.repair.correct} corrected in ${original ? "repair rounds" : "the repair round"}.` : undefined,
    contextLabel: `${soloSubjectLabel(state.config.subject)} · ${modeName(state.config.origin)}`, detail: survival ? `Personal best · ${survival.best}` : summary.partial ? `Partial round · ${summary.unattempted} unanswered` : undefined,
    xpLines: [{ label: "Answer XP", value: `+${xp.base}` }, { label: "Challenge bonus", value: `+${xp.challenge}` }, { label: "Completion bonus", value: `+${xp.completion}` }],
    xpTotal: `+${xp.total} XP`, streakLine: streak && firstPass.attempted ? `${streak}-day study streak` : undefined,
    saveLabel: state.pending ? `${xp.durablyAcknowledged} XP saved on this device. Other progress is pending.` : summary.recordSaveStatus === "acknowledged"
      ? cloudPending ? "Saved on this device. Cloud sync is pending." : "Saved on this device." : undefined,
    missed, primaryLabel: missed.length ? "Practice your misses" : "Try another round",
    encouragement: firstPass.accuracy === 1 ? "Ready for a different question type?" : undefined };
}

export function useKeyboardViewport(input: RefObject<HTMLInputElement | null>, typed: boolean) {
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

export function QuizFlow({ home = false, onEnterSession, onResume, onStudyRoom, onFriend, reviewDeck, reviewDue = 0, dailyNewCap = 0, hasReviewCard, onAddReviewCard, onOpenReviewDeck,
  subject: requestedSubject = "kana", learnedWords = NO_LEARNED, studiedKanji = NO_LEARNED, speechEnabled, onSpeechChange, owner, controller, ready, unavailable, launch, catalogs, history, preferences, onPreferenceChange, onReadCustom, onSaveCustom, previousBest,
  streak, cloudPending, autoPronounce, exampleFor, speak, chime, onBack, onProfile }: Props) {
  const { state, dispatch, recoveryError, otherTab } = controller;
  const active = state.phase !== "idle" ? state : null;
  const subject: SoloSubject = home ? requestedSubject : active?.config.subject ?? requestedSubject;
  const words = subject === "vocab";
  const kanji = subject === "kanji";
  const kana = subject === "kana";
  const subjectLabel = soloSubjectLabel(subject);
  const [companionPause, setCompanionPause] = useState(0);
  const companion = useQuizCompanion(owner, home ? null : active, !ready || otherTab || unavailable || !!recoveryError || active?.pending?.status === "failed", !speechEnabled, companionPause);
  const [mode, setMode] = useState<KanaMode>(launch === "timed" ? "timed" : launch === "survival" ? "survival" : "practice");
  const [kindOverride, setKindOverride] = useState<string | null>(launch === "typed" ? "type" : null);
  const [setup, setSetup] = useState(!home && (launch === "customize" || launch === "timed" || requestedSubject !== "kana"));
  const [exit, setExit] = useState(false);
  const [whyFor, setWhyFor] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [customSearch, setCustomSearch] = useState("");
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
  const repairBase = useRef<ActiveSession | null>(null);
  const repairHistory = useRef<ActiveSession[]>([]);
  const addedCards = useRef(new Set<string>());
  const growthOwner = useRef(owner);
  if(growthOwner.current!==owner){growthOwner.current=owner;repairBase.current=null;repairHistory.current=[];addedCards.current.clear();}
  const kind = words ? preferences.quizVocabKind : kanji ? preferences.quizKanjiKind : mode === "survival" && (kindOverride ?? preferences.quizKanaKind) === "type" ? "read" : kindOverride ?? preferences.quizKanaKind;
  const configFor = (prefs: QuizPreferences, m: KanaMode, k: string, ids: readonly string[] | undefined, id: string, now: number) => soloConfig(prefs, subject, m, k, ids, learnedWords, id, now, studiedKanji);
  const frame = useKeyboardViewport(inputRef, active?.current.responseType === "typed" && (active.phase === "asking" || active.phase === "feedback" || active.phase === "committing"));
  const preflight = useMemo(() => (state.phase === "idle" || home) && (!home || setup) ? getEligibility(catalogs, configFor(preferences, mode, kind, custom ?? undefined, "kana-setup", 0)) : null,
    [catalogs, state.phase, home, setup, preferences, mode, kind, custom, subject, learnedWords, studiedKanji]);
  const curatedItems = useMemo(() => kanji && (!home || setup) ? createContextCandidates(catalogs).candidates.map(item => ({id:item.itemId,glyph:`${item.face} · ${item.reveal.reading} · ${item.reveal.meaning}`})) : [], [catalogs, kanji, home, setup]);
  // Pool counts depend on kind/filters, not question quantity or auto-next settings.
  const kanjiPoolOptions = useMemo(() => {
    if (!kanji || state.phase !== "idle" || home && !setup) return [];
    const count = (pool: "all" | "studied", ids?: readonly string[]) => getEligibility(catalogs,
      configFor({...preferences,quizLength:10,quizKanjiPool:pool},"practice",kind,ids,"kanji-pool",0)).eligibleTargets;
    const all = count("all");
    return [{id:"recommended",label:"Recommended",count:all}, {id:"all",label:"All kanji",count:all},
      {id:"studied",label:"Studied kanji",count:count("studied")},
      {id:"custom",label:"Custom selection",count:custom ? count("all",custom) : 0}];
  }, [catalogs, kanji, state.phase, kind, studiedKanji, custom, home, setup]);

  const homeKind = words ? preferences.quizVocabKind : kanji ? preferences.quizKanjiKind : preferences.quizKanaKind;
  const homeRequest=useMemo(()=>home?{catalogs,config:configFor(preferences,"practice",homeKind,custom??undefined,"home-recommendation",Date.now()),history}:null,
    [home,catalogs,preferences,homeKind,custom,subject,learnedWords,studiedKanji,history,owner]);
  const homeRecommendation=useHomeRecommendation(homeRequest);

  function start(acceptFallback: boolean, newMode = mode, newKind = kind, selected = custom) {
    if (!ready || otherTab || active && active.phase !== "results") return false;
    const clock = quizClock();
    const sessionId = quizDeviceId();
    const config = configFor(preferences, newMode, newKind, selected ?? undefined, sessionId, clock.epochMs);
    const eligibility = getEligibility(catalogs, config);
    if (preferences.quizLength === "all" && eligibility.eligibleTargets > SESSION_LIMITS.questions) { setMessage("Choose a shorter length or narrow the pool; All exceeds the 256-question recovery limit."); setSetup(true); return false; }
    const result = buildQuestions(catalogs, { ...config, acceptFourChoiceFallback: acceptFallback }, history, seededRandom(parseInt(sessionId.slice(0, 8), 16)));
    if (!result.questions.length) { setSetup(true); return false; }
    const started = dispatch({ type: "START", questions: result.questions, clock, config: { sessionId, subject, origin: newMode,
      challenge: newMode === "timed" ? !kana && preferences.quizChallengeTier === "lightning" ? "steady" : preferences.quizChallengeTier : "steady", autoNext: preferences.quizAutoNext,
      previousSurvivalBest: Number.isSafeInteger(previousBest) && previousBest >= 0 ? previousBest : 0, rewardVersion: 1 } });
    if (started) { repairBase.current=null;repairHistory.current=[];addedCards.current.clear();setSetup(false); setMessage(undefined); if(home) onEnterSession?.(subject); }
    return started;
  }

  useEffect(() => {
    if (home) return;
    if (consumedLaunch.current || !ready) return;
    consumedLaunch.current = true;
    if (state.phase !== "idle" || otherTab || setup || launch === "resume") return;
    if (!preflight || (preferences.quizLength !== "all" && preflight.eligibleTargets < preferences.quizLength) || preflight.requiresFourChoiceAcknowledgement) setSetup(true);
    else start(false);
  }, [home, ready, state.phase, otherTab, setup, launch, preflight, preferences.quizLength]);

  const questionId = active?.current.id;
  useLayoutEffect(() => {
    if (home || !questionId) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const shouldFocusTypedInput = active?.current.responseType === "typed" && active.phase === "asking";
    if (focusNext.current || shouldFocusTypedInput) {
      focusNext.current = false;
      (inputRef.current ?? promptRef.current)?.focus({ preventScroll: true });
    }
  }, [home, questionId, active?.phase === "paused", active?.current.responseType, active?.phase]);

  useEffect(() => {
    if (home) return;
    if (!latestAnswer || heard.current === latestAnswer.questionId) return;
    heard.current = latestAnswer.questionId;
    if (document.visibilityState === "hidden" || !active || otherTab) return;
    chime(latestAnswer.outcome === "correct");
    const speech = soloSpeechText(active.current);
    if (autoPronounce && speech) speak(speech);
  }, [home, latestAnswer, active, otherTab, chime, speak, autoPronounce]);

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
    if (home || !active || !ready || otherTab || setup || exit || active.phase === "results") return;
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
  }, [home, active, ready, otherTab, setup, exit]);

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
  const shell: StudioPresentation = { studyUnit: words || kanji && (active ? active.current.kind === "kanji-word" : kind === "word") ? "word" : "character", speechEnabled, onSpeechChange, companion, scrollRef, liveViewport: frame ?? {}, keyboardOpen: !!frame, overlay: leaveSheet, modalOpen: !!leaveSheet };
  const header = <StudioHeader backLabel={home ? "Back to Study Room" : "Back to Practice"} onBack={home ? onStudyRoom ?? onBack : onBack}
    trailing={<button className="quiz-icon-btn" type="button" aria-label="Open profile" onClick={() => {
      if (!active || otherTab || controller.saveForLater()) onProfile();
      else setMessage("This practice position could not be saved.");
    }}><UserRound aria-hidden="true" /></button>}>
    <p className="quiz-header__progress">{home ? "Practice" : `${subjectLabel} practice`}</p>
  </StudioHeader>;

  const selectedStages = quizKanaStages(preferences.quizKanaStagesMask);
  const customItems = setup && custom ? kanji
    ? kind === "word" ? curatedItems : catalogs.kanji.map(item => ({id:encodeId("j",[item.kanji]),glyph:`${item.kanji} · ${item.meaning}`}))
    : words
    ? [...new Map(catalogs.vocabulary.filter(item => !preferences.quizVocabPool.startsWith("theme:") || item.category === preferences.quizVocabPool.slice(6))
      .map(item => [vocabularyId(item), {id:vocabularyId(item),glyph:`${item.word} · ${item.hiragana} · ${item.english}`}])).values()]
    : (["hiragana", "katakana"] as const).flatMap(script => {
      if (preferences.quizKanaScript !== "both" && preferences.quizKanaScript !== script) return [];
      return catalogs[script].filter(item => selectedStages.includes(item.category)).map(item => ({glyph:item.kana,id:encodeId(script === "hiragana" ? "h":"k",[script,item.kana])}));
    }) : [];
  const matchingCustom = customItems.filter(item => item.glyph.toLocaleLowerCase().includes(customSearch.trim().toLocaleLowerCase()));
  const oversizedAll = preferences.quizLength === "all" && (preflight?.eligibleTargets ?? 0) > SESSION_LIMITS.questions;
  const poolOptions = words ? [
    {id:"recommended",label:"Recommended",count:catalogs.vocabulary.length}, {id:"all",label:"All words",count:catalogs.vocabulary.length},
    {id:"learned",label:"Learned words",count:learnedWords.length},
    ...VOCAB_CATEGORY_META.map(category=>({id:`theme:${category.id}`,label:category.label,count:catalogs.vocabulary.filter(item=>item.category===category.id).length})),
    {id:"custom",label:"Custom selection",count:custom?.length ?? 0}] : kanjiPoolOptions;
  const targetName = words || kanji && kind === "word" ? "words" : kanji ? "kanji" : "characters";
  const updateCustom = (ids: string[]) => {
    setCustom(ids);
    const saved = onSaveCustom(ids);
    if (saved) setCustom([...saved]);
  };
  const openSetup = (nextMode: KanaMode) => { setMode(nextMode); setSetup(true); setMessage(undefined); };
  const setupSheet = setup && preflight ? <QuizSetupSheet returnFocusRef={customizeRef}
    view={{ subject: words ? "words" : subject, subjects: home ? [{id:"kana",label:"Kana"},{id:"words",label:"Words"},{id:"kanji",label:"Kanji"}] : [{ id: words ? "words" : subject, label: subjectLabel }], poolId: custom ? "custom" : kanji ? preferences.quizKanjiPool : preferences.quizVocabPool, pools: poolOptions, kindId: kind,
      kinds: (words ? VOCAB_KINDS : kanji ? KANJI_KINDS : KINDS).filter(option => mode !== "survival" || option.id !== "type").map(option => ({ ...option, ...(kanji && option.id === "word" ? {hint:preflight.curatedSetLabel} : {}) })),
      lengthHelp: preferences.quizLength === "all"
        ? mode === "survival" ? `All ${preflight.eligibleTargets} eligible ${targetName} in the bank. Survival repeats after one pass.`
          : `All ${preflight.eligibleTargets} eligible ${targetName}, once each. Mixed uses one question type per target.`
        : !kana ? `${preflight.eligibleTargets} eligible ${targetName} for this pool and question type.${kanji && kind === "word" ? " Answer with the complete word reading." : ""}` : undefined,
      length: preferences.quizLength, lengths: [...LENGTHS], autoNext: preferences.quizAutoNext, matchCount: preflight.eligibleTargets,
      startBlocked: oversizedAll,
      emptyAlternative: kanji ? {id:"all",label:"Use all kanji",reason:custom ? `Choose ${kind === "word" ? "curated words" : "kanji"} in Advanced below. Unsupported readings are skipped; changing question type can change eligibility.` : preferences.quizKanjiPool === "studied" ? "No eligible targets for your studied kanji. Use Study on a kanji card, choose another question type, or use All kanji. Quiz answers do not mark kanji studied." : "No supported targets for this question type. In words uses only reviewed curated entries; try Meaning for isolated kanji."}
        : words ? {id:"all",label:"Use all words",reason: custom ? "Choose words in Advanced below. Reading mode needs an eligible kanji-containing written word." : preferences.quizVocabPool === "learned" ? "No eligible words are marked learned. Mark words manually in Learn > Words, or use All words." : "No words match this pool and question type."} : custom ? { id: "all", label: "Use all matching kana", reason: "Your custom selection has no matching targets." } : undefined,
      startLabel: preflight.requiresFourChoiceAcknowledgement ? "Start with four choices" : undefined,
      notice: oversizedAll ? `All ${preflight.eligibleTargets} targets exceeds the 256-question recovery limit. Narrow the pool or choose 10, 20 or 30.` : preflight.requiresFourChoiceAcknowledgement ? preflight.notices[0] : undefined,
      kana: !kana ? undefined : { script: preferences.quizKanaScript, scripts: SCRIPTS, choices: preferences.quizChoiceCount,
        stages: STAGES.map(stage => ({ ...stage, on: selectedStages.includes(stage.id) })) } }}
    actions={{ onSubjectChange: id => {setCustom(null);setCustomSearch("");if(mode === "survival" && id !== "kana")setMode("practice");onPreferenceChange({quizSubject:id === "words" ? "vocab" : id});}, onPoolChange: id => { if (id === "custom") setCustom(onReadCustom()); else { setCustom(null); const pool = poolOptions.find(option=>option.id===id); if (pool) onPreferenceChange(kanji ? {quizKanjiPool:pool.id as QuizPreferences["quizKanjiPool"]} : {quizVocabPool: pool.id as QuizPreferences["quizVocabPool"]}); } }, onClose: () => setSetup(false), onStart: () => start(preflight.requiresFourChoiceAcknowledgement),
      onUseAlternative: () => {setCustom(null); if (kanji) onPreferenceChange({quizKanjiPool:"all"}); else if (words) onPreferenceChange({quizVocabPool:"all"});},
      onKindChange: id => { if (kanji) { const option = KANJI_KINDS.find(row=>row.id===id); if(option) onPreferenceChange({quizKanjiKind:option.id as QuizPreferences["quizKanjiKind"]}); return; } if (words) { const option = VOCAB_KINDS.find(row=>row.id===id); if(option) onPreferenceChange({quizVocabKind:option.id as QuizPreferences["quizVocabKind"]}); return; } const chosen = KINDS.find(option => option.id === id); if (chosen) { setKindOverride(null); onPreferenceChange({ quizKanaKind: chosen.id }); } },
      onLengthChange: n => { const length = LENGTHS.find(candidate => candidate === n); if (length) onPreferenceChange({ quizLength: length }); },
      onScriptChange: quizKanaScript => onPreferenceChange({ quizKanaScript }), onToggleStage: id => {
        const bit = STAGES.findIndex(stage => stage.id === id);
        const mask = preferences.quizKanaStagesMask ^ (1 << bit);
        if (bit >= 0 && mask) onPreferenceChange({ quizKanaStagesMask: mask });
      }, onChoicesChange: quizChoiceCount => onPreferenceChange({ quizChoiceCount }), onAutoNextChange: quizAutoNext => onPreferenceChange({ quizAutoNext }) }}
    modeOptions={mode === "timed" ? <StudioSegmented label="Time per question" value={!kana && preferences.quizChallengeTier === "lightning" ? "steady" : preferences.quizChallengeTier}
      options={kana ? TIERS : [{id:"steady" as const,label:"Steady · 20 s"},{id:"quick" as const,label:"Quick · 10 s"}]} columns={kana ? 3 : 2}
      onChange={quizChallengeTier => onPreferenceChange({quizChallengeTier})} />
      : mode === "survival" ? <p className="quiz-help">45 s to start. Correct answers add 5 s. Wrong answers cost 8 s.</p> : undefined}
    customSelection={<div className="quiz-field">
      <button type="button" className="quiz-btn quiz-btn--secondary" aria-pressed={custom !== null} onClick={() => {
        setCustom(custom ? null : onReadCustom());
      }}>{custom ? "Use matching pool" : words || kanji && kind === "word" ? "Choose specific words" : kanji ? "Choose specific kanji" : "Choose specific kana"}</button>
      {custom && <>
        <p className="quiz-help">{customItems.filter(item => custom.includes(item.id)).length} selected {kana ? "in these groups" : "in this pool"}{kanji ? ". Isolated kanji and curated word selections are kept separately when you change question type." : ""}</p>
        <button type="button" className="quiz-btn quiz-btn--quiet" onClick={() => updateCustom([...(kanji ? custom.filter(id => !customItems.some(item=>item.id===id)) : []),...matchingCustom.map(item => item.id)])}>Select all matching {kana ? "kana" : targetName}</button>
        <button type="button" className="quiz-btn quiz-btn--quiet" onClick={() => updateCustom(kanji ? custom.filter(id => !customItems.some(item=>item.id===id)) : [])}>Clear {kanji ? "shown selection" : "selection"}</button>
        {!kana && <label className="quiz-field">Find {kanji ? "targets" : "words"}<input className="quiz-input" value={customSearch} onChange={event=>setCustomSearch(event.target.value)} /><span className="quiz-help">Showing up to 80 matches. Selection is limited by the shared 256-item draft.</span></label>}
        <div className="quiz-chips" role="group" aria-label="Select practice targets">{matchingCustom.slice(0,!kana ? 80 : matchingCustom.length).map(item => <button type="button" key={item.id}
          className="quiz-chip-toggle quiz-jp" lang="ja" aria-pressed={custom.includes(item.id)} onClick={() => updateCustom(custom.includes(item.id) ? custom.filter(id => id !== item.id) : [...custom, item.id])}>{item.glyph}</button>)}</div>
      </>}
      {message && <p className="quiz-help" role="status">{message}</p>}
    </div>} /> : undefined;



  if (!ready || otherTab || (!home && active?.phase === "paused" && !leaveSheet)) {
    return <StudioShell {...shell} label={`${subjectLabel} practice`} header={header} width="player"
      companion={companion}>
      <section className="quiz-card quiz-stack">
        <h1 className="quiz-title">{otherTab ? "Practice is open in another tab" : unavailable ? "Device progress is unavailable" : active?.phase === "paused" ? "Practice paused" : "Getting your practice ready"}</h1>
        {active?.phase === "paused" && !otherTab && ready ? <>
          <p className="quiz-body">{subjectLabel} · {active.config.origin === "survival" ? `Question ${active.index + 1}` : `Question ${active.index + 1} of ${active.questions.length}`}</p>
          {requestedSubject !== subject && <p className="quiz-notice">Your saved {subjectLabel} session comes first. Resume it, or leave and finish/discard before starting {soloSubjectLabel(requestedSubject)}.</p>}
          <p className="quiz-body">Continue when you’re ready.</p>
          {status}
          <button type="button" className="quiz-btn quiz-btn--primary" onClick={() => { focusNext.current = true; simpleEvent("RESUME"); }}>Resume</button>
          <button type="button" className="quiz-btn quiz-btn--secondary" onClick={openExit}>Leave, finish or discard</button>
        </> : <p className="quiz-body">{otherTab ? "Return to that tab to continue." : recoveryError ?? (unavailable ? "Open Profile to check your account or restore a backup." : "Your device progress is loading.")}</p>}
        {message && <p className="quiz-notice" role="status">{message}</p>}
      </section>
    </StudioShell>;
  }

  if (home) {
    const next = homeRecommendation.value ?? {needsSetup:true,summary:`${homeRecommendation.loading ? "Preparing" : "Customize"} ${subjectLabel} practice`,note:homeRecommendation.error??"Preparing your selected set…"};
    const homeView = {
      resume: active ? {subjectLabel:soloSubjectLabel(active.config.subject),positionLabel:active.phase === "results" ? "Saved results" : active.config.origin === "survival" ? `Survival question ${active.index+1}` : `Question ${active.index+1} of ${active.questions.length}`,actionLabel:active.phase === "results" ? "View results" : "Resume"} : undefined,
      recommendation:{eyebrow:"Your next practice",summary:next.summary,note:active ? "Resume or discard your saved session before starting another." : next.note,cta:homeRecommendation.loading ? "Preparing practice…" : next.needsSetup ? "Adjust practice" : "Start practice",blocked:!!active||homeRecommendation.loading},
      subjects:[{id:"kana" as const,label:"Kana"},{id:"words" as const,label:"Words"},{id:"kanji" as const,label:"Kanji"}],subject:words ? "words" as const : kanji ? "kanji" as const : "kana" as const,
      challenges:[{id:"timed" as const,title:"Timed practice",description:kana ? "12, 6 or 3 seconds per question" : "20 or 10 seconds per question"},
        ...(kana ? [{id:"survival" as const,title:"Survival",description:"Kana choices · 45-second starting budget"}] : []),
        ...(onFriend ? [{id:"friend" as const,title:"Play with a friend",description:"Open the existing online duel lobby"}] : [])],
      reviewDeck:reviewDeck ?? {title:"Review Deck",detail:"Practice cards you have saved.",badge:"Open"}
    };
    return <StudioShell {...shell} label="Practice" width="home" header={header} overlay={setupSheet} modalOpen={!!setupSheet}>
      {status}{message && <p className="quiz-notice" role="status">{message}</p>}
      <PracticeHome view={homeView} customizeRef={customizeRef} actions={{
        onStart:()=>{if(active||homeRecommendation.loading)return;if(next.needsSetup)openSetup("practice");else start(false,"practice",homeKind);},
        onCustomize:()=>{if(active)setMessage("Resume or discard your saved session before customizing a new one.");else openSetup("practice");},
        onSelectSubject:id=>{setCustom(null);setCustomSearch("");setMode("practice");onPreferenceChange({quizSubject:id === "words" ? "vocab" : id});},
        onChallenge:id=>{if(active){setMessage("Resume or discard your saved session first.");return;}if(id === "friend")onFriend?.();else openSetup(id === "survival" ? "survival" : "timed");},
        onResume:()=>onResume?.(),onDiscardResume:()=>{if(!controller.discard())setMessage("Save pending progress before discarding this position.");else setMessage(undefined);},
        onOpenReviewDeck:()=>{if(!active || controller.saveForLater())onOpenReviewDeck?.();else setMessage("Save the remaining progress before opening Review Deck.");}
      }} />
    </StudioShell>;
  }

  if (active?.phase === "results") {
    const original = active.config.origin === "repair" && repairBase.current?.config.sessionId === active.config.repairOf ? repairBase.current : null;
    const repairs = [...repairHistory.current.filter(s=>s.config.sessionId!==active.config.sessionId),active];
    const remaining = remainingQuestions(original ?? active,original ? repairs : []);
    const deckQuestions = original ? remainingQuestions(original) : active.config.origin === "repair" ? active.questions : remainingQuestions(active);
    const cards = reviewChoices(deckQuestions,history,(key,type)=>hasReviewCard?.(key,type) ?? false).map(card=>({...card,present:card.present||addedCards.current.has(card.id)}));
    const batch = reviewBatch(cards);
    const addCards = (ids: readonly string[]) => {
      if (!ready || otherTab || active.pending || !onAddReviewCard) return;
      let added=0;
      for(const card of cards.filter(c=>ids.includes(c.id)&&!c.present).slice(0,5)) {
        if(addedCards.current.has(card.id)||hasReviewCard?.(card.target.itemKey,card.target.type))continue;
        if(onAddReviewCard(card.target.itemKey,card.target.type)){addedCards.current.add(card.id);added++;}
      }
      setMessage(added ? reviewAddedCopy(added,dailyNewCap) : "These cards are already in your Review Deck, or could not be added.");
    };
    const repair = () => {
      if(!ready || otherTab || active.pending)return;
      const sessionId=quizDeviceId(),clock=quizClock();
      const questions=repairQuestions(remaining,sessionId);
      if(!questions.length)return;
      if(!controller.discard()){setMessage("Save the remaining progress before starting repair.");return;}
      if(active.config.origin!=="repair"){repairBase.current=active;repairHistory.current=[];}
      else if(original) repairHistory.current=repairs;
      const repairOf=original?.config.sessionId ?? active.config.repairOf ?? active.config.sessionId;
      if(!dispatch({type:"START",questions,clock,config:{sessionId,subject:active.config.subject,origin:"repair",challenge:"steady",autoNext:preferences.quizAutoNext,previousSurvivalBest:0,rewardVersion:1,repairOf}}))setMessage("This repair could not be started. Your committed progress is kept.");
      else {setMessage(undefined);setWhyFor(undefined);}
    };
    const another = () => {
      if (!controller.discard()) { setMessage("Save the remaining progress before starting another round."); return; }
      const again = active.config.origin === "repair" ? "practice" : active.config.origin;
      setMode(again);
      start(false, again);
    };
    const back = () => { if (active.pending ? controller.saveForLater() : controller.discard()) onBack(); else setMessage("This practice still needs attention before leaving."); };
    return <QuizResults shell={{ ...shell, modalOpen: false, overlay: undefined }} view={{...resultsModel(active, streak, cloudPending,original,repairs),
      reviewCards:onAddReviewCard ? cards.map(c=>({id:c.id,label:c.label,present:c.present})) : undefined,
      reviewDeckLabel:batch.length&&onAddReviewCard ? `Add ${batch.length} to Review Deck` : undefined,
      reviewDeckNote:!remaining.length&&reviewDue>0 ? "Your Review Deck has practice available today." : undefined}}
      status={<>{status}{message && <p className="quiz-notice" role="status">{message}</p>}</>}
      actions={{ onPrimary: remaining.length ? repair : another, onAnotherRound:remaining.length ? another : undefined,
        onAddToReviewDeck:()=>addCards(batch.map(c=>c.id)),onAddCard:id=>addCards([id]),
        onOpenReviewDeck:onOpenReviewDeck ? ()=>{if(active.pending ? controller.saveForLater() : controller.discard())onOpenReviewDeck();else setMessage("Save the remaining progress before opening Review Deck.");} : undefined,
        onBackToPractice: back }} />;
  }

  if (active) {
    const question = soloQuestionModel(active);
    const result = latestAnswer && soloFeedbackModel(active, latestAnswer, question, exampleFor);
    const answered: QuizAnswerState = result && latestAnswer ? { status: "answered", outcome: result.outcome, selectedId: latestAnswer.responseId,
      correctId: active.current.correctChoiceId, typedValue: latestAnswer.typedValue } : { status: "unanswered" };
    const duration = active.config.origin === "survival" ? SESSION_LIMITS.survivalFeedbackMs : SESSION_LIMITS.autoNextMs;
    const autoNext: AutoNextView | undefined = active.runtime.autoNextDeadlineMonoMs !== null ? { phase: "counting", label: `Next in ${duration / 1000}s`, durationMs: duration }
      : result?.outcome === "correct" && active.config.autoNext && active.autoNextCanceled ? { phase: "paused", label: "Auto-next paused" } : undefined;
    return <QuizPlayer shell={shell} question={question} answer={answered} typedValue={latestAnswer?.typedValue ?? active.draft}
      announcement={result?.announcement ?? ""} status={status} blocked={active.phase === "committing" || active.phase === "paused"}
      promptRef={promptRef} inputRef={inputRef} autoNextEnabled={active.config.autoNext}
      feedback={result ? <QuizFeedback view={result} whyOpen={whyFor === question.id} onToggleWhy={() => { cancelAuto("expand"); setWhyFor(previous => previous === question.id ? undefined : question.id); }}
        onListen={() => { cancelAuto("listen"); const speech = soloSpeechText(active.current); if (speech) speak(speech); }}
        onInteract={() => cancelAuto("pointer")} autoNext={autoNext} onPauseAutoNext={() => cancelAuto("manual")} /> : undefined}
      actions={{ onChoose: choiceId => respond({ type: "choice", choiceId }), onTypedChange: value => {
        const event = scope(); if (event) dispatch({ ...event, type: "DRAFT", value });
      }, onSubmitTyped: event => { event?.stopPropagation(); if (active.draft.trim()) respond({ type: "typed", value: active.draft }); },
      onNext: next, onExit: openExit, onPause: () => { simpleEvent("PAUSE"); }, onFeedbackFocus: () => cancelAuto("focus"), onAutoNextChange: enabled => {
        const event = scope();
        if (event && dispatch({ ...event, type: "SET_AUTO_NEXT", enabled })) onPreferenceChange({ quizAutoNext: enabled });
      } }} />;
  }

  return <StudioShell {...shell} label={`${subjectLabel} practice`} header={header} width="setup" overlay={setupSheet} modalOpen={!!setupSheet}>
    <section className="quiz-card quiz-stack">
      <h1 className="quiz-title">{subjectLabel} practice</h1>
      <p className="quiz-body">{words ? "Practice word meanings, readings and reverse recognition." : kanji ? "Practice meanings, taught on’yomi and kun’yomi, or complete readings from the curated word set. Quiz practice never marks a kanji studied." : "Read, recognize, or type kana at your own pace."}</p>
      {status}
      {message && <p className="quiz-notice" role="status">{message}</p>}
      <button type="button" className="quiz-btn quiz-btn--primary" onClick={() => {
        setMode("practice");
        const report = getEligibility(catalogs, configFor(preferences, "practice", kind, undefined, "solo-setup", 0));
        if ((preferences.quizLength !== "all" && report.eligibleTargets < preferences.quizLength) || report.requiresFourChoiceAcknowledgement) openSetup("practice");
        else start(false, "practice", kind, null);
      }}>Start practice</button>
      <button ref={customizeRef} type="button" className="quiz-btn quiz-btn--secondary" onClick={() => openSetup("practice")}>Customize</button>
      {kana && <button type="button" className="quiz-btn quiz-btn--quiet" onClick={() => openSetup("timed")}>Timed practice</button>}
      {kana && <button type="button" className="quiz-btn quiz-btn--quiet" onClick={() => openSetup("survival")}>Survival</button>}
    </section>
  </StudioShell>;
}
