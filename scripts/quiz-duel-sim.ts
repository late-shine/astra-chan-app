/** QZ9 adversarial protocol2 fixtures. No Firebase/app/browser/network execution. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { HIRAGANA_DATA,KATAKANA_DATA,KANJI_DATA,VOCABULARY_DATA } from '../src/data';
import { KANJI_READING_RECORDS_V2,KANJI_WORD_FAMILIES_V2 } from '../src/kanjiWordFamiliesV2';
import { encodeId } from '../src/quiz/ids';
import { questionView } from '../src/quiz/grade';
import { createDuelRoom,joinDuel,acknowledgeReady,changeDuelSettings,startMatch,openParallelQuestion,applyDuelAnswer,
  expireQuestion,advanceCompetitive,advanceParallel,finishMatch,cancelWaiting,rematch,summarizeDuel,deriveDuelHistory,reconnectDuel,
  decodeDuelRoom,buildDuelManifest,duelDuration,duelMatchId,defaultDuelMode,DUEL_LIMITS,type DuelResult,type DuelError } from '../src/quiz/duel';
import type { Catalogs,DuelRoom,DuelScope,DuelSettings,DuelKind,DuelManifest,Response,DuelRole } from '../src/quiz/types';
let passed=0;
function check(name:string,value:unknown){assert.ok(value,name);passed++;}
function room(result:DuelResult):DuelRoom {if(!result.ok||!result.room)throw Error(JSON.stringify(result));return result.room;}
function rejected(name:string,result:DuelResult,code?:DuelError){check(name,result.ok===false&&(!code||result.code===code));}
function throws(name:string,fn:()=>unknown){try{fn();}catch{check(name,true);return;}check(name,false);}
const NOW=Date.UTC(2026,10,14,8),catalogs:Catalogs={hiragana:HIRAGANA_DATA,katakana:KATAKANA_DATA,kanji:KANJI_DATA,vocabulary:VOCABULARY_DATA,readingRecords:KANJI_READING_RECORDS_V2,wordFamilies:KANJI_WORD_FAMILIES_V2};
const settings=(mode:DuelSettings['mode']='competitive',kind:DuelKind='kana-read',count:DuelSettings['count']=5):DuelSettings=>{
  const subject=kind.startsWith('kana-')?'kana':kind.startsWith('vocab-')?'vocab':'kanji';
  return {subject,kind,count,mode,difficulty:'medium',durationMs:duelDuration(subject,'medium'),pool:{filter:'all',label:'Public catalog',...(subject==='kana'?{script:'hiragana' as const,stages:['basic' as const]}:{})}};
};
const scope=(r:DuelRoom,uid='H',now=NOW):DuelScope=>({uid,now,matchId:r.v2.matchId,revision:r.v2.settingsRevision});
let serial=0;
function waiting(s=settings(),series=`series${serial++}`):DuelRoom {
  let r=room(createDuelRoom('H','Host',s,series,NOW));r=room(joinDuel(r,scope(r,'G'),'Guest'));return r;
}
function ready(r:DuelRoom):DuelRoom {r=room(acknowledgeReady(r,scope(r),2));return room(acknowledgeReady(r,scope(r,'G'),2));}
function started(s=settings(),series?:string):DuelRoom {const r=ready(waiting(s,series));return room(startMatch(r,scope(r),buildDuelManifest(catalogs,s,r.v2.matchId,31),NOW+1500));}
const win=(r:DuelRoom,index:number,correct=true):Response=>{const q=r.v2.manifest!.questions[index];return q.responseType==='choice'?{type:'choice',choiceId:correct?q.correctChoiceId:q.choices.find(c=>c.id!==q.correctChoiceId)!.id}:{type:'typed',value:correct?q.acceptedTyped[0]:'not-an-answer'};};
function answer(r:DuelRoom,role:DuelRole,index:number,correct=true,elapsed=100):DuelRoom {
  const start=r.v2.rounds![`r_${index}`].windows[role]!.startAt;
  return room(applyDuelAnswer(r,scope(r,role==='host'?'H':'G',start+elapsed+10),{index,receiptId:`${role}_${index}`,capturedAt:start+elapsed,response:win(r,index,correct)}));
}

console.log('Protocol validation / readiness / frozen manifests');
rejected('null snapshots handled',startMatch(null,{uid:'H',matchId:'x',revision:0,now:NOW},{schemaVersion:1,settingsRevision:0,questions:[]},NOW),'missing');
rejected('old rooms rejected explicitly',joinDuel({status:'waiting',hostId:'H'}, {uid:'G',matchId:'x',revision:0,now:NOW},'Guest'),'version');
const firebaseEmpty=JSON.parse(JSON.stringify(room(createDuelRoom('H','Host',settings(),'firebase',NOW))));
delete firebaseEmpty.guestId;delete firebaseEmpty.guestName;delete firebaseEmpty.questionStartedAt;
check('Firebase omitted null membership and start normalized',decodeDuelRoom(firebaseEmpty).guestId===null&&decodeDuelRoom(firebaseEmpty).questionStartedAt===null);
firebaseEmpty.guestId='G';
check('child guest claim before display name is decodable',decodeDuelRoom(firebaseEmpty).guestName==='Guest');
const firebaseWords=JSON.parse(JSON.stringify(room(createDuelRoom('H','Host',settings('parallel','vocab-meaning'),'firebasewords',NOW))));
delete firebaseWords.settings.stages;
check('Firebase omitted empty compatibility stages normalized',decodeDuelRoom(firebaseWords).settings.stages.length===0);
let lobby=waiting();
rejected('host cannot start before Ready',startMatch(lobby,scope(lobby),buildDuelManifest(catalogs,lobby.v2.settings,lobby.v2.matchId,1),NOW+1500),'not-ready');
rejected('old guest has no protocol2 capability',acknowledgeReady(lobby,scope(lobby,'G'),1),'version');
lobby=room(acknowledgeReady(lobby,scope(lobby),2));
rejected('old guest blocks start despite host Ready',startMatch(lobby,scope(lobby),buildDuelManifest(catalogs,lobby.v2.settings,lobby.v2.matchId,1),NOW+1500),'not-ready');
lobby=room(acknowledgeReady(lobby,scope(lobby,'G'),2));const oldRevision=lobby.v2.settingsRevision;
const before=JSON.stringify(lobby),sourceSettings=settings();
lobby=room(changeDuelSettings(lobby,scope(lobby),sourceSettings));
check('settings change invalidates both readiness states',!lobby.v2.readiness&&lobby.v2.settingsRevision===oldRevision+1);
check('settings source object not frozen/mutated',!Object.isFrozen(sourceSettings)&&JSON.stringify(sourceSettings)===JSON.stringify(settings()));
rejected('stale Ready cannot acknowledge new settings',acknowledgeReady(lobby,{...scope(lobby,'G'),revision:oldRevision},2),'stale');
rejected('outsider rejected',acknowledgeReady(lobby,scope(lobby,'X'),2),'outsider');
rejected('guest cannot change settings',changeDuelSettings(lobby,scope(lobby,'G'),settings()),'outsider');
const changedReady=ready(lobby);
rejected('old manifest rejected even with current Ready/scope',startMatch(changedReady,scope(changedReady),buildDuelManifest(catalogs,changedReady.v2.settings,changedReady.v2.matchId,1,oldRevision),NOW+1500),'stale');
check('fresh manifest revision starts',room(startMatch(changedReady,scope(changedReady),buildDuelManifest(catalogs,changedReady.v2.settings,changedReady.v2.matchId,1,changedReady.v2.settingsRevision),NOW+1500)).status==='playing');
check('previous lobby input was immutable',JSON.parse(before).v2.readiness.guest.protocol===2);
let largestManifest=0;
for(const kind of ['kana-read','kana-type','vocab-meaning','vocab-reading','vocab-reverse','kanji-meaning','kanji-on'] as const){
  const s=settings('parallel',kind,20),r=ready(waiting(s)),manifest=buildDuelManifest(catalogs,s,r.v2.matchId,9);
  const m=JSON.stringify(manifest);largestManifest=Math.max(largestManifest,new TextEncoder().encode(m).length);
  const live=room(startMatch(r,scope(r),manifest,NOW+1500));
  const guest=decodeDuelRoom(JSON.parse(JSON.stringify(live)));
  check('guest needs no local catalog: '+kind,isDeepStrictEqual(guest.v2.manifest,live.v2.manifest));
  check('both clients identical question/choice order: '+kind,isDeepStrictEqual(guest.v2.manifest!.questions.map(questionView),manifest.questions.map(questionView)));
  check('complete bounded manifest: '+kind,manifest.questions.length===20&&new TextEncoder().encode(m).length<=DUEL_LIMITS.manifestBytes&&!m.includes('undefined'));
  check('no private learning maps: '+kind,!/quizSkills|characterProgress|vocabularyProgress|masteredChars/.test(JSON.stringify(live)));
}
check('word/kanji modes default Parallel',defaultDuelMode('vocab')==='parallel'&&defaultDuelMode('kanji')==='parallel'&&defaultDuelMode('kana')==='competitive');
throws('Superhard not allowed outside kana',()=>duelDuration('vocab','superhard'));
rejected('learned scopes rejected',createDuelRoom('H','Host',{...settings(),pool:{filter:'learned',label:'private'} } as unknown as DuelSettings,'bad',NOW),'invalid');
rejected('context/kun/mixed not duel kinds',createDuelRoom('H','Host',{...settings(),kind:'kanji-word'} as unknown as DuelSettings,'bad',NOW),'invalid');
const base=started();
const badSchema=structuredClone(base) as unknown as {v2:{manifest:{schemaVersion:number}}};badSchema.v2.manifest.schemaVersion=2;
throws('new manifest schema mismatch rejected',()=>decodeDuelRoom(badSchema));
throws('private map injection rejected',()=>decodeDuelRoom({...base,v2:{...base.v2,quizSkills:{}}}));
throws('unsupported protocol rejected',()=>decodeDuelRoom({...base,protocolVersion:3}));
const reordered=JSON.parse(JSON.stringify(base));reordered.settings=Object.fromEntries(Object.entries(reordered.settings).reverse());
check('wire object property order is irrelevant',decodeDuelRoom(reordered).v2.matchId===base.v2.matchId);
const sparseMaps=JSON.parse(JSON.stringify(waiting()));delete sparseMaps.v2.readiness;delete sparseMaps.answers;
check('RTDB absent empty maps accepted',decodeDuelRoom(sparseMaps).status==='waiting');
throws('undefined is never a wire value',()=>decodeDuelRoom({...base,hostAvatar:undefined}));
throws('nonfinite timestamps rejected',()=>decodeDuelRoom({...base,v2:{...base.v2,expiresAt:Infinity}}));
const smallIds=base.v2.manifest!.questions.map(q=>q.itemId).slice(0,4),small={...settings(),pool:{...settings().pool,filter:'explicit' as const,targetIds:smallIds}};
throws('less than5 eligible targets cannot start',()=>buildDuelManifest(catalogs,small,'small_0',1));
const ten=buildDuelManifest(catalogs,settings('parallel','kana-read',10),'ten_0',2);
const shrink={...settings('parallel','kana-read',20),pool:{...settings().pool,filter:'explicit' as const,targetIds:ten.questions.slice(0,7).map(q=>q.itemId)}};
check('counts shrink to actual unique public targets',buildDuelManifest(catalogs,shrink,'shrunk_0',1).questions.length===7);

console.log('Competitive adversarial delivery / timing / once-only advance');
const start=base.v2.rounds!.r_0.windows.host!.startAt,deadline=base.v2.rounds!.r_0.windows.host!.deadlineAt;
const event={index:0,receiptId:'captured',capturedAt:start+100,response:win(base,0)};
rejected('countdown answer rejected',applyDuelAnswer(base,scope(base,'H',start-1),{...event,capturedAt:start-1}),'early');
rejected('future captured answer time rejected',applyDuelAnswer(base,scope(base,'H',start+100),{...event,capturedAt:start+101}),'early');
rejected('queued before deadline but delivered late rejected',applyDuelAnswer(base,scope(base,'H',deadline),event),'late');
rejected('retry must use fresh estimated now',applyDuelAnswer(base,scope(base,'H',deadline+5000),event),'late');
rejected('stale match rejected',applyDuelAnswer(base,{...scope(base,'H',start+200),matchId:'old_0'},event),'stale');
rejected('stale index rejected',applyDuelAnswer(base,scope(base,'H',start+200),{...event,index:1}),'stale');
rejected('outsider answer rejected',applyDuelAnswer(base,scope(base,'X',start+200),event),'outsider');
rejected('caller outcome rejected',applyDuelAnswer(base,scope(base,'H',start+200),{...event,outcome:'correct'} as unknown as typeof event),'invalid');
rejected('unknown choice rejected',applyDuelAnswer(base,scope(base,'H',start+200),{...event,response:{type:'choice',choiceId:'fake'}}),'invalid');
rejected('advance before lock rejected',advanceCompetitive(base,scope(base,'G',start+200),0,start+1700),'locked');
let won=room(applyDuelAnswer(base,scope(base,'H',start+200),event));
const stored=won.v2.rounds!.r_0.answers!.host!;
const duplicate=applyDuelAnswer(won,scope(won,'H',deadline+200),{...event,response:win(won,0,false)});
check('committed receipt returns stored answer without regrading',duplicate.ok&&!duplicate.changed&&isDeepStrictEqual(duplicate.answer,stored));
rejected('locked competitive second claim adds no answer',applyDuelAnswer(won,scope(won,'G',start+201),{...event,receiptId:'guestClaim'}),'locked');
check('winner gets1 point, unanswered loser unattempted',summarizeDuel(won).host.points===1&&summarizeDuel(won).guest.attempted===0&&summarizeDuel(won).guest.unattempted===5);
rejected('cannot advance before1600ms lock feedback',advanceCompetitive(won,scope(won,'G',start+1799),0,start+3299),'early');
const advanced=room(advanceCompetitive(won,scope(won,'G',start+1800),0,start+3300));
rejected('second participant advance cannot skip a round',advanceCompetitive(advanced,scope(advanced,'H',start+1801),0,start+3301),'stale');
check('next competitive start scheduled once',advanced.v2.competitiveIndex===1&&advanced.v2.rounds!.r_1.windows.host!.startAt===start+3300);
let both=answer(base,'host',0,false);both=answer(both,'guest',0,false,150);
check('both wrong lock without winner',both.v2.rounds!.r_0.lockedAt!==undefined&&!both.v2.rounds!.r_0.winner&&summarizeDuel(both).host.wrong===1);
rejected('early expiry rejected',expireQuestion(base,scope(base,'G',deadline-1),0),'early');
const expiredRound=room(expireQuestion(base,scope(base,'G',deadline),0));
check('expiry synthesizes only missing full-duration timeouts',summarizeDuel(expiredRound).host.timeout===1&&summarizeDuel(expiredRound).guest.elapsedMs===base.v2.settings.durationMs&&!expiredRound.v2.rounds!.r_0.winner);
check('round expiry idempotent',expireQuestion(expiredRound,scope(expiredRound,'H',deadline+1),0).ok);
check('all original rooms remain unchanged',!base.v2.rounds!.r_0.answers&&base.currentQuestion===0);

console.log('Parallel independence / reconnect / outcomes / history');
let parallel=started(settings('parallel'));
rejected('cannot answer before acknowledged opening',applyDuelAnswer(parallel,scope(parallel,'H',NOW+2000),{index:0,receiptId:'not-open',capturedAt:NOW+1900,response:win(parallel,0)}));
parallel=room(openParallelQuestion(parallel,scope(parallel,'H',NOW+2000),0));
const originalWindow=parallel.v2.rounds!.r_0.windows.host!;
check('opening acknowledged once; reconnect never restarts clock',isDeepStrictEqual(room(openParallelQuestion(parallel,scope(parallel,'H',NOW+6000),0)).v2.rounds!.r_0.windows.host,originalWindow));
const myBefore=reconnectDuel(parallel,'H',parallel.v2.matchId,NOW+2200);
parallel=room(openParallelQuestion(parallel,scope(parallel,'G',NOW+4000),0));
parallel=answer(parallel,'guest',0,false,300);
rejected('wrong answer cannot auto-next',advanceParallel(parallel,scope(parallel,'G',NOW+6000),0,'auto'),'early');
parallel=room(advanceParallel(parallel,scope(parallel,'G',NOW+6000),0,'manual'));
parallel=room(openParallelQuestion(parallel,scope(parallel,'G',NOW+6100),1));
const myAfter=reconnectDuel(parallel,'H',parallel.v2.matchId,NOW+6200);
check('opponent progress does not change own draft key/question/start',myBefore.draftKey===myAfter.draftKey&&myBefore.startAt===myAfter.startAt&&isDeepStrictEqual(myBefore.question,myAfter.question));
check('reconnect keeps shared deadline elapsed',myAfter.deadlineAt===originalWindow.deadlineAt&&myAfter.remainingMs===originalWindow.deadlineAt-(NOW+6200));
const timedOut=room(expireQuestion(parallel,scope(parallel,'H',originalWindow.deadlineAt),0));
check('parallel timeout uses own full duration without changing opponent index',timedOut.v2.rounds!.r_0.answers!.host!.outcome==='timeout'&&timedOut.v2.rounds!.r_0.answers!.host!.elapsedMs===timedOut.v2.settings.durationMs&&timedOut.v2.progress.guest.index===1);
rejected('parallel timeout still requires explicit Next',advanceParallel(timedOut,scope(timedOut,'H',originalWindow.deadlineAt+1600),0,'auto'),'early');
parallel=answer(parallel,'host',0,true,500);
check('own elapsed is not shared with other role',parallel.v2.rounds!.r_0.answers!.host!.elapsedMs===500&&parallel.v2.rounds!.r_0.answers!.guest!.elapsedMs===300);
rejected('correct auto-next waits1600ms',advanceParallel(parallel,scope(parallel,'H',NOW+4109),0,'auto'),'early');
parallel=room(advanceParallel(parallel,scope(parallel,'H',NOW+4110),0,'auto'));
rejected('duplicate advance cannot move own index twice',advanceParallel(parallel,scope(parallel,'H',NOW+4111),0,'manual'),'stale');
rejected('cannot finish while either still playing',finishMatch(parallel,scope(parallel,'H',NOW+7000),'complete'),'state');
rejected('no rematch mid-play',rematch(parallel,scope(parallel,'H',NOW+7000),duelMatchId(parallel.v2.seriesId,1)),'state');
const disconnected={...parallel,presence:{H:{tabA:true as const,tabB:true as const}},lastSeen:{G:NOW+1000}};
check('multiple own connections remain connected',reconnectDuel(disconnected,'H',parallel.v2.matchId,NOW+5001).opponentDisconnected);
rejected('cannot end absence before60s',finishMatch(disconnected,scope(parallel,'H',NOW+60999),'connection'),'connection');
const reconnecting={...disconnected,presence:{...disconnected.presence,G:{newTab:true as const}}};
check('old tab lastSeen cannot mark connected opponent offline',!reconnectDuel(reconnecting,'H',parallel.v2.matchId,NOW+70000).opponentDisconnected);
const aborted=room(finishMatch(disconnected,scope(parallel,'H',NOW+61000),'connection'));
check('aborted has partial counts and no declared winner',summarizeDuel(aborted).partial&&summarizeDuel(aborted).winner===null&&deriveDuelHistory(aborted,'H','ABC123').result==='aborted');
const left=room(finishMatch(parallel,scope(parallel,'G',NOW+7000),'left'));
check('explicit leave retains immutable members and results',left.guestId==='G'&&left.hostId==='H'&&left.v2.endedReason==='left');
const lobbyLeft=room(finishMatch(lobby,scope(lobby,'G'),'left'));
check('waiting guest leave closes lobby instead of clearing membership',lobbyLeft.status==='finished'&&lobbyLeft.guestId==='G');
const canceled=cancelWaiting(lobby,scope(lobby));check('waiting host cancel handles null output',canceled.ok&&canceled.room===null);
rejected('expired room rejects new transition',acknowledgeReady(lobby,scope(lobby,'H',lobby.v2.expiresAt),2),'expired');
throws('expired reconnect rejected',()=>reconnectDuel(parallel,'H',parallel.v2.matchId,parallel.v2.expiresAt));
check('member can explicitly expire room',room(finishMatch(parallel,scope(parallel,'H',parallel.v2.expiresAt),'expired')).v2.endedReason==='expired');

function finishParallel(hostCorrect:readonly boolean[],guestCorrect:readonly boolean[],hostElapsed=100,guestElapsed=200):DuelRoom {
  let r=started(settings('parallel'));
  for(const role of ['host','guest'] as const)for(let i=0;i<5;i++){
    const t=NOW+10000+i*20000+(role==='guest'?100000:0),uid=role==='host'?'H':'G';
    r=room(openParallelQuestion(r,scope(r,uid,t),i));r=answer(r,role,i,(role==='host'?hostCorrect:guestCorrect)[i],role==='host'?hostElapsed:guestElapsed);
    r=room(advanceParallel(r,scope(r,uid,t+3000),i,'manual'));
    if(role==='host'&&i===4)check('finished host waits on opponent',reconnectDuel(r,'H',r.v2.matchId,t+3001).phase==='waiting-opponent');
  }
  return r;
}
const finished=finishParallel([true,true,false,true,true],[true,true,true,true,true]);
check('accuracy outranks speed; summary/history same winner',summarizeDuel(finished).winner==='guest'&&deriveDuelHistory(finished,'G','ABC123').result==='win');
check('parallel compatibility scores not mistaken for0-0 tie',finished.scores.host===0&&finished.scores.guest===0&&deriveDuelHistory(finished,'H','ABC123').opponentScore===5);
check('real manifest denominator not hardcoded10',summarizeDuel(finished).total===5&&deriveDuelHistory(finished,'H','ABC123').questionCount===5);
const equal=finishParallel([true,false,true,false,true],[true,false,true,false,true],500,500);
check('equal accuracy and all-response elapsed is tie',summarizeDuel(equal).winner==='tie');
const faster=finishParallel([true,false,true,false,true],[true,false,true,false,true],100,200);
check('equal correct count breaks on all response durations including wrong',summarizeDuel(faster).winner==='host'&&summarizeDuel(faster).host.elapsedMs===500);
function finishCompetitive(winners:readonly (DuelRole|null)[]):DuelRoom {
  let r=started();
  for(let i=0;i<5;i++){
    const window=r.v2.rounds![`r_${i}`].windows.host!;
    r=winners[i]?answer(r,winners[i]!,i):room(expireQuestion(r,scope(r,'G',window.deadlineAt),i));
    const locked=r.v2.rounds![`r_${i}`].lockedAt!;
    r=room(advanceCompetitive(r,scope(r,i%2?'H':'G',locked+1600),i,locked+3100));
  }
  return r;
}
const competitiveWin=finishCompetitive(['host','host','guest','host',null]);
check('full competitive outcome uses points',summarizeDuel(competitiveWin).winner==='host'&&summarizeDuel(competitiveWin).host.points===3&&deriveDuelHistory(competitiveWin,'G','ABC123').result==='loss');
check('completed timeout rounds charge full elapsed',summarizeDuel(competitiveWin).guest.timeout===1&&summarizeDuel(competitiveWin).guest.unattempted===3);
check('competitive completed tie supported',summarizeDuel(finishCompetitive(['host','guest','host','guest',null])).winner==='tie');
const history=deriveDuelHistory(finished,'H','ABC123');
check('history key fresh matchId, payload no undefined',history.id===finished.v2.matchId&&JSON.parse(JSON.stringify(history)).subject==='kana'&&!JSON.stringify(history).includes('undefined'));
const nextId=duelMatchId(finished.v2.seriesId,1),again=room(rematch(finished,scope(finished,'H',NOW+300000),nextId));
check('rematch preserves code-membership/TTL but clears manifest/answers/Ready',again.v2.matchId!==finished.v2.matchId&&again.guestId==='G'&&again.v2.expiresAt===finished.v2.expiresAt&&!again.v2.manifest&&!again.v2.rounds&&!again.v2.readiness);
rejected('old match answers cannot enter rematch',applyDuelAnswer(again,scope(finished,'H',NOW+300001),event),'stale');
rejected('cannot reuse previous matchId',rematch(finished,scope(finished,'H',NOW+300000),finished.v2.matchId),'stale');
check('fresh IDs deterministically unique over generations',new Set(Array.from({length:100},(_,i)=>duelMatchId('nonce',i))).size===100);
const committedLast=finished.v2.rounds!.r_4.answers!.host!;
const replayFinished=applyDuelAnswer(finished,scope(finished,'H',finished.v2.expiresAt+1),{index:4,receiptId:committedLast.receiptId,capturedAt:0,response:win(finished,4,false)});
check('committed receipt replay after finish/expiry returns stored outcome only',replayFinished.ok&&!replayFinished.changed&&isDeepStrictEqual(replayFinished.answer,committedLast));

console.log('Race order matrix / size and structural adversaries');
for(let seed=0;seed<12;seed++)for(const first of ['host','guest'] as const){
  const r=started(settings(),`race${seed}${first}`),w=answer(r,first,0,true,100+seed);
  const loser=otherRole(first),window=r.v2.rounds!.r_0.windows.host!;
  rejected('race losing correct rejected',applyDuelAnswer(w,scope(w,loser==='host'?'H':'G',window.startAt+200),{index:0,receiptId:'loser',capturedAt:window.startAt+190,response:win(w,0)}),'locked');
  check('race awards exactly one point',summarizeDuel(w).host.points+summarizeDuel(w).guest.points===1);
  const n=room(advanceCompetitive(w,scope(w,loser==='host'?'H':'G',window.startAt+2000),0,window.startAt+3500));
  rejected('race second advance stale',advanceCompetitive(n,scope(n,first==='host'?'H':'G',window.startAt+2001),0,window.startAt+3501),'stale');
}
function otherRole(r:DuelRole):DuelRole{return r==='host'?'guest':'host';}
const bigReady=ready(waiting(settings('parallel','vocab-meaning',20))),normal=buildDuelManifest(catalogs,bigReady.v2.settings,bigReady.v2.matchId,3);
const oversized={...normal,questions:normal.questions.map(q=>({...q,reveal:{...q.reveal,note:'x'.repeat(7000)}}))};
rejected('serialized max manifest enforced',startMatch(bigReady,scope(bigReady),oversized,NOW+1500),'invalid');
const kana20=buildDuelManifest(catalogs,settings('parallel','kana-read',20),'roomBudget_0',7);
const budgetPool={...settings('parallel','kana-read',20),pool:{...settings().pool,filter:'explicit' as const,targetIds:[...kana20.questions.map(q=>q.itemId),...Array.from({length:236},(_,i)=>encodeId('h',['hiragana','x'.repeat(340)+i]))]}};
const budgetLobby=ready(waiting(budgetPool,'roomBudget'));
const budgetManifest:DuelManifest={...kana20,questions:kana20.questions.map(q=>({...q,reveal:{...q.reveal,note:'x'.repeat(5000)}}))};
check('budget fixture manifest fits individual limit',new TextEncoder().encode(JSON.stringify(budgetManifest)).length<=DUEL_LIMITS.manifestBytes);
rejected('combined room payload max enforced',startMatch(budgetLobby,scope(budgetLobby),budgetManifest,NOW+1500),'invalid');
const invalidChoice=structuredClone(base);(invalidChoice.v2.manifest!.questions[0] as unknown as {choices:{id:string;label:string}[]}).choices[1].label=(invalidChoice.v2.manifest!.questions[0] as {choices:readonly {label:string}[]}).choices[0].label;
throws('duplicate displayed options rejected',()=>decodeDuelRoom(invalidChoice));
const activeWords=started(settings('parallel','vocab-meaning'));
check('word compatibility alphabet mixed never determines live subject',activeWords.settings.alphabet==='mixed'&&reconnectDuel(activeWords,'G',activeWords.v2.matchId,NOW+1600).question?.subject==='vocab');
const source=readFileSync('src/quiz/duel.ts','utf8');
check('no ambient time/random/network inside pure module',!source.includes('Date.now')&&!source.includes('new Date')&&!source.includes('Math.random')&&!source.includes('firebase/')&&!source.includes('localStorage'));
console.log(`Largest sampled manifest: ${largestManifest} bytes (limit ${DUEL_LIMITS.manifestBytes}).`);
console.log(`${passed} QZ9 duel checks passed, 0 failed.`);
