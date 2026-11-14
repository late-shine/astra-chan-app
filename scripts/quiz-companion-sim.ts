import assert from 'node:assert/strict';
import { advanceCompanion, companionView, createCompanion, drawCompanion, type CompanionInput, type CompanionRecord } from '../src/quiz/companion';
import { COMPANION_COPY, type CompanionCategory } from '../src/quiz/companionCopy';
import { settledCompanionRecords } from '../src/quiz/useQuizCompanion';
import type { ActiveSession } from '../src/quiz/types';
let count = 0;
function check(name: string, value: unknown) { assert.ok(value, name); count++; }
const lines = Object.values(COMPANION_COPY).flat();
check('72 authored unique IDs', lines.length === 72 && new Set(lines.map(l => l.id)).size === 72);
check('all correct lines fit auto-next', COMPANION_COPY.correct.every(l => l.text.split(/\s+/).length <= 12));
for (const category of Object.keys(COMPANION_COPY) as CompanionCategory[]) {
  let bag = createCompanion(42); const ids: string[] = [];
  for (let i = 0; i < 30; i++) { bag = drawCompanion(bag, category); ids.push(bag.lineId); }
  for (let i = 0; i < 30; i += 6) check(`${category} bag ${i} exhausts`, new Set(ids.slice(i, i + 6)).size === 6);
  check(`${category} refill avoids adjacent repeat`, ids.every((id, i) => !i || id !== ids[i - 1]));
}
let state = createCompanion(123); let records: CompanionRecord[] = [];
let input: CompanionInput = { scope: 'owner:session', phase: 'asking', question: 'q0', records, challenge: false, now: 0 };
const step = (patch: Partial<CompanionInput> = {}) => { input = { ...input, ...patch, records }; state = advanceCompanion(state, input); return state; };
step();
function answer(outcome: CompanionRecord['outcome'], now = input.now + 5000) { records = [...records, { seq: records.length + 1, outcome }]; return step({ phase: 'feedback', question: `q${records.length}`, now }); }
answer('wrong');answer('timeout');check('two misses no support', state.run === 2 && state.triggers === 0);
answer('wrong');check('third miss support', state.run === 3 && state.triggers === 1 && state.expression === 'trying' && state.lineId.startsWith('support-'));
const third = JSON.stringify(state);step();check('rerender/duplicate delivery is stable', JSON.stringify(state) === third);
step({phase:'asking'});check('next question retains trying art and support line', state.expression === 'trying' && state.lineId.startsWith('support-'));
answer('wrong');check('fourth miss retains trying without retrigger',state.expression==='trying'&&state.triggers===1);
answer('timeout');check('later timeout retains trying',state.expression==='trying'&&state.triggers===1);
step({phase:'committing'});check('pending commit retains trying art',state.expression==='trying');
for (let i = 0; i < 3; i++) answer('wrong');check('misses4–8 never retrigger', state.run === 8 && state.triggers === 1);
answer('correct');check('first correct recovers', state.run === 0 && state.expression==='pleased' && state.lineId.startsWith('recovery-'));
answer('wrong');answer('wrong');answer('timeout');check('later run triggers second support', state.triggers === 2);
answer('correct');answer('wrong');answer('wrong');answer('wrong');check('support capped at two', state.triggers === 2 && state.expression !== 'trying');
// Earliest possible second run reaches3 only four answered records after support; cooldown prevents it.
records=[];state=createCompanion(3);step({scope:'cooldown',phase:'asking'});answer('wrong');answer('wrong');answer('wrong');answer('correct');answer('wrong');answer('wrong');answer('wrong');check('five-answer cooldown',state.triggers===1);
answer('unattempted');check('unattempted neither increments nor resets run',state.run===3);
const beforeInvalid=JSON.stringify(state);records=[...records,{seq:-1,outcome:'wrong'}];step();check('invalid sequence ignored',JSON.stringify(state)===beforeInvalid);
// Rehydrate confirmed history but do not replay support; rebuild cap and cooldown.
const restored=advanceCompanion(createCompanion(3),{...input,records,phase:'paused'});
check('refresh reconstructs history',restored.triggers===1&&restored.run===3);
check('refresh starts resume and no trying replay',restored.lineId.startsWith('resume-')&&restored.expression==='intro'&&!restored.pending);
const tryingHistory:CompanionRecord[]=[{seq:1,outcome:'wrong'},{seq:2,outcome:'timeout'},{seq:3,outcome:'wrong'}];
const tryingRestore=advanceCompanion(createCompanion(3),{...input,records:tryingHistory,phase:'paused'});
const resumed=advanceCompanion(tryingRestore,{...input,records:tryingHistory,phase:'asking'});check('resuming restores active trying without historic support speech',resumed.expression==='trying'&&!resumed.lineId.startsWith('support-'));
const blockedTrying=advanceCompanion(resumed,{...input,records:tryingHistory,phase:'feedback',blocked:true});check('blocking error still overrides trying',blockedTrying.expression==='intro');
records=[];state=createCompanion(7);step({scope:'timed',phase:'asking',challenge:true});answer('wrong');answer('wrong');answer('timeout');check('timed support deferred',state.pending&&state.expression!=='trying'&&!state.lineId.startsWith('support-'));
step({phase:'paused',explicitPause:false});check('automatic pause retains pending without intervention',state.pending&&state.expression==='intro');step({explicitPause:true});check('explicit pause shows deferred support',state.expression==='trying'&&state.lineId.startsWith('support-')&&!state.pending);
records=[];state=createCompanion(7);step({scope:'survival',phase:'asking',challenge:true});answer('wrong');answer('wrong');answer('wrong');answer('correct');check('correct clears timed pending',!state.pending&&state.lineId.startsWith('recovery-'));
step({phase:'paused'});check('stale timed support not shown at pause',state.lineId.startsWith('pause-'));
records=[];state=createCompanion(9);step({scope:'throttle',phase:'asking',challenge:false});answer('correct',1000);const line=state.lineId;answer('wrong',1200);check('throttle keeps copy but changes expression',state.lineId===line&&state.expression==='encouraging');step({now:9000});check('dropped ordinary line is never queued',state.lineId===line);answer('wrong',9100);check('eligible later ordinary updates',state.lineId.startsWith('wrong-'));
const muted=companionView(state,true);check('quiet hides only personality',muted.speech===''&&!muted.support&&muted.expression===state.expression);
step({phase:'results',result:{complete:true,accuracy:.8}});check('80% full result is strong',state.expression==='celebrate'&&state.lineId.startsWith('result-strong-'));
step({phase:'asking'});step({phase:'results',result:{complete:true,accuracy:.79}});check('mixed result truthful',state.expression==='encouraging'&&state.lineId.startsWith('result-mixed-'));
step({phase:'asking'});step({phase:'results',result:{complete:false,accuracy:1}});check('partial never celebrates',state.expression==='intro'&&state.lineId.startsWith('result-partial-'));
check('blocking errors suppress celebration and speech',companionView(state,false,true).speech===''&&companionView(state,false,true).expression==='intro');
records=[];step({scope:'other-owner:repair-session',phase:'asking'});check('owner/session/repair reset',state.run===0&&state.triggers===0&&state.seq===0&&state.recent.length===1);
answer('wrong');const hiddenLine=state.lineId;step({hidden:true});answer('wrong');check('hidden event emits no message',state.run===2&&state.lineId===hiddenLine);step({hidden:false});check('foreground does not replay',state.lineId===hiddenLine);
// Narrow adapter contract: pending retries/cloud receipts are not new settled answers.
const record={type:'answer',sessionId:'s',seq:1,outcome:'wrong'};
const pending={record,status:'failed'};
const fake=(extra: object)=>({config:{sessionId:'s'},records:[record],acknowledgedSeq:0,pending,phase:'committing',volatile:false,...extra} as unknown as ActiveSession);
const frozenInput=fake({acknowledgedSeq:1});const originalJSON=JSON.stringify(frozenInput);settledCompanionRecords(frozenInput);check('projection cannot modify recovery/record state',JSON.stringify(frozenInput)===originalJSON);
check('pending commit excluded',settledCompanionRecords(fake({})).length===0);
check('failed retry excluded',settledCompanionRecords(fake({pending:{...pending,attempt:3}})).length===0);
check('ack settled record consumed',settledCompanionRecords(fake({acknowledgedSeq:1})).length===1);
check('explicit volatile feedback consumed',settledCompanionRecords(fake({volatile:true,phase:'feedback'})).length===1);
check('old volatile flag cannot settle new commit',settledCompanionRecords(fake({volatile:true})).length===0);
check('adapter strips typed/answer/XP fields',Object.keys(settledCompanionRecords(fake({acknowledgedSeq:1}))[0]).sort().join(',')==='outcome,seq');
console.log(`${count} companion checks passed, 0 failed.`);
