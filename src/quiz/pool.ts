import { createKanaCandidates } from './content/kana';
import { createVocabularyCandidates } from './content/vocabulary';
import { createKanjiCandidates } from './content/kanji';
import { contextHighlights, createContextCandidates } from './content/context';
import { chooseFoils } from './distractors';
import { assertQuestion } from './grade';
import { compareText, occurrenceId } from './ids';
import { draw, shuffle } from './random';
import { QUESTION_KINDS, freeze, type BuildConfig, type BuildResult, type Candidate, type Catalogs,
  type EligibilityReport, type ExclusionReason, type FactoryResult, type Question, type QuestionKind, type QuizHistory, type RandomInt } from './types';

export const ELIGIBILITY_REASON_LABELS: Readonly<Record<ExclusionReason, string>> = freeze({
  'invalid-content': 'Incomplete or unsupported content', 'id-too-long': 'Source identity is too long',
  'ambiguous-prompt': 'Prompt needs disambiguation', 'unsupported-reading': 'Reading is not supported',
  unreviewed: 'Awaiting content review', 'rare-word': 'Outside the common curated set',
  'missing-target': 'Target kanji is missing', 'conflicting-word': 'Word has conflicting readings',
  'insufficient-choices': 'Not enough distinct answer choices',
});
const DEFAULT_KINDS = freeze({ kana: ['kana-read'], vocab: ['vocab-meaning'], kanji: ['kanji-meaning'] } as const);

function prepare(catalogs: Catalogs, config: BuildConfig): { candidates: Candidate[]; report: EligibilityReport } {
  if (!Number.isSafeInteger(config.length) || config.length < 1 || !Number.isFinite(config.now)) throw new RangeError('Invalid quiz length or clock');
  occurrenceId(config.sessionId, Math.max(0, config.length - 1));
  const requested = config.kinds ?? DEFAULT_KINDS[config.subject];
  const kinds = [...new Set(requested)].sort(compareText);
  const prefix = config.subject === 'vocab' ? 'vocab-' : `${config.subject}-`;
  if (!kinds.length || kinds.some(kind => !QUESTION_KINDS.includes(kind) || !kind.startsWith(prefix))) throw new RangeError('Kinds must belong to the selected subject');
  if (config.choiceCount !== undefined && config.choiceCount !== 4 && config.choiceCount !== 6) throw new RangeError('Invalid choice count');
  if (config.choiceCount === 6 && config.subject !== 'kana') throw new RangeError('Six choices are supported only for kana');
  const filter = config.pool?.filter ?? 'all';
  if ((filter === 'learned' && config.subject !== 'vocab') || (filter === 'studied' && config.subject !== 'kanji')) throw new RangeError('Manual flags apply only to their own subject');
  const empty = (sourceCount: number): FactoryResult => ({ sourceCount, candidates: [], exclusions: [], duplicateIdentities: [] });
  const kana = config.subject === 'kana' ? createKanaCandidates(catalogs) : empty(catalogs.hiragana.length + catalogs.katakana.length);
  const vocab = config.subject === 'vocab' ? createVocabularyCandidates(catalogs) : empty(catalogs.vocabulary.length);
  const kanji = config.subject === 'kanji' ? createKanjiCandidates(catalogs) : empty(catalogs.kanji.length);
  const context = createContextCandidates(catalogs);
  const factories = [kana, vocab, kanji, context];
  const scoped = factories.flatMap(factory => factory.candidates).filter(candidate => {
    if (candidate.subject !== config.subject) return false;
    if (config.subject === 'kana') {
      if (config.pool?.script && config.pool.script !== 'both' && candidate.script !== config.pool.script) return false;
      if (!(config.pool?.stages ?? ['basic']).some(stage => stage === candidate.stage)) return false;
    }
    if (config.subject === 'vocab' && config.pool?.category && config.pool.category !== 'all' && candidate.category !== config.pool.category) return false;
    if (filter === 'custom' && !config.pool?.itemIds?.includes(candidate.itemId)) return false;
    if (filter === 'learned' && !config.pool?.learnedWords?.includes(candidate.deck.itemKey)) return false;
    if (filter === 'studied' && !candidate.roots?.some(root => config.pool?.studiedKanji?.includes(root))) return false;
    return true;
  });
  const candidates = scoped.filter(candidate => kinds.includes(candidate.kind)).map(candidate => {
    if (candidate.kind === 'kanji-word' && filter === 'studied') {
      const root = candidate.roots?.find(value => config.pool?.studiedKanji?.includes(value));
      if (root) return { ...candidate, deck: { itemKey: root, type: 'kanji' as const }, highlights: contextHighlights(candidate.face, root) };
    }
    return candidate;
  }).sort((a, b) => compareText(a.skillKey, b.skillKey));
  const needsFallback = config.choiceCount === 6 && candidates.some(candidate => !candidate.typed && candidate.foils.length < 5);
  const choiceCount = config.choiceCount === 6 && !needsFallback ? 6 : 4;
  const notices: string[] = [];
  if (needsFallback) notices.push('This pool supports four choices. Use four choices for the entire round.');
  const targets = new Set(candidates.map(candidate => candidate.targetKey)).size;
  if (targets < config.length) notices.push(`This pool has ${targets} distinct targets; the round will contain ${targets} questions.`);
  const curatedCount = config.subject === 'kanji' ? scoped.filter(candidate => candidate.kind === 'kanji-word').length : context.candidates.length;
  if (kinds.includes('kanji-word') && context.candidates.length < 10) notices.push(`Smaller curated set: ${context.candidates.length} eligible words; fewer than the planned ten-word threshold.`);
  const eligibleByKind = Object.fromEntries(QUESTION_KINDS.map(kind => [kind, candidates.filter(candidate => candidate.kind === kind).length])) as Record<QuestionKind, number>;
  return { candidates, report: freeze({
    sourceCounts: { kana: kana.sourceCount, vocab: vocab.sourceCount, kanji: kanji.sourceCount, context: context.sourceCount },
    duplicateIdentities: factories.flatMap(factory => factory.duplicateIdentities).sort(compareText),
    exclusions: factories.flatMap(factory => factory.exclusions), eligibleByKind, eligibleTargets: targets,
    effectiveChoiceCount: choiceCount, requiresFourChoiceAcknowledgement: needsFallback,
    notices, curatedWordCount: curatedCount,
    curatedSetLabel: `${context.candidates.length < 10 ? 'Smaller curated set' : 'Curated set'} · ${curatedCount} words`,
  }) };
}

/** Setup preflight: report notices before Start, particularly six-to-four fallback. */
export function getEligibility(catalogs: Catalogs, config: BuildConfig): EligibilityReport {
  return prepare(catalogs, config).report;
}
export type HistoryBucket = 'weak' | 'new' | 'other';
export function historyBucket(candidate: Candidate, history: QuizHistory, now: number): HistoryBucket {
  const record = history.skills?.[candidate.skillKey];
  if (record && record.firstAttempts > 0) {
    const recentMiss = record.lastFirstMissAt !== undefined && now >= record.lastFirstMissAt && now - record.lastFirstMissAt <= 72 * 60 * 60 * 1000;
    return (record.firstAttempts >= 2 && record.firstCorrect / record.firstAttempts < 0.7) || recentMiss ? 'weak' : 'other';
  }
  // Legacy accuracy is weak evidence only for reading that exact kana.
  const legacy = candidate.kind === 'kana-read' ? history.characterProgress?.[candidate.deck.itemKey] : undefined;
  if (legacy && legacy.total > 0) return legacy.total >= 2 && legacy.correct / legacy.total < 0.7 ? 'weak' : 'other';
  return 'new';
}
function weight(candidate: Candidate, bucket: HistoryBucket, history: QuizHistory, now: number): number {
  const correctAt = history.skills?.[candidate.skillKey]?.lastCorrectAt;
  const recent = correctAt !== undefined && now >= correctAt && now - correctAt < 10 * 60 * 1000;
  return ({ weak: 16, new: 8, other: 4 }[bucket]) / (recent ? 4 : 1);
}

/** Freeze one eligible adapter candidate; session builders normally call buildQuestions. */
export function createQuestion(candidate: Candidate, occurrence: { readonly sessionId: string; readonly index: number; readonly choiceCount?: 4 | 6 }, rng: RandomInt): Question {
  const choiceCount = occurrence.choiceCount ?? 4;
  if (!candidate.typed && (candidate.foils.length < choiceCount - 1 || (choiceCount === 6 && candidate.subject !== 'kana'))) throw new Error('Candidate cannot supply the requested choices');
  const answer = candidate.answers[draw(rng, candidate.answers.length)];
  const base = { id: occurrenceId(occurrence.sessionId, occurrence.index), itemId: candidate.itemId, skillKey: candidate.skillKey,
    subject: candidate.subject, kind: candidate.kind, instruction: candidate.instruction, face: candidate.face,
    ...(candidate.faceSub !== undefined ? { faceSub: candidate.faceSub } : {}),
    ...(candidate.highlights ? { highlights: candidate.highlights.map(range => ({ ...range })) } : {}),
    reveal: { ...candidate.reveal, answer,
      ...(['kanji-on', 'kanji-kun'].includes(candidate.kind) ? { reading: answer } : {}) },
    ...(candidate.speechText ? { speechText: candidate.speechText } : {}), deck: { ...candidate.deck },
  };
  let question: Question;
  if (candidate.typed) question = { ...base, responseType: 'typed', acceptedTyped: [...candidate.typed] };
  else {
    const labels = shuffle([answer, ...chooseFoils(candidate.foils, choiceCount - 1, rng)], rng);
    const choices = labels.map((label, choiceIndex) => ({ id: `c_${choiceIndex}`, label }));
    question = { ...base, responseType: 'choice', choices, correctChoiceId: choices[labels.indexOf(answer)].id };
  }
  assertQuestion(question);
  return freeze(question);
}

export function buildQuestions(catalogs: Catalogs, config: BuildConfig, history: QuizHistory, rng: RandomInt): BuildResult {
  const { candidates, report } = prepare(catalogs, config);
  if (report.requiresFourChoiceAcknowledgement && !config.acceptFourChoiceFallback) throw new Error('Show the four-choice setup notice and acknowledge it before Start');
  const count = Math.min(config.length, report.eligibleTargets);
  const quota: Record<HistoryBucket, number> = { weak: Math.floor(count * 0.4), new: Math.floor(count * 0.3), other: count - Math.floor(count * 0.4) - Math.floor(count * 0.3) };
  const kindOrder = shuffle([...new Set(candidates.map(candidate => candidate.kind))].sort(compareText), rng);
  const kindCounts = new Map<QuestionKind, number>(kindOrder.map(kind => [kind, 0]));
  let remaining = [...candidates];
  const questions: Question[] = [];
  for (let index = 0; index < count; index++) {
    const buckets = remaining.map(candidate => ({ candidate, bucket: historyBucket(candidate, history, config.now) }));
    const availableKinds = kindOrder.filter(kind => remaining.some(candidate => candidate.kind === kind));
    const minCount = Math.min(...availableKinds.map(kind => kindCounts.get(kind) ?? 0));
    const balanced = buckets.filter(entry => (kindCounts.get(entry.candidate.kind) ?? 0) === minCount);
    const desired = (['weak', 'new', 'other'] as const).find(bucket => quota[bucket] > 0 && balanced.some(entry => entry.bucket === bucket));
    const categoryPool = desired ? balanced.filter(entry => entry.bucket === desired) : balanced;
    const kind = kindOrder.find(value => categoryPool.some(entry => entry.candidate.kind === value));
    const options = categoryPool.filter(entry => entry.candidate.kind === kind);
    const totalWeight = options.reduce((total, entry) => total + weight(entry.candidate, entry.bucket, history, config.now), 0);
    let ticket = draw(rng, totalWeight);
    let selected = options[0];
    for (const option of options) {
      ticket -= weight(option.candidate, option.bucket, history, config.now);
      if (ticket < 0) { selected = option; break; }
    }
    quota[selected.bucket] = Math.max(0, quota[selected.bucket] - 1);
    const candidate = selected.candidate;
    kindCounts.set(candidate.kind, (kindCounts.get(candidate.kind) ?? 0) + 1);
    questions.push(createQuestion(candidate, { sessionId: config.sessionId, index, choiceCount: report.effectiveChoiceCount }, rng));
    remaining = remaining.filter(other => other.targetKey !== candidate.targetKey);
  }
  return freeze({ questions, eligibility: report });
}
