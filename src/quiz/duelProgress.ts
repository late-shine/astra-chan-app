/** QZ11 own-answer projection. No network, storage, clock, UI, or opponent-learning input. */
import {decodeDuelRoom} from './duel';
import {decodeId,occurrenceId} from './ids';
import {parseProgressEntry,validQuizSessionId,type ProgressEntry} from './progress';
import {rewardFor} from './reward';
import {buildQuestions} from './pool';
import {seededRandom} from './random';
import {freeze,type Catalogs,type DuelRoom,type Question} from './types';
export interface DuelLearningJournal {version:1;owner:string;matchId:string;sessionId:string;acknowledgedThrough:number;entries:readonly ProgressEntry[]}
export const duelJournalKey=(owner:string)=>`astra_duel_learning_v1:${encodeURIComponent(owner)}`;
export function duelLearningId(matchId:string,uid:string){const id=`d${matchId.length}_${matchId}_${uid}`;if(!validQuizSessionId(id))throw Error('Unsupported duel learning identity.');return id;}
export function enrollDuelLearning(raw:unknown,uid:string):DuelLearningJournal {
  const room=decodeDuelRoom(raw);
  if(room.status!=='waiting'||room.hostId!==uid&&room.guestId!==uid)throw Error('Learning rewards must be enrolled in the current lobby.');
  return freeze({version:1,owner:uid,matchId:room.v2.matchId,sessionId:duelLearningId(room.v2.matchId,uid),acknowledgedThrough:0,entries:[]});
}
export function parseDuelLearning(raw:string,uid:string):DuelLearningJournal {
  if(new TextEncoder().encode(raw).length>64*1024)throw Error('Duel learning checkpoint is too large.');
  const j=JSON.parse(raw) as DuelLearningJournal;
  if(j.version!==1||j.owner!==uid||typeof j.matchId!=='string'||!/^[A-Za-z0-9_]{1,80}$/u.test(j.matchId)||j.sessionId!==duelLearningId(j.matchId,uid)||!Array.isArray(j.entries)||j.entries.length>20||!Number.isSafeInteger(j.acknowledgedThrough)||j.acknowledgedThrough<0||j.acknowledgedThrough>j.entries.length)throw Error('Invalid duel learning checkpoint.');
  const entries=j.entries.map((entry,index)=>{const parsed=parseProgressEntry(entry);if(!parsed||parsed.record.type!=='answer'||parsed.record.origin!=='duel'||parsed.record.sessionId!==j.sessionId||parsed.record.seq!==index+1)throw Error('Invalid duel learning sequence.');return parsed;});
  return freeze({version:1,owner:uid,matchId:j.matchId,sessionId:j.sessionId,acknowledgedThrough:j.acknowledgedThrough,entries});
}
/** Emit the settled prefix, including zero-impact claimed/unshown rounds to prevent receipt gaps. */
export function projectDuelLearning(raw:unknown,journal:DuelLearningJournal,localDate:(epoch:number)=>string):DuelLearningJournal {
  const room=decodeDuelRoom(raw),v=room.v2;
  if(room.hostId!==journal.owner&&room.guestId!==journal.owner||v.matchId!==journal.matchId)throw Error('Duel learning owner or match changed.');
  const role=room.hostId===journal.owner?'host':'guest',entries:ProgressEntry[]=[];
  for(const [index,q] of (v.manifest?.questions??[]).entries()){
    const round=v.rounds?.[`r_${index}`],own=round?.answers?.[role];
    if(!own&&room.status!=='finished'&&!(v.settings.mode==='competitive'&&round?.lockedAt!==undefined))break;
    const answeredAt=own?.capturedAt??round?.lockedAt??v.endedAt!;
    const outcome=own?.outcome??'unattempted';
    const record={type:'answer' as const,sessionId:journal.sessionId,seq:index+1,questionId:occurrenceId(journal.sessionId,index),skillKey:q.skillKey,
      target:{subject:q.subject,itemId:q.itemId,kind:q.kind,...(q.subject==='kana'?{kanaGlyph:decodeId(q.itemId).tuple[1]}:{})},
      outcome,elapsedMs:own?.elapsedMs??0,answeredAt,localDate:journal.entries[index]?.record.localDate??localDate(answeredAt),origin:'duel' as const,rewardVersion:1 as const,
      xp:rewardFor({type:'answer',origin:'duel',subject:q.subject,kind:q.kind,outcome,difficulty:v.settings.difficulty}).total};
    const entry=parseProgressEntry({record,challenge:'steady',difficulty:v.settings.difficulty});if(!entry)throw Error('Invalid confirmed duel learning record.');
    if(journal.entries[index]&&JSON.stringify(journal.entries[index])!==JSON.stringify(entry))throw Error('A confirmed duel learning record changed.');
    entries.push(entry);
  }
  if(entries.length<journal.entries.length)throw Error('Duel learning records cannot move backwards.');
  return freeze({...journal,entries});
}
export function duelLearningTotals(journal:DuelLearningJournal|null){
  let base=0,challenge=0;
  for(const {record:r,difficulty} of journal?.entries??[])if(r.type==='answer'){const reward=rewardFor({type:'answer',origin:'duel',subject:r.target.subject,kind:r.target.kind,outcome:r.outcome,difficulty});base+=reward.base;challenge+=reward.challenge;}
  return {base,challenge,completion:0,total:base+challenge};
}
export function duelMisses(raw:unknown,uid:string):readonly Question[]{
  const room=decodeDuelRoom(raw);if(room.status!=='finished'||room.hostId!==uid&&room.guestId!==uid)return [];
  const role=room.hostId===uid?'host':'guest';
  return (room.v2.manifest?.questions??[]).filter((_,index)=>{const outcome=room.v2.rounds?.[`r_${index}`]?.answers?.[role]?.outcome;return outcome==='wrong'||outcome==='timeout';});
}
/** Current catalog mapping is required only for optional solo growth, never live match rendering. */
export function mappedDuelMisses(room:DuelRoom,uid:string,catalogs:Catalogs):readonly Question[]{
  const misses=duelMisses(room,uid);if(!misses.length)return [];
  const s=room.v2.settings;
  const local=buildQuestions(catalogs,{sessionId:'duel-repair-map',subject:s.subject,kinds:[s.kind],length:20,choiceCount:4,now:0,
    pool:{filter:'custom',itemIds:misses.map(q=>q.itemId),...(s.subject==='kana'?{script:s.pool.script,stages:s.pool.stages}:{})}},{},seededRandom(1)).questions;
  const keys=new Set(local.map(q=>q.skillKey));return misses.every(q=>keys.has(q.skillKey))?misses:[];
}
