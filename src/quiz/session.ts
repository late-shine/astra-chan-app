import { assertQuestion, grade } from './grade';
import { decodeId, encodeId, isSafeKey, occurrenceId } from './ids';
import { rewardFor } from './reward';
import { SESSION_LIMITS, freeze, type ActiveSession, type AnswerRecord, type ClockStamp, type CompletionRecord,
  type FinishReason, type Question, type QuizProgressRecord, type SessionConfig, type SessionEvent, type SessionState } from './types';

export const createSession = (): SessionState => freeze({ phase: 'idle' });
export function validLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
export function validClock(clock: ClockStamp): boolean {
  return Number.isFinite(clock.monoMs) && clock.monoMs >= 0 && clock.monoMs <= Number.MAX_SAFE_INTEGER
    && Number.isFinite(clock.epochMs) && clock.epochMs >= 0 && clock.epochMs <= 8.64e15 && validLocalDate(clock.localDate);
}
export function timedLimitMs(config: SessionConfig): number | null {
  if (config.origin !== 'timed') return null;
  if (config.challenge === 'lightning') return 3000;
  return config.subject === 'kana' ? config.challenge === 'quick' ? 6000 : 12_000
    : config.challenge === 'quick' ? 10_000 : 20_000;
}
export function validateSessionConfig(config: SessionConfig): void {
  occurrenceId(config.sessionId, SESSION_LIMITS.records);
  if (config.sessionId.length > 128 || !isSafeKey(config.sessionId) || !['kana', 'vocab', 'kanji'].includes(config.subject) || !['practice', 'timed', 'survival', 'repair'].includes(config.origin)
    || !['steady', 'quick', 'lightning'].includes(config.challenge) || typeof config.autoNext !== 'boolean'
    || config.rewardVersion !== 1 || !Number.isSafeInteger(config.previousSurvivalBest) || config.previousSurvivalBest < 0
    || config.origin !== 'timed' && config.challenge !== 'steady'
    || config.challenge === 'lightning' && config.subject !== 'kana'
    || config.origin === 'survival' && config.subject !== 'kana') throw new RangeError('Invalid solo session configuration');
  if (config.origin === 'repair') {
    if (!config.repairOf || config.repairOf.length > 128 || !isSafeKey(config.repairOf) || config.repairOf === config.sessionId) throw new RangeError('Repair must name a different original session');
    occurrenceId(config.repairOf, 0);
  } else if (config.repairOf !== undefined) throw new RangeError('Only repair sessions have an original session');
}
export function questionTargetKey(question: Question): string {
  const { prefix, tuple } = decodeId(question.itemId);
  return prefix === 'v' || prefix === 'w' ? encodeId(prefix, [tuple[0]]) : question.itemId;
}
function deeplyFrozen(value: unknown): boolean {
  return value === null || typeof value !== 'object' || Object.isFrozen(value) && Object.values(value).every(deeplyFrozen);
}
function start(event: Extract<SessionEvent, { type: 'START' }>): ActiveSession {
  validateSessionConfig(event.config);
  if (!validClock(event.clock) || !event.questions.length || event.questions.length > SESSION_LIMITS.questions || !deeplyFrozen(event.questions)) throw new RangeError('Start requires nonempty deeply frozen questions and a valid clock');
  event.questions.forEach((question, index) => {
    assertQuestion(question);
    rewardFor({ type: 'answer', origin: event.config.origin, subject: question.subject, kind: question.kind, outcome: 'wrong', challenge: event.config.challenge });
    const source = decodeId(question.itemId);
    if (question.subject === 'kana' ? !['h', 'k'].includes(source.prefix) || source.tuple.length !== 2
      || source.tuple[0] !== (source.prefix === 'h' ? 'hiragana' : 'katakana') || !source.tuple[1]
      : question.subject === 'vocab' ? source.prefix !== 'v' || source.tuple.length !== 3
      : question.kind === 'kanji-word' ? source.prefix !== 'w' || source.tuple.length !== 3 : source.prefix !== 'j' || source.tuple.length !== 1) throw new RangeError('Invalid source identity');
    if (question.id !== occurrenceId(event.config.sessionId, index) || question.subject !== event.config.subject
      || !isSafeKey(question.itemId) || question.skillKey !== `${question.itemId}__${question.kind}` || !isSafeKey(question.skillKey)
      || event.config.origin === 'survival' && question.responseType !== 'choice') throw new RangeError('Question does not belong to this session');
  });
  if (event.config.origin !== 'survival' && new Set(event.questions.map(questionTargetKey)).size !== event.questions.length) throw new RangeError('Ordinary and repair rounds cannot repeat targets');
  if (event.config.origin === 'repair' && event.questions.length > 5) throw new RangeError('Repair is at most five unique targets');
  const config = { sessionId: event.config.sessionId, subject: event.config.subject, origin: event.config.origin,
    challenge: event.config.challenge, autoNext: event.config.autoNext, previousSurvivalBest: event.config.previousSurvivalBest,
    rewardVersion: 1 as const, ...(event.config.repairOf ? { repairOf: event.config.repairOf } : {}) };
  const remainingMs = timedLimitMs(config);
  const survivalRemainingMs = config.origin === 'survival' ? SESSION_LIMITS.survivalStartMs : null;
  return freeze({ phase: 'asking', config, questions: [...event.questions], current: event.questions[0], index: 0,
    records: [], pending: null, acknowledgedSeq: 0, commitTargetSeq: 0, draft: '', remainingMs, survivalRemainingMs,
    questionElapsedMs: 0, autoNextRemainingMs: null, autoNextToken: null, autoNextCanceled: false,
    pauseRequested: false, resumeState: null, finishReason: null, volatile: false, revision: 1, lastInputId: null,
    runtime: { lastMonoMs: event.clock.monoMs, anchorMonoMs: event.clock.monoMs,
      deadlineMonoMs: remainingMs !== null || survivalRemainingMs !== null ? event.clock.monoMs + (remainingMs ?? survivalRemainingMs ?? 0) : null,
      autoNextDeadlineMonoMs: null } });
}
function seal(previous: ActiveSession, next: ActiveSession): ActiveSession {
  return freeze({ ...next, revision: previous.revision + 1 });
}
function capture(state: ActiveSession, clock: ClockStamp): ActiveSession {
  if (state.phase === 'asking') {
    const elapsed = Math.max(0, clock.monoMs - (state.runtime.anchorMonoMs ?? clock.monoMs));
    const budget = state.remainingMs ?? state.survivalRemainingMs;
    const expired = state.runtime.deadlineMonoMs !== null && clock.monoMs >= state.runtime.deadlineMonoMs;
    const consumed = budget === null ? elapsed : expired ? budget : Math.min(elapsed, budget);
    return { ...state, remainingMs: state.remainingMs === null ? null : Math.max(0, state.remainingMs - consumed),
      survivalRemainingMs: state.survivalRemainingMs === null ? null : Math.max(0, state.survivalRemainingMs - consumed),
      questionElapsedMs: state.questionElapsedMs + consumed,
      runtime: { ...state.runtime, lastMonoMs: clock.monoMs, anchorMonoMs: clock.monoMs } };
  }
  return { ...state, autoNextRemainingMs: state.runtime.autoNextDeadlineMonoMs === null ? state.autoNextRemainingMs : Math.max(0, state.runtime.autoNextDeadlineMonoMs - clock.monoMs),
    runtime: { ...state.runtime, lastMonoMs: clock.monoMs } };
}
/** Pure checkpoint only; an overdue checkpoint is restored as expired, never refilled. */
export function checkpointSession(state: ActiveSession, clock: ClockStamp): ActiveSession {
  if (!validClock(clock) || clock.monoMs < state.runtime.lastMonoMs) throw new RangeError('Invalid or backward checkpoint clock');
  return seal(state, capture(state, clock));
}
function stopped(state: ActiveSession): ActiveSession['runtime'] {
  return { lastMonoMs: state.runtime.lastMonoMs, anchorMonoMs: null, deadlineMonoMs: null, autoNextDeadlineMonoMs: null };
}
function enqueue(state: ActiveSession, record: QuizProgressRecord): ActiveSession {
  const records = [...state.records, record];
  const pending = state.pending ? state.pending.status === 'failed'
    ? { record: state.pending.record, attempt: state.pending.attempt + 1, status: 'pending' as const } : state.pending
    : { record, attempt: 0, status: 'pending' as const };
  return { ...state, phase: 'committing', records, pending, commitTargetSeq: record.seq,
    resumeState: null, autoNextRemainingMs: null, autoNextToken: null, runtime: stopped(state) };
}
function answer(state: ActiveSession, clock: ClockStamp, outcome: AnswerRecord['outcome'], response?: Extract<SessionEvent, { type: 'ANSWER' }>['response']): ActiveSession {
  const question = state.current;
  const xp = rewardFor({ type: 'answer', origin: state.config.origin, subject: question.subject, kind: question.kind,
    outcome, challenge: state.config.challenge }).total;
  const target = { subject: question.subject, itemId: question.itemId, kind: question.kind,
    ...(question.subject === 'kana' ? { kanaGlyph: decodeId(question.itemId).tuple[1] } : {}) };
  const record: AnswerRecord = { type: 'answer', sessionId: state.config.sessionId, seq: state.records.length + 1,
    questionId: question.id, skillKey: question.skillKey, target, outcome,
    ...(response?.type === 'choice' ? { responseId: response.choiceId } : {}),
    ...(response?.type === 'typed' ? { typedValue: response.value } : {}),
    elapsedMs: state.questionElapsedMs, answeredAt: clock.epochMs, localDate: clock.localDate,
    origin: state.config.origin, rewardVersion: 1, xp };
  let budget = state.survivalRemainingMs;
  if (budget !== null) budget = outcome === 'correct' ? Math.min(SESSION_LIMITS.survivalCapMs, budget + 5000)
    : outcome === 'wrong' ? Math.max(0, budget - 8000) : budget;
  const reason = budget === 0 ? 'survival-zero' : record.seq >= SESSION_LIMITS.records ? 'safety-limit' : state.finishReason;
  return enqueue({ ...state, survivalRemainingMs: budget, finishReason: reason }, record);
}
function fullyAnswered(state: ActiveSession): boolean {
  return state.config.origin !== 'survival' && state.records.filter(record => record.type === 'answer').length === state.questions.length;
}
function finish(state: ActiveSession, clock: ClockStamp, reason: FinishReason): ActiveSession {
  const count = new Set(state.records.filter((record): record is AnswerRecord => record.type === 'answer' && record.origin !== 'repair' && record.outcome !== 'unattempted')
    .map(record => questionTargetKey(state.questions[Number(decodeId(record.questionId).tuple[1]) % state.questions.length]))).size;
  const completion = rewardFor({ type: 'completion', origin: state.config.origin, complete: reason === 'completed', uniqueFirstPassCount: count }).total;
  if (completion && !state.records.some(record => record.type === 'completion')) {
    const record: CompletionRecord = { type: 'completion', sessionId: state.config.sessionId, seq: state.records.length + 1,
      origin: state.config.origin as 'practice' | 'timed', uniqueFirstPassCount: count,
      answeredAt: clock.epochMs, localDate: clock.localDate, rewardVersion: 1, xp: 20 };
    return enqueue({ ...state, finishReason: reason, pauseRequested: false, autoNextCanceled: true }, record);
  }
  return { ...state, phase: 'results', finishReason: reason, commitTargetSeq: 0, pauseRequested: false,
    resumeState: null, autoNextCanceled: true, autoNextRemainingMs: null, autoNextToken: null, runtime: stopped(state) };
}
function feedback(state: ActiveSession, clock: ClockStamp): ActiveSession {
  if (state.finishReason) return finish(state, clock, state.finishReason);
  const last = state.records.filter(record => record.type === 'answer' && record.questionId === state.current.id).at(-1);
  const auto = last?.type === 'answer' && last.outcome === 'correct' && state.config.autoNext && !state.autoNextCanceled && !state.pauseRequested;
  const duration = state.config.origin === 'survival' ? SESSION_LIMITS.survivalFeedbackMs : SESSION_LIMITS.autoNextMs;
  return { ...state, phase: state.pauseRequested ? 'paused' : 'feedback', resumeState: state.pauseRequested ? 'feedback' : null,
    pauseRequested: false, commitTargetSeq: 0, autoNextRemainingMs: auto ? duration : null,
    autoNextToken: auto && last ? last.seq : null,
    runtime: { ...stopped(state), autoNextDeadlineMonoMs: auto ? clock.monoMs + duration : null } };
}
function next(state: ActiveSession, clock: ClockStamp): ActiveSession {
  if (state.config.origin !== 'survival' && state.index + 1 >= state.questions.length) return finish(state, clock, 'completed');
  const index = state.index + 1;
  const template = state.questions[index % state.questions.length];
  const current = freeze({ ...template, id: occurrenceId(state.config.sessionId, index) });
  const remainingMs = timedLimitMs(state.config);
  return { ...state, phase: 'asking', index, current, remainingMs, draft: '', questionElapsedMs: 0,
    autoNextCanceled: false, autoNextRemainingMs: null, autoNextToken: null, resumeState: null,
    runtime: { lastMonoMs: clock.monoMs, anchorMonoMs: clock.monoMs,
      deadlineMonoMs: remainingMs !== null || state.survivalRemainingMs !== null ? clock.monoMs + (remainingMs ?? state.survivalRemainingMs ?? 0) : null,
      autoNextDeadlineMonoMs: null } };
}

/** All race/identity/deadline guards live here; effects only settle the pending record. */
export function reduceSession(state: SessionState, event: SessionEvent): SessionState {
  if (event.type === 'START') return state.phase === 'idle' ? start(event) : state;
  if (state.phase === 'idle' || event.sessionId !== state.config.sessionId || !validClock(event.clock) || event.clock.monoMs < state.runtime.lastMonoMs) return state;
  if ('seq' in event) {
    const pending = state.pending;
    if (!pending || pending.record.seq !== event.seq || pending.attempt !== event.attempt) return state;
    const at = capture(state, event.clock);
    if (event.type === 'COMMIT_OK') {
      const nextRecord = state.records[event.seq];
      const updated = { ...at, acknowledgedSeq: event.seq,
        pending: nextRecord ? { record: nextRecord, attempt: 0, status: 'pending' as const } : null };
      return seal(state, state.phase === 'committing' && event.seq >= state.commitTargetSeq ? feedback(updated, event.clock) : updated);
    }
    if (event.type === 'COMMIT_FAILED') return seal(state, { ...at, autoNextCanceled: true,
      runtime: { ...at.runtime, autoNextDeadlineMonoMs: null }, pending: { ...pending, status: 'failed', failure: event.failure } });
    if (event.type === 'RETRY_COMMIT') return pending.status === 'failed' ? seal(state, { ...at,
      pending: { record: pending.record, attempt: pending.attempt + 1, status: 'pending' } }) : state;
    if (pending.status !== 'failed' || state.phase !== 'committing') return state;
    // Keep the oldest pending record and complete ordered log; acknowledge nothing durable.
    return seal(state, feedback({ ...at, volatile: true, autoNextCanceled: true }, event.clock));
  }
  if (event.questionId !== state.current.id || state.phase === 'results') return state;
  if (event.type === 'CANCEL_AUTO_NEXT') {
    if (state.autoNextCanceled) return state;
    const at = capture(state, event.clock);
    return seal(state, { ...at, autoNextCanceled: true, runtime: { ...at.runtime, autoNextDeadlineMonoMs: null } });
  }
  if (state.phase === 'committing') {
    if (event.type === 'PAUSE') return seal(state, { ...capture(state, event.clock), pauseRequested: true, autoNextCanceled: true });
    if (event.type === 'FINISH') return seal(state, { ...capture(state, event.clock), finishReason: state.finishReason ?? (fullyAnswered(state) ? 'completed' : 'partial'), autoNextCanceled: true });
    return state;
  }
  if (event.type === 'RESUME') {
    if (state.phase !== 'paused') return state;
    const resume = state.resumeState ?? 'asking';
    const resumed: ActiveSession = { ...state, phase: resume, resumeState: null, autoNextCanceled: true,
      runtime: { lastMonoMs: event.clock.monoMs, anchorMonoMs: resume === 'asking' ? event.clock.monoMs : null,
        deadlineMonoMs: resume === 'asking' && (state.remainingMs !== null || state.survivalRemainingMs !== null) ? event.clock.monoMs + (state.remainingMs ?? state.survivalRemainingMs ?? 0) : null,
        autoNextDeadlineMonoMs: null } };
    return seal(state, resume === 'asking' && (resumed.remainingMs === 0 || resumed.survivalRemainingMs === 0) ? answer(resumed, event.clock, 'timeout') : resumed);
  }
  if (state.phase === 'paused') {
    if (event.type !== 'FINISH') return state;
    const at = capture(state, event.clock);
    return seal(state, state.resumeState === 'asking' && (state.remainingMs === 0 || state.survivalRemainingMs === 0)
      ? answer({ ...at, finishReason: 'partial' }, event.clock, 'timeout')
      : finish(at, event.clock, fullyAnswered(state) ? 'completed' : 'partial'));
  }
  if ((event.type === 'ANSWER' || event.type === 'NEXT') && (event.repeat || !event.inputId.trim() || event.inputId.length > 128 || event.inputId === state.lastInputId)) return state;
  if (event.type === 'NEXT' && state.phase !== 'feedback' || event.type === 'ANSWER' && state.phase !== 'asking'
    || event.type === 'DRAFT' && (state.phase !== 'asking' || state.current.responseType !== 'typed' || event.value.length > SESSION_LIMITS.draft)) return state;
  if (event.type === 'AUTO_NEXT' && (state.phase !== 'feedback' || state.autoNextCanceled || event.token !== state.autoNextToken
    || state.runtime.autoNextDeadlineMonoMs === null || event.clock.monoMs < state.runtime.autoNextDeadlineMonoMs)) return state;
  const at = capture(state, event.clock);
  if (state.phase === 'asking' && (at.remainingMs === 0 || at.survivalRemainingMs === 0)) {
    return seal(state, answer({ ...at, ...(event.type === 'PAUSE' ? { pauseRequested: true, autoNextCanceled: true } : {}),
      ...(event.type === 'FINISH' ? { finishReason: 'partial' as const } : {}) }, event.clock, 'timeout'));
  }
  if (event.type === 'ANSWER') {
    if (event.response.type === 'typed' && event.response.value.length > SESSION_LIMITS.draft) return state;
    const result = grade(state.current, event.response);
    return result.valid ? seal(state, answer({ ...at, lastInputId: event.inputId }, event.clock, result.outcome, event.response)) : state;
  }
  if (event.type === 'NEXT' || event.type === 'AUTO_NEXT') return seal(state, next({ ...at, ...('inputId' in event ? { lastInputId: event.inputId } : {}) }, event.clock));
  if (event.type === 'FINISH') return seal(state, finish(at, event.clock, fullyAnswered(at) ? 'completed' : 'partial'));
  if (event.type === 'PAUSE') return seal(state, { ...at, phase: 'paused', resumeState: state.phase === 'asking' ? 'asking' : 'feedback',
    autoNextCanceled: true, runtime: stopped(at) });
  if (event.type === 'DRAFT') return seal(state, { ...at, draft: event.value });
  return event.type === 'TICK' && state.phase === 'asking' ? seal(state, at) : state;
}
