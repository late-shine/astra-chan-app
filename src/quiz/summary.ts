import { rewardFor } from './reward';
import { freeze, type ActiveSession, type AnswerRecord, type Question, type QuizProgressRecord } from './types';

export interface SummaryMiss {
  readonly questionId: string; readonly itemId: string; readonly skillKey: string;
  readonly subject: Question['subject']; readonly kind: Question['kind']; readonly face: string;
  readonly deck?: Question['deck'];
}
export interface SessionSummary {
  readonly sessionId: string; readonly complete: boolean; readonly partial: boolean;
  readonly firstPass: { readonly attempted: number; readonly correct: number; readonly wrong: number;
    readonly timeout: number; readonly accuracy: number | null };
  readonly unattempted: number;
  readonly repair: { readonly attempted: number; readonly correct: number; readonly correctedMisses: number; readonly xp: number };
  readonly xp: { readonly base: number; readonly challenge: number; readonly completion: number; readonly total: number; readonly durablyAcknowledged: number };
  readonly misses: readonly SummaryMiss[]; readonly remainingMisses: readonly SummaryMiss[];
  /** Record acknowledgement only; browser recovery/cloud status belongs to adapters. */
  readonly recordSaveStatus: 'none' | 'pending' | 'failed' | 'acknowledged';
  readonly survival: { readonly score: number; readonly previousBest: number; readonly best: number; readonly newBest: boolean } | null;
}

/** Optional linked repair sessions add a separate repair line, never first-try attempts. */
export function summarize(session: ActiveSession, repairs: readonly ActiveSession[] = []): SessionSummary {
  const answers = session.records.filter((record): record is AnswerRecord => record.type === 'answer');
  const first = answers.filter(record => record.origin !== 'repair' && record.outcome !== 'unattempted');
  const uniqueRepairs = new Map<string, { record: AnswerRecord; session: ActiveSession }>();
  const linked = repairs.filter(repair => repair.config.origin === 'repair' && repair.config.repairOf === session.config.sessionId);
  for (const repairSession of [session, ...linked]) for (const record of repairSession.records) {
    if (record.type === 'answer' && record.origin === 'repair' && record.outcome !== 'unattempted') {
      uniqueRepairs.set(JSON.stringify([record.sessionId, record.seq]), { record, session: repairSession });
    }
  }
  const repairAnswers = [...uniqueRepairs.values()];
  const misses = new Map<string, SummaryMiss>();
  for (const [index, record] of answers.entries()) {
    if (record.origin === 'repair' || !['wrong', 'timeout'].includes(record.outcome)) continue;
    const question = session.questions[index % session.questions.length];
    if (!misses.has(record.skillKey)) misses.set(record.skillKey, { questionId: record.questionId, itemId: record.target.itemId,
      skillKey: record.skillKey, subject: record.target.subject, kind: record.target.kind, face: question.face,
      ...(question.deck ? { deck: { ...question.deck } } : {}) });
  }
  const corrected = new Set(repairAnswers.filter(({ record }) => record.outcome === 'correct' && misses.has(record.skillKey)).map(({ record }) => record.skillKey));
  let base = 0, challenge = 0, completion = 0;
  const xpRecords = new Map<string, { record: QuizProgressRecord; session: ActiveSession }>();
  for (const record of session.records) xpRecords.set(JSON.stringify([record.sessionId, record.seq]), { record, session });
  for (const entry of repairAnswers) xpRecords.set(JSON.stringify([entry.record.sessionId, entry.record.seq]), entry);
  let durable = 0;
  for (const { record, session: source } of xpRecords.values()) {
    const reward = record.type === 'completion' ? { base: 0, challenge: 0, completion: record.xp }
      : rewardFor({ type: 'answer', origin: record.origin, subject: record.target.subject, kind: record.target.kind,
        outcome: record.outcome, challenge: source.config.challenge });
    base += reward.base; challenge += reward.challenge; completion += reward.completion;
    if (record.seq <= source.acknowledgedSeq) durable += record.xp;
  }
  const correct = first.filter(record => record.outcome === 'correct').length;
  const score = answers.filter(record => record.origin === 'survival' && record.outcome === 'correct').length;
  const previousBest = session.config.previousSurvivalBest;
  return freeze({ sessionId: session.config.sessionId, complete: session.finishReason === 'completed',
    partial: ['partial', 'safety-limit'].includes(session.finishReason ?? '') || session.phase !== 'results',
    firstPass: { attempted: first.length, correct, wrong: first.filter(record => record.outcome === 'wrong').length,
      timeout: first.filter(record => record.outcome === 'timeout').length, accuracy: first.length ? correct / first.length : null },
    unattempted: session.config.origin === 'survival' ? 0 : Math.max(0, session.questions.length - answers.filter(record => record.outcome !== 'unattempted').length),
    repair: { attempted: repairAnswers.length, correct: repairAnswers.filter(({ record }) => record.outcome === 'correct').length,
      correctedMisses: corrected.size, xp: repairAnswers.reduce((total, { record }) => total + record.xp, 0) },
    xp: { base, challenge, completion, total: base + challenge + completion, durablyAcknowledged: durable },
    misses: [...misses.values()], remainingMisses: [...misses.values()].filter(miss => !corrected.has(miss.skillKey)),
    recordSaveStatus: xpRecords.size === 0 ? 'none' : !session.pending && linked.every(repair => !repair.pending) ? 'acknowledged'
      : session.pending?.status === 'failed' || linked.some(repair => repair.pending?.status === 'failed') ? 'failed' : 'pending',
    survival: session.config.origin === 'survival' ? { score, previousBest, best: Math.max(previousBest, score), newBest: score > previousBest } : null,
  });
}
