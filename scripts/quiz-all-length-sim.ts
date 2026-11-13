/** Owner-requested All length regression. Pure real-catalog checks; no App/Firebase/network. */
import assert from 'node:assert/strict';
import { HIRAGANA_DATA, KATAKANA_DATA } from '../src/data';
import { completePreferences, sanitizeEnvelope, sanitizePreferenceValues, serializePreferences } from '../src/preferences';
import { createKanaCandidates } from '../src/quiz/content/kana';
import { buildQuestions, getEligibility } from '../src/quiz/pool';
import { QUIZ_LENGTH_OPTIONS, parseQuizPreferenceString, quizBuildLength, quizKanaStages, validateQuizPreference } from '../src/quiz/preferences';
import { seededRandom } from '../src/quiz/random';
import { createSession, reduceSession } from '../src/quiz/session';
import { serializeSnapshot, validateSnapshot } from '../src/quiz/snapshot';
import { SESSION_LIMITS, type BuildConfig, type Catalogs, type QuestionKind } from '../src/quiz/types';
let checks=0;
function check(name:string,value:unknown) { assert.ok(value,name);checks++; }
check('four balanced visible options',JSON.stringify(QUIZ_LENGTH_OPTIONS)==='[10,20,30,"all"]');
check('local All parsing',parseQuizPreferenceString('quizLength','all')==='all');
check('All accepted by existing scalar validator',validateQuizPreference('quizLength','all')==='all');
check('retired saved5 normalizes to10',validateQuizPreference('quizLength',5)===10);
check('invalid scalar rejected',validateQuizPreference('quizLength','ALL')===undefined);
const pref=completePreferences({quizLength:'all'});
check('existing preference serialization preserves All',sanitizeEnvelope(JSON.parse(JSON.stringify({updatedAt:1,values:pref})))?.values.quizLength==='all' && serializePreferences(pref)!==serializePreferences(completePreferences({quizLength:10})));
check('sanitization accepts All and migrates5',sanitizePreferenceValues({quizLength:'all'}).quizLength==='all'&&sanitizePreferenceValues({quizLength:5}).quizLength===10);
const catalogs:Catalogs={hiragana:HIRAGANA_DATA,katakana:KATAKANA_DATA,vocabulary:[],kanji:[]};
const candidates=createKanaCandidates(catalogs).candidates;
const clock={monoMs:100,epochMs:1800000000000,localDate:'2027-01-15'};
for(const script of ['hiragana','katakana','both'] as const) for(const mask of [1,15]) for(const kinds of [['kana-read'],['kana-pick'],['kana-type'],['kana-read','kana-pick','kana-type']] as QuestionKind[][]) {
  const config:BuildConfig={sessionId:`all_${script}_${mask}_${kinds.length}_${kinds[0]}`,now:clock.epochMs,subject:'kana',kinds,length:quizBuildLength('all'),choiceCount:4,pool:{script,stages:quizKanaStages(mask)}};
  const expected=new Set(candidates.filter(c=>kinds.includes(c.kind)&&(script==='both'||c.script===script)&&quizKanaStages(mask).includes(c.stage!)).map(c=>c.targetKey));
  const report=getEligibility(catalogs,config);
  check('current complete kana pool fits existing recovery limit',expected.size<=SESSION_LIMITS.questions);
  for(const seed of [1,22,333]) {
    const result=buildQuestions(catalogs,config,{skills:{}},seededRandom(seed));
    const ids=result.questions.map(q=>q.itemId);
    check('All covers every eligible character exactly once',ids.length===expected.size&&new Set(ids).size===ids.length&&ids.every(id=>expected.has(id)));
    check('eligibility count matches full bank',result.questions.length===report.eligibleTargets);
    const session=reduceSession(createSession(),{type:'START',questions:result.questions,clock,config:{sessionId:config.sessionId,subject:'kana',origin:'practice',challenge:'steady',autoNext:true,previousSurvivalBest:0,rewardVersion:1}});
    assert.notEqual(session.phase,'idle');
    if(session.phase!=='idle') {
      const wire=serializeSnapshot(session,'local:all-test',clock);
      check('All snapshot stays within existing byte limit',new TextEncoder().encode(wire).length<=SESSION_LIMITS.snapshotBytes);
      check('All restores under unchanged recovery contract',validateSnapshot(wire,'local:all-test',clock).ok);
    }
  }
}
// Custom selection limits targets, never widens to the entire script.
const custom=[candidates.find(c=>c.kind==='kana-type')!.itemId];
const cfg:BuildConfig={sessionId:'all_custom',now:clock.epochMs,subject:'kana',kinds:['kana-type'],length:quizBuildLength('all'),pool:{script:'both',stages:quizKanaStages(15),filter:'custom',itemIds:custom}};
check('All respects one-character typed selection',buildQuestions(catalogs,cfg,{},seededRandom(3)).questions.length===1);
check('All respects empty selection',buildQuestions(catalogs,{...cfg,pool:{...cfg.pool,itemIds:[]}}, {},seededRandom(3)).questions.length===0);
console.log(`${checks} All-length checks passed, 0 failed.`);
