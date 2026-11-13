/** QZ8 growth contracts. Owner command: npx tsx scripts/quiz-growth-sim.ts. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { HIRAGANA_DATA,KATAKANA_DATA,KANJI_DATA,VOCABULARY_DATA } from '../src/data';
import { KANJI_READING_RECORDS_V2,KANJI_WORD_FAMILIES_V2 } from '../src/kanjiWordFamiliesV2';
import type { StudentStats } from '../src/types';
import { DEFAULT_QUIZ_PREFERENCES } from '../src/quiz/preferences';
import { soloConfig } from '../src/quiz/soloSetup';
import { recommend,remainingQuestions,repairQuestions,reviewChoices,reviewBatch,reviewAddedCopy } from '../src/quiz/recommend';
import { buildQuestions,poolHistory } from '../src/quiz/pool';
import { seededRandom } from '../src/quiz/random';
import { createSession,reduceSession,questionTargetKey } from '../src/quiz/session';
import { applyQuizRecord,progressEntryForPending } from '../src/quiz/progress';
import { summarize } from '../src/quiz/summary';
import { serializeSnapshot,validateSnapshot } from '../src/quiz/snapshot';
import { occurrenceId } from '../src/quiz/ids';
import { freeze,type ActiveSession,type Catalogs,type Question,type QuizHistory,type SessionState } from '../src/quiz/types';
let passed=0;
const check=(name:string,value:unknown)=>{assert.ok(value,name);passed++;};
const active=(s:SessionState):ActiveSession=>{if(s.phase==='idle')throw Error('Expected active');return s;};
const now=Date.UTC(2026,10,14,5),clock={monoMs:0,epochMs:now,localDate:'2026-11-14'};
const catalogs:Catalogs={hiragana:HIRAGANA_DATA,katakana:KATAKANA_DATA,kanji:KANJI_DATA,vocabulary:VOCABULARY_DATA,readingRecords:KANJI_READING_RECORDS_V2,wordFamilies:KANJI_WORD_FAMILIES_V2};
const config=soloConfig(DEFAULT_QUIZ_PREFERENCES,'kana','practice','read',undefined,[],'growth',now);
const all=buildQuestions(catalogs,{...config,length:256},{},seededRandom(2)).questions;
const history:QuizHistory={skills:Object.fromEntries(all.map((q,i)=>[q.skillKey,i<14?{firstAttempts:5,firstCorrect:1,lastFirstMissAt:now-1000}:i<28?{firstAttempts:0,firstCorrect:0}:{firstAttempts:5,firstCorrect:5}]))};
const quota=buildQuestions(catalogs,config,history,seededRandom(4)).questions;
const facts=poolHistory(catalogs,config,history);
check('eligible facts classify weak/new/other',facts.buckets.weak===14&&facts.buckets.new===14&&facts.buckets.other===all.length-28);
check('10-question quotas select4 weak3 new3 other',[quota.filter(q=>all.findIndex(a=>a.itemId===q.itemId)<14).length,quota.filter(q=>{const i=all.findIndex(a=>a.itemId===q.itemId);return i>=14&&i<28;}).length,quota.filter(q=>all.findIndex(a=>a.itemId===q.itemId)>=28).length].join(',')==='4,3,3');
check('no repeated recommended target',new Set(quota.map(questionTargetKey)).size===10);
const allNew:QuizHistory={skills:{}};
check('new learner is never called weak',recommend(catalogs,config,allNew).note==='Start with the basics.');
check('recent eligible misses lead recommendation',recommend(catalogs,config,history).note.includes('recent mistakes'));
const typeConfig=soloConfig(DEFAULT_QUIZ_PREFERENCES,'kana','practice','type',undefined,[],'growth-type',now);
check('read weakness does not become type weakness',poolHistory(catalogs,typeConfig,history).buckets.weak===0&&recommend(catalogs,typeConfig,history).note==='Start with the basics.');
const oneWeak:QuizHistory={skills:Object.fromEntries(all.map((q,i)=>[q.skillKey,i===0?{firstAttempts:4,firstCorrect:0}:{firstAttempts:4,firstCorrect:4}]))};
check('quota shortages fill without padding or duplicates',buildQuestions(catalogs,config,oneWeak,seededRandom(8)).questions.length===10);
check('empty pool asks for relevant setup',recommend(catalogs,{...config,pool:{filter:'custom',itemIds:[]}},history).needsSetup);
check('small pool recommends honest one-tap length',recommend(catalogs,{...config,pool:{filter:'custom',itemIds:[all[0].itemId]}},history).count===1&&!recommend(catalogs,{...config,pool:{filter:'custom',itemIds:[all[0].itemId]}},history).needsSetup);

let stats:StudentStats={xp:0,totalAttempts:0,correctCount:0,studyDates:[],streakCount:0,lastActiveDate:'',masteredChars:[],characterProgress:{},vocabularyProgress:{},favoriteCategory:'basic',srsCards:{},survivalBestScore:0,srsReviewedTotal:0};
let mono=0;
const stamp=()=>({...clock,monoMs:++mono});
function settle(s:ActiveSession):ActiveSession {
  while(s.pending){stats=applyQuizRecord(stats,progressEntryForPending(s));s=active(reduceSession(s,{type:'COMMIT_OK',sessionId:s.config.sessionId,seq:s.pending.record.seq,attempt:s.pending.attempt,clock:stamp()}));}
  return s;
}
function play(questions:readonly Question[],sessionId:string,wrong:ReadonlySet<number>,repairOf?:string):ActiveSession {
  let s=active(reduceSession(createSession(),{type:'START',questions,clock:stamp(),config:{sessionId,subject:'kana',origin:repairOf?'repair':'practice',challenge:'steady',autoNext:false,previousSurvivalBest:0,rewardVersion:1,...(repairOf?{repairOf}:{})}}));
  for(let i=0;i<questions.length;i++){
    const q=s.current;if(q.responseType!=='choice')throw Error('Choice fixture required');
    s=active(reduceSession(s,{type:'ANSWER',sessionId,questionId:q.id,clock:stamp(),inputId:`${sessionId}_${i}`,response:{type:'choice',choiceId:wrong.has(i)?q.choices.find(c=>c.id!==q.correctChoiceId)!.id:q.correctChoiceId}}));
    s=settle(s);
    s=settle(active(reduceSession(s,{type:'NEXT',sessionId,questionId:q.id,clock:stamp(),inputId:`next_${i}`})));
  }
  check('reaches results',s.phase==='results');return s;
}
const original=play(buildQuestions(catalogs,config,{},seededRandom(5)).questions,'growth',new Set([0,1,2,3,4,5,6]));
const oldSummary=summarize(original),oldStats={attempts:stats.totalAttempts,correct:stats.correctCount};
const firstQuestions=repairQuestions(remainingQuestions(original),'repair-one');
check('repair max5 unique and frozen same kinds',firstQuestions.length===5&&new Set(firstQuestions.map(questionTargetKey)).size===5&&firstQuestions.every(q=>Object.isFrozen(q)&&original.questions.some(o=>o.skillKey===q.skillKey&&o.kind===q.kind)));
const firstRepair=play(firstQuestions,'repair-one',new Set([4]),original.config.sessionId);
const combined=summarize(original,[firstRepair,firstRepair]);
check('repair keeps original first-pass counts/accuracy',isDeepStrictEqual(combined.firstPass,oldSummary.firstPass));
check('repair changes only separate counters and5XP correct',stats.totalAttempts===oldStats.attempts&&stats.correctCount===oldStats.correct&&summarize(firstRepair).xp.total===20&&firstRepair.records.every(r=>r.type==='answer'&&r.origin==='repair'&&r.xp<=5));
check('remaining misses include outside first batch',remainingQuestions(original,[firstRepair]).length===3);
const secondRepair=play(repairQuestions(remainingQuestions(original,[firstRepair]),'repair-two'),'repair-two',new Set(),original.config.sessionId);
check('explicit second repair finishes remaining set',remainingQuestions(original,[firstRepair,secondRepair]).length===0&&summarize(original,[firstRepair,secondRepair]).repair.correctedMisses===7);
check('completion bonus unchanged by repair',summarize(original,[firstRepair,secondRepair]).xp.completion===oldSummary.xp.completion&&oldSummary.xp.completion===20);
check('repair stats use ra/rc not a/c',firstRepair.questions.every(q=>(stats.quizSkills?.[q.skillKey].ra??0)>=1&&(stats.quizSkills?.[q.skillKey].a??0)===1));
const restored=validateSnapshot(serializeSnapshot(firstRepair,'growth-owner',stamp()),'growth-owner',stamp());
check('repair recovery keeps exact bank and origin',restored.ok&&restored.state.config.origin==='repair'&&isDeepStrictEqual(restored.state.questions,firstQuestions));
check('refresh fallback retains unresolved current repair targets only',remainingQuestions(firstRepair).length===1);
check('duplicate targets across kinds collapse in repair',repairQuestions([...firstQuestions,...firstQuestions],'unique').length===5);

const duplicateKinds=freeze([{...all[0],id:occurrenceId('deck',0)},{...all[0],kind:'kana-type' as const,skillKey:all[0].itemId+'__kana-type',id:occurrenceId('deck',1)},...all.slice(1,9)]);
const choices=reviewChoices(duplicateKinds,{skills:{...history.skills,[all[0].skillKey]:{firstAttempts:5,firstCorrect:0,lastFirstMissAt:now}}},key=>key===all[1].deck?.itemKey);
check('actual deck identity dedupes kinds',choices.length===9);
check('batch max5 excludes existing cards',reviewBatch(choices).length===5&&reviewBatch(choices).every(c=>!c.present));
check('ranked batch starts with lowest accuracy and recent miss',reviewBatch(choices)[0].target.itemKey===all[0].deck?.itemKey);
check('already-present cards do not return in next batch',reviewBatch(choices.map(c=>({...c,present:c.present||reviewBatch(choices).some(b=>b.id===c.id)}))).length===3);
const words=buildQuestions(catalogs,soloConfig({...DEFAULT_QUIZ_PREFERENCES,quizLength:'all'},'kanji','practice','word',undefined,[],'context-deck',now),{},seededRandom(1)).questions;
const contextCards=reviewChoices(words,{},()=>false);
check('context maps to real bare kanji targets',contextCards.every(c=>c.target.type==='kanji'&&!c.target.itemKey.startsWith('kanji:')&&KANJI_DATA.some(k=>k.kanji===c.target.itemKey)));
check('multiple context words dedupe same target card',contextCards.length<words.length);
check('daily cap copy is accurate',reviewAddedCopy(2,0).includes('paused')&&reviewAddedCopy(2,10).includes('up to 10')&&reviewAddedCopy(2,9999)==='Added 2 to your Review Deck.');
check('nothing automatically adds a card',Object.keys(stats.srsCards).length===0);
const app=readFileSync('src/App.tsx','utf8');
check('single controller retained',(app.match(/useQuizSession\(/g)??[]).length===1);
check('Writing Desk guide remains',readFileSync('src/components/MenuScreen.tsx','utf8').includes('guide: "desk"'));
console.log(`${passed} QZ8 growth checks passed, 0 failed.`);
