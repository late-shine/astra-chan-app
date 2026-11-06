/**
 * QZ2 pure content checks. Run: npx tsx scripts/quiz-content-sim.ts
 * Optional: --write-audit replaces only the marked runtime report in the audit doc.
 * Imports real catalogs; no App, browser, storage, stats, Firebase or network.
 * Counts are measured, never asserted against an old plan's promised totals.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HIRAGANA_DATA, KATAKANA_DATA, KANJI_DATA, VOCABULARY_DATA } from '../src/data';
import { KANJI_READING_RECORDS_V2, KANJI_WORD_FAMILIES_V2 } from '../src/kanjiWordFamiliesV2';
import { createKanaCandidates, kanaAliases } from '../src/quiz/content/kana';
import { createVocabularyCandidates, vocabularyId } from '../src/quiz/content/vocabulary';
import { allKnownReadings, createKanjiCandidates, isolatedReadings } from '../src/quiz/content/kanji';
import { createContextCandidates } from '../src/quiz/content/context';
import { meaningsOverlap, readingKey } from '../src/quiz/distractors';
import { assertQuestion, grade, questionView } from '../src/quiz/grade';
import { compareText, decodeId, encodeId, isSafeKey, keyBytes, normalizeLabel } from '../src/quiz/ids';
import { buildQuestions, createQuestion, getEligibility, historyBucket } from '../src/quiz/pool';
import { seededRandom, shuffle } from '../src/quiz/random';
import { QUESTION_KINDS, freeze, type BuildConfig, type Candidate, type Catalogs,
  type Question, type QuestionKind, type QuizHistory, type SkillHistory } from '../src/quiz/types';

let passed = 0;
const failures: string[] = [];
function check(name: string, condition: boolean): void { if (condition) passed++; else failures.push(name); }
function throws(name: string, run: () => unknown): void {
  try { run(); check(name, false); } catch { check(name, true); }
}
function section(name: string): void { console.log(`\n── ${name}`); }
const json = (value: unknown): string => JSON.stringify(value);
const bytes = (value: unknown): number => new TextEncoder().encode(json(value)).length;
function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing real-catalog fixture: ${name}`);
  return value;
}
const NOW = 1_800_000_000_000;
const catalogs: Catalogs = freeze(structuredClone({
  hiragana: HIRAGANA_DATA, katakana: KATAKANA_DATA, vocabulary: VOCABULARY_DATA,
  kanji: KANJI_DATA, readingRecords: KANJI_READING_RECORDS_V2, wordFamilies: KANJI_WORD_FAMILIES_V2,
}));
const before = json(catalogs);
const blank: Catalogs = { hiragana: [], katakana: [], vocabulary: [], kanji: [] };
const config = (subject: BuildConfig['subject'], kinds: readonly QuestionKind[], extra: Partial<BuildConfig> = {}): BuildConfig => ({
  sessionId: 'content-audit', subject, kinds, length: 10, now: NOW, ...extra,
});

section('Integer RNG and reversible identities');
const rngA = seededRandom(123), rngB = seededRandom(123);
check('identical integer streams', json(Array.from({ length: 128 }, () => rngA(17))) === json(Array.from({ length: 128 }, () => rngB(17))));
throws('reject invalid RNG bound', () => seededRandom(1)(0));
throws('reject invalid seed', () => seededRandom(1.5));
throws('reject noninteger injected RNG', () => shuffle([1, 2], () => 0.5));
const tuple = ['日.#$[]/', 'a_b', 'a/b', 'a.b', '\u0000', '😀'];
const encoded = encodeId('w', tuple);
check('UTF-8 tuple round trip, punctuation and boundaries', json(decodeId(encoded).tuple) === json(tuple));
check('punctuation cannot collapse identities', encodeId('v', ['a.b']) !== encodeId('v', ['a/b']) && encodeId('v', ['a', 'b']) !== encodeId('v', ['a_b']));
check('encoded key is safe', isSafeKey(encoded));
check('key limit is UTF-8 bytes', !isSafeKey('日'.repeat(257)) && keyBytes('日'.repeat(256)) === 768);
throws('bad encoding rejected', () => decodeId('v_zz'));
throws('noncanonical encoding rejected', () => decodeId('v_5b202261225d'));

section('Every real eligible candidate: identity, choices, grading, safe view');
const factories = [createKanaCandidates(catalogs), createVocabularyCandidates(catalogs), createKanjiCandidates(catalogs), createContextCandidates(catalogs)];
const candidates = factories.flatMap(factory => factory.candidates);
const bySkill = new Map(candidates.map(candidate => [candidate.skillKey, candidate]));
check('skill identities do not collide', bySkill.size === candidates.length);
const samples = new Map<QuestionKind, Question>();
let largestSample = 0;
let conservativeSizeBound = 0;
for (const [index, candidate] of candidates.entries()) {
  const name = `${candidate.kind}:${candidate.face}`;
  check(`${name}: legal identity`, isSafeKey(candidate.itemId) && isSafeKey(candidate.skillKey) && isSafeKey(candidate.targetKey));
  check(`${name}: reversible identity`, encodeId(decodeId(candidate.itemId).prefix, decodeId(candidate.itemId).tuple) === candidate.itemId);
  const question = createQuestion(candidate, { sessionId: 'catalog-sample', index }, seededRandom(index + 11));
  assertQuestion(question);
  check(`${name}: deeply frozen output`, Object.isFrozen(question) && Object.isFrozen(question.reveal)
    && (question.responseType === 'choice' ? Object.isFrozen(question.choices) && question.choices.every(Object.isFrozen) : Object.isFrozen(question.acceptedTyped)));
  if (!samples.has(candidate.kind)) samples.set(candidate.kind, question);
  largestSample = Math.max(largestSample, bytes(question));
  const view = questionView(question);
  check(`${name}: view omits answer channels`, !['reveal', 'speechText', 'acceptedTyped', 'correctChoiceId', 'itemId', 'skillKey', 'deck'].some(key => key in view));
  if (['vocab-reading', 'kanji-word'].includes(question.kind)) check(`${name}: reading has no subtitle`, !('faceSub' in view));
  if (question.responseType === 'choice') {
    check(`${name}: exactly four unique legal labels`, question.choices.length === 4 && new Set(question.choices.map(choice => normalizeLabel(choice.label))).size === 4);
    check(`${name}: exactly one graded answer`, question.choices.filter(choice => grade(question, { type: 'choice', choiceId: choice.id }).outcome === 'correct').length === 1);
    check(`${name}: unknown choice invalid`, !grade(question, { type: 'choice', choiceId: 'missing' }).valid);
    check(`${name}: typed response invalid`, !grade(question, { type: 'typed', value: question.reveal.answer }).valid);
    if (candidate.kind === 'kanji-on' || candidate.kind === 'kanji-kun') {
      const source = required(catalogs.kanji.find(item => item.kanji === candidate.face), name);
      const allReadings = new Set(allKnownReadings(source, catalogs));
      check(`${name}: every possible foil excludes all target readings`, candidate.foils.every(foil => !allReadings.has(readingKey(foil.label))));
      check(`${name}: all target readings excluded`, question.choices.filter(choice => choice.id !== question.correctChoiceId).every(choice => !allReadings.has(readingKey(choice.label))));
      const pattern = candidate.kind === 'kanji-on' ? /^[\u30a1-\u30f6ー]+$/u : /^[\u3041-\u3096ー]+$/u;
      check(`${name}: one script-correct token per choice`, question.choices.every(choice => pattern.test(choice.label)));
    }
    if (candidate.kind === 'kana-pick') {
      const scriptGlyphs = new Set(catalogs[candidate.script ?? 'hiragana'].map(item => item.kana));
      check(`${name}: every possible foil is same-script`, candidate.foils.every(foil => scriptGlyphs.has(foil.label)));
      check(`${name}: same-script glyph choices`, question.choices.every(choice => scriptGlyphs.has(choice.label)));
    }
    // Conservative upper bound: longest possible labels and a maximum-size occurrence ID.
    const longestAnswer = [...candidate.answers].sort((a, b) => bytes(b) - bytes(a))[0];
    const longestFoils = [...candidate.foils].sort((a, b) => bytes(b.label) - bytes(a.label)).slice(0, candidate.subject === 'kana' && candidate.foils.length >= 5 ? 5 : 3);
    const bound = { ...question, id: `q_${'0'.repeat(766)}`,
      choices: [longestAnswer, ...longestFoils.map(foil => foil.label)].map((label, at) => ({ id: `c_${at}`, label })), correctChoiceId: 'c_0',
      reveal: { ...question.reveal, answer: longestAnswer, ...(['kanji-on', 'kanji-kun'].includes(candidate.kind) ? { reading: longestAnswer } : {}) } };
    conservativeSizeBound = Math.max(conservativeSizeBound, bytes(bound));
  } else {
    check(`${name}: typed/choice fields exclusive`, !('choices' in question) && !('correctChoiceId' in question));
    check(`${name}: every per-item alias accepted`, question.acceptedTyped.every(value => grade(question, { type: 'typed', value }).outcome === 'correct'));
    check(`${name}: empty input invalid`, !grade(question, { type: 'typed', value: ' \n ' }).valid);
    conservativeSizeBound = Math.max(conservativeSizeBound, bytes({ ...question, id: `q_${'0'.repeat(766)}` }));
  }
}
check('all shipped kinds represented, or explicitly excluded', QUESTION_KINDS.every(kind => samples.has(kind) || factories.some(factory => factory.exclusions.some(exclusion => exclusion.kind === kind))));
check('factories left deep-frozen input unchanged', json(catalogs) === before);

section('Kana aliases and confusions');
for (const glyph of ['し', 'ち', 'つ', 'ふ', 'じ', 'しゃ', 'しゅ', 'しょ', 'ちゃ', 'ちゅ', 'ちょ', 'じゃ', 'じゅ', 'じょ', 'ん', 'シ', 'チ', 'ツ', 'フ', 'ン']) {
  const candidate = required(candidates.find(item => item.kind === 'kana-type' && item.face === glyph), glyph);
  const question = createQuestion(candidate, { sessionId: 'aliases', index: 0 }, seededRandom(4));
  check(`${glyph}: NFKC, case and whitespace only`, grade(question, { type: 'typed', value: candidate.answers[0].toUpperCase().split('').join(' ') }).outcome === 'correct');
  check(`${glyph}: punctuation not silently stripped`, grade(question, { type: 'typed', value: `${candidate.answers[0]}!` }).outcome === 'wrong');
}
const shi = createQuestion(required(candidates.find(item => item.kind === 'kana-type' && item.face === 'し'), 'し'), { sessionId: 'aliases', index: 0 }, seededRandom(1));
check('fullwidth romaji normalizes', grade(shi, { type: 'typed', value: 'ＳＩ' }).outcome === 'correct');
const a = createQuestion(required(candidates.find(item => item.kind === 'kana-type' && item.face === 'あ'), 'あ'), { sessionId: 'aliases', index: 1 }, seededRandom(1));
check('shi alias cannot answer another glyph', grade(a, { type: 'typed', value: 'si' }).outcome === 'wrong');
check('ambiguous ji aliases stay item-specific', kanaAliases('じ', 'ji').includes('zi') && !kanaAliases('ぢ', 'ji').includes('zi'));
check('ambiguous ji/zu reverse prompts excluded', ['じ', 'ぢ', 'ず', 'づ', 'ジ', 'ヂ', 'ズ', 'ヅ'].every(glyph => !candidates.some(item => item.kind === 'kana-pick' && item.deck.itemKey === glyph)));
const nu = required(candidates.find(item => item.kind === 'kana-pick' && item.deck.itemKey === 'ぬ'), 'ぬ');
const nuQuestion = createQuestion(nu, { sessionId: 'confusions', index: 0 }, seededRandom(9));
check('curated ぬ/め confusion is offered', nuQuestion.responseType === 'choice' && nuQuestion.choices.some(choice => choice.label === 'め'));

section('Duplicates, alternate senses and unsupported readings');
const vocab = (word: string) => required(catalogs.vocabulary.find(item => item.word === word), word);
const fixtureWords = ['車', '自動車', '猫', '犬', '水', '木', '本', 'ノート', '山'].map(vocab);
const fixture: Catalogs = freeze({ ...blank, hiragana: catalogs.hiragana.slice(0, 24), katakana: catalogs.katakana.slice(0, 12),
  vocabulary: [...fixtureWords, vocab('ノート'), ...catalogs.vocabulary.filter(item => item.word === '辛い')],
  kanji: catalogs.kanji, readingRecords: catalogs.readingRecords, wordFamilies: catalogs.wordFamilies });
const fixtureVocab = createVocabularyCandidates(fixture);
check('exact duplicate vocabulary tuple collapses', fixtureVocab.duplicateIdentities.length === 1);
check('synonym overlap is conservative', meaningsOverlap('Car / Vehicle', 'Automobile / Car') && meaningsOverlap('Large', 'Big'));
const reverseCar = required(fixtureVocab.candidates.find(item => item.kind === 'vocab-reverse' && item.deck.itemKey === '車'), 'reverse car');
check('reverse excludes an alternate synonym answer', !reverseCar.foils.some(foil => foil.label === '自動車'));
check('contradictory 辛い readings excluded', fixtureVocab.exclusions.filter(item => item.kind === 'vocab-reading' && item.source === '辛い').length === 2);
const withSense: Catalogs = { ...fixture, vocabulary: [...fixture.vocabulary, { ...vocab('本'), english: 'SYNTHETIC TEST SENSE' }] };
check('same word+reading with distinct senses needs context', !createVocabularyCandidates(withSense).candidates.some(item => item.kind === 'vocab-meaning' && item.deck.itemKey === '本'));
check('meaning/category identity separation', vocabularyId(vocab('猫')) === vocabularyId({ ...vocab('猫'), category: 'another-category' }));
const placeholder = required(catalogs.kanji.find(item => item.kanji === '週'), '週');
check('placeholder kunyomi unsupported', isolatedReadings(placeholder, catalogs, 'kunyomi').length === 0);
const multi = required(catalogs.kanji.find(item => item.kanji === '四'), '四');
check('mismatched legacy tokens rejected, not padded', isolatedReadings({ ...multi, kunyomiRomaji: 'yo' }, {}, 'kunyomi').length === 0);
const sei = required(catalogs.kanji.find(item => item.kanji === '生'), '生');
check('word-family-only ショウ never isolated', !isolatedReadings(sei, catalogs, 'onyomi').includes('ショウ') && allKnownReadings(sei, catalogs).includes('しょう'));
const hiddenRecords = { ...catalogs, readingRecords: { '生': { onyomi: [{ ...required(catalogs.readingRecords?.['生'].onyomi[0], '生 on'), proofreadingStatus: 'needs-review' as const }], kunyomi: [] } } };
check('unreviewed structured readings do not fall back to legacy', isolatedReadings(sei, hiddenRecords, 'onyomi').length === 0);

section('Curated context gates, whole-word identity, and target-kanji deck');
const context = factories[3];
check('whole words deduplicated across families', new Set(context.candidates.map(item => item.face)).size === context.candidates.length);
check('rare 会釈 and ambiguous bare 生 excluded', ['会釈', '生'].every(word => !context.candidates.some(item => item.face === word)));
check('today is one item despite two families', context.candidates.filter(item => item.face === '今日').length === 1);
check('context deck points only to the highlighted real kanji', context.candidates.every(item => item.deck.type === 'kanji' && Boolean(item.highlights?.length)
  && item.highlights?.every(range => item.face.slice(range.start, range.end) === item.deck.itemKey)
  && item.highlights.length === item.face.split(item.deck.itemKey).length - 1));
const sourceWord = required(catalogs.wordFamilies?.['生'][0], '先生');
const changedFamilies = { ...catalogs.wordFamilies, '生': [{ ...sourceWord, proofreadingStatus: 'needs-review' as const }] };
check('unreviewed word metadata excluded', createContextCandidates({ ...catalogs, wordFamilies: changedFamilies }).exclusions.some(item => item.source === `生:${sourceWord.id}` && item.reason === 'unreviewed'));
const contradictory = { ...catalogs.wordFamilies, '生': [...(catalogs.wordFamilies?.['生'] ?? []), { ...sourceWord, id: 'corrupt-fixture', reading: 'INVALID_FIXTURE' }] };
check('unresolved contradictory word excludes valid twin too', !createContextCandidates({ ...catalogs, wordFamilies: contradictory }).candidates.some(item => item.face === sourceWord.word));
const wrongTarget = { ...catalogs.wordFamilies, '火': [sourceWord] };
check('missing target excluded', createContextCandidates({ ...catalogs, wordFamilies: wrongTarget }).exclusions.some(item => item.source === `火:${sourceWord.id}` && item.reason === 'missing-target'));
const longWord = { ...sourceWord, id: 'overlong-fixture', word: sourceWord.word.repeat(200) };
check('oversize source identity excluded', createContextCandidates({ ...catalogs, wordFamilies: { ...catalogs.wordFamilies, '生': [longWord] } }).exclusions.some(item => item.reason === 'id-too-long'));

section('Frozen rounds, ordering independence, strict filters, small pools');
function reversed(input: Catalogs): Catalogs {
  return { ...input, hiragana: [...input.hiragana].reverse(), katakana: [...input.katakana].reverse(),
    vocabulary: [...input.vocabulary].reverse(), kanji: [...input.kanji].reverse(),
    readingRecords: Object.fromEntries(Object.entries(input.readingRecords ?? {}).reverse().map(([root, records]) => [root, { onyomi: [...records.onyomi].reverse(), kunyomi: [...records.kunyomi].reverse() }])),
    wordFamilies: Object.fromEntries(Object.entries(input.wordFamilies ?? {}).reverse().map(([root, entries]) => [root, [...entries].reverse()])),
  };
}
for (const subject of ['kana', 'vocab', 'kanji'] as const) {
  const kinds = QUESTION_KINDS.filter(kind => kind.startsWith(subject === 'vocab' ? 'vocab-' : `${subject}-`));
  const setup = config(subject, kinds, { pool: { stages: ['basic', 'dakuon', 'handakuon', 'yoon'] } });
  const one = buildQuestions(fixture, setup, {}, seededRandom(72));
  const two = buildQuestions(fixture, setup, {}, seededRandom(72));
  const reordered = buildQuestions(reversed(fixture), setup, {}, seededRandom(72));
  check(`${subject}: fixed seed serializes identically`, json(one) === json(two));
  check(`${subject}: input ordering cannot change serialized questions`, json(one.questions) === json(reordered.questions));
  const targets = one.questions.map(question => required((subject === 'vocab' ? fixtureVocab.candidates : candidates).find(item => item.skillKey === question.skillKey), question.skillKey).targetKey);
  check(`${subject}: mixed kinds never repeat target`, new Set(targets).size === targets.length);
  check(`${subject}: occurrence IDs unique and safe`, new Set(one.questions.map(question => question.id)).size === one.questions.length && one.questions.every(question => isSafeKey(question.id)));
}
const tiny = { ...blank, hiragana: catalogs.hiragana.slice(0, 4) };
const sixConfig = config('kana', ['kana-read'], { choiceCount: 6, length: 10 });
check('six-to-four preflight notice', getEligibility(tiny, sixConfig).requiresFourChoiceAcknowledgement);
throws('fallback cannot silently start', () => buildQuestions(tiny, sixConfig, {}, seededRandom(1)));
const fourFallback = buildQuestions(tiny, { ...sixConfig, acceptFourChoiceFallback: true }, {}, seededRandom(1));
check('small pool shrinks and count stays four all round', fourFallback.questions.length === 4 && fourFallback.questions.every(question => question.responseType === 'choice' && question.choices.length === 4));
const fullSix = buildQuestions(catalogs, sixConfig, {}, seededRandom(13));
check('six choices stay unique, legal and single-answer all round', fullSix.questions.length === 10 && fullSix.questions.every(question => question.responseType === 'choice'
  && question.choices.length === 6 && new Set(question.choices.map(choice => normalizeLabel(choice.label))).size === 6
  && question.choices.filter(choice => grade(question, { type: 'choice', choiceId: choice.id }).outcome === 'correct').length === 1));
const single = { ...blank, hiragana: catalogs.hiragana.slice(0, 1) };
check('typed works with one target', buildQuestions(single, config('kana', ['kana-type']), {}, seededRandom(1)).questions.length === 1);
check('choice does not fabricate tiny-pool filler', buildQuestions(single, config('kana', ['kana-read']), {}, seededRandom(1)).questions.length === 0);
check('empty pool is a usable eligibility result', buildQuestions(blank, config('kana', ['kana-read']), {}, seededRandom(1)).questions.length === 0);
const catId = vocabularyId(vocab('猫'));
check('custom target uses global catalog foils', buildQuestions(fixture, config('vocab', ['vocab-reading'], { pool: { filter: 'custom', itemIds: [catId] } }), {}, seededRandom(1)).questions.length === 1);
check('empty custom means no targets', buildQuestions(fixture, config('vocab', ['vocab-meaning'], { pool: { filter: 'custom', itemIds: [] } }), {}, seededRandom(1)).questions.length === 0);
check('learned is explicit and strict', buildQuestions(fixture, config('vocab', ['vocab-meaning'], { pool: { filter: 'learned', learnedWords: ['猫'] } }), {}, seededRandom(1)).questions.every(question => question.deck?.itemKey === '猫'));
const studiedRound = buildQuestions(fixture, config('kanji', ['kanji-meaning'], { pool: { filter: 'studied', studiedKanji: ['日'] } }), {}, seededRandom(1));
check('studied is explicit and strict', studiedRound.questions.length === 1 && studiedRound.questions[0].face === '日');
const studiedWords = buildQuestions(fixture, config('kanji', ['kanji-word'], { pool: { filter: 'studied', studiedKanji: ['日'] } }), {}, seededRandom(1));
check('shared context word retargets to the selected studied kanji', studiedWords.questions.length > 0 && studiedWords.questions.every(question => question.deck?.itemKey === '日'
  && question.highlights?.every(range => question.face.slice(range.start, range.end) === '日')));
check('curated setup count reflects selected pool', studiedWords.eligibility.curatedWordCount === studiedWords.eligibility.eligibleByKind['kanji-word']);
throws('cross-subject kind rejected', () => buildQuestions(fixture, config('kana', ['vocab-meaning']), {}, seededRandom(1)));
throws('cross-subject manual flags rejected', () => getEligibility(fixture, config('kana', ['kana-read'], { pool: { filter: 'learned' } })));

section('History quotas, recency boundaries and low-confidence fallback');
const historyCandidates = createKanaCandidates({ ...blank, hiragana: catalogs.hiragana.slice(0, 24) }).candidates.filter(item => item.kind === 'kana-read');
const skills: Record<string, SkillHistory> = {};
for (const [index, candidate] of historyCandidates.entries()) {
  if (index < 8) skills[candidate.skillKey] = { firstAttempts: 3, firstCorrect: 1 };
  else if (index >= 16) skills[candidate.skillKey] = { firstAttempts: 3, firstCorrect: 3 };
}
const history: QuizHistory = { skills };
const historyCatalog = { ...blank, hiragana: catalogs.hiragana.slice(0, 24) };
const quotaRound = buildQuestions(historyCatalog, config('kana', ['kana-read']), history, seededRandom(55));
const selectedBuckets = quotaRound.questions.map(question => historyBucket(required(historyCandidates.find(candidate => candidate.skillKey === question.skillKey), question.skillKey), history, NOW));
check('ten targets allocate 4 weak / 3 new / 3 other', ['weak', 'new', 'other'].every((bucket, index) => selectedBuckets.filter(value => value === bucket).length === [4, 3, 3][index]));
const sampleCandidate = historyCandidates[0];
check('recent first miss is weak even after one attempt', historyBucket(sampleCandidate, { skills: { [sampleCandidate.skillKey]: { firstAttempts: 1, firstCorrect: 0, lastFirstMissAt: NOW - 60_000 } } }, NOW) === 'weak');
check('old miss is outside the 72h window', historyBucket(sampleCandidate, { skills: { [sampleCandidate.skillKey]: { firstAttempts: 1, firstCorrect: 0, lastFirstMissAt: NOW - 72 * 3_600_000 - 1 } } }, NOW) === 'other');
const legacy = { characterProgress: { [sampleCandidate.deck.itemKey]: { total: 4, correct: 0 } } };
check('legacy progress is weak evidence for kana-read', historyBucket(sampleCandidate, legacy, NOW) === 'weak');
const typedSibling = required(createKanaCandidates(historyCatalog).candidates.find(item => item.kind === 'kana-type' && item.itemId === sampleCandidate.itemId), 'typed sibling');
check('legacy progress does not invent typed history', historyBucket(typedSibling, legacy, NOW) === 'new');
const balanced = buildQuestions(historyCatalog, config('kana', ['kana-read', 'kana-pick', 'kana-type'], { length: 12 }), {}, seededRandom(90));
const counts = ['kana-read', 'kana-pick', 'kana-type'].map(kind => balanced.questions.filter(question => question.kind === kind).length);
check('supported kinds balanced when all are available', Math.max(...counts) - Math.min(...counts) <= 1);
const pair = historyCandidates.slice(0, 2);
const pairHistory = (recent: boolean): QuizHistory => ({ skills: Object.fromEntries(pair.map((candidate, index) => [candidate.skillKey, {
  firstAttempts: 4, firstCorrect: 4, lastCorrectAt: index === 1 && recent ? NOW - 1 : NOW - 600_000,
}])) });
const pairSetup = config('kana', ['kana-read'], { length: 1, pool: { filter: 'custom', itemIds: pair.map(candidate => candidate.itemId) } });
const normalPick = buildQuestions(historyCatalog, pairSetup, pairHistory(false), max => Math.floor(max / 2));
const recentPick = buildQuestions(historyCatalog, pairSetup, pairHistory(true), max => Math.floor(max / 2));
check('recent-correct quarter-weight changes the weighted boundary', normalPick.questions[0]?.itemId === pair[1].itemId && recentPick.questions[0]?.itemId === pair[0].itemId);
check('all catalog inputs still unchanged', json(catalogs) === before);
const mutable = structuredClone(fixture);
const mutableBefore = json(mutable);
buildQuestions(mutable, config('vocab', ['vocab-reading', 'vocab-meaning', 'vocab-reverse']), {}, seededRandom(62));
check('mutable caller catalog order/content unchanged too', json(mutable) === mutableBefore);
const choiceSample = required(samples.get('kana-read'), 'choice contract');
throws('runtime contract rejects mixed typed/choice fields', () => assertQuestion({ ...choiceSample, acceptedTyped: ['a'] } as unknown as Question));
for (const [length, expected] of [[5, [2, 1, 2]], [20, [8, 6, 6]]] as const) {
  const round = buildQuestions(historyCatalog, config('kana', ['kana-read'], { length }), history, seededRandom(43));
  const buckets = round.questions.map(question => historyBucket(required(historyCandidates.find(candidate => candidate.skillKey === question.skillKey), question.skillKey), history, NOW));
  check(`proportional quotas at ${length}`, ['weak', 'new', 'other'].every((bucket, index) => buckets.filter(value => value === bucket).length === expected[index]));
}
const scarceHistory: QuizHistory = { skills: { [historyCandidates[0].skillKey]: { firstAttempts: 3, firstCorrect: 0 } } };
check('category shortages fill from remaining targets', buildQuestions(historyCatalog, config('kana', ['kana-read']), scarceHistory, seededRandom(1)).questions.length === 10);

section('Current catalog report');
const reportLines = [
  'Runtime report generated by `npx tsx scripts/quiz-content-sim.ts` (no wall clock is used).', '',
  '| Source | Rows | Duplicate identity occurrences |', '|---|---:|---:|',
  ...factories.map((factory, index) => `| ${['Kana', 'Vocabulary', 'Kanji', 'Curated context'][index]} | ${factory.sourceCount} | ${factory.duplicateIdentities.length} |`), '',
  'Duplicate identities / whole-word collapses (decoded source tuples):', '',
  ...factories.flatMap((factory, index) => factory.duplicateIdentities.map(id => `- ${['Kana', 'Vocabulary', 'Kanji', 'Curated context'][index]}: ${json(decodeId(id).tuple)}`)), '',
  '| Kind | Eligible identities | Distinct round targets |', '|---|---:|---:|',
  ...QUESTION_KINDS.map(kind => { const eligible = candidates.filter(candidate => candidate.kind === kind);
    return `| ${kind} | ${eligible.length} | ${new Set(eligible.map(candidate => candidate.targetKey)).size} |`; }), '',
  `Curated coverage: ${Object.keys(catalogs.wordFamilies ?? {}).length} families; ${context.candidates.length} eligible distinct whole words.`,
  `Largest deterministic four-choice sample: ${largestSample} UTF-8 JSON bytes.`,
  `Conservative worst-case bound: ${conservativeSizeBound} UTF-8 JSON bytes (768-byte occurrence ID; longest legal labels; six kana choices when supported).`, '',
  'Exclusions (content metadata, not independently verified Japanese semantics):', '',
  ...factories.flatMap(factory => factory.exclusions).map(item => `- ${item.kind}: ${item.source} — ${item.reason}: ${item.detail}`), '',
  'One deterministic output sample per kind (feedback included for review):', '',
  ...[...samples].sort(([a], [b]) => compareText(a, b)).flatMap(([kind, question]) => [`**${kind}**`, '```json', JSON.stringify(question, null, 2), '```', '']),
];
const reportText = reportLines.join('\n');
console.log(reportText);
console.log(`\n${passed} passed; ${failures.length} failed.`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else if (process.argv.includes('--write-audit')) {
  const path = fileURLToPath(new URL('../docs/quiz-content-audit.md', import.meta.url));
  const old = readFileSync(path, 'utf8');
  const start = '<!-- QZ2-RUNTIME-START -->', end = '<!-- QZ2-RUNTIME-END -->';
  const beginAt = old.indexOf(start), endAt = old.indexOf(end);
  if (beginAt < 0 || endAt < beginAt) throw new Error('Audit report markers missing');
  writeFileSync(path, `${old.slice(0, beginAt + start.length)}\n${reportText}\n${old.slice(endAt)}`);
  console.log('Updated only the marked runtime report in docs/quiz-content-audit.md.');
}
