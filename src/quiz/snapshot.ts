import { isHiraganaReading, isKanjiWord } from './distractors';
import { assertQuestion, grade } from './grade';
import { decodeId, isSafeKey, normalizeLabel, normalizeTyped, occurrenceId } from './ids';
import { rewardFor } from './reward';
import { checkpointSession, questionTargetKey, timedLimitMs, validClock, validLocalDate, validateSessionConfig } from './session';
import { QUESTION_KINDS, SESSION_LIMITS, freeze, type ActiveSession, type AnswerRecord, type ClockStamp,
  type CompletionRecord, type PersistedSession, type Question, type QuizProgressRecord,
  type SessionConfig, type SessionSnapshot, type SnapshotValidation } from './types';

export const RESTORE_FAILURE_MESSAGE = 'This saved practice can’t be restored. Your saved progress is still here.';
type FailureReason = Extract<SnapshotValidation, { ok: false }>['reason'];
class InvalidSnapshot extends Error {
  constructor(readonly reason: FailureReason = 'malformed') { super(RESTORE_FAILURE_MESSAGE); }
}
function demand(condition: unknown, reason: FailureReason = 'malformed'): asserts condition {
  if (!condition) throw new InvalidSnapshot(reason);
}
function object(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  demand(value !== null && typeof value === 'object' && !Array.isArray(value));
  const result = value as Record<string, unknown>;
  demand(required.every(key => Object.hasOwn(result, key)) && Object.keys(result).every(key => required.includes(key) || optional.includes(key)));
  return result;
}
function num(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER, integer = false): number {
  demand(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isSafeInteger(value)));
  return value;
}
function text(value: unknown, max: number, nonempty = true): string {
  demand(typeof value === 'string' && value.length <= max && (!nonempty || value.trim().length > 0));
  return value;
}
function boolean(value: unknown): boolean { demand(typeof value === 'boolean'); return value; }
function enumeration<T extends string>(value: unknown, allowed: readonly T[]): T {
  demand(typeof value === 'string' && allowed.includes(value as T)); return value as T;
}
function list(value: unknown, max: number, min = 0): unknown[] {
  demand(Array.isArray(value) && value.length >= min && value.length <= max); return value;
}
function nullableNumber(value: unknown, max = Number.MAX_SAFE_INTEGER): number | null { return value === null ? null : num(value, 0, max); }
function near(a: number, b: number): boolean { return Math.abs(a - b) <= 0.000001; }
function canonical(value: unknown): string {
  const ordered = (part: unknown): unknown => Array.isArray(part) ? part.map(ordered)
    : part !== null && typeof part === 'object' ? Object.fromEntries(Object.entries(part).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, ordered(child)])) : part;
  return JSON.stringify(ordered(value));
}
/** Preserve opaque UID case/bytes; reject malformed suffixes instead of merging owners. */
export function normalizeOwnerKey(owner: string): string {
  if (typeof owner !== 'string' || !owner || owner !== owner.trim() || owner.length > 128 || /[\u0000-\u001f\u007f]/u.test(owner)
    || decodeURIComponent(encodeURIComponent(owner)) !== owner) throw new RangeError('Invalid snapshot owner');
  return owner;
}
export function snapshotKey(owner: string): string { return `astra_quiz_session_v1:${encodeURIComponent(normalizeOwnerKey(owner))}`; }

/** Reject exotic objects, accessors, cycles and excessive nesting before serialization. */
function jsonTree(value: unknown): void {
  let nodes = 0;
  const ancestors = new Set<object>();
  const visit = (part: unknown, depth: number): void => {
    demand(++nodes <= 100_000 && depth <= 16);
    if (part === null || typeof part === 'boolean') return;
    if (typeof part === 'string') { demand(part.length <= 16_384); return; }
    if (typeof part === 'number') { demand(Number.isFinite(part)); return; }
    demand(typeof part === 'object' && !ancestors.has(part));
    const array = Array.isArray(part);
    demand(array || Object.getPrototypeOf(part) === Object.prototype || Object.getPrototypeOf(part) === null);
    if (array) demand(part.length <= SESSION_LIMITS.records && Object.keys(part).length === part.length);
    const descriptors = Object.getOwnPropertyDescriptors(part);
    const keys = Reflect.ownKeys(descriptors);
    demand(keys.length <= (array ? SESSION_LIMITS.records + 1 : 64));
    ancestors.add(part);
    for (const key of keys) {
      demand(typeof key === 'string');
      if (array && key === 'length') continue;
      const descriptor = descriptors[key];
      demand('value' in descriptor && descriptor.enumerable && key !== '__proto__' && key !== 'constructor' && key !== 'prototype');
      visit(descriptor.value, depth + 1);
    }
    ancestors.delete(part);
  };
  visit(value, 0);
}
function checkedQuestion(value: unknown): Question {
  const q = object(value, ['id', 'itemId', 'skillKey', 'subject', 'kind', 'responseType', 'instruction', 'face', 'reveal'],
    ['faceSub', 'highlights', 'speechText', 'deck', 'choices', 'correctChoiceId', 'acceptedTyped']);
  const subject = enumeration(q.subject, ['kana', 'vocab', 'kanji'] as const);
  const kind = enumeration(q.kind, QUESTION_KINDS);
  demand(kind.startsWith(subject === 'vocab' ? 'vocab-' : `${subject}-`));
  const id = text(q.id, 768), itemId = text(q.itemId, 768), skill = text(q.skillKey, 768);
  demand(isSafeKey(id) && isSafeKey(itemId) && isSafeKey(skill) && skill === `${itemId}__${kind}` && decodeId(id).prefix === 'q');
  const source = decodeId(itemId);
  const face = text(q.face, 256);
  text(q.instruction, 512);
  if (q.faceSub !== undefined) text(q.faceSub, 256);
  if (q.speechText !== undefined) text(q.speechText, 256);
  if (subject === 'kana') {
    demand(['h', 'k'].includes(source.prefix) && source.tuple.length === 2 && source.tuple[0] === (source.prefix === 'h' ? 'hiragana' : 'katakana'));
    demand((source.prefix === 'h' ? /^[\u3041-\u3096]+$/u : /^[\u30a1-\u30faー]+$/u).test(source.tuple[1]));
    if (kind !== 'kana-pick') demand(face === source.tuple[1]);
  } else if (subject === 'vocab' || kind === 'kanji-word') {
    demand(source.prefix === (subject === 'vocab' ? 'v' : 'w') && source.tuple.length === 3);
    source.tuple.forEach(part => text(part, 1024));
    demand(normalizeLabel(source.tuple[2]) === source.tuple[2]);
    if (kind !== 'vocab-reverse') demand(face === source.tuple[0]);
    if (kind === 'vocab-reading' || kind === 'kanji-word') demand(isKanjiWord(face) && isHiraganaReading(source.tuple[1]) && !Object.hasOwn(q, 'faceSub'));
  } else demand(source.prefix === 'j' && source.tuple.length === 1 && /^[\u3400-\u9fff]$/u.test(source.tuple[0]) && face === source.tuple[0]);
  const reveal = object(q.reveal, ['answer'], ['reading', 'meaning', 'note', 'example', 'confusion']);
  text(reveal.answer, 512);
  for (const key of ['reading', 'meaning', 'note', 'example', 'confusion']) if (reveal[key] !== undefined) text(reveal[key], key === 'note' || key === 'example' ? 2048 : 1024);
  if (subject === 'vocab' || kind === 'kanji-word') {
    demand(reveal.reading === source.tuple[1] && typeof reveal.meaning === 'string' && normalizeLabel(reveal.meaning) === source.tuple[2]);
  }
  if (q.deck !== undefined) {
    const deck = object(q.deck, ['itemKey', 'type']);
    const type = enumeration(deck.type, ['hiragana', 'katakana', 'vocab', 'kanji'] as const);
    const itemKey = text(deck.itemKey, 256);
    if (subject === 'kana') demand(type === source.tuple[0] && itemKey === source.tuple[1]);
    else if (subject === 'vocab') demand(type === 'vocab' && itemKey === source.tuple[0]);
    else demand(type === 'kanji' && /^[\u3400-\u9fff]$/u.test(itemKey) && face.includes(itemKey));
  }
  if (q.highlights !== undefined) {
    demand(kind === 'kanji-word');
    let end = 0;
    let glyph: string | null = null;
    for (const raw of list(q.highlights, 32, 1)) {
      const range = object(raw, ['start', 'end']);
      const begin = num(range.start, end, face.length - 1, true);
      end = num(range.end, begin + 1, face.length, true);
      const selected = face.slice(begin, end);
      demand(/^[\u3400-\u9fff]$/u.test(selected) && (glyph === null || glyph === selected));
      glyph = selected;
    }
    if (q.deck !== undefined) demand(glyph === (q.deck as Record<string, unknown>).itemKey);
    demand(glyph !== null && list(q.highlights, 32).length === face.split(glyph).length - 1);
  } else demand(kind !== 'kanji-word');
  const response = enumeration(q.responseType, ['choice', 'typed'] as const);
  if (response === 'choice') {
    demand(!Object.hasOwn(q, 'acceptedTyped'));
    const choices = list(q.choices, 6, 4);
    demand(choices.length === 4 || choices.length === 6 && subject === 'kana');
    for (const raw of choices) {
      const choice = object(raw, ['id', 'label']);
      demand(isSafeKey(text(choice.id, 64))); text(choice.label, 256);
      if (kind === 'kanji-on') demand(/^[\u30a1-\u30f6ー]+$/u.test(choice.label as string));
      if (['kanji-kun', 'kanji-word', 'vocab-reading'].includes(kind)) demand(isHiraganaReading(choice.label as string));
      if (kind === 'kana-read') demand(/^[a-z]+$/u.test(choice.label as string));
      if (kind === 'kana-pick') demand((source.prefix === 'h' ? /^[\u3041-\u3096]+$/u : /^[\u30a1-\u30faー]+$/u).test(choice.label as string));
    }
    text(q.correctChoiceId, 64);
    const correct = choices.find(raw => (raw as Record<string, unknown>).id === q.correctChoiceId) as Record<string, unknown> | undefined;
    demand(correct?.label === reveal.answer);
  } else {
    demand(kind === 'kana-type' && !Object.hasOwn(q, 'choices') && !Object.hasOwn(q, 'correctChoiceId'));
    const aliases = list(q.acceptedTyped, 8, 1).map(raw => text(raw, 32));
    demand(new Set(aliases).size === aliases.length && aliases.every(alias => /^[a-z]+$/u.test(alias)) && aliases.includes(normalizeTyped(reveal.answer as string)));
  }
  const result = q as unknown as Question;
  assertQuestion(result);
  return result;
}
function checkedConfig(value: unknown): SessionConfig {
  const cfg = object(value, ['sessionId', 'subject', 'origin', 'challenge', 'autoNext', 'previousSurvivalBest', 'rewardVersion'], ['repairOf']);
  text(cfg.sessionId, 256); enumeration(cfg.subject, ['kana', 'vocab', 'kanji']); enumeration(cfg.origin, ['practice', 'timed', 'survival', 'repair']);
  enumeration(cfg.challenge, ['steady', 'quick', 'lightning']); boolean(cfg.autoNext); num(cfg.previousSurvivalBest, 0, Number.MAX_SAFE_INTEGER, true);
  demand(cfg.rewardVersion === 1, 'version');
  if (cfg.repairOf !== undefined) text(cfg.repairOf, 256);
  const result = cfg as unknown as SessionConfig;
  validateSessionConfig(result);
  return result;
}
function checkedWire(raw: unknown, owner: string, now: ClockStamp): SessionSnapshot {
  const top = object(raw, ['schemaVersion', 'ownerKey', 'savedAtEpoch', 'cleanPause', 'state']);
  demand(top.schemaVersion === 1, 'version');
  demand(text(top.ownerKey, 128) === normalizeOwnerKey(owner), 'owner');
  const saved = num(top.savedAtEpoch, 0, 8.64e15);
  demand(now.epochMs - saved <= SESSION_LIMITS.snapshotTtlMs, 'expired');
  demand(saved - now.epochMs <= SESSION_LIMITS.snapshotTtlMs, 'future-clock');
  const clean = boolean(top.cleanPause);
  const s = object(top.state, ['phase', 'config', 'questions', 'current', 'index', 'records', 'pending', 'acknowledgedSeq',
    'commitTargetSeq', 'draft', 'remainingMs', 'survivalRemainingMs', 'questionElapsedMs', 'autoNextRemainingMs', 'autoNextToken',
    'autoNextCanceled', 'pauseRequested', 'resumeState', 'finishReason', 'volatile', 'revision', 'lastInputId']);
  const phase = enumeration(s.phase, ['asking', 'committing', 'feedback', 'paused', 'results'] as const);
  const cfg = checkedConfig(s.config);
  const questions = list(s.questions, SESSION_LIMITS.questions, 1).map(checkedQuestion);
  questions.forEach((question, index) => demand(question.subject === cfg.subject && question.id === occurrenceId(cfg.sessionId, index)
    && (cfg.origin !== 'survival' || question.responseType === 'choice')));
  demand(cfg.origin === 'survival' || new Set(questions.map(questionTargetKey)).size === questions.length);
  demand(cfg.origin !== 'repair' || questions.length <= 5);
  const index = num(s.index, 0, SESSION_LIMITS.records - 1, true);
  demand(cfg.origin === 'survival' || index < questions.length);
  const current = checkedQuestion(s.current);
  demand(canonical(current) === canonical({ ...questions[index % questions.length], id: occurrenceId(cfg.sessionId, index) }));
  const records = list(s.records, SESSION_LIMITS.records);
  const answers: AnswerRecord[] = [];
  let completions = 0;
  let survivalBudget: number = SESSION_LIMITS.survivalStartMs;
  const limit = timedLimitMs(cfg);
  for (const [position, rawRecord] of records.entries()) {
    const base = object(rawRecord, ['type', 'sessionId', 'seq', 'origin', 'answeredAt', 'localDate', 'rewardVersion', 'xp'],
      ['questionId', 'skillKey', 'target', 'outcome', 'responseId', 'typedValue', 'elapsedMs', 'uniqueFirstPassCount']);
    demand(base.sessionId === cfg.sessionId && base.seq === position + 1 && base.rewardVersion === 1);
    num(base.answeredAt, 0, 8.64e15); demand(validLocalDate(text(base.localDate, 10)));
    if (base.type === 'completion') {
      object(base, ['type', 'sessionId', 'seq', 'origin', 'answeredAt', 'localDate', 'rewardVersion', 'xp', 'uniqueFirstPassCount']);
      demand(++completions === 1 && position === records.length - 1 && ['practice', 'timed'].includes(cfg.origin)
        && base.origin === cfg.origin && answers.length === questions.length && base.uniqueFirstPassCount === questions.length && questions.length >= 10 && base.xp === 20);
      continue;
    }
    object(base, ['type', 'sessionId', 'seq', 'origin', 'answeredAt', 'localDate', 'rewardVersion', 'xp', 'questionId', 'skillKey', 'target', 'outcome', 'elapsedMs'], ['responseId', 'typedValue']);
    demand(base.type === 'answer' && completions === 0 && base.origin === cfg.origin && (cfg.origin === 'survival' || answers.length < questions.length));
    const expected = questions[answers.length % questions.length];
    demand(base.questionId === occurrenceId(cfg.sessionId, answers.length) && base.skillKey === expected.skillKey);
    const target = object(base.target, ['subject', 'itemId', 'kind'], ['kanaGlyph']);
    demand(target.subject === expected.subject && target.itemId === expected.itemId && target.kind === expected.kind);
    demand(expected.subject === 'kana' ? target.kanaGlyph === decodeId(expected.itemId).tuple[1] : !Object.hasOwn(target, 'kanaGlyph'));
    const outcome = enumeration(base.outcome, ['correct', 'wrong', 'timeout'] as const);
    const elapsed = num(base.elapsedMs);
    if (limit !== null) demand(elapsed <= limit + 0.000001 && (outcome === 'timeout' ? near(elapsed, limit) : elapsed < limit));
    if (cfg.origin === 'survival') {
      demand(survivalBudget > 0 && elapsed <= survivalBudget + 0.000001 && (outcome === 'timeout' ? near(elapsed, survivalBudget) : elapsed < survivalBudget));
      survivalBudget = Math.max(0, survivalBudget - elapsed);
      if (outcome === 'correct') survivalBudget = Math.min(SESSION_LIMITS.survivalCapMs, survivalBudget + 5000);
      if (outcome === 'wrong') survivalBudget = Math.max(0, survivalBudget - 8000);
    }
    if (outcome === 'timeout') demand((limit !== null || cfg.origin === 'survival') && !Object.hasOwn(base, 'responseId') && !Object.hasOwn(base, 'typedValue'));
    else {
      const response = expected.responseType === 'choice' ? { type: 'choice' as const, choiceId: text(base.responseId, 64) }
        : { type: 'typed' as const, value: text(base.typedValue, SESSION_LIMITS.draft) };
      demand(expected.responseType === 'choice' ? !Object.hasOwn(base, 'typedValue') : !Object.hasOwn(base, 'responseId'));
      const result = grade(expected, response);
      demand(result.valid && result.outcome === outcome);
    }
    demand(base.xp === rewardFor({ type: 'answer', origin: cfg.origin, subject: expected.subject, kind: expected.kind, outcome, challenge: cfg.challenge }).total);
    answers.push(base as unknown as AnswerRecord);
  }
  const answered = answers.length === index + 1;
  const unanswered = answers.length === index;
  demand(answered || unanswered);
  if (phase === 'asking' || phase === 'paused' && s.resumeState === 'asking') demand(unanswered);
  if (phase === 'feedback' || phase === 'committing' || phase === 'paused' && s.resumeState === 'feedback') demand(answered);
  const elapsed = num(s.questionElapsedMs);
  if (answered) demand(near(elapsed, answers[answers.length - 1].elapsedMs));
  const remaining = nullableNumber(s.remainingMs, limit ?? 0);
  demand(limit === null ? remaining === null : remaining !== null && near(remaining, Math.max(0, limit - elapsed)));
  const survival = nullableNumber(s.survivalRemainingMs, SESSION_LIMITS.survivalCapMs);
  demand(cfg.origin === 'survival' ? survival !== null && (!unanswered || elapsed <= survivalBudget + 0.000001)
    && near(survival, Math.max(0, survivalBudget - (unanswered ? elapsed : 0))) : survival === null);
  text(s.draft, SESSION_LIMITS.draft, false);
  const ack = num(s.acknowledgedSeq, 0, records.length, true);
  const targetSeq = num(s.commitTargetSeq, 0, records.length, true);
  const volatile = boolean(s.volatile);
  if (s.pending === null) demand(ack === records.length);
  else {
    const pending = object(s.pending, ['record', 'attempt', 'status'], ['failure']);
    num(pending.attempt, 0, Number.MAX_SAFE_INTEGER - 1, true);
    const status = enumeration(pending.status, ['pending', 'failed']);
    demand(ack < records.length && canonical(pending.record) === canonical(records[ack]));
    if (status === 'failed') enumeration(pending.failure, ['snapshot', 'outbox', 'stats', 'unavailable']);
    else demand(!Object.hasOwn(pending, 'failure'));
    demand(phase === 'committing' || volatile);
  }
  demand(phase === 'committing' ? s.pending !== null && targetSeq === records.length && targetSeq > ack : targetSeq === 0);
  const canceled = boolean(s.autoNextCanceled);
  const autoRemaining = nullableNumber(s.autoNextRemainingMs, cfg.origin === 'survival' ? SESSION_LIMITS.survivalFeedbackMs : SESSION_LIMITS.autoNextMs);
  const autoToken = s.autoNextToken === null ? null : num(s.autoNextToken, 1, records.length, true);
  demand((autoRemaining === null) === (autoToken === null));
  if (autoRemaining !== null) demand(cfg.autoNext && answered && answers.at(-1)?.outcome === 'correct' && autoToken === answers.at(-1)?.seq
    && (phase === 'feedback' || phase === 'paused' && s.resumeState === 'feedback'));
  const pauseRequested = boolean(s.pauseRequested);
  demand(!pauseRequested || phase === 'committing');
  demand(phase === 'paused' ? ['asking', 'feedback'].includes(text(s.resumeState, 16)) && canceled : s.resumeState === null);
  demand(clean === (phase !== 'asking'));
  if (phase === 'results') enumeration(s.finishReason, ['completed', 'partial', 'survival-zero', 'safety-limit']);
  else if (phase === 'committing' && s.finishReason !== null) enumeration(s.finishReason, ['completed', 'partial', 'survival-zero', 'safety-limit']);
  else demand(s.finishReason === null);
  if (s.finishReason === 'completed') demand(cfg.origin !== 'survival' && answers.length === questions.length && (cfg.origin === 'repair' || questions.length < 10 || completions === 1));
  if (s.finishReason === 'survival-zero') demand(cfg.origin === 'survival' && survival === 0 && answered);
  if (s.finishReason === 'safety-limit') demand(cfg.origin === 'survival' && records.length === SESSION_LIMITS.records);
  demand(completions === 0 || s.finishReason === 'completed');
  num(s.revision, 1, Number.MAX_SAFE_INTEGER - 1, true);
  if (s.lastInputId !== null) text(s.lastInputId, 128);
  return top as unknown as SessionSnapshot;
}

/** Caller pauses first on hidden/pagehide. This function performs no storage write. */
export function createSnapshot(state: ActiveSession, owner: string, clock: ClockStamp): SessionSnapshot {
  const at = checkpointSession(state, clock);
  const { runtime: _runtime, ...saved } = at;
  const snapshot: SessionSnapshot = { schemaVersion: 1, ownerKey: normalizeOwnerKey(owner), savedAtEpoch: clock.epochMs,
    cleanPause: at.phase !== 'asking', state: saved };
  const serialized = JSON.stringify(snapshot);
  if (new TextEncoder().encode(serialized).length > SESSION_LIMITS.snapshotBytes) throw new RangeError('Quiz snapshot exceeds 512 KiB');
  const copy: unknown = JSON.parse(serialized);
  jsonTree(copy);
  return freeze(checkedWire(copy, owner, clock));
}
export function serializeSnapshot(state: ActiveSession, owner: string, clock: ClockStamp): string {
  return JSON.stringify(createSnapshot(state, owner, clock));
}
/** Rehydrate only validated data. Clock rollback cannot increase saved remaining time. */
export function validateSnapshot(raw: unknown, owner: string, now: ClockStamp): SnapshotValidation {
  try {
    demand(validClock(now));
    normalizeOwnerKey(owner);
    let parsed: unknown;
    if (typeof raw === 'string') {
      demand(new TextEncoder().encode(raw).length <= SESSION_LIMITS.snapshotBytes, 'size');
      parsed = JSON.parse(raw);
    } else { jsonTree(raw); parsed = JSON.parse(JSON.stringify(raw)); }
    jsonTree(parsed);
    demand(new TextEncoder().encode(JSON.stringify(parsed)).length <= SESSION_LIMITS.snapshotBytes, 'size');
    const snapshot = checkedWire(parsed, owner, now);
    const saved = snapshot.state;
    const lost = snapshot.cleanPause ? 0 : Math.max(0, now.epochMs - snapshot.savedAtEpoch);
    const budget = saved.remainingMs ?? saved.survivalRemainingMs;
    const spent = saved.phase === 'asking' && budget !== null ? Math.min(budget, lost) : 0;
    const phase = saved.phase === 'asking' || saved.phase === 'feedback' ? 'paused' : saved.phase;
    const resumeState = saved.phase === 'asking' || saved.phase === 'feedback' ? saved.phase : saved.resumeState;
    const state: ActiveSession = { ...saved, phase, resumeState,
      remainingMs: saved.remainingMs === null ? null : Math.max(0, saved.remainingMs - spent),
      survivalRemainingMs: saved.survivalRemainingMs === null ? null : Math.max(0, saved.survivalRemainingMs - spent),
      questionElapsedMs: saved.questionElapsedMs + spent,
      autoNextCanceled: true, pauseRequested: saved.phase === 'committing' ? true : saved.pauseRequested,
      revision: saved.revision + 1,
      runtime: { lastMonoMs: now.monoMs, anchorMonoMs: null, deadlineMonoMs: null, autoNextDeadlineMonoMs: null } };
    return freeze({ ok: true, state });
  } catch (error) {
    return freeze({ ok: false, reason: error instanceof InvalidSnapshot ? error.reason : 'malformed', message: RESTORE_FAILURE_MESSAGE });
  }
}
