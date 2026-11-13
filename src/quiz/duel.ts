/** QZ9 pure protocol. No Firebase, local catalog imports, clocks, RNG, storage or effects. */
import { assertQuestion, grade, questionView } from './grade';
import { decodeId, isSafeKey, occurrenceId } from './ids';
import { buildQuestions } from './pool';
import { seededRandom } from './random';
import { questionTargetKey } from './session';
import { freeze, type Catalogs, type DuelAnswer, type DuelAnswerEvent, type DuelHistory, type DuelKind,
  type DuelManifest, type DuelPayload, type DuelPlayerSummary, type DuelPublicPool, type DuelRole, type DuelRoom,
  type DuelRound, type DuelScope, type DuelSettings, type DuelSummary, type Question, type Response, type Subject } from './types';

export const DUEL_LIMITS = freeze({manifestBytes:128*1024,roomBytes:256*1024,questions:20,ttlMs:2*60*60*1000,
  countdownMs:1500,feedbackMs:1600,disconnectBannerMs:3000,disconnectEndMs:60000});
export const OLD_DUEL_MESSAGE = 'This room uses an older duel version. Both players should refresh and create a new room.';
const ROLES = ['host','guest'] as const;
const KINDS:Readonly<Record<Subject,readonly DuelKind[]>> = {kana:['kana-read','kana-type'],vocab:['vocab-meaning','vocab-reading','vocab-reverse'],kanji:['kanji-meaning','kanji-on']};
export type DuelError = 'missing'|'version'|'invalid'|'outsider'|'expired'|'stale'|'state'|'not-ready'|'early'|'late'|'answered'|'locked'|'connection';
export type DuelResult = {readonly ok:true;readonly room:DuelRoom|null;readonly changed:boolean;readonly answer?:DuelAnswer}
  | {readonly ok:false;readonly code:DuelError;readonly message:string};
class Rejected extends Error { constructor(readonly code:DuelError,message:string){super(message);} }
function need(value:unknown,message='Invalid duel payload',code:DuelError='invalid'):asserts value {if(!value)throw new Rejected(code,message);}
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
function keys(value:unknown,allowed:readonly string[]):void {need(plain(value)&&Object.keys(value).every(k=>allowed.includes(k)));}
const time=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=8.64e15;
const integer=(n:unknown,max=1000000):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=max;
const text=(s:unknown,max=8192):s is string=>typeof s==='string'&&s.length>0&&s.length<=max;
const safe=(s:unknown):s is string=>text(s,128)&&isSafeKey(s);
const token=(s:unknown):s is string=>text(s,80)&&/^[A-Za-z0-9_]+$/u.test(s);
const bytes=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v)).length;
function wire(value:unknown,depth=0):void {
  need(depth<=18);
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){need(Number.isFinite(value));return;}
  if(Array.isArray(value)){need(value.length<=2048);for(let i=0;i<value.length;i++){need(i in value);wire(value[i],depth+1);}return;}
  need(plain(value));for(const [key,v] of Object.entries(value)){need(isSafeKey(key));wire(v,depth+1);}
}
const roundKey=(index:number)=>`r_${index}`; // Avoid RTDB's dense numeric-object to array conversion.
const other=(role:DuelRole):DuelRole=>role==='host'?'guest':'host';
export const duelMatchId=(seriesId:string,generation:number):string=>{
  need(token(seriesId)&&seriesId.length<=64&&integer(generation));return `${seriesId}_${generation}`;
};
export function duelDuration(subject:Subject,difficulty:DuelSettings['difficulty']):number {
  need(['kana','vocab','kanji'].includes(subject)&&['easy','medium','hard','superhard'].includes(difficulty));
  need(subject==='kana'||difficulty!=='superhard');
  return (subject==='kana'?{easy:15000,medium:10000,hard:5000,superhard:3000}:{easy:20000,medium:15000,hard:10000,superhard:0})[difficulty];
}
export const defaultDuelMode=(subject:Subject):DuelSettings['mode']=>subject==='kana'?'competitive':'parallel';
export function assertDuelSettings(s:DuelSettings):void {
  keys(s,['subject','kind','pool','count','difficulty','durationMs','mode']);
  need(['kana','vocab','kanji'].includes(s.subject)&&KINDS[s.subject].includes(s.kind));
  need([5,10,20].includes(s.count)&&['competitive','parallel'].includes(s.mode)&&s.durationMs===duelDuration(s.subject,s.difficulty));
  const p=s.pool;keys(p,['filter','label','script','stages','category','targetIds']);
  need(['all','theme','explicit'].includes(p.filter)&&text(p.label,120));
  if(s.subject==='kana')need(['hiragana','katakana','both'].includes(p.script??'')&&Array.isArray(p.stages)&&p.stages.length>0&&p.stages.length<=4&&new Set(p.stages).size===p.stages.length&&p.stages.every(stage=>['basic','dakuon','handakuon','yoon'].includes(stage)));
  else need(p.script===undefined&&p.stages===undefined);
  need(p.filter==='theme'?s.subject==='vocab'&&text(p.category,80):p.category===undefined);
  if(p.filter==='explicit')need(Array.isArray(p.targetIds)&&p.targetIds.length<=256&&new Set(p.targetIds).size===p.targetIds.length&&p.targetIds.every(id=>{
    if(!isSafeKey(id))return false;const source=decodeId(id);return s.subject==='kana'?['h','k'].includes(source.prefix):source.prefix===(s.subject==='vocab'?'v':'j');
  }));else need(p.targetIds===undefined);
}

export function assertDuelManifest(manifest:DuelManifest,settings:DuelSettings,matchId:string,revision:number):void {
  keys(manifest,['schemaVersion','settingsRevision','questions']);need(integer(revision));need(manifest.schemaVersion===1,'Unsupported question schema','version');need(manifest.settingsRevision===revision,'Manifest was prepared for different settings.','stale');
  need(Array.isArray(manifest.questions)&&manifest.questions.length>=5&&manifest.questions.length<=settings.count&&manifest.questions.length<=20);
  wire(manifest);need(bytes(manifest)<=DUEL_LIMITS.manifestBytes,'Manifest exceeds128KiB');
  const targets=new Set<string>();
  for(const [index,q] of manifest.questions.entries()) {
    keys(q,['id','itemId','skillKey','subject','kind','instruction','face','faceSub','highlights','reveal','speechText','deck','responseType','choices','correctChoiceId','acceptedTyped']);
    need(q.subject===settings.subject&&q.kind===settings.kind&&q.id===occurrenceId(matchId,index)&&q.skillKey===`${q.itemId}__${q.kind}`&&isSafeKey(q.skillKey));
    const source=decodeId(q.itemId);
    need(q.subject==='kana'?['h','k'].includes(source.prefix)&&source.tuple.length===2&&source.tuple[0]===(source.prefix==='h'?'hiragana':'katakana'):source.prefix===(q.subject==='vocab'?'v':'j')&&source.tuple.length===(q.subject==='vocab'?3:1));
    need(text(q.face)&&text(q.instruction,1024)&&q.highlights===undefined); // Context is not a v1 duel kind.
    need(q.faceSub===undefined||q.kind==='vocab-meaning'&&text(q.faceSub));
    need(q.speechText===undefined||text(q.speechText));
    keys(q.reveal,['answer','reading','meaning','note','example','confusion']);need(text(q.reveal.answer)&&Object.values(q.reveal).every(v=>text(v)));
    if(q.deck){keys(q.deck,['itemKey','type']);need(text(q.deck.itemKey,256)&&['hiragana','katakana','vocab','kanji'].includes(q.deck.type));
      need(q.deck.type===(q.subject==='kana'?(source.prefix==='h'?'hiragana':'katakana'):q.subject)&&q.deck.itemKey===source.tuple[q.subject==='kana'?1:0]);}
    if(q.responseType==='choice') {need(Array.isArray(q.choices)&&q.choices.length===4);q.choices.forEach((c:{id:string;label:string})=>{keys(c,['id','label']);need(token(c.id)&&text(c.label));});}
    else need(q.responseType==='typed'&&q.kind==='kana-type'&&Array.isArray(q.acceptedTyped)&&q.acceptedTyped.length<=32&&q.acceptedTyped.every((a:string)=>text(a,128)));
    assertQuestion(q);
    const target=questionTargetKey(q);need(!targets.has(target));targets.add(target);
    if(settings.pool.filter==='explicit')need(settings.pool.targetIds?.includes(q.itemId));
    if(q.subject==='kana'&&settings.pool.script!=='both')need(source.tuple[0]===settings.pool.script);
  }
}

/** Build ONCE outside the transaction with a captured seed/matchId; no private history input. */
export function buildDuelManifest(catalogs:Catalogs,settings:DuelSettings,matchId:string,seed:number,revision=0):DuelManifest {
  assertDuelSettings(settings);const p=settings.pool;
  const result=buildQuestions(catalogs,{sessionId:matchId,subject:settings.subject,kinds:[settings.kind],length:settings.count,now:0,choiceCount:4,
    pool:{...(settings.subject==='kana'?{script:p.script!,stages:p.stages!}:{}),...(p.filter==='explicit'?{filter:'custom',itemIds:p.targetIds!}:p.filter==='theme'?{category:p.category!}:{})}}, {},seededRandom(seed));
  const manifest={schemaVersion:1 as const,settingsRevision:revision,questions:result.questions};assertDuelManifest(manifest,settings,matchId,revision);return freeze(manifest);
}
function legacySettings(v:DuelPayload):DuelRoom['settings'] {
  const s=v.settings;return {alphabet:s.subject==='kanji'?'kanji':s.subject==='vocab'?'mixed':s.pool.script==='both'?'mixed':s.pool.script!,difficulty:s.difficulty,
    questionCount:v.manifest?.questions.length??s.count,quizMode:s.kind==='kana-type'?'romaji':'choice',questionDuration:s.durationMs,stages:s.pool.stages??[],multiplayerMode:s.mode};
}
function player(v:DuelPayload,role:DuelRole):DuelPlayerSummary {
  let points=0,correct=0,wrong=0,timeout=0,elapsedMs=0;
  for(const round of Object.values(v.rounds??{})) {
    if(round.winner===role)points++;
    const answer=round.answers?.[role];if(!answer)continue;
    if(answer.outcome==='correct')correct++;else if(answer.outcome==='wrong')wrong++;else timeout++;
    elapsedMs+=answer.elapsedMs;
  }
  const attempted=correct+wrong+timeout,total=v.manifest?.questions.length??0;
  return {points,correct,wrong,timeout,attempted,unattempted:Math.max(0,total-attempted),elapsedMs,accuracy:attempted?correct/attempted:null};
}
function seal(room:DuelRoom):DuelRoom {
  const v=room.v2,current=v.rounds?.[roundKey(v.competitiveIndex)];
  const next={...room,settings:legacySettings(v),currentQuestion:v.competitiveIndex,questionStartedAt:v.settings.mode==='competitive'?current?.windows.host?.startAt??null:null,
    scores:{host:player(v,'host').points,guest:player(v,'guest').points}};
  wire(next);need(bytes(next)<=DUEL_LIMITS.roomBytes,'Room exceeds256KiB');return decodeDuelRoom(next);
}
function roleOf(room:DuelRoom,uid:string):DuelRole {const role=room.hostId===uid?'host':room.guestId===uid?'guest':null;need(role,'You are not a participant','outsider');return role;}
function assertResponse(response:Response,q:Question):void {
  if(response.type==='choice'){keys(response,['type','choiceId']);need(q.responseType==='choice'&&q.choices.some(c=>c.id===response.choiceId));}
  else {keys(response,['type','value']);need(response.type==='typed'&&q.responseType==='typed'&&text(response.value,128));}
}

/** Strict bounded wire decoder; empty RTDB maps may be absent. No catalog lookup or regrading receipts. */
export function decodeDuelRoom(raw:unknown):DuelRoom {
  need(raw!==null&&raw!==undefined,'This duel room is no longer available.','missing');
  need(plain(raw)&&raw.protocolVersion===2,OLD_DUEL_MESSAGE,'version');wire(raw);need(bytes(raw)<=DUEL_LIMITS.roomBytes);
  const r=raw as unknown as DuelRoom;
  keys(r,['protocolVersion','status','hostId','guestId','hostName','guestName','hostAvatar','guestAvatar','seed','settings','currentQuestion','questionStartedAt','scores','answers','v2','presence','lastSeen']);
  need(['waiting','playing','finished'].includes(r.status)&&safe(r.hostId)&&(r.guestId===null||safe(r.guestId)&&r.guestId!==r.hostId)&&text(r.hostName,24)&&(r.guestName===null||text(r.guestName,24))&&integer(r.seed));
  need((r.guestId===null)===(r.guestName===null));need(r.hostAvatar===undefined||typeof r.hostAvatar==='string'&&r.hostAvatar.length<=DUEL_LIMITS.roomBytes);need(r.guestAvatar===undefined||r.guestAvatar===null||typeof r.guestAvatar==='string'&&r.guestAvatar.length<=DUEL_LIMITS.roomBytes);
  const v=r.v2;keys(v,['seriesId','generation','matchId','settingsRevision','settings','readiness','manifest','rounds','competitiveIndex','progress','createdAt','expiresAt','endedAt','endedReason']);
  need(v.matchId===duelMatchId(v.seriesId,v.generation)&&integer(v.settingsRevision)&&time(v.createdAt)&&time(v.expiresAt)&&v.expiresAt===v.createdAt+DUEL_LIMITS.ttlMs);
  assertDuelSettings(v.settings);keys(v.progress,ROLES);
  for(const role of ROLES){const p=v.progress[role];keys(p,['index','finished']);need(integer(p.index,20)&&typeof p.finished==='boolean');}
  if(v.readiness){keys(v.readiness,ROLES);for(const ready of Object.values(v.readiness)){keys(ready,['revision','protocol']);need(ready.protocol===2&&ready.revision===v.settingsRevision);}need(!v.readiness.guest||!!r.guestId);}
  const count=v.manifest?.questions.length??0;
  if(v.manifest)assertDuelManifest(v.manifest,v.settings,v.matchId,v.settingsRevision);
  need(integer(v.competitiveIndex,count));
  for(const role of ROLES){const p=v.progress[role];need(p.index<=count&&p.finished===(!!count&&p.index===count));}
  if(r.status==='waiting')need(!v.manifest&&!Object.keys(v.rounds??{}).length&&v.competitiveIndex===0);
  if(r.status==='playing'){need(v.manifest,'Missing duel manifest. Refresh or create a new room.','version');need(!!r.guestId&&!v.endedReason&&v.endedAt===undefined);}
  if(r.status==='finished')need(['complete','left','connection','expired'].includes(v.endedReason??'')&&time(v.endedAt)&&v.endedAt>=v.createdAt);
  else need(v.endedReason===undefined&&v.endedAt===undefined);
  if(v.rounds){need(plain(v.rounds)&&Object.keys(v.rounds).length<=count);for(const [key,round] of Object.entries(v.rounds)){
    need(/^r_(?:0|[1-9]\d*)$/u.test(key));const index=Number(key.slice(2));need(index<count);keys(round,['windows','answers','lockedAt','winner']);keys(round.windows,ROLES);
    if(round.answers)keys(round.answers,ROLES);
    for(const role of ROLES){const w=round.windows[role],a=round.answers?.[role];if(w){keys(w,['startAt','deadlineAt']);need(time(w.startAt)&&w.startAt>=v.createdAt&&w.startAt<v.expiresAt&&w.deadlineAt===w.startAt+v.settings.durationMs);}
      if(a){keys(a,['receiptId','outcome','response','capturedAt','acceptedAt','elapsedMs']);need(w&&token(a.receiptId)&&['correct','wrong','timeout'].includes(a.outcome)&&time(a.capturedAt)&&time(a.acceptedAt)&&a.capturedAt<=a.acceptedAt&&a.capturedAt>=w.startAt);
        if(a.outcome==='timeout')need(a.response===undefined&&a.capturedAt===w.deadlineAt&&a.acceptedAt>=w.deadlineAt&&a.elapsedMs===v.settings.durationMs);
        else {need(a.response&&a.acceptedAt<w.deadlineAt&&a.elapsedMs===a.capturedAt-w.startAt);assertResponse(a.response,v.manifest!.questions[index]);}}
    }
    if(v.settings.mode==='competitive'){
      need(round.windows.host&&round.windows.guest&&round.windows.host.startAt===round.windows.guest.startAt&&index<=v.competitiveIndex);
      const answers=Object.values(round.answers??{});
      if(round.lockedAt!==undefined){need(time(round.lockedAt)&&answers.every(a=>a.acceptedAt<=round.lockedAt!));
        need(round.winner?ROLES.includes(round.winner)&&round.answers?.[round.winner]?.outcome==='correct'&&answers.filter(a=>a.outcome==='correct').length===1:answers.length===2&&answers.every(a=>a.outcome!=='correct'));}
      else need(round.winner===undefined&&answers.length<2&&answers.every(a=>a.outcome!=='correct'));
      if(index<v.competitiveIndex)need(round.lockedAt!==undefined);
    }else{need(round.lockedAt===undefined&&round.winner===undefined);for(const role of ROLES){need(!round.windows[role]||index<=v.progress[role].index);if(index<v.progress[role].index)need(round.answers?.[role]);}}
  }}
  if(v.settings.mode==='competitive'&&count){for(let i=0;i<=Math.min(v.competitiveIndex,count-1);i++)need(v.rounds?.[roundKey(i)]);need(v.progress.host.index===v.competitiveIndex&&v.progress.guest.index===v.competitiveIndex);}
  if(v.settings.mode==='parallel')for(const role of ROLES)for(let i=0;i<v.progress[role].index;i++)need(v.rounds?.[roundKey(i)]?.answers?.[role]);
  if(v.endedReason==='complete')need(count&&v.progress.host.finished&&v.progress.guest.finished);
  if(r.presence){need(plain(r.presence));for(const [uid,connections] of Object.entries(r.presence)){need(uid===r.hostId||uid===r.guestId);need(plain(connections)&&Object.keys(connections).length<=16&&Object.values(connections).every(x=>x===true));}}
  if(r.lastSeen){need(plain(r.lastSeen)&&Object.entries(r.lastSeen).every(([uid,n])=>(uid===r.hostId||uid===r.guestId)&&time(n)));}
  if(r.answers)need(plain(r.answers)&&!Object.keys(r.answers).length);
  keys(r.settings,['alphabet','difficulty','questionCount','quizMode','questionDuration','stages','multiplayerMode']);
  const mirror=legacySettings(v);need(Object.entries(mirror).every(([key,value])=>JSON.stringify(r.settings[key as keyof typeof mirror])===JSON.stringify(value))&&r.currentQuestion===v.competitiveIndex);
  const current=v.rounds?.[roundKey(v.competitiveIndex)];need(r.questionStartedAt===(v.settings.mode==='competitive'?current?.windows.host?.startAt??null:null));
  keys(r.scores,ROLES);need(r.scores.host===player(v,'host').points&&r.scores.guest===player(v,'guest').points);
  return freeze(JSON.parse(JSON.stringify(r)) as DuelRoom);
}

function context(raw:unknown,scope:DuelScope,expired=false) {
  const room=decodeDuelRoom(raw);keys(scope,['uid','matchId','revision','now']);need(safe(scope.uid)&&time(scope.now)&&scope.now>=room.v2.createdAt);
  const role=roleOf(room,scope.uid);need(scope.matchId===room.v2.matchId&&scope.revision===room.v2.settingsRevision,'This match or settings revision changed.','stale');
  if(!expired)need(scope.now<room.v2.expiresAt,'This room has expired.','expired');return {room,role};
}
function run(action:()=>DuelResult):DuelResult {try{return action();}catch(error){return {ok:false,code:error instanceof Rejected?error.code:'invalid',message:error instanceof Rejected?error.message:'Invalid duel payload'};}}
const success=(room:DuelRoom|null,changed=true,answer?:DuelAnswer):DuelResult=>({ok:true,room,changed,...(answer?{answer}:{})});
const playing=(room:DuelRoom)=>need(room.status==='playing','This match is not playing.','state');
function setRound(room:DuelRoom,index:number,round:DuelRound):DuelRoom {return {...room,v2:{...room.v2,rounds:{...room.v2.rounds,[roundKey(index)]:round}}};}

export function createDuelRoom(hostId:string,hostName:string,settings:DuelSettings,seriesId:string,now:number):DuelResult {return run(()=>{
  need(safe(hostId)&&text(hostName,24)&&time(now));assertDuelSettings(settings);
  const v:DuelPayload={seriesId,generation:0,matchId:duelMatchId(seriesId,0),settingsRevision:0,settings,competitiveIndex:0,
    progress:{host:{index:0,finished:false},guest:{index:0,finished:false}},createdAt:now,expiresAt:now+DUEL_LIMITS.ttlMs};
  return success(seal({protocolVersion:2,status:'waiting',hostId,guestId:null,hostName,guestName:null,seed:0,settings:legacySettings(v),currentQuestion:0,questionStartedAt:null,scores:{host:0,guest:0},v2:v}));
});}
export function joinDuel(raw:unknown,scope:DuelScope,name:string):DuelResult {return run(()=>{
  // A nonmember guest can only claim an empty waiting guest slot.
  const room=decodeDuelRoom(raw);need(safe(scope.uid)&&scope.uid!==room.hostId&&text(name,24));need(time(scope.now)&&scope.now>=room.v2.createdAt&&scope.now<room.v2.expiresAt,'This room has expired.','expired');
  need(scope.matchId===room.v2.matchId&&scope.revision===room.v2.settingsRevision,'Stale lobby','stale');need(room.status==='waiting'&&(!room.guestId||room.guestId===scope.uid),'Lobby is not available','state');
  return room.guestId===scope.uid?success(room,false):success(seal({...room,guestId:scope.uid,guestName:name}));
});}
export function acknowledgeReady(raw:unknown,scope:DuelScope,protocol:number):DuelResult {return run(()=>{
  const {room,role}=context(raw,scope);need(room.status==='waiting','Not waiting','state');need(protocol===2,'Refresh to the current duel protocol.','version');
  return success(seal({...room,v2:{...room.v2,readiness:{...room.v2.readiness,[role]:{revision:scope.revision,protocol:2}}}}));
});}
export function changeDuelSettings(raw:unknown,scope:DuelScope,settings:DuelSettings):DuelResult {return run(()=>{
  const {room,role}=context(raw,scope);need(role==='host','Only host changes settings','outsider');need(room.status==='waiting','Not waiting','state');assertDuelSettings(settings);
  const {readiness, ...v}=room.v2;return success(seal({...room,v2:{...v,settings,settingsRevision:v.settingsRevision+1}}));
});}
export function startMatch(raw:unknown,scope:DuelScope,manifest:DuelManifest,startAt:number):DuelResult {return run(()=>{
  const {room,role}=context(raw,scope);need(role==='host','Only host starts','outsider');need(room.status==='waiting','Not waiting','state');
  need(room.guestId&&ROLES.every(r=>room.v2.readiness?.[r]?.revision===scope.revision&&room.v2.readiness[r]?.protocol===2),'Both players must Ready on this revision.','not-ready');
  assertDuelManifest(manifest,room.v2.settings,scope.matchId,scope.revision);need(time(startAt)&&startAt>=scope.now&&startAt<=scope.now+5000,'Prepare a fresh scheduled start.','early');
  const window={startAt,deadlineAt:startAt+room.v2.settings.durationMs};
  const rounds:Record<string,DuelRound>=room.v2.settings.mode==='competitive'?{r_0:{windows:{host:window,guest:window}}}:{};
  return success(seal({...room,status:'playing',v2:{...room.v2,manifest,rounds}}));
});}
export function openParallelQuestion(raw:unknown,scope:DuelScope,index:number):DuelResult {return run(()=>{
  const {room,role}=context(raw,scope);playing(room);need(room.v2.settings.mode==='parallel'&&integer(index,19)&&room.v2.progress[role].index===index&&!room.v2.progress[role].finished,'Stale question index','stale');
  const round=room.v2.rounds?.[roundKey(index)]??{windows:{}};
  if(round.windows[role])return success(room,false);
  return success(seal(setRound(room,index,{...round,windows:{...round.windows,[role]:{startAt:scope.now,deadlineAt:scope.now+room.v2.settings.durationMs}}})));
});}
export function applyDuelAnswer(raw:unknown,scope:DuelScope,event:DuelAnswerEvent):DuelResult {return run(()=>{
  const {room,role}=context(raw,scope,true);keys(event,['index','receiptId','capturedAt','response']);need(integer(event.index,19)&&token(event.receiptId));
  const v=room.v2,round=v.rounds?.[roundKey(event.index)],existing=round?.answers?.[role];
  if(existing?.receiptId===event.receiptId)return success(room,false,existing); // No grade, deadline extension or extra progress.
  need(scope.now<v.expiresAt,'This room has expired.','expired');playing(room);
  need(event.index===(v.settings.mode==='competitive'?v.competitiveIndex:v.progress[role].index),'Stale question index','stale');
  need(!existing,'This player has already answered.','answered');
  need(!Object.values(v.rounds??{}).some(r=>r.answers?.[role]?.receiptId===event.receiptId),'Receipt already used','answered');
  need(round&&round.lockedAt===undefined,'This competitive round is locked.','locked');
  const window=round.windows[role];need(window,'Open your question first.','early');
  need(scope.now>=window.startAt&&time(event.capturedAt)&&event.capturedAt>=window.startAt&&event.capturedAt<=scope.now,'Invalid captured answer time','early');
  need(scope.now<window.deadlineAt,'Answer arrived after the deadline.','late');
  const q=v.manifest!.questions[event.index];assertResponse(event.response,q);const result=grade(q,event.response);need(result.valid);
  const answer:DuelAnswer={receiptId:event.receiptId,outcome:result.outcome,response:event.response,capturedAt:event.capturedAt,acceptedAt:scope.now,elapsedMs:event.capturedAt-window.startAt};
  const answers={...round.answers,[role]:answer};
  const lock=v.settings.mode==='competitive'&&(answer.outcome==='correct'||!!answers.host&&!!answers.guest);
  return success(seal(setRound(room,event.index,{...round,answers,...(lock?{lockedAt:scope.now,...(answer.outcome==='correct'?{winner:role}:{})}:{})})),true,answer);
});}
export function expireQuestion(raw:unknown,scope:DuelScope,index:number):DuelResult {return run(()=>{
  const {room,role}=context(raw,scope);playing(room);const v=room.v2;
  need(integer(index,19)&&index===(v.settings.mode==='competitive'?v.competitiveIndex:v.progress[role].index),'Stale question index','stale');
  const round=v.rounds?.[roundKey(index)];need(round,'Question not open','early');if(round.lockedAt!==undefined)return success(room,false);
  const roles=v.settings.mode==='competitive'?ROLES:[role];let answers={...round.answers};let changed=false;
  for(const r of roles){const window=round.windows[r];need(window&&scope.now>=window.deadlineAt,'Deadline not reached','early');
    if(!answers[r]){changed=true;answers={...answers,[r]:{receiptId:`timeout_${r}_${index}`,outcome:'timeout',capturedAt:window.deadlineAt,acceptedAt:scope.now,elapsedMs:v.settings.durationMs}};}}
  if(!changed)return success(room,false);
  return success(seal(setRound(room,index,{...round,answers,...(v.settings.mode==='competitive'?{lockedAt:scope.now}:{})})));
});}
function completed(room:DuelRoom,now:number):DuelRoom {return room.v2.progress.host.finished&&room.v2.progress.guest.finished?{...room,status:'finished',v2:{...room.v2,endedAt:now,endedReason:'complete'}}:room;}
export function advanceCompetitive(raw:unknown,scope:DuelScope,index:number,nextStartAt:number):DuelResult {return run(()=>{
  const {room}=context(raw,scope);playing(room);const v=room.v2;need(v.settings.mode==='competitive'&&index===v.competitiveIndex,'Stale question index','stale');
  const round=v.rounds?.[roundKey(index)];need(round?.lockedAt!==undefined,'Round is not locked.','locked');need(scope.now>=round.lockedAt+DUEL_LIMITS.feedbackMs,'Feedback is still running.','early');
  const next=index+1,finished=next===v.manifest!.questions.length;let rounds=v.rounds;
  if(!finished){need(time(nextStartAt)&&nextStartAt>=scope.now&&nextStartAt<=scope.now+5000,'Fresh next start needed','early');const window={startAt:nextStartAt,deadlineAt:nextStartAt+v.settings.durationMs};rounds={...rounds,[roundKey(next)]:{windows:{host:window,guest:window}}};}
  return success(seal(completed({...room,v2:{...v,competitiveIndex:next,rounds,progress:{host:{index:next,finished},guest:{index:next,finished}}}},scope.now)));
});}
export function advanceParallel(raw:unknown,scope:DuelScope,index:number,trigger:'manual'|'auto'):DuelResult {return run(()=>{
  const {room,role}=context(raw,scope);playing(room);const v=room.v2;need(v.settings.mode==='parallel'&&integer(index,19)&&index===v.progress[role].index&&!v.progress[role].finished,'Stale question index','stale');
  const answer=v.rounds?.[roundKey(index)]?.answers?.[role];need(answer,'Answer before advancing','early');need(trigger==='manual'||trigger==='auto');
  if(trigger==='auto')need(answer.outcome==='correct'&&scope.now>=answer.acceptedAt+DUEL_LIMITS.feedbackMs,'Automatic next is correct-only after feedback.','early');
  else need(scope.now>=answer.acceptedAt);
  const next=index+1;return success(seal(completed({...room,v2:{...v,progress:{...v.progress,[role]:{index:next,finished:next===v.manifest!.questions.length}}}},scope.now)));
});}
const connected=(room:DuelRoom,uid:string)=>Object.values(room.presence?.[uid]??{}).some(Boolean);
export function finishMatch(raw:unknown,scope:DuelScope,reason:'complete'|'left'|'connection'|'expired'):DuelResult {return run(()=>{
  const {room,role}=context(raw,scope,reason==='expired');if(room.status==='finished')return success(room,false);
  need(['complete','left','connection','expired'].includes(reason));
  if(reason==='complete')need(room.v2.progress.host.finished&&room.v2.progress.guest.finished,'Both players must finish.','state');
  if(reason==='expired')need(scope.now>=room.v2.expiresAt,'Room has not expired.','early');
  if(reason==='connection'){const uid=role==='host'?room.guestId:room.hostId;need(uid&&connected(room,scope.uid)&&!connected(room,uid)&&room.lastSeen?.[uid]!==undefined&&scope.now-room.lastSeen[uid]>=DUEL_LIMITS.disconnectEndMs,'Continuous absence is not established.','connection');}
  return success(seal({...room,status:'finished',v2:{...room.v2,endedReason:reason,endedAt:scope.now}}));
});}
export function cancelWaiting(raw:unknown,scope:DuelScope):DuelResult {return run(()=>{const {room,role}=context(raw,scope);need(role==='host'&&room.status==='waiting','Only host cancels a waiting room.','state');return success(null);});}
export function rematch(raw:unknown,scope:DuelScope,matchId:string):DuelResult {return run(()=>{
  const {room,role}=context(raw,scope);need(role==='host'&&room.status==='finished'&&room.guestId,'End the match before rematching.','state');const old=room.v2,generation=old.generation+1;need(matchId===duelMatchId(old.seriesId,generation),'Fresh match ID required','stale');
  const v:DuelPayload={seriesId:old.seriesId,generation,matchId,settingsRevision:old.settingsRevision+1,settings:old.settings,competitiveIndex:0,
    progress:{host:{index:0,finished:false},guest:{index:0,finished:false}},createdAt:old.createdAt,expiresAt:old.expiresAt};
  return success(seal({...room,status:'waiting',v2:v}));
});}

export function summarizeDuel(raw:unknown):DuelSummary {
  const room=decodeDuelRoom(raw),v=room.v2,host=player(v,'host'),guest=player(v,'guest');const complete=room.status==='finished'&&v.endedReason==='complete';
  const delta=v.settings.mode==='competitive'?host.points-guest.points:host.correct-guest.correct||guest.elapsedMs-host.elapsedMs;
  return freeze({matchId:v.matchId,total:v.manifest?.questions.length??0,complete,partial:!complete,endedReason:v.endedReason??null,host,guest,winner:complete?delta===0?'tie':delta>0?'host':'guest':null});
}
export function deriveDuelHistory(raw:unknown,uid:string,roomCode:string):DuelHistory {
  const room=decodeDuelRoom(raw),role=roleOf(room,uid),v=room.v2;need(room.status==='finished'&&v.manifest&&/^[A-Z0-9]{6}$/u.test(roomCode),'No finished match to record.','state');const summary=summarizeDuel(room),mine=summary[role],theirs=summary[other(role)];
  return freeze({id:v.matchId,roomCode,opponentUid:(role==='host'?room.guestId:room.hostId)!,opponentName:(role==='host'?room.guestName:room.hostName)!,opponentAvatar:(role==='host'?room.guestAvatar:room.hostAvatar)??'',
    myScore:v.settings.mode==='competitive'?mine.points:mine.correct,opponentScore:v.settings.mode==='competitive'?theirs.points:theirs.correct,result:!summary.complete?'aborted':summary.winner==='tie'?'tie':summary.winner===role?'win':'loss',
    quizMode:v.settings.kind==='kana-type'?'romaji':'choice',difficulty:v.settings.difficulty,multiplayerMode:v.settings.mode,questionCount:summary.total,playedAt:v.endedAt!,protocolVersion:2,subject:v.settings.subject,kind:v.settings.kind,endedReason:v.endedReason!,myCorrect:mine.correct,opponentCorrect:theirs.correct,myElapsedMs:mine.elapsedMs,opponentElapsedMs:theirs.elapsedMs});
}
export function reconnectDuel(raw:unknown,uid:string,matchId:string,now:number) {
  const room=decodeDuelRoom(raw),v=room.v2,role=roleOf(room,uid);need(time(now)&&now>=v.createdAt&&now<v.expiresAt,'This room has expired.','expired');need(v.matchId===matchId,'This match changed.','stale');
  const index=v.settings.mode==='competitive'?v.competitiveIndex:v.progress[role].index,round=v.rounds?.[roundKey(index)],window=round?.windows[role],answer=round?.answers?.[role],opponent=role==='host'?room.guestId:room.hostId;
  const absence=opponent&&!connected(room,opponent)&&room.lastSeen?.[opponent]!==undefined?Math.max(0,now-room.lastSeen[opponent]):0;
  const phase=room.status==='waiting'?'lobby':room.status==='finished'?'results':v.progress[role].finished?'waiting-opponent':!window?'opening':round?.lockedAt!==undefined||answer?'feedback':now<window.startAt?'countdown':'asking';
  const question=v.manifest?.questions[index];
  return freeze({role,phase,index,draftKey:`${v.matchId}:${role}:${index}:${question?.id??'done'}`,remainingMs:window?Math.max(0,window.deadlineAt-now):0,startAt:window?.startAt??null,deadlineAt:window?.deadlineAt??null,
    question:question?questionView(question):null,answer:answer??null,opponentDisconnected:absence>DUEL_LIMITS.disconnectBannerMs,canEndForConnection:!!opponent&&connected(room,uid)&&absence>=DUEL_LIMITS.disconnectEndMs});
}
