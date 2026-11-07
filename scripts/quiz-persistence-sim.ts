/** QZ4 storage fault injection using the production pure reducer, journal and cloud queue. */
import { HIRAGANA_DATA, KANJI_DATA, VOCABULARY_DATA } from '../src/data';
import { completePreferences, sanitizeEnvelope } from '../src/preferences';
import type { StudentStats } from '../src/types';
import {
  createCloudSaveQueue, createQuizStorage, MASTER_STATS_KEY, outboxKey, prepareQuizCommit, readHydrationJournal,
  type CloudSaveRequest, type StorageResult,
} from '../src/quiz/browserStorage';
import { createKanaCandidates } from '../src/quiz/content/kana';
import { createKanjiCandidates } from '../src/quiz/content/kanji';
import { createVocabularyCandidates } from '../src/quiz/content/vocabulary';
import { encodeId, occurrenceId, skillKey } from '../src/quiz/ids';
import { createQuestion, historyBucket } from '../src/quiz/pool';
import {
  applyQuizRecord, canUseDeviceStats, hydrateQuizProgress, mergeQuizProgress, parseProgressEntry,
  progressEntryForPending, quizHistoryFromStats, QUIZ_OUTBOX_LIMIT, QUIZ_SKILL_LIMIT,
  readQuizProgress, receiptThrough, sanitizeQuizProgress, withQuizMaps, type ProgressEntry,
} from '../src/quiz/progress';
import { seededRandom } from '../src/quiz/random';
import { createSession, reduceSession } from '../src/quiz/session';
import { snapshotKey } from '../src/quiz/snapshot';
import { freeze, type ActiveSession, type ClockStamp, type QuestionKind, type SessionEvent, type SessionState, type SoloOrigin } from '../src/quiz/types';

const OWNER = 'sim-owner';
const OTHER = 'sim-other';
const T0 = 1_800_000_000_000;
const day = '2026-11-07';
const clock = (monoMs: number, localDate = day): ClockStamp => ({ monoMs, epochMs: T0 + monoMs, localDate });
const json = (value: unknown) => JSON.stringify(value);
const stats = (): StudentStats => ({
  xp: 40, totalAttempts: 2, correctCount: 1, studyDates: ['2026-11-06'], streakCount: 1, lastActiveDate: '2026-11-06',
  masteredChars: ['あ'], characterProgress: { 日: { total: 1, correct: 1 } }, vocabularyProgress: { 猫: true },
  favoriteCategory: 'basic', srsCards: { 'kanji:日': { level: 2, nextReview: T0 + 100, itemKey: '日', type: 'kanji' } },
  srsSettings: { dailyReviewCap: 25, dailyNewCap: 3, updatedAt: T0 - 100 }, survivalBestScore: 4, srsReviewedTotal: 3,
  preferences: { updatedAt: T0, values: { theme: 'dark', quizAutoNext: false, quizLength: 20 } },
  tips: { seen: { desk: true } },
});
let passed = 0;
const failures: string[] = [];
function check(name: string, condition: boolean) { if (condition) passed++; else failures.push(name); }
function throws(name: string, run: () => unknown) {
  try { run(); check(name, false); } catch { check(name, true); }
}
function value<T>(result: StorageResult<T>): T {
  if (result.ok === false) throw new Error(result.message);
  return result.value;
}
function active(state: SessionState): ActiveSession {
  if (state.phase === 'idle') throw new Error('Expected an active session');
  return state;
}

function device() {
  const data = new Map<string, string>();
  const operations: string[] = [];
  let fault: { key: string; operation: 'read' | 'set' | 'remove'; name: string } | null = null;
  const maybeThrow = (key: string, operation: 'read' | 'set' | 'remove') => {
    if (fault?.key !== key || fault.operation !== operation) return;
    const name = fault.name;
    fault = null;
    throw Object.assign(new Error(name), { name });
  };
  const store = createQuizStorage(() => ({
    getItem(key) { maybeThrow(key, 'read'); return data.get(key) ?? null; },
    setItem(key, raw) { maybeThrow(key, 'set'); operations.push(`set:${key}`); data.set(key, raw); },
    removeItem(key) { maybeThrow(key, 'remove'); operations.push(`remove:${key}`); data.delete(key); },
  }));
  return { store, data, operations, failNext: (key: string, operation: 'read' | 'set' | 'remove', name = 'QuotaExceededError') => {
    fault = { key, operation, name };
  } };
}

const kana = createKanaCandidates({ hiragana: HIRAGANA_DATA, katakana: [] }).candidates;
const kanji = createKanjiCandidates({ kanji: KANJI_DATA }).candidates;
const vocabulary = createVocabularyCandidates({ vocabulary: VOCABULARY_DATA.slice(0, 30) }).candidates;
const candidates = [...kana, ...kanji, ...vocabulary];
function start(sessionId: string, kind: QuestionKind = 'kana-read', origin: SoloOrigin = 'practice', length = 2) {
  const rows = candidates.filter(row => row.kind === kind).slice(0, length);
  if (rows.length !== length) throw new Error(`Missing fixture for ${kind}`);
  const questions = freeze(rows.map((row, index) => createQuestion(row, { sessionId, index }, seededRandom(index + 42))));
  return active(reduceSession(createSession(), { type: 'START', questions, clock: clock(0), config: {
    sessionId, subject: questions[0].subject, origin, autoNext: true, challenge: origin === 'timed' ? 'quick' : 'steady',
    previousSurvivalBest: 4, rewardVersion: 1, ...(origin === 'repair' ? { repairOf: 'original' } : {}),
  } }));
}
function answer(state: ActiveSession, at = clock(10), correct = true) {
  const q = state.current;
  const response = q.responseType === 'typed' ? { type: 'typed' as const, value: q.acceptedTyped[0] }
    : { type: 'choice' as const, choiceId: correct ? q.correctChoiceId : q.choices.find(choice => choice.id !== q.correctChoiceId)!.id };
  return active(reduceSession(state, { type: 'ANSWER', sessionId: state.config.sessionId, questionId: q.id,
    clock: at, inputId: `answer-${state.index}`, response }));
}
function commitEvent(state: ActiveSession, type: 'COMMIT_OK' | 'RETRY_COMMIT' | 'CONTINUE_VOLATILE' | 'COMMIT_FAILED', at: ClockStamp) {
  const pending = state.pending!;
  const common = { sessionId: state.config.sessionId, seq: pending.record.seq, attempt: pending.attempt, clock: at };
  const event: SessionEvent = type === 'COMMIT_FAILED' ? { ...common, type, failure: 'stats' } : { ...common, type };
  return active(reduceSession(state, event));
}
function advance(state: ActiveSession, at: ClockStamp) {
  return active(reduceSession(state, { type: 'NEXT', sessionId: state.config.sessionId, questionId: state.current.id,
    clock: at, inputId: `next-${state.index}` }));
}
function finishCommit(store: ReturnType<typeof createQuizStorage>, pending: ActiveSession, at: ClockStamp, owner = OWNER) {
  const prepared = prepareQuizCommit(store, owner, true, pending, at);
  if (prepared.ok === false) throw new Error(prepared.message);
  const local = value(store.readStats())!;
  const next = applyQuizRecord(local, prepared.entries[0], at.epochMs);
  value(store.writeStats(next, { owner }));
  const acknowledged = commitEvent(pending, 'COMMIT_OK', at);
  value(store.writeSnapshot(acknowledged, owner, at));
  return next;
}

async function main() {
  const base = stats();
  const asking = start('crash');
  const pending = answer(asking);
  const first = progressEntryForPending(pending);
  const secondState = answer(advance(commitEvent(pending, 'COMMIT_OK', clock(11)), clock(12)), clock(13, '2026-11-08'));
  const second = progressEntryForPending(secondState);
  const one = applyQuizRecord(base, first, T0);
  const two = applyQuizRecord(one, second, T0);

  for (const boundary of ['snapshot', 'outbox', 'updater', 'stats', 'ack'] as const) {
    const { store, operations, failNext } = device();
    value(store.writeStats(base, { owner: OWNER }));
    value(store.writeSnapshot(asking, OWNER, clock(1)));
    operations.length = 0;
    if (boundary === 'snapshot') failNext(snapshotKey(OWNER), 'set');
    if (boundary === 'outbox') failNext(outboxKey(OWNER), 'set');
    const result = prepareQuizCommit(store, OWNER, true, pending, clock(11));
    if (boundary === 'snapshot') {
      check('snapshot denial does not append or update stats', result.ok === false && result.failure === 'snapshot' &&
        !operations.length && value(store.readStats())!.xp === base.xp);
    } else {
      check(`${boundary}: pending snapshot precedes other writes`, operations[0] === `set:${snapshotKey(OWNER)}`);
    }
    if (boundary === 'outbox') {
      check('outbox quota failure keeps pending and leaves master stats intact', result.ok === false && result.failure === 'outbox' &&
        value(store.readSnapshot(OWNER, clock(12)))?.pending?.record.seq === 1 && value(store.readStats())!.xp === base.xp);
      const journal = value(readHydrationJournal(store, OWNER, base, clock(13)));
      check('cloud hydrate reconstructs a missing outbox append from the pending snapshot',
        journal.activeSessions.has('crash') && journal.entries.length === 1 &&
        hydrateQuizProgress(base, base, journal.entries, T0, journal.activeSessions).stats.xp === 55);
    }
    if (boundary === 'updater' || boundary === 'stats' || boundary === 'ack') {
      check(`${boundary}: outbox append precedes stats`, operations[1] === `set:${outboxKey(OWNER)}`);
      const original = value(store.readStats())!;
      const firstRender = applyQuizRecord(original, first, T0);
      const secondRender = applyQuizRecord(original, first, T0);
      check(`${boundary}: StrictMode-style repeated updater remains pure`, json(firstRender) === json(secondRender) &&
        original.xp === base.xp && operations.length === 2);
      if (boundary === 'stats') {
        failNext(MASTER_STATS_KEY, 'set');
        const write = store.writeStats(firstRender, { owner: OWNER });
        check('master quota failure cannot acknowledge the record', write.ok === false && write.reason === 'quota' &&
          !value(store.readStats())!.quizReceipts && !!value(store.readSnapshot(OWNER, clock(12)))?.pending);
      }
      if (boundary === 'ack') {
        value(store.writeStats(firstRender, { owner: OWNER }));
        const atomic = value(store.readStats())!;
        check('one master write contains XP and receipt together', operations[2] === `set:${MASTER_STATS_KEY}` &&
          atomic.xp === 55 && receiptThrough(atomic, 'crash') === 1);
        failNext(snapshotKey(OWNER), 'set');
        const ack = store.writeSnapshot(commitEvent(pending, 'COMMIT_OK', clock(12)), OWNER, clock(12));
        check('failed snapshot ack leaves original recoverable pending', ack.ok === false &&
          value(store.readSnapshot(OWNER, clock(13)))?.pending?.record.seq === 1);
      }
    }
    // New process state is reconstructed from persisted data only.
    const restored = value(store.readSnapshot(OWNER, clock(50)))!;
    const retry = boundary === 'snapshot'
      ? answer(active(reduceSession(restored, { type: 'RESUME', sessionId: restored.config.sessionId,
        questionId: restored.current.id, clock: clock(51) })), clock(52)) : restored;
    const saved = finishCommit(store, retry, clock(60));
    check(`${boundary}: replay pays once`, saved.xp === 55 && saved.totalAttempts === 3 &&
      receiptThrough(saved, 'crash') === 1 && value(store.readOutbox(OWNER)).length === 1);
    check(`${boundary}: duplicate delivery is a no-op`, applyQuizRecord(saved, first, T0) === saved);
  }
  const denied = createQuizStorage(() => { throw Object.assign(new Error('blocked'), { name: 'SecurityError' }); });
  const deniedResult = prepareQuizCommit(denied, OWNER, true, pending, clock(11));
  check('denied storage gives a visible typed failure', deniedResult.ok === false && deniedResult.failure === 'snapshot');
  const volatile = commitEvent(commitEvent(pending, 'COMMIT_FAILED', clock(11)), 'CONTINUE_VOLATILE', clock(12));
  check('volatile continuation retains pending and has no durable acknowledgment', volatile.phase === 'feedback' &&
    volatile.pending?.record.seq === 1 && volatile.acknowledgedSeq === 0);

  throws('receipt gaps are rejected', () => applyQuizRecord(base, second));
  check('invalid reward is refused', parseProgressEntry({ ...first, record: { ...first.record, xp: 999 } }) === null);
  check('local dates survive midnight and duplicate replay', two.lastActiveDate === '2026-11-08' && two.streakCount === 3 &&
    two.studyDates.includes(day) && applyQuizRecord(two, second) === two);
  const wrong = applyQuizRecord(base, progressEntryForPending(answer(start('wrong'), clock(10), false)));
  check('wrong records count as study without XP', wrong.xp === base.xp && wrong.totalAttempts === 3 && wrong.correctCount === 1 &&
    wrong.studyDates.includes(day) && Object.values(wrong.quizSkills ?? {})[0].m === clock(10).epochMs);
  const repair = applyQuizRecord(one, progressEntryForPending(answer(start('repair', 'kana-read', 'repair'))));
  check('repair updates its own counters without another first pass or kana attempt', repair.xp === 60 && repair.totalAttempts === one.totalAttempts &&
    repair.characterProgress === one.characterProgress && Object.values(repair.quizSkills ?? {})[0].ra === 1);
  const skipped = applyQuizRecord(base, { ...first, record: { ...first.record, outcome: 'unattempted', xp: 0 } as ProgressEntry['record'] });
  check('unattempted advances only the receipt', skipped.xp === base.xp && skipped.studyDates === base.studyDates &&
    skipped.totalAttempts === base.totalAttempts && !skipped.quizSkills && receiptThrough(skipped, 'crash') === 1);
  for (const kind of ['vocab-meaning', 'kanji-meaning'] as const) {
    const graded = applyQuizRecord(base, progressEntryForPending(answer(start(kind, kind))));
    check(`${kind}: leaves manual flags and SRS unchanged`, graded.characterProgress === base.characterProgress &&
      graded.vocabularyProgress === base.vocabularyProgress && graded.masteredChars === base.masteredChars &&
      graded.srsCards === base.srsCards && graded.srsSettings === base.srsSettings);
  }
  const typed = progressEntryForPending(answer(start('typed', 'kana-type', 'timed')));
  check('outbox has recalculated challenge XP and omits typed responses', typed.record.xp === 30 &&
    !json(typed).includes('typedValue') && !json(typed).includes('responseId'));
  const last = { owner: OWNER };
  {
    const { store } = device();
    value(store.writeStats(base, last));
    const stage = prepareQuizCommit(store, OWNER, true, pending, clock(11));
    if (stage.ok === false) throw new Error(stage.message);
    // A Study/Review update lands after journal preparation but before the updater's render.
    const interleaved: StudentStats = { ...base, xp: base.xp + 40, favoriteCategory: 'reviewed',
      srsCards: { ...base.srsCards, 'kanji:日': { ...base.srsCards['kanji:日'], level: 3 } } };
    const committed = applyQuizRecord(interleaved, stage.entries[0]);
    value(store.writeStats(committed, last));
    const disk = value(store.readStats())!;
    check('latest combined write retains interleaved unrelated changes', disk.xp === 95 && disk.favoriteCategory === 'reviewed' &&
      disk.srsCards['kanji:日'].level === 3 && receiptThrough(disk, 'crash') === 1);
    const stale = store.writeStats(base, last, base);
    check('a tab with an older observed receipt cannot overwrite newer disk progress', stale.ok === false &&
      stale.reason === 'conflict' && value(store.readStats())!.xp === 95);
  }

  const key = first.record.type === 'answer' ? first.record.skillKey : '';
  const wholeA = { quizSkills: { [key]: { a: 3, c: 1, t: T0, ra: 2, rc: 1 } } };
  const wholeB = { quizSkills: { [key]: { a: 2, c: 2, t: T0 + 1 } } };
  const merged = mergeQuizProgress(wholeA, wholeB, T0).maps;
  check('merge is commutative and idempotent', json(merged) === json(mergeQuizProgress(wholeB, wholeA, T0).maps) &&
    json(merged) === json(mergeQuizProgress(merged, merged, T0).maps));
  check('newer whole row wins without summing unrelated histories', json(merged.quizSkills?.[key]) === json(wholeB.quizSkills[key]));
  const tie = { quizSkills: { [key]: { a: 3, c: 1, t: T0, ra: 4, rc: 2 } } };
  check('last tie uses stable whole-row ordering', json(mergeQuizProgress(wholeA, tie, T0).maps) === json(mergeQuizProgress(tie, wholeA, T0).maps));
  check('malformed optional rows sanitize and omit empty maps', !Object.keys(sanitizeQuizProgress({
    quizSkills: { 'bad/key': { a: 1, c: 1, t: T0 }, [key]: { a: 1, c: 2, t: T0 } },
    quizReceipts: { ['__proto__']: { through: 3, at: T0 }, broken: { through: -1, at: T0 } },
  }, T0).maps).length);
  const manySkills = Object.fromEntries(Array.from({ length: QUIZ_SKILL_LIMIT + 1 }, (_, i) => [
    skillKey(encodeId('v', [`fixture-${i}`, 'fixture', 'fixture']), 'vocab-meaning'), { a: 1, c: 1, t: T0 - i },
  ]));
  const trimmed = sanitizeQuizProgress({ quizSkills: manySkills }, T0);
  check('skill cap reports pruning and retains the newest rows', trimmed.prunedSkills === 1 &&
    Object.keys(trimmed.maps.quizSkills ?? {}).length === QUIZ_SKILL_LIMIT &&
    !Object.hasOwn(trimmed.maps.quizSkills ?? {}, skillKey(encodeId('v', ['fixture-6000', 'fixture', 'fixture']), 'vocab-meaning')));
  const old = T0 - 31 * 86_400_000;
  const receipts = Object.fromEntries(Array.from({ length: 130 }, (_, i) => [`recent-${i}`, { at: T0 - i, through: 1 }]));
  const retained = sanitizeQuizProgress({ quizReceipts: { ...receipts, expired: { at: old, through: 1 }, pinned: { at: old, through: 1 } } },
    T0, new Set(['pinned']));
  check('receipt retention pins outbox/active sessions outside the age/count cap', Object.keys(retained.maps.quizReceipts ?? {}).length === 129 &&
    !!retained.maps.quizReceipts?.pinned && !retained.maps.quizReceipts?.expired);
  const read = kana.find(row => row.kind === 'kana-read')!;
  const pick = kana.find(row => row.kind === 'kana-pick' && row.deck.itemKey === read.deck.itemKey)!;
  const history = quizHistoryFromStats({ ...base, characterProgress: { [read.deck.itemKey]: { total: 5, correct: 1 } } });
  check('legacy character totals inform kana-read only', historyBucket(read, history, T0) === 'weak' && historyBucket(pick, history, T0) === 'new');

  {
    const { store, data } = device();
    value(store.writeStats(two, last));
    value(store.appendOutbox(OWNER, [first, second]));
    value(store.writeSnapshot(secondState, OWNER, clock(20)));
    check('owner scope refuses foreign snapshots and quiz-bearing device seeds', !value(store.readSnapshot(OTHER, clock(21))) &&
      !canUseDeviceStats(two, last, OTHER) && canUseDeviceStats(base, null, OTHER));
    check('local fallback owner is stable across initialization', value(store.localOwner('first')) === value(store.localOwner('second')));
    value(store.claimLease(OWNER, 'first-tab', 'crash', T0));
    const conflict = store.claimLease(OWNER, 'second-tab', 'new-session', T0 + 1);
    check('second tab is refused while the lease is live', conflict.ok === false && conflict.reason === 'conflict');
    value(store.releaseLease(OWNER, 'first-tab', T0 + 2));
    value(store.claimLease(OWNER, 'second-tab', 'crash', T0 + 3));
    value(store.releaseLease(OWNER, 'second-tab', T0 + 4));
    value(store.appendOutbox(OTHER, [first]));
    const before = json(value(store.readStats()));
    const preserved = { ...base, quizSkills: two.quizSkills, quizReceipts: two.quizReceipts };
    const oldBackup = withQuizMaps(base, readQuizProgress(JSON.parse(json(base))).maps);
    check('old backup keeps optional maps absent', json(oldBackup) === json(base));
    const newBackup = withQuizMaps(preserved, sanitizeQuizProgress(JSON.parse(json(preserved)), T0).maps);
    check('new backup maps and preference envelope round trip', receiptThrough(newBackup, 'crash') === 2 &&
      !!newBackup.quizSkills && sanitizeEnvelope(newBackup.preferences)?.values.quizLength === 20 &&
      completePreferences(newBackup.preferences?.values ?? {}).quizAutoNext === false);
    const importBinding = { owner: OWNER, backupUpload: 'import-one' };
    value(store.replaceFromBackup(oldBackup, importBinding));
    check('import discards only this owner pending snapshot/outbox before adopting totals', value(store.readStats())!.xp === 40 &&
      !value(store.readSnapshot(OWNER, clock(25))) && value(store.readOutbox(OWNER)).length === 0 &&
      value(store.readOutbox(OTHER)).length === 1 && before !== json(value(store.readStats())));
    check('offline refresh keeps the imported full seed until upload is acknowledged',
      (value(store.readBinding()) as typeof importBinding).backupUpload === 'import-one' &&
      hydrateQuizProgress(oldBackup, null, [], T0).stats.xp === 40);
    check('stale upload cannot clear a different import marker', !value(store.acknowledgeBackupUpload({ owner: OWNER, backupUpload: 'old' })));
    value(store.acknowledgeBackupUpload(importBinding));
    check('exact backup payload clears only its own marker', json(value(store.readBinding())) === json(last));
    data.set(outboxKey(OWNER), JSON.stringify({ version: 1, owner: OTHER, entries: [first] }));
    check('outbox payload owner mismatch is refused and retained', store.readOutbox(OWNER).ok === false && data.has(outboxKey(OWNER)));
  }
  {
    const { store, data, failNext } = device();
    value(store.writeStats(two, last));
    value(store.appendOutbox(OWNER, [first, second]));
    value(store.writeSnapshot(secondState, OWNER, clock(20)));
    const before = json([...data]);
    failNext(MASTER_STATS_KEY, 'set');
    const failed = store.replaceFromBackup(base, { owner: OWNER, backupUpload: 'failed-import' });
    check('a synchronous failed import restores both journals and the prior blob', failed.ok === false &&
      json([...data].sort()) === json((JSON.parse(before) as [string, string][]).sort()));
  }

  {
    const { store, data } = device();
    value(store.writeStats(two, last));
    value(store.appendOutbox(OWNER, [first, second]));
    value(store.writeSnapshot(secondState, OWNER, clock(20)));
    value(store.removeSnapshot(OWNER));
    check('dismissing results keeps the cloud batch', value(store.readOutbox(OWNER)).length === 2);
    // Refresh before the 700 ms upload. Local receipt already covers both records, cloud covers only the first.
    const hydrated = hydrateQuizProgress(value(store.readStats())!, one, value(store.readOutbox(OWNER)), T0 + 100);
    check('refresh before cloud upload replays against cloud before merging local receipts',
      hydrated.stats.xp === 70 && hydrated.stats.totalAttempts === 4 && receiptThrough(hydrated.stats, 'crash') === 2);
    check('absent cloud seed with a durable local prefix does not double-add outbox',
      hydrateQuizProgress(two, null, [first, second], T0 + 100).stats.xp === two.xp);
    check('absent cloud seed recovers only the missing tail after interrupted apply',
      hydrateQuizProgress(one, null, [first, second], T0 + 100).stats.xp === two.xp);

    const calls: CloudSaveRequest[] = [];
    const uploads: { resolve: () => void; reject: (error: Error) => void }[] = [];
    const acknowledged: CloudSaveRequest[] = [];
    const errors: unknown[] = [];
    const queue = createCloudSaveQueue(request => new Promise<void>((resolve, reject) => {
      calls.push(request); uploads.push({ resolve, reject });
    }), request => { acknowledged.push(request); value(store.acknowledgeOutbox(request.binding.owner, request.stats)); },
    error => errors.push(error), 60_000, 60_000);
    try {
      const firstPayload = { stats: one, binding: last };
      const newerPayload = { stats: two, binding: last };
      queue.enqueue(firstPayload);
      const sending = queue.flush();
      await Promise.resolve();
      queue.enqueue(newerPayload);
      check('only one account save in flight', queue.flush() === sending && calls.length === 1);
      uploads[0].resolve();
      await sending;
      check('older exact payload does not clear newer answer or its batch prefix', acknowledged[0] === firstPayload &&
        value(store.readOutbox(OWNER)).length === 2);
      const failed = queue.flush();
      await Promise.resolve();
      uploads[1].reject(new Error('offline'));
      await failed;
      check('failed upload retains the whole batch', errors.length === 1 && value(store.readOutbox(OWNER)).length === 2);
      const retry = queue.flush();
      await Promise.resolve();
      check('failed latest payload is retried', calls[2] === newerPayload);
      uploads[2].resolve();
      await retry;
      check('newest successful exact payload clears the fully acknowledged batch', value(store.readOutbox(OWNER)).length === 0);
      value(store.appendOutbox(OWNER, [first]));
      queue.enqueue(firstPayload);
      const oldOwnerSave = queue.flush();
      await Promise.resolve();
      queue.cancel();
      uploads[3].resolve();
      await oldOwnerSave;
      check('owner boundary ignores acknowledgment of an earlier in-flight save', value(store.readOutbox(OWNER)).length === 1);
    } finally { queue.cancel(); }
    const raw = Array.from({ length: QUIZ_OUTBOX_LIMIT }, (_, index) => {
      const sessionId = `pending-${index}`;
      return { ...first, record: { ...first.record, sessionId, questionId: occurrenceId(sessionId, 0) } };
    });
    const full = JSON.stringify({ version: 1, owner: OWNER, entries: raw });
    data.set(outboxKey(OWNER), full);
    const overflow = store.appendOutbox(OWNER, [first]);
    check('full outbox reports capacity and never prunes unacknowledged records', overflow.ok === false &&
      overflow.reason === 'limit' && data.get(outboxKey(OWNER)) === full);
  }
}

main().then(() => {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.log(`${passed} passed. ${failures.length} failed.`);
  if (failures.length) process.exitCode = 1;
}).catch(error => { console.error(error); process.exitCode = 1; });
