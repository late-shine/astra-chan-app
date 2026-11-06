/** QZ3 pure machine/reward/snapshot checks. Run: npx tsx scripts/quiz-session-sim.ts */
import { HIRAGANA_DATA, KANJI_DATA, VOCABULARY_DATA } from '../src/data';
import { KANJI_READING_RECORDS_V2, KANJI_WORD_FAMILIES_V2 } from '../src/kanjiWordFamiliesV2';
import { createKanaCandidates } from '../src/quiz/content/kana';
import { createVocabularyCandidates } from '../src/quiz/content/vocabulary';
import { createKanjiCandidates } from '../src/quiz/content/kanji';
import { createContextCandidates } from '../src/quiz/content/context';
import { occurrenceId } from '../src/quiz/ids';
import { createQuestion } from '../src/quiz/pool';
import { seededRandom } from '../src/quiz/random';
import { rewardFor } from '../src/quiz/reward';
import { createSession, reduceSession, timedLimitMs } from '../src/quiz/session';
import { createSnapshot, normalizeOwnerKey, serializeSnapshot, snapshotKey, validateSnapshot } from '../src/quiz/snapshot';
import { summarize } from '../src/quiz/summary';
import { QUESTION_KINDS, SESSION_LIMITS, freeze, type ActiveSession, type AnswerRecord, type ClockStamp,
  type Question, type QuestionKind, type RewardContext, type SessionConfig, type SessionEvent,
  type SessionSnapshot, type SessionState } from '../src/quiz/types';

let passed = 0;
const failures: string[] = [];
function check(name: string, condition: boolean): void { if (condition) passed++; else failures.push(name); }
function throws(name: string, run: () => unknown): void { try { run(); check(name, false); } catch { check(name, true); } }
function section(title: string): void { console.log(`\n── ${title}`); }
const json = (value: unknown): string => JSON.stringify(value);
const BASE = 1_800_000_000_000; // Synthetic clocks; local calendar dates are supplied, never derived as UTC.
const clock = (monoMs: number, epochMs = BASE + monoMs, localDate = '2026-11-07'): ClockStamp => ({ monoMs, epochMs, localDate });
function active(state: SessionState): ActiveSession { if (state.phase === 'idle') throw new Error('Expected active session'); return state; }
function step(state: ActiveSession, event: SessionEvent): ActiveSession { return active(reduceSession(state, event)); }
function scope(state: ActiveSession, mono: number) { return { sessionId: state.config.sessionId, questionId: state.current.id, clock: clock(mono) }; }
function setup(sessionId: string, extra: Partial<SessionConfig> = {}): SessionConfig {
  return { sessionId, subject: 'kana', origin: 'practice', challenge: 'steady', autoNext: true, previousSurvivalBest: 0, rewardVersion: 1, ...extra };
}
const source = { hiragana: HIRAGANA_DATA, katakana: [], vocabulary: VOCABULARY_DATA.filter(item => ['猫', '犬', '車', '水', '山', '本', '木', '自動車', 'こんにちは'].includes(item.word)),
  kanji: KANJI_DATA, readingRecords: KANJI_READING_RECORDS_V2, wordFamilies: KANJI_WORD_FAMILIES_V2 };
const candidates = [createKanaCandidates(source), createVocabularyCandidates(source), createKanjiCandidates(source), createContextCandidates(source)].flatMap(result => result.candidates);
function bank(sessionId: string, count = 10, kind: QuestionKind = 'kana-read'): readonly Question[] {
  const rows = candidates.filter(candidate => candidate.kind === kind).slice(0, count);
  if (rows.length !== count) throw new Error(`Not enough real fixtures for ${kind}`);
  return freeze(rows.map((candidate, index) => createQuestion(candidate, { sessionId, index }, seededRandom(index + 8))));
}
function begin(sessionId: string, extra: Partial<SessionConfig> = {}, count = 10, kind: QuestionKind = 'kana-read'): ActiveSession {
  return active(reduceSession(createSession(), { type: 'START', config: setup(sessionId, extra), questions: bank(sessionId, count, kind), clock: clock(0) }));
}
function answer(state: ActiveSession, mono: number, correct = true, inputId = `answer-${state.index}`): ActiveSession {
  const q = state.current;
  const response = q.responseType === 'typed' ? { type: 'typed' as const, value: correct ? q.acceptedTyped[0] : 'incorrect' }
    : { type: 'choice' as const, choiceId: correct ? q.correctChoiceId : q.choices.find(choice => choice.id !== q.correctChoiceId)!.id };
  return step(state, { type: 'ANSWER', ...scope(state, mono), response, inputId });
}
function commit(state: ActiveSession, mono: number, type: 'COMMIT_OK' | 'COMMIT_FAILED' | 'RETRY_COMMIT' | 'CONTINUE_VOLATILE' = 'COMMIT_OK'): ActiveSession {
  if (!state.pending) throw new Error('Expected pending commit');
  const fields = { sessionId: state.config.sessionId, seq: state.pending.record.seq, attempt: state.pending.attempt, clock: clock(mono) };
  return step(state, type === 'COMMIT_FAILED' ? { type, ...fields, failure: 'stats' } : { type, ...fields });
}
function next(state: ActiveSession, mono: number, inputId = `next-${state.index}`): ActiveSession { return step(state, { type: 'NEXT', ...scope(state, mono), inputId }); }
function record(state: ActiveSession): AnswerRecord {
  const result = state.records.filter((entry): entry is AnswerRecord => entry.type === 'answer').at(-1);
  if (!result) throw new Error('Expected answer record'); return result;
}
function round(sessionId: string, count = 10, correct = true, extra: Partial<SessionConfig> = {}, kind: QuestionKind = 'kana-read'): ActiveSession {
  let state = begin(sessionId, extra, count, kind);
  let mono = 0;
  for (let index = 0; index < count; index++) {
    state = answer(state, mono += 100, correct);
    state = commit(state, ++mono);
    state = next(state, ++mono);
  }
  while (state.pending) state = commit(state, ++mono);
  return state;
}

section('Reward version 1: explicit expected rows');
const rewards: [string, RewardContext, number][] = [
  ['ordinary choice', { type: 'answer', subject: 'kana', kind: 'kana-read', origin: 'practice', outcome: 'correct' }, 15],
  ['ordinary typed', { type: 'answer', subject: 'kana', kind: 'kana-type', origin: 'practice', outcome: 'correct' }, 25],
  ['steady choice', { type: 'answer', subject: 'kana', kind: 'kana-pick', origin: 'timed', outcome: 'correct', challenge: 'steady' }, 15],
  ['quick choice', { type: 'answer', subject: 'kana', kind: 'kana-read', origin: 'timed', outcome: 'correct', challenge: 'quick' }, 20],
  ['quick typed', { type: 'answer', subject: 'kana', kind: 'kana-type', origin: 'timed', outcome: 'correct', challenge: 'quick' }, 30],
  ['lightning choice', { type: 'answer', subject: 'kana', kind: 'kana-pick', origin: 'timed', outcome: 'correct', challenge: 'lightning' }, 25],
  ['lightning typed', { type: 'answer', subject: 'kana', kind: 'kana-type', origin: 'timed', outcome: 'correct', challenge: 'lightning' }, 35],
  ['word quick', { type: 'answer', subject: 'vocab', kind: 'vocab-reading', origin: 'timed', outcome: 'correct', challenge: 'quick' }, 20],
  ['kanji steady', { type: 'answer', subject: 'kanji', kind: 'kanji-word', origin: 'timed', outcome: 'correct', challenge: 'steady' }, 15],
  ['survival', { type: 'answer', subject: 'kana', kind: 'kana-read', origin: 'survival', outcome: 'correct' }, 15],
  ['repair typed', { type: 'answer', subject: 'kana', kind: 'kana-type', origin: 'repair', outcome: 'correct', challenge: 'lightning' }, 5],
  ['duel easy', { type: 'answer', subject: 'kana', kind: 'kana-read', origin: 'duel', outcome: 'correct', difficulty: 'easy' }, 15],
  ['duel medium typed', { type: 'answer', subject: 'kana', kind: 'kana-type', origin: 'duel', outcome: 'correct', difficulty: 'medium' }, 25],
  ['duel hard', { type: 'answer', subject: 'vocab', kind: 'vocab-meaning', origin: 'duel', outcome: 'correct', difficulty: 'hard' }, 20],
  ['duel hard typed', { type: 'answer', subject: 'kana', kind: 'kana-type', origin: 'duel', outcome: 'correct', difficulty: 'hard' }, 30],
  ['duel superhard choice', { type: 'answer', subject: 'kana', kind: 'kana-read', origin: 'duel', outcome: 'correct', difficulty: 'superhard' }, 25],
  ['duel superhard typed', { type: 'answer', subject: 'kana', kind: 'kana-type', origin: 'duel', outcome: 'correct', difficulty: 'superhard' }, 35],
];
for (const [name, context, expected] of rewards) {
  const value = rewardFor(context);
  check(`${name}: ${expected} XP`, value.total === expected && value.base + value.challenge + value.completion === expected);
  if (context.type === 'answer') for (const outcome of ['wrong', 'timeout', 'unattempted'] as const) check(`${name}: ${outcome} zero`, rewardFor({ ...context, outcome }).total === 0);
}
for (const origin of ['practice', 'timed', 'repair', 'survival', 'duel'] as const) {
  check(`${origin}: completion eligibility`, rewardFor({ type: 'completion', origin, complete: true, uniqueFirstPassCount: 10 }).total === (['practice', 'timed'].includes(origin) ? 20 : 0));
  check(`${origin}: partial no completion`, rewardFor({ type: 'completion', origin, complete: false, uniqueFirstPassCount: 20 }).total === 0);
}
check('nine targets no completion', rewardFor({ type: 'completion', origin: 'practice', complete: true, uniqueFirstPassCount: 9 }).total === 0);
throws('word Lightning unsupported', () => rewardFor({ type: 'answer', subject: 'vocab', kind: 'vocab-reading', origin: 'timed', outcome: 'correct', challenge: 'lightning' }));
throws('word Superhard unsupported', () => rewardFor({ type: 'answer', subject: 'vocab', kind: 'vocab-reading', origin: 'duel', outcome: 'correct', difficulty: 'superhard' }));

section('Input races, deadline wins and immutable transitions');
let state = begin('races', { origin: 'timed' });
const asking = state;
const askingJson = json(asking);
state = answer(state, 1000);
check('answer enters committing', state.phase === 'committing' && state.records.length === 1 && state.pending?.record.seq === 1);
check('duplicate click cannot grade twice', answer(state, 1000) === state);
check('Next cannot escape committing', next(state, 1001) === state);
check('another Start cannot replace an active session', reduceSession(state, { type: 'START', config: setup('replacement'), questions: bank('replacement'), clock: clock(1001) }) === state);
check('wrong-session commit ack ignored', step(state, { type: 'COMMIT_OK', sessionId: 'old-session', seq: 1, attempt: 0, clock: clock(1001) }) === state);
check('commit sequence gap ignored', step(state, { type: 'COMMIT_OK', sessionId: state.config.sessionId, seq: 2, attempt: 0, clock: clock(1001) }) === state);
check('tick cannot escape committing', step(state, { type: 'TICK', ...scope(state, 50_000) }) === state);
check('original state unchanged', json(asking) === askingJson);
check('StrictMode repeated reducer call has identical record', json(answer(asking, 1000)) === json(answer(asking, 1000)));
check('state/record frozen', Object.isFrozen(state) && Object.isFrozen(state.pending) && Object.isFrozen(state.records[0]));
state = commit(state, 1001);
const feedback = state;
check('saved ack moves to feedback once', feedback.phase === 'feedback' && feedback.acknowledgedSeq === 1 && feedback.pending === null);
check('duplicate durable ack cannot re-arm auto-next', step(feedback, { type: 'COMMIT_OK', sessionId: feedback.config.sessionId, seq: 1, attempt: 0, clock: clock(1002) }) === feedback);
check('held Enter cannot reuse submit input for Next', next(feedback, 1002, 'answer-0') === feedback);
check('repeat key event rejected inside reducer', step(feedback, { type: 'NEXT', ...scope(feedback, 1002), inputId: 'new-key', repeat: true }) === feedback);
const oldNext: SessionEvent = { type: 'NEXT', ...scope(feedback, 1003), inputId: 'new-next' };
state = step(feedback, oldNext);
check('one Next advances exactly once', state.index === 1 && step(state, oldNext) === state);
check('stale question answer ignored', step(state, { type: 'ANSWER', ...scope(asking, 1004), response: { type: 'choice', choiceId: asking.current.responseType === 'choice' ? asking.current.correctChoiceId : '' }, inputId: 'late-click' }) === state);
check('old session Next ignored', step(state, { ...oldNext, sessionId: 'previous', clock: clock(2000) }) === state);
check('old session answer ignored even with current question ID', step(state, { type: 'ANSWER', ...scope(state, 2000), sessionId: 'previous', inputId: 'old-session-answer',
  response: { type: 'choice', choiceId: state.current.responseType === 'choice' ? state.current.correctChoiceId : '' } }) === state);
check('old session auto ignored', step(state, { type: 'AUTO_NEXT', ...scope(state, 4000), sessionId: 'previous', token: 1 }) === state);
check('backward monotonic event ignored', step(state, { type: 'TICK', ...scope(state, 10) }) === state);
const atDeadline = answer(begin('deadline', { origin: 'timed' }), 12_000);
check('answer exactly at deadline becomes timeout', record(atDeadline).outcome === 'timeout' && !('responseId' in record(atDeadline)));
const timedOut = step(begin('timeout', { origin: 'timed' }), { type: 'TICK', sessionId: 'timeout', questionId: occurrenceId('timeout', 0), clock: clock(12_500) });
check('late timer caps elapsed at deadline', record(timedOut).outcome === 'timeout' && record(timedOut).elapsedMs === 12_000);
check('timeout then click stays one outcome', answer(timedOut, 12_600).records.length === 1);
let fractional = active(reduceSession(createSession(), { type: 'START', config: setup('fractional', { origin: 'timed' }), questions: bank('fractional'), clock: clock(1.25) }));
fractional = step(fractional, { type: 'TICK', ...scope(fractional, 4999.125) });
check('fractional clock exact deadline still wins', record(answer(fractional, 12_001.25)).outcome === 'timeout');
const typed = begin('typed', {}, 1, 'kana-type');
check('empty typed answer rejected', step(typed, { type: 'ANSWER', ...scope(typed, 500), response: { type: 'typed', value: '  ' }, inputId: 'empty' }) === typed);
check('invalid choice response rejected', step(typed, { type: 'ANSWER', ...scope(typed, 500), response: { type: 'choice', choiceId: 'c_0' }, inputId: 'wrong-type' }) === typed);
throws('mutable question bank rejected', () => reduceSession(createSession(), { type: 'START', config: setup('mutable'), questions: [...bank('mutable')], clock: clock(0) }));
throws('empty frozen bank rejected', () => reduceSession(createSession(), { type: 'START', config: setup('empty-bank'), questions: freeze([]), clock: clock(0) }));
const duplicate = bank('duplicate', 1)[0];
throws('ordinary duplicate target rejected', () => reduceSession(createSession(), { type: 'START', config: setup('duplicate'), questions: freeze([duplicate, freeze({ ...duplicate, id: occurrenceId('duplicate', 1) })]), clock: clock(0) }));
throws('ordinary cannot retain a quick timer/tier', () => begin('not-timed', { challenge: 'quick' }));
check('tier limits exact across subjects', timedLimitMs(setup('limits', { origin: 'timed' })) === 12_000
  && timedLimitMs(setup('limits', { origin: 'timed', subject: 'vocab' })) === 20_000
  && timedLimitMs(setup('limits', { origin: 'timed', subject: 'kanji', challenge: 'quick' })) === 10_000);

section('Correct-only auto-next, permanent cancellation and pauses');
let auto = commit(answer(begin('auto'), 1000), 1001);
const autoEvent: SessionEvent = { type: 'AUTO_NEXT', ...scope(auto, 2601), token: auto.autoNextToken! };
check('auto cannot run early', step(auto, { ...autoEvent, clock: clock(2600) }) === auto);
check('stale auto token rejected', step(auto, { ...autoEvent, token: 999 }) === auto);
auto = step(auto, autoEvent);
check('correct auto advances once', auto.index === 1 && step(auto, autoEvent) === auto);
let canceled = commit(answer(begin('canceled'), 1000), 1001);
canceled = step(canceled, { type: 'CANCEL_AUTO_NEXT', ...scope(canceled, 1500), reason: 'expand' });
check('Why permanently cancels this auto-next', canceled.autoNextCanceled && canceled.runtime.autoNextDeadlineMonoMs === null
  && step(canceled, { type: 'AUTO_NEXT', ...scope(canceled, 9000), token: 1 }) === canceled);
for (const reason of ['listen', 'pointer', 'focus', 'sheet', 'manual'] as const) {
  const waiting = commit(answer(begin(`cancel-${reason}`), 100), 101);
  check(`${reason} cancels`, step(waiting, { type: 'CANCEL_AUTO_NEXT', ...scope(waiting, 200), reason }).autoNextCanceled);
}
const wrong = commit(answer(begin('wrong'), 1000, false), 1001);
check('wrong never auto-next', wrong.autoNextToken === null && step(wrong, { type: 'AUTO_NEXT', ...scope(wrong, 5000), token: 1 }) === wrong);
let paused = begin('pause', { origin: 'timed' });
paused = step(paused, { type: 'PAUSE', ...scope(paused, 3000) });
check('asking pause freezes remaining', paused.phase === 'paused' && paused.remainingMs === 9000 && paused.runtime.deadlineMonoMs === null);
const hiddenTick: SessionEvent = { type: 'TICK', ...scope(paused, 8 * 3_600_000) };
check('long hidden interval consumes no paused time', step(paused, hiddenTick) === paused);
paused = step(paused, { type: 'RESUME', ...scope(paused, 8 * 3_600_000) });
check('resume rebases deadline on saved remainder', paused.runtime.deadlineMonoMs === 8 * 3_600_000 + 9000 && paused.autoNextCanceled);
paused = answer(paused, 8 * 3_600_000 + 1000);
check('elapsed excludes hidden interval', record(paused).elapsedMs === 4000);
let pausedFeedback = commit(answer(begin('pause-feedback'), 1000), 1001);
pausedFeedback = step(pausedFeedback, { type: 'PAUSE', ...scope(pausedFeedback, 1501) });
check('feedback pause captures auto remainder', pausedFeedback.autoNextRemainingMs === 1100);
pausedFeedback = step(pausedFeedback, { type: 'RESUME', ...scope(pausedFeedback, 100_000) });
check('feedback resume never restarts auto', pausedFeedback.phase === 'feedback' && pausedFeedback.autoNextCanceled && pausedFeedback.runtime.autoNextDeadlineMonoMs === null);
let hiddenCommit = answer(begin('hidden-commit'), 1000);
hiddenCommit = step(hiddenCommit, { type: 'PAUSE', ...scope(hiddenCommit, 1001) });
hiddenCommit = commit(hiddenCommit, 10_000);
check('hide during commit settles into paused feedback', hiddenCommit.phase === 'paused' && hiddenCommit.resumeState === 'feedback' && hiddenCommit.autoNextToken === null);

section('Commit retry, volatile queue and ordered finish bonus');
let failing = answer(begin('failure', {}, 3), 1000);
failing = commit(failing, 1001, 'COMMIT_FAILED');
check('failure is visible and keeps pending', failing.phase === 'committing' && failing.pending?.status === 'failed' && failing.acknowledgedSeq === 0);
check('summary reports record failure, not a durable save', summarize(failing).recordSaveStatus === 'failed');
const failedAttempt = failing.pending!.attempt;
failing = commit(failing, 1002, 'RETRY_COMMIT');
check('retry increments attempt and retains same record', failing.pending?.attempt === failedAttempt + 1 && failing.pending.record.seq === 1);
check('old attempt failure ignored', step(failing, { type: 'COMMIT_FAILED', sessionId: failing.config.sessionId, seq: 1, attempt: failedAttempt, clock: clock(1003), failure: 'stats' }) === failing);
failing = commit(failing, 1004, 'COMMIT_FAILED');
failing = commit(failing, 1005, 'CONTINUE_VOLATILE');
check('volatile proceeds without claiming durable ack', failing.phase === 'feedback' && failing.volatile && failing.pending?.record.seq === 1 && failing.acknowledgedSeq === 0);
failing = next(failing, 1006);
failing = answer(failing, 2000);
check('next volatile answer queues behind retained oldest pending', failing.records.length === 2 && failing.pending?.record.seq === 1 && failing.commitTargetSeq === 2);
failing = commit(failing, 2001, 'COMMIT_FAILED');
failing = commit(failing, 2002, 'CONTINUE_VOLATILE');
check('two volatile answers retained with no duplicate XP', failing.records.length === 2 && summarize(failing).xp.total === 30 && summarize(failing).xp.durablyAcknowledged === 0);
const volatileSnapshot = createSnapshot(failing, 'owner', clock(2003));
check('volatile backlog is restorable', validateSnapshot(volatileSnapshot, 'owner', clock(1, BASE + 3000)).ok);
failing = step(failing, { type: 'FINISH', ...scope(failing, 2004) });
check('results never discard unsaved records', failing.phase === 'results' && failing.records.length === 2 && failing.pending !== null);
failing = commit(failing, 2005);
check('ack promotes only next contiguous record', failing.acknowledgedSeq === 1 && failing.pending?.record.seq === 2);
failing = commit(failing, 2006);
check('background ack can settle results without paying again', failing.phase === 'results' && failing.pending === null && summarize(failing).xp.durablyAcknowledged === 30 && summarize(failing).xp.total === 30);
let finishing = answer(begin('finish-pending'), 1000);
finishing = step(finishing, { type: 'FINISH', ...scope(finishing, 1001) });
check('Finish waits for pending', finishing.phase === 'committing' && finishing.finishReason === 'partial');
finishing = commit(finishing, 1002);
check('partial results after settle, no bonus', finishing.phase === 'results' && !finishing.records.some(entry => entry.type === 'completion'));
let full = round('full');
check('normal ten pays ordered completion once', full.phase === 'results' && full.records.length === 11 && full.records[10].type === 'completion' && full.records[10].seq === 11 && summarize(full).xp.total === 170);
const fullRecords = json(full.records);
full = step(full, { type: 'FINISH', ...scope(full, 100_000) });
check('repeated Finish/results input cannot add bonus', json(full.records) === fullRecords && next(full, 100_001) === full && answer(full, 100_002) === full);
check('nine-question complete round no bonus', round('nine', 9).records.length === 9);
check('all-wrong complete round earns completion only', summarize(round('all-wrong', 10, false)).xp.total === 20);
check('timed quick typed separates base/challenge/completion', json(summarize(round('typed-timed', 10, true, { origin: 'timed', challenge: 'quick' }, 'kana-type')).xp) === json({ base: 250, challenge: 50, completion: 20, total: 320, durablyAcknowledged: 320 }));

section('Repair and partial first-try summaries');
const original = round('original', 3, false);
const originalBefore = json(summarize(original));
const repair = round('repair', 3, true, { origin: 'repair', repairOf: 'original' });
const combined = summarize(original, [repair, repair]);
check('repair awards five each, no completion', summarize(repair).xp.total === 15 && repair.records.every(entry => entry.type === 'answer' && entry.origin === 'repair'));
check('repair excluded from its own first-try denominator', summarize(repair).firstPass.attempted === 0 && summarize(repair).firstPass.accuracy === null);
check('linked repair never changes original accuracy/attempts', combined.firstPass.attempted === 3 && combined.firstPass.correct === 0 && combined.firstPass.accuracy === 0);
check('repair deduplicates and reports corrected misses', combined.repair.attempted === 3 && combined.repair.correctedMisses === 3 && combined.remainingMisses.length === 0 && combined.xp.total === 15);
check('summary did not mutate original', json(summarize(original)) === originalBefore);
let partial = commit(answer(begin('partial', {}, 10), 100), 101);
partial = step(partial, { type: 'FINISH', ...scope(partial, 102) });
check('unshown queue never becomes wrong attempts', summarize(partial).firstPass.attempted === 1 && summarize(partial).firstPass.accuracy === 1 && summarize(partial).unattempted === 9 && summarize(partial).xp.completion === 0);
const zero = step(begin('zero'), { type: 'FINISH', sessionId: 'zero', questionId: occurrenceId('zero', 0), clock: clock(0) });
check('zero-answer finish no accuracy fabrication or XP', summarize(zero).firstPass.accuracy === null && summarize(zero).xp.total === 0);
check('no records never imply a saved practice', summarize(zero).recordSaveStatus === 'none');
const skippedRecord: AnswerRecord = { ...record(original), questionId: original.questions[0].id,
  skillKey: original.questions[0].skillKey, target: { subject: original.questions[0].subject, itemId: original.questions[0].itemId,
    kind: original.questions[0].kind }, outcome: 'unattempted', xp: 0, seq: 1 };
const skipped = freeze({ ...original, index: 0, current: original.questions[0], records: [skippedRecord], acknowledgedSeq: 1 });
check('summary contract excludes explicit unattempted records too', summarize(skipped).firstPass.attempted === 0 && summarize(skipped).firstPass.accuracy === null && summarize(skipped).unattempted === 3);

section('Survival budget, feedback, cycling, score and end guards');
let survival = begin('survival', { origin: 'survival', previousSurvivalBest: 4 }, 2);
check('starts 45 seconds on a 60-second scale', survival.survivalRemainingMs === 45_000 && survival.remainingMs === null);
survival = answer(survival, 1000);
check('correct consumes one second then adds five', survival.survivalRemainingMs === 49_000);
survival = commit(survival, 100_000);
check('commit/feedback never consume budget; correct delay 900ms', survival.survivalRemainingMs === 49_000 && survival.autoNextRemainingMs === 900);
survival = next(survival, 100_100);
check('second question has deadline from carried budget', survival.runtime.deadlineMonoMs === 149_100);
survival = step(survival, { type: 'TICK', ...scope(survival, 100_200) });
check('second-question ticker consumes actual elapsed', survival.survivalRemainingMs === 48_900);
survival = answer(survival, 100_300);
survival = commit(survival, 200_000);
survival = next(survival, 200_001);
check('Survival cycles immutable bank with fresh occurrence ID', survival.index === 2 && survival.current.id === occurrenceId('survival', 2) && survival.current.itemId === survival.questions[0].itemId);
let mono = 200_001;
for (let count = 0; count < 6; count++) { survival = commit(answer(survival, mono += 1), ++mono); survival = next(survival, ++mono); }
check('correct cap is sixty seconds', survival.survivalRemainingMs === 60_000);
check('actual score, not index/bank length, sets best', summarize(survival).survival?.score === 8 && summarize(survival).survival?.best === 8 && summarize(survival).survival?.newBest === true);
const priorBest = commit(answer(begin('prior-best', { origin: 'survival', previousSurvivalBest: 20 }, 1), 100), 101);
check('larger previous best preserved', summarize(priorBest).survival?.best === 20 && summarize(priorBest).survival?.newBest === false);
const penalty = answer(begin('penalty', { origin: 'survival' }), 44_000, false);
check('minus-eight floors at zero once', penalty.survivalRemainingMs === 0 && record(penalty).outcome === 'wrong');
const penaltyEnd = commit(penalty, 44_001);
check('penalty zero ends only after commit', penaltyEnd.phase === 'results' && penaltyEnd.finishReason === 'survival-zero');
const expiredSurvival = answer(begin('survival-timeout', { origin: 'survival' }), 45_000);
check('Survival deadline response is one timeout, no +5/-8 loop', expiredSurvival.survivalRemainingMs === 0 && record(expiredSurvival).outcome === 'timeout' && expiredSurvival.records.length === 1);
const survivalEnd = commit(expiredSurvival, 45_001);
check('zero end cannot repeat', step(survivalEnd, { type: 'TICK', ...scope(survivalEnd, 46_000) }) === survivalEnd && next(survivalEnd, 46_001) === survivalEnd);
const survivalWrong = commit(answer(begin('survival-wrong', { origin: 'survival' }), 100, false), 101);
check('Survival honors correct-only auto-next on wrong', survivalWrong.autoNextToken === null && survivalWrong.survivalRemainingMs === 36_900);
throws('typed Survival unsupported', () => begin('survival-typed', { origin: 'survival' }, 1, 'kana-type'));

section('Snapshots: clocks, identity, pause, expiry, pending, all kinds');
const owner = 'Owner/A';
check('owner suffix is stable and case-sensitive', snapshotKey(owner).endsWith('Owner%2FA') && snapshotKey(owner) !== snapshotKey('owner/A'));
throws('owner is not silently trimmed', () => normalizeOwnerKey(' Owner/A '));
let recover = begin('recover', { origin: 'timed' });
const wire = createSnapshot(recover, owner, clock(3000));
check('wire contains no page-local monotonic fields', !json(wire).includes('MonoMs') && !Object.hasOwn(wire.state, 'runtime') && wire.state.remainingMs === 9000);
const restored = validateSnapshot(wire, owner, clock(10, BASE + 5000));
if (!restored.ok) throw new Error('Valid snapshot rejected');
check('unclean checkpoint deducts elapsed, not fresh full time', restored.state.phase === 'paused' && restored.state.remainingMs === 7000 && restored.state.questionElapsedMs === 5000);
recover = step(restored.state, { type: 'RESUME', ...scope(restored.state, 11) });
check('restored timer waits for explicit Resume and new origin', recover.runtime.deadlineMonoMs === 7011);
const cleanPaused = step(begin('clean', { origin: 'timed' }), { type: 'PAUSE', sessionId: 'clean', questionId: occurrenceId('clean', 0), clock: clock(3000) });
const cleanWire = createSnapshot(cleanPaused, owner, clock(4000));
const cleanRestore = validateSnapshot(cleanWire, owner, clock(10, BASE + 8 * 3_600_000));
check('clean pause survives long hidden interval without loss', cleanRestore.ok && cleanRestore.state.remainingMs === 9000 && cleanRestore.state.phase === 'paused');
const backward = validateSnapshot(wire, owner, clock(1, BASE + 2000));
check('backward epoch cannot add time', backward.ok && backward.state.remainingMs === 9000);
const expired = validateSnapshot(wire, owner, clock(1, BASE + 20_000));
if (!expired.ok) throw new Error('Expired timer should restore as paused zero');
check('expired timer restores at zero, not full duration', expired.state.remainingMs === 0 && expired.state.phase === 'paused');
const expiryAnswer = step(expired.state, { type: 'RESUME', ...scope(expired.state, 2) });
check('explicit Resume records expired timeout once', expiryAnswer.phase === 'committing' && record(expiryAnswer).outcome === 'timeout' && expiryAnswer.records.length === 1
  && step(expiryAnswer, { type: 'RESUME', ...scope(expiryAnswer, 3) }) === expiryAnswer);
const expiryFinish = step(expired.state, { type: 'FINISH', ...scope(expired.state, 2) });
check('Finish cannot bypass an already expired restored question', expiryFinish.phase === 'committing' && record(expiryFinish).outcome === 'timeout');
check('expired paused Finish keeps a valid pending wire state', validateSnapshot(createSnapshot(expiryFinish, owner, clock(3)), owner, clock(1, BASE + 1000)).ok);
const pendingWire = createSnapshot(answer(begin('pending-restore'), 100), owner, clock(101));
const pendingRestore = validateSnapshot(pendingWire, owner, clock(10, BASE + 1000));
if (!pendingRestore.ok) throw new Error('Pending snapshot rejected');
const pendingSettled = commit(pendingRestore.state, 11);
check('restore pending is paused after durable settle', pendingRestore.state.phase === 'committing' && pendingRestore.state.pauseRequested && pendingSettled.phase === 'paused' && pendingSettled.resumeState === 'feedback');
check('results snapshot remains results', (() => { const saved = createSnapshot(full, owner, clock(200_000)); const result = validateSnapshot(saved, owner, clock(1, BASE + 201_000)); return result.ok && result.state.phase === 'results'; })());
for (const kind of QUESTION_KINDS) {
  const subject = kind.startsWith('vocab-') ? 'vocab' : kind.startsWith('kanji-') ? 'kanji' : 'kana';
  const sample = begin(`kind-${kind}`, { subject }, 1, kind);
  const saved = createSnapshot(sample, owner, clock(10));
  const result = validateSnapshot(saved, owner, clock(1, BASE + 20));
  check(`${kind}: bounded frozen question survives restore`, result.ok && Object.isFrozen(result.state.current) && result.state.current.id === sample.current.id && json(result.state.current.choices) === json(sample.current.choices));
}
const survived = validateSnapshot(createSnapshot(survival, owner, clock(mono)), owner, clock(1, BASE + mono + 5000));
check('Survival checkpoint also loses wall time, retains actual best', survived.ok && survived.state.survivalRemainingMs === 55_000 && summarize(survived.state).survival?.best === 8);
const midnight = step(begin('midnight'), { type: 'ANSWER', sessionId: 'midnight', questionId: occurrenceId('midnight', 0), clock: clock(100, BASE, '2026-11-08'),
  inputId: 'midnight-answer', response: { type: 'choice', choiceId: (bank('midnight')[0] as Extract<Question, { responseType: 'choice' }>).correctChoiceId } });
check('record captures supplied local date, not UTC slicing', record(midnight).localDate === '2026-11-08');

section('Malformed snapshot matrix: meaningful independent corruptions');
type Mutable<T> = T extends readonly (infer U)[] ? Mutable<U>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
function corrupt(name: string, change: (copy: Mutable<SessionSnapshot>) => void, original = pendingWire): void {
  const copy = JSON.parse(json(original)) as Mutable<SessionSnapshot>;
  change(copy);
  check(name, !validateSnapshot(json(copy), owner, clock(10, BASE + 1000)).ok);
}
check('corrupt JSON rejected', !validateSnapshot('{', owner, clock(1)).ok);
check('wrong owner rejected', !validateSnapshot(wire, 'OtherOwner', clock(1, BASE + 5000)).ok);
check('old schema rejected', (() => { const result = validateSnapshot({ ...wire, schemaVersion: 2 }, owner, clock(1, BASE + 5000)); return result.ok === false && result.reason === 'version'; })());
check('TTL expiry rejected', (() => { const result = validateSnapshot(wire, owner, clock(1, wire.savedAtEpoch + SESSION_LIMITS.snapshotTtlMs + 1)); return result.ok === false && result.reason === 'expired'; })());
check('implausibly future epoch rejected', !validateSnapshot({ ...wire, savedAtEpoch: BASE + 2 * SESSION_LIMITS.snapshotTtlMs }, owner, clock(1)).ok);
check('oversized serialized payload rejected before parsing', (() => { const result = validateSnapshot(' '.repeat(SESSION_LIMITS.snapshotBytes + 1), owner, clock(1)); return result.ok === false && result.reason === 'size'; })());
corrupt('raw source injection rejected', copy => Object.assign(copy.state.current, { src: { hidden: 'data' } }));
corrupt('runtime monotonic field rejected', copy => Object.assign(copy.state, { runtime: { deadlineMonoMs: 123 } }));
corrupt('phase cannot skip a pending commit', copy => { copy.state.phase = 'feedback'; });
corrupt('wrong active question relationship rejected', copy => { copy.state.index = 1; });
corrupt('sequence gap rejected', copy => { copy.state.records[0].seq = 3; });
corrupt('pending record payload disagreement rejected', copy => { copy.state.pending!.record.xp = 99; });
corrupt('receipt gap rejected', copy => { copy.state.acknowledgedSeq = 1; });
corrupt('invented XP rejected', copy => { copy.state.records[0].xp = 999; copy.state.pending!.record.xp = 999; });
corrupt('answer claims wrong target rejected', copy => { if (copy.state.records[0].type === 'answer') copy.state.records[0].target.itemId = 'j_5b2261225d'; });
corrupt('outcome/response disagreement rejected', copy => { if (copy.state.records[0].type === 'answer') {
  copy.state.records[0].outcome = 'wrong'; copy.state.records[0].xp = 0;
  Object.assign(copy.state.pending!.record, { outcome: 'wrong', xp: 0 });
} });
corrupt('invalid local date rejected', copy => { copy.state.records[0].localDate = '2026-02-30'; copy.state.pending!.record.localDate = '2026-02-30'; });
corrupt('typed plus choice fields rejected', copy => Object.assign(copy.state.questions[0], { acceptedTyped: ['a'] }));
corrupt('duplicate choices rejected', copy => { const q = copy.state.questions[0]; if (q.responseType === 'choice') q.choices[1].label = q.choices[0].label; });
corrupt('unknown correct ID rejected', copy => { const q = copy.state.questions[0]; if (q.responseType === 'choice') q.correctChoiceId = 'missing'; });
corrupt('oversized choice label rejected', copy => { const q = copy.state.questions[0]; if (q.responseType === 'choice') q.choices[0].label = 'a'.repeat(257); });
corrupt('illegal identity bytes rejected', copy => { copy.state.questions[0].itemId = 'bad/key'; });
corrupt('mixed subject/kind rejected', copy => { copy.state.questions[0].subject = 'kanji'; });
corrupt('unknown question kind rejected', copy => Object.assign(copy.state.questions[0], { kind: 'unknown-kind' }));
corrupt('asking cannot claim a clean pause', copy => { copy.cleanPause = true; }, wire);
corrupt('restored timer cannot exceed tier', copy => { copy.state.remainingMs = 12_001; }, wire);
corrupt('negative timer rejected', copy => { copy.state.remainingMs = -1; }, wire);
corrupt('unknown config fields rejected', copy => Object.assign(copy.state.config, { extras: true }));
corrupt('reward version rejected', copy => Object.assign(copy.state.config, { rewardVersion: 2 }));
corrupt('auto-next on wrong answer rejected', copy => { copy.state.phase = 'feedback'; copy.state.commitTargetSeq = 0; copy.state.pending = null; copy.state.acknowledgedSeq = 1;
  copy.state.autoNextRemainingMs = 100; copy.state.autoNextToken = 1; }, createSnapshot(commit(answer(begin('wrong-snapshot'), 100, false), 101), owner, clock(102)));
let getterRead = false;
const getterPayload = { ...wire };
Object.defineProperty(getterPayload, 'state', { enumerable: true, get() { getterRead = true; return wire.state; } });
check('accessors rejected without invoking them', !validateSnapshot(getterPayload, owner, clock(1)).ok && !getterRead);
const cycle: Record<string, unknown> = {}; cycle.self = cycle;
check('cycles rejected', !validateSnapshot(cycle, owner, clock(1)).ok);
check('prototype objects rejected', !validateSnapshot(Object.create({ inherited: true }), owner, clock(1)).ok);

section('Long Survival bound and no silent history pruning');
let bounded = begin('bounded', { origin: 'survival' }, 1);
let time = 0;
for (let index = 0; index < SESSION_LIMITS.records; index++) {
  bounded = answer(bounded, ++time);
  bounded = commit(bounded, ++time);
  if (index + 1 < SESSION_LIMITS.records) bounded = next(bounded, ++time);
}
check('safety limit finishes explicitly with all records retained', bounded.phase === 'results' && bounded.finishReason === 'safety-limit' && bounded.records.length === SESSION_LIMITS.records);
throws('oversized genuine snapshot fails rather than pruning history', () => serializeSnapshot(bounded, owner, clock(++time)));
check('safety-limit result still reports real score', summarize(bounded).survival?.score === SESSION_LIMITS.records);

console.log('\nReward rows: choice 15; typed 25; timed +0/+5/+10; repair 5; completion 20 once; wrong/timeout/unattempted 0.');
console.log('Timers: Steady 12/20s; Quick 6/10s; Lightning kana 3s; Survival 45s, +5 cap60 / -8 floor0, correct feedback 900ms.');
console.log('No browser/storage/stat/network effects are executed; QZ4 write-boundary fault injection is still required.');
console.log(`${passed} passed; ${failures.length} failed.`);
for (const failure of failures) console.error(`FAIL: ${failure}`);
if (failures.length) process.exitCode = 1;
