import type { QuizReceipt, QuizSkillProgress, StudentStats } from '../types';
import { grade } from './grade';
import { compareText, decodeId, isSafeKey, occurrenceId, skillKey } from './ids';
import { rewardFor } from './reward';
import { questionTargetKey, validLocalDate } from './session';
import { QUESTION_KINDS, SESSION_LIMITS, type ActiveSession, type AnswerRecord, type ChallengeTier,
  type CompletionRecord, type QuestionKind, type QuizHistory } from './types';

export const QUIZ_SKILL_LIMIT = 6000;
export const QUIZ_OUTBOX_LIMIT = 5000;
const RECEIPT_LIMIT = 128;
const RECEIPT_TTL = 30 * 86_400_000;
type QuizMaps = Pick<StudentStats, 'quizSkills' | 'quizReceipts'>;

/** Outbox projection. Raw responses and frozen questions stay in the session snapshot. */
export interface ProgressEntry {
  readonly record: Omit<AnswerRecord, 'responseId' | 'typedValue'> | CompletionRecord;
  readonly challenge: ChallengeTier;
  readonly difficulty?: import("./types").DuelDifficulty;
  readonly survivalScore?: number;
}

const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const epoch = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 8.64e15;
const compareDesc = (a: number, b: number) => b - a;

export function validQuizSessionId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 128 &&
    isSafeKey(value) && !Object.hasOwn(Object.prototype, value) && value !== 'prototype';
}

function decodeSkill(key: string) {
  if (!isSafeKey(key)) return null;
  const split = key.lastIndexOf('__');
  if (split < 0) return null;
  const itemId = key.slice(0, split);
  const kind = key.slice(split + 2) as QuestionKind;
  if (!QUESTION_KINDS.includes(kind)) return null;
  try {
    const { prefix, tuple } = decodeId(itemId);
    if (kind.startsWith('kana-')) {
      const hiragana = prefix === 'h' && tuple[0] === 'hiragana' && /^[\u3041-\u3096]+$/u.test(tuple[1] ?? '');
      const katakana = prefix === 'k' && tuple[0] === 'katakana' && /^[\u30a1-\u30faー]+$/u.test(tuple[1] ?? '');
      if (tuple.length === 2 && (hiragana || katakana)) return { itemId, kind, subject: 'kana', kanaGlyph: tuple[1] } as const;
      return null;
    }
    if (kind.startsWith('vocab-')) {
      return prefix === 'v' && tuple.length === 3 && tuple.every(part => part.trim())
        ? { itemId, kind, subject: 'vocab' } as const : null;
    }
    const valid = kind === 'kanji-word' ? prefix === 'w' && tuple.length === 3 && tuple.every(part => part.trim())
      : prefix === 'j' && tuple.length === 1 && /^[\u3400-\u9fff]$/u.test(tuple[0]);
    return valid ? { itemId, kind, subject: 'kanji' } as const : null;
  } catch { return null; }
}

function skillRows(raw: unknown): Record<string, QuizSkillProgress> {
  const rows: Record<string, QuizSkillProgress> = {};
  for (const [key, value] of Object.entries(object(raw) ?? {})) {
    const row = object(value);
    if (!decodeSkill(key) || !row || !count(row.a) || !count(row.c) || row.c > row.a || !epoch(row.t)) continue;
    if (row.m !== undefined && (!epoch(row.m) || row.m > row.t || row.c === row.a)) continue;
    if ((row.ra !== undefined || row.rc !== undefined) && (!count(row.ra) || !count(row.rc) || row.rc > row.ra)) continue;
    if (row.a === 0 && !row.ra) continue;
    rows[key] = {
      a: row.a, c: row.c, t: row.t,
      ...(row.m === undefined ? {} : { m: row.m as number }),
      ...(count(row.ra) && row.ra > 0 && count(row.rc) ? { ra: row.ra, rc: row.rc } : {}),
    };
  }
  return rows;
}

function receiptRows(raw: unknown): Record<string, QuizReceipt> {
  const rows: Record<string, QuizReceipt> = {};
  for (const [key, value] of Object.entries(object(raw) ?? {})) {
    const row = object(value);
    if (validQuizSessionId(key) && row && count(row.through) && row.through > 0 &&
      row.through <= SESSION_LIMITS.records && epoch(row.at)) rows[key] = { through: row.through, at: row.at };
  }
  return rows;
}

function capMaps(skills: Record<string, QuizSkillProgress>, receipts: Record<string, QuizReceipt>,
  now: number, pinned: ReadonlySet<string>) {
  const orderedSkills = Object.entries(skills).sort(([ak, a], [bk, b]) => compareDesc(a.t, b.t) || compareText(ak, bk));
  const allReceipts = Object.entries(receipts);
  const keepPinned = allReceipts.filter(([id]) => pinned.has(id));
  const recent = allReceipts.filter(([id, row]) => !pinned.has(id) && now - row.at <= RECEIPT_TTL)
    .sort(([ak, a], [bk, b]) => compareDesc(a.at, b.at) || compareText(ak, bk)).slice(0, RECEIPT_LIMIT);
  const kept = [...keepPinned, ...recent].sort(([a], [b]) => compareText(a, b));
  const maps: QuizMaps = {};
  if (orderedSkills.length) maps.quizSkills = Object.fromEntries(orderedSkills.slice(0, QUIZ_SKILL_LIMIT));
  if (kept.length) maps.quizReceipts = Object.fromEntries(kept);
  return { maps, prunedSkills: Math.max(0, orderedSkills.length - QUIZ_SKILL_LIMIT), prunedReceipts: allReceipts.length - kept.length };
}

export function sanitizeQuizProgress(raw: unknown, now: number, pinned: ReadonlySet<string> = new Set()) {
  const stats = object(raw);
  return capMaps(skillRows(stats?.quizSkills), receiptRows(stats?.quizReceipts), now, pinned);
}

/** Load structural receipts before auth resolves. Age/count pruning then uses the owner's pins. */
export function readQuizProgress(raw: unknown) {
  const stats = object(raw);
  const receipts = receiptRows(stats?.quizReceipts);
  return capMaps(skillRows(stats?.quizSkills), receipts, 0, new Set(Object.keys(receipts)));
}

export function withQuizMaps(stats: StudentStats, maps: QuizMaps): StudentStats {
  const { quizSkills: _skills, quizReceipts: _receipts, ...rest } = stats;
  return { ...rest, ...maps };
}

export function canUseDeviceStats(stats: StudentStats, binding: { owner: string; backupUpload?: string } | 'transition' | null, owner: string): boolean {
  if (binding === 'transition') return false;
  return binding?.owner === owner || (!binding?.backupUpload && !stats.quizSkills && !stats.quizReceipts);
}

export function mergeQuizProgress(a: QuizMaps, b: QuizMaps, now: number, pinned: ReadonlySet<string> = new Set()) {
  const skills = skillRows(a.quizSkills);
  for (const [key, row] of Object.entries(skillRows(b.quizSkills))) {
    const old = skills[key];
    const order = old && (row.t - old.t || row.a - old.a || row.c - old.c || compareText(JSON.stringify(row), JSON.stringify(old)));
    if (!old || (order ?? 0) > 0) skills[key] = row;
  }
  const receipts = receiptRows(a.quizReceipts);
  for (const [key, row] of Object.entries(receiptRows(b.quizReceipts))) {
    const old = receipts[key];
    if (!old || row.through > old.through || row.through === old.through && row.at > old.at) receipts[key] = row;
  }
  return capMaps(skills, receipts, now, pinned);
}

export function receiptThrough(stats: QuizMaps, sessionId: string): number {
  const receipts = stats.quizReceipts;
  return receipts && Object.hasOwn(receipts, sessionId) ? receipts[sessionId].through : 0;
}

export function hasUnseenQuizReceipt(raw: unknown, observed: QuizMaps | null): boolean {
  const disk = receiptRows(object(raw)?.quizReceipts);
  return Object.entries(disk).some(([session, row]) => row.through > receiptThrough(observed ?? {}, session));
}

export function parseProgressEntry(raw: unknown): ProgressEntry | null {
  const input = object(raw);
  const r = object(input?.record);
  const tier = input?.challenge;
  if (!r || (tier !== 'steady' && tier !== 'quick' && tier !== 'lightning') || r.rewardVersion !== 1 ||
    !validQuizSessionId(r.sessionId) || !count(r.seq) || r.seq < 1 || r.seq > SESSION_LIMITS.records ||
    !epoch(r.answeredAt) || typeof r.localDate !== 'string' || !validLocalDate(r.localDate)) return null;
  const common = { sessionId: r.sessionId, seq: r.seq, answeredAt: r.answeredAt, localDate: r.localDate, rewardVersion: 1 as const };
  if (r.type === 'completion') {
    if ((r.origin !== 'practice' && r.origin !== 'timed') || (r.origin === 'practice' && tier !== 'steady') ||
      !count(r.uniqueFirstPassCount) || r.uniqueFirstPassCount < 10 || r.uniqueFirstPassCount > SESSION_LIMITS.questions ||
      r.seq !== r.uniqueFirstPassCount + 1 || r.xp !== 20 || input?.survivalScore !== undefined) return null;
    return { challenge: tier, record: { ...common, type: 'completion', origin: r.origin, uniqueFirstPassCount: r.uniqueFirstPassCount, xp: 20 } };
  }
  if (r.type !== 'answer' || typeof r.skillKey !== 'string' || typeof r.questionId !== 'string' || !isSafeKey(r.questionId) ||
    typeof r.elapsedMs !== 'number' || !Number.isFinite(r.elapsedMs) || r.elapsedMs < 0) return null;
  const target = decodeSkill(r.skillKey);
  const rawTarget = object(r.target);
  if (!target || !rawTarget || rawTarget.itemId !== target.itemId || rawTarget.kind !== target.kind ||
    rawTarget.subject !== target.subject || rawTarget.kanaGlyph !== target.kanaGlyph) return null;
  const origin = r.origin;
  const outcome = r.outcome;
  if (origin !== 'practice' && origin !== 'timed' && origin !== 'survival' && origin !== 'repair' && origin !== 'duel') return null;
  if (outcome !== 'correct' && outcome !== 'wrong' && outcome !== 'timeout' && outcome !== 'unattempted') return null;
  const difficulty=input?.difficulty;
  if (origin==='duel' ? !['easy','medium','hard','superhard'].includes(difficulty as string) || !['kana-read','kana-type','vocab-meaning','vocab-reading','vocab-reverse','kanji-meaning','kanji-on'].includes(target.kind) : difficulty!==undefined) return null;
  if (origin !== 'timed' && tier !== 'steady') return null;
  if (origin === 'repair' && r.seq > 5) return null;
  try {
    if (r.questionId !== occurrenceId(r.sessionId, r.seq - 1)) return null;
    const xp = rewardFor({ type: 'answer', origin, subject: target.subject, kind: target.kind, outcome, challenge: tier, ...(origin==='duel'?{difficulty:difficulty as import("./types").DuelDifficulty}:{}) }).total;
    if (xp !== r.xp) return null;
    const survivalScore = input?.survivalScore;
    if (origin === 'survival') {
      if (!count(survivalScore) || survivalScore > r.seq || (outcome === 'correct' && survivalScore === 0)) return null;
    } else if (survivalScore !== undefined) return null;
    return {
      challenge: tier,
      ...(origin==='duel'?{difficulty:difficulty as import("./types").DuelDifficulty}:{}),
      ...(typeof survivalScore === 'number' ? { survivalScore } : {}),
      record: { ...common, type: 'answer', origin, outcome, questionId: r.questionId, skillKey: r.skillKey,
        target, elapsedMs: r.elapsedMs, xp },
    };
  } catch { return null; }
}

/** Derive the outbox entry from the pending frozen question and accepted response. */
export function progressEntryForPending(state: ActiveSession): ProgressEntry {
  const record = state.pending?.record;
  if (!record || record.sessionId !== state.config.sessionId || record.origin !== state.config.origin) throw new Error('Invalid pending quiz record');
  const records = state.records.slice(0, record.seq);
  if (records.length !== record.seq || JSON.stringify(records.at(-1)) !== JSON.stringify(record)) throw new Error('Pending record is outside its log');
  if (record.type === 'answer') {
    const question = state.questions[(record.seq - 1) % state.questions.length];
    if (!question || record.skillKey !== question.skillKey || record.target.itemId !== question.itemId ||
      record.target.kind !== question.kind || record.target.subject !== question.subject) throw new Error('Pending record does not match the question');
    if (record.outcome === 'correct' || record.outcome === 'wrong') {
      const response = question.responseType === 'typed' ? { type: 'typed' as const, value: record.typedValue ?? '' }
        : { type: 'choice' as const, choiceId: record.responseId ?? '' };
      const graded = grade(question, response);
      if (!graded.valid || graded.outcome !== record.outcome) throw new Error('Pending outcome does not match the response');
    }
  } else {
    const targets = new Set(state.questions.map(questionTargetKey));
    if (targets.size !== record.uniqueFirstPassCount || record.seq !== state.questions.length + 1 ||
      records.slice(0, -1).some(answer => answer.type !== 'answer' || answer.outcome === 'unattempted')) {
      throw new Error('Invalid completion record');
    }
  }
  const survivalScore = state.config.origin === 'survival'
    ? records.filter(answer => answer.type === 'answer' && answer.outcome === 'correct').length : undefined;
  const entry = parseProgressEntry({ record, challenge: state.config.challenge, survivalScore });
  if (!entry) throw new Error('Invalid quiz reward or progress target');
  return entry;
}

function streakEndingOn(dates: readonly string[], anchor: string): number {
  const studied = new Set(dates);
  let day = Date.parse(`${anchor}T00:00:00.000Z`);
  let streak = 0;
  // UTC here is calendar arithmetic on the captured local label, not a conversion of the answer epoch.
  while (Number.isFinite(day) && studied.has(new Date(day).toISOString().slice(0, 10))) {
    streak++;
    day -= 86_400_000;
  }
  return streak;
}

function checkedEntry(input: ProgressEntry): ProgressEntry {
  const entry = parseProgressEntry(input);
  if (!entry) throw new Error('Invalid quiz progress record');
  return entry;
}

function ownedStats(stats: StudentStats) {
  return { ...stats, quizSkills: { ...stats.quizSkills }, quizReceipts: { ...stats.quizReceipts } };
}

/** Only mutates the copy made for this reduction or hydration replay. */
function applyEntry(next: ReturnType<typeof ownedStats>, entry: ProgressEntry): void {
  const r = entry.record;
  const through = receiptThrough(next, r.sessionId);
  if (r.seq <= through) return;
  if (r.seq !== through + 1) throw new Error('Quiz receipt sequence gap');
  const oldReceipt = next.quizReceipts[r.sessionId];
  next.quizReceipts[r.sessionId] = { through: r.seq, at: Math.max(oldReceipt?.at ?? 0, r.answeredAt) };
  next.xp += r.xp;
  if (r.type === 'answer' && r.outcome !== 'unattempted') {
    const old = next.quizSkills[r.skillKey] ?? { a: 0, c: 0, t: 0 };
    const row = { ...old, t: Math.max(old.t, r.answeredAt) };
    const correct = Number(r.outcome === 'correct');
    if (r.origin === 'repair') {
      row.ra = Math.min(Number.MAX_SAFE_INTEGER, (row.ra ?? 0) + 1);
      row.rc = Math.min(Number.MAX_SAFE_INTEGER, (row.rc ?? 0) + correct);
    } else {
      row.a = Math.min(Number.MAX_SAFE_INTEGER, row.a + 1);
      row.c = Math.min(Number.MAX_SAFE_INTEGER, row.c + correct);
      if (!correct && row.c < row.a) row.m = Math.max(row.m ?? 0, r.answeredAt);
      next.totalAttempts++;
      next.correctCount += correct;
      const days = next.studyDates ?? [];
      next.studyDates = days.includes(r.localDate) ? days : [...days, r.localDate];
      const last = next.lastActiveDate;
      let anchor = last && validLocalDate(last) && last > r.localDate ? last : r.localDate;
      for (const date of next.studyDates) if (validLocalDate(date) && date > anchor) anchor = date;
      next.lastActiveDate = anchor;
      next.streakCount = streakEndingOn(next.studyDates, anchor);
      if (r.target.subject === 'kana' && r.target.kanaGlyph) {
        const key = r.target.kanaGlyph;
        const oldGlyph = next.characterProgress?.[key] ?? { correct: 0, total: 0 };
        next.characterProgress = { ...next.characterProgress, [key]: { total: oldGlyph.total + 1, correct: oldGlyph.correct + correct } };
      }
      if (entry.survivalScore !== undefined) next.survivalBestScore = Math.max(next.survivalBestScore ?? 0, entry.survivalScore);
    }
    next.quizSkills[r.skillKey] = row;
  }
}

export function applyQuizRecord(stats: StudentStats, input: ProgressEntry, now = input.record.answeredAt,
  pinned: ReadonlySet<string> = new Set()): StudentStats {
  const entry = checkedEntry(input);
  if (entry.record.seq <= receiptThrough(stats, entry.record.sessionId)) return stats;
  const next = ownedStats(stats);
  applyEntry(next, entry);
  return withQuizMaps(next, capMaps(next.quizSkills, next.quizReceipts, now, new Set([...pinned, entry.record.sessionId])).maps);
}

/** Replay before merging receipts. A missing prefix is a sync error, never a fabricated receipt. */
export function hydrateQuizProgress(local: StudentStats, cloud: StudentStats | null,
  entries: readonly ProgressEntry[], now: number, activeSessions: ReadonlySet<string> = new Set()) {
  const pinned = new Set([...activeSessions, ...entries.map(entry => entry.record.sessionId)]);
  const baseline = cloud ?? local;
  const clean = sanitizeQuizProgress(baseline, now, pinned);
  const stats = ownedStats(withQuizMaps(baseline, clean.maps));
  const ordered = [...entries].sort((a, b) => compareText(a.record.sessionId, b.record.sessionId) || a.record.seq - b.record.seq);
  for (const entry of ordered) applyEntry(stats, checkedEntry(entry));
  const merged = mergeQuizProgress(stats, local, now, pinned);
  return { stats: withQuizMaps(stats, merged.maps), prunedSkills: clean.prunedSkills + merged.prunedSkills };
}

/** Only kana-read can consult legacy glyph totals. Repair time cannot stand in for last correct. */
export function quizHistoryFromStats(stats: StudentStats): QuizHistory {
  return {
    characterProgress: stats.characterProgress,
    skills: Object.fromEntries(Object.entries(stats.quizSkills ?? {}).map(([key, row]) => [key, {
      firstAttempts: row.a, firstCorrect: row.c,
      ...(row.m === undefined ? {} : { lastFirstMissAt: row.m }),
      ...(row.c > 0 && row.m !== row.t && !row.ra ? { lastCorrectAt: row.t } : {}),
    }])),
  };
}
