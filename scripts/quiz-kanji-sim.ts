/** QZ7 caller/view/progress contracts. Run manually: npx tsx scripts/quiz-kanji-sim.ts */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { HIRAGANA_DATA, KATAKANA_DATA, KANJI_DATA, VOCABULARY_DATA } from '../src/data';
import { KANJI_READING_RECORDS_V2, KANJI_WORD_FAMILIES_V2 } from '../src/kanjiWordFamiliesV2';
import type { StudentStats } from '../src/types';
import { allKnownReadings, createKanjiCandidates, isolatedReadings } from '../src/quiz/content/kanji';
import { createContextCandidates } from '../src/quiz/content/context';
import { readingKey } from '../src/quiz/distractors';
import { encodeId } from '../src/quiz/ids';
import { DEFAULT_QUIZ_PREFERENCES } from '../src/quiz/preferences';
import { mergeSoloCustomDraft, soloConfig, soloSubjectLabel, isSoloCustomId } from '../src/quiz/soloSetup';
import { soloQuestionModel, soloFeedbackModel, soloSpeechText } from '../src/quiz/soloViews';
import { buildQuestions, getEligibility } from '../src/quiz/pool';
import { seededRandom } from '../src/quiz/random';
import { createSession, reduceSession } from '../src/quiz/session';
import { applyQuizRecord, progressEntryForPending } from '../src/quiz/progress';
import { serializeSnapshot, validateSnapshot } from '../src/quiz/snapshot';
import { SESSION_LIMITS, type ActiveSession, type Catalogs, type SessionState } from '../src/quiz/types';

let passed = 0;
function check(name: string, value: unknown) { assert.ok(value, name); passed++; }
function active(state: SessionState): ActiveSession { if (state.phase === 'idle') throw Error('Expected active session'); return state; }
const catalogs: Catalogs = {hiragana:HIRAGANA_DATA,katakana:KATAKANA_DATA,vocabulary:VOCABULARY_DATA,kanji:KANJI_DATA,
  readingRecords:KANJI_READING_RECORDS_V2,wordFamilies:KANJI_WORD_FAMILIES_V2};
const before = JSON.stringify(catalogs);
const clock = {monoMs:10,epochMs:Date.UTC(2026,10,13,8),localDate:'2026-11-13'};
const base: StudentStats = {xp:0,totalAttempts:0,correctCount:0,studyDates:[],streakCount:0,lastActiveDate:'',masteredChars:[],
  characterProgress:{日:{total:1,correct:1}},vocabularyProgress:{猫:true},favoriteCategory:'basic',srsCards:{},survivalBestScore:0,srsReviewedTotal:0};
const isolated = createKanjiCandidates(catalogs);
const context = createContextCandidates(catalogs);
const config = (kind: string, ids?: readonly string[], studied: readonly string[] = []) => soloConfig(
  {...DEFAULT_QUIZ_PREFERENCES,quizLength:'all',quizKanjiPool:studied.length ? 'studied' : 'all'},
  'kanji','practice',kind,ids,[],'kanji_'+kind,clock.epochMs,studied);

for (const kind of ['meaning','on','kun','mixed','word'] as const) {
  const cfg = config(kind);
  const result = buildQuestions(catalogs,cfg,{},seededRandom(71));
  const {questions,eligibility} = result;
  check('nonempty bounded All covers actual eligibility: '+kind,questions.length>0&&questions.length===eligibility.eligibleTargets&&questions.length<=SESSION_LIMITS.questions);
  check('no repeated targets including word aliases: '+kind,new Set(questions.map(q=>q.face)).size===questions.length);
  if (kind === 'mixed') check('Mixed is explicitly isolated',questions.every(q=>q.kind!=='kanji-word')&&new Set(questions.map(q=>q.kind)).size===3);
  let state = active(reduceSession(createSession(),{type:'START',questions,clock,config:{sessionId:cfg.sessionId,subject:'kanji',origin:'practice',challenge:'steady',autoNext:true,previousSurvivalBest:0,rewardVersion:1}}));
  for (const q of questions) {
    const view = soloQuestionModel({...state,current:q});
    check('Kanji subject and safe unanswered view',view.subjectLabel==='Kanji'&&!('reveal' in view)&&!('speechText' in view)&&!('itemId' in view)&&!view.prompt.reading&&!view.prompt.helper);
    check('four distinct labels',q.responseType==='choice'&&q.choices.length===4&&new Set(q.choices.map(c=>c.label)).size===4);
    if (q.kind === 'kanji-meaning') check('English choices use long layout',view.choiceLayout==='long'&&view.choices.every(c=>!c.ja));
    else check('reading choices use Japanese face',view.choices.every(c=>c.ja));
    if (q.kind === 'kanji-on' || q.kind === 'kanji-kun') {
      const row = KANJI_DATA.find(item=>item.kanji===q.face)!;
      const answers = isolatedReadings(row,catalogs,q.kind==='kanji-on'?'onyomi':'kunyomi');
      const known = new Set(allKnownReadings(row,catalogs));
      check('exactly one taught reading option',q.choices?.filter(c=>answers.includes(c.label)).length===1);
      check('all known alternate readings excluded from foils',q.choices?.filter(c=>c.id!==q.correctChoiceId).every(c=>!known.has(readingKey(c.label))));
      check('post-answer speech uses frozen chosen reading',soloSpeechText(q)===q.reveal.answer);
    }
    if (q.kind === 'kanji-word') {
      check('whole-word size, highlights and real kanji deck target',view.prompt.size==='word'&&isDeepStrictEqual(view.prompt.highlights,q.highlights)&&!!q.highlights?.length&&q.deck?.type==='kanji'&&KANJI_DATA.some(k=>k.kanji===q.deck?.itemKey));
      check('context owns a word skill, not isolated mastery',q.itemId.startsWith('w_')&&q.skillKey.endsWith('__kanji-word'));
    }
  }
  const q = state.current;
  if (q.responseType !== 'choice') throw Error('Kanji must use choices');
  for (const correct of [false,true]) {
    const asking = state;
    const answered = active(reduceSession(asking,{type:'ANSWER',sessionId:cfg.sessionId,questionId:q.id,clock:{...clock,monoMs:20},inputId:correct?'right':'wrong',response:{type:'choice',choiceId:correct?q.correctChoiceId:q.choices.find(c=>c.id!==q.correctChoiceId)!.id}}));
    const record = answered.records.at(-1)!;
    if (record.type !== 'answer') throw Error('Expected answer');
    check('shared 15/0 XP',record.xp===(correct?15:0));
    const entry = progressEntryForPending(answered);
    const stats = applyQuizRecord(base,entry);
    check('attempt/activity/own skill updated',stats.totalAttempts===1&&stats.correctCount===(correct?1:0)&&stats.quizSkills?.[q.skillKey].a===1&&stats.studyDates.includes(clock.localDate)&&stats.streakCount===1);
    check('quiz does not consume Study reward or manual mastery',stats.characterProgress===base.characterProgress&&stats.characterProgress.日.total===1&&stats.characterProgress[q.face]?.total===base.characterProgress[q.face]?.total&&stats.masteredChars===base.masteredChars&&stats.vocabularyProgress===base.vocabularyProgress&&stats.srsCards===base.srsCards);
    check('receipt replay is idempotent',isDeepStrictEqual(applyQuizRecord(stats,entry),stats));
    const feedbackState = active(reduceSession(answered,{type:'COMMIT_OK',sessionId:cfg.sessionId,seq:answered.pending!.record.seq,attempt:answered.pending!.attempt,clock:{...clock,monoMs:21}}));
    check('correct auto-next / wrong manual',feedbackState.phase==='feedback'&&(correct?feedbackState.runtime.autoNextDeadlineMonoMs!==null:feedbackState.runtime.autoNextDeadlineMonoMs===null));
    const feedback = soloFeedbackModel(feedbackState,record,soloQuestionModel(feedbackState),()=>{throw Error('Kanji must not use kana example helper');});
    check('frozen answer feedback',feedback?.correctAnswer===q.reveal.answer&&feedback.canListen);
    if(q.kind==='kanji-word') check('whole word/reading/meaning and original note',feedback?.sentence.includes(q.face)&&feedback.sentence.includes(q.reveal.reading!)&&feedback.sentence.includes(q.reveal.meaning!)&&feedback.why?.sourceNote===q.reveal.note);
    const restored = validateSnapshot(serializeSnapshot(feedbackState,'qz7-owner',{...clock,monoMs:22}),'qz7-owner',{...clock,monoMs:23});
    check('reload pauses exact frozen question/outcome',restored.ok&&restored.state.phase==='paused'&&isDeepStrictEqual(restored.state.current,q)&&isDeepStrictEqual(restored.state.records,feedbackState.records));
    const persisted = JSON.parse(JSON.stringify(stats)) as StudentStats;
    check('skill/totals and Study guard survive JSON',persisted.quizSkills?.[q.skillKey].a===1&&persisted.totalAttempts===1&&isDeepStrictEqual(persisted.characterProgress,base.characterProgress));
  }
  console.log(`${kind}: ${eligibility.eligibleTargets} eligible targets; ${eligibility.curatedSetLabel}`);
}

check('derived readings never become isolated answers',!isolated.candidates.find(c=>c.face==='生'&&c.kind==='kanji-on')?.answers.includes('ショウ'));
check('empty kun placeholders audited',isolated.exclusions.some(e=>e.source==='週'&&e.kind==='kanji-kun'&&e.reason==='unsupported-reading'));
check('semantic exclusions remain explicit',context.exclusions.some(e=>e.source==='生:生-生'&&e.reason==='ambiguous-prompt')&&context.exclusions.some(e=>e.source==='会:会-会釈'&&e.reason==='rare-word'));
check('duplicate families collapse 今日 and 今月',context.candidates.filter(c=>c.face==='今日').length===1&&context.candidates.filter(c=>c.face==='今月').length===1);
for (const word of ['今日','誕生','日記']) {
  const candidate = context.candidates.find(c=>c.face===word)!;
  check('source-traced curated word exists: '+word,!!candidate);
  const round = buildQuestions(catalogs,config('word',[candidate.itemId]),{},seededRandom(12));
  check('custom whole-word target shrinks to one, broader foils',round.questions.length===1&&round.questions[0].face===word&&round.questions[0].choices?.length===4);
  if(word==='今日') check('irregular word has complete reading; no inferred segment',round.questions[0].reveal.answer==='きょう'&&!('segment' in round.questions[0]));
}
const emptyStudied = soloConfig({...DEFAULT_QUIZ_PREFERENCES,quizKanjiPool:'studied'},'kanji','practice','meaning',undefined,[],'empty-studied',clock.epochMs,[]);
check('empty Studied stays empty',getEligibility(catalogs,emptyStudied).eligibleTargets===0);
check('empty custom stays empty',getEligibility(catalogs,config('word',[])).eligibleTargets===0);
check('unsupported custom kun is not padded',getEligibility(catalogs,config('kun',[encodeId('j',['週'])])).eligibleTargets===0);
check('studied isolated filter constrains targets',buildQuestions(catalogs,config('mixed',undefined,['日']),{},seededRandom(1)).questions.every(q=>q.face==='日'));
const studiedWords = buildQuestions(catalogs,config('word',undefined,['日']),{},seededRandom(1));
check('studied curated words anchor only eligible studied root',studiedWords.questions.length>0&&studiedWords.questions.every(q=>q.deck?.itemKey==='日'&&q.highlights?.every(r=>q.face.slice(r.start,r.end)==='日')));
check('other subjects preserved in bounded custom draft',mergeSoloCustomDraft(['h_00','v_00','j_old','w_old'],['j_new','w_new'],'kanji').ids.join(',')==='h_00,v_00,j_new,w_new');
check('kanji draft cannot replace other subjects',isSoloCustomId('j_00','kanji')&&isSoloCustomId('w_00','kanji')&&!isSoloCustomId('v_00','kanji')&&soloSubjectLabel('kanji')==='Kanji');
check('existing kana and vocab configurations remain subject-specific',soloConfig(DEFAULT_QUIZ_PREFERENCES,'kana','practice','read',undefined,[],'kana',0).kinds?.join(',')==='kana-read'&&soloConfig(DEFAULT_QUIZ_PREFERENCES,'vocab','practice','meaning',undefined,[],'vocab',0).kinds?.join(',')==='vocab-meaning');
check('no source ordering/data mutation',JSON.stringify(catalogs)===before);
const app = readFileSync('src/App.tsx','utf8');
check('one App controller and no legacy kanji pipeline',(app.match(/useQuizSession\(/g)??[]).length===1&&!app.includes('handleKanjiAnswer')&&!app.includes('generateKanjiChoices')&&!app.includes('kanjiQuizScreenProps')&&!existsSync('src/components/KanjiQuizScreen.tsx'));
check('existing +40 guard remains independent',app.includes('const alreadyStudied = (statsRef.current.characterProgress?.[activeKanji]?.total || 0) > 0;')&&app.includes('if (prevProg.total > 0) return prev;')&&app.includes('xp: prev.xp + 40'));
check('Grammar and duel helpers retained',app.includes('const awardXPAndIncrementAttempt')&&app.includes('const generateChoices'));

// Performance fix: reuse only public factory output; source edits must invalidate it.
const mutableKanji = KANJI_DATA.map(row=>({...row}));
const mutableReadings = structuredClone(KANJI_READING_RECORDS_V2);
const mutableWords = structuredClone(KANJI_WORD_FAMILIES_V2);
const mutableVocab = VOCABULARY_DATA.map(row=>({...row}));
const changing: Catalogs = {...catalogs,kanji:mutableKanji,readingRecords:mutableReadings,wordFamilies:mutableWords,vocabulary:mutableVocab};
const cachedRound = (kind: string, source: Catalogs = changing) => buildQuestions(source,config(kind),{},seededRandom(42));
const cold = cachedRound('mixed');
check('warm factory cache preserves seeded questions and eligibility',isDeepStrictEqual(cachedRound('mixed'),cold));
cachedRound('meaning');
mutableKanji[0].meaning = 'Unique cache fixture meaning';
const changedMeaning = cachedRound('meaning');
check('kanji cache invalidates in-place source changes',changedMeaning.questions.some(q=>q.face===mutableKanji[0].kanji&&q.reveal.meaning==='Unique cache fixture meaning'));
cachedRound('on');
mutableReadings.生.onyomi[0].kana = 'セイセイ';
mutableReadings.生.onyomi[0].romaji = 'seisei';
check('kanji cache invalidates structured reading edits',isDeepStrictEqual(cachedRound('on'),cachedRound('on',{...changing,kanji:[...mutableKanji]})));
cachedRound('word');
Object.values(mutableWords).flat().find(word=>word.word==='誕生')!.note = 'QZ7 cache fixture note';
check('context cache invalidates curated source notes',cachedRound('word').questions.some(q=>q.face==='誕生'&&q.reveal.note?.includes('QZ7 cache fixture note')));
mutableVocab.push({word:'今日',hiragana:'べつ',romaji:'betsu',english:'Synthetic conflicting cache fixture',category:mutableVocab[0].category});
check('context cache invalidates vocabulary conflicts',!cachedRound('word').questions.some(q=>q.face==='今日'));
mutableKanji.splice(mutableKanji.findIndex(k=>k.kanji==='日'),1);
check('context cache invalidates kanji root edits',isDeepStrictEqual(cachedRound('word'),cachedRound('word',{...changing,kanji:[...mutableKanji]})));
const learnedAfterWarm = buildQuestions(catalogs,config('word',undefined,['日']),{},seededRandom(42));
check('warm caches never reuse another filter or owner selection',learnedAfterWarm.questions.length>0&&learnedAfterWarm.questions.every(q=>q.deck?.itemKey==='日'));
console.log(`${passed} QZ7 checks passed, 0 failed.`);
