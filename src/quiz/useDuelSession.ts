/** QZ10 thin controller. Match state comes only from acknowledged protocol2 snapshots. */
import { useCallback,useEffect,useRef,useState } from 'react';
import { acknowledgeReady,advanceCompetitive,advanceParallel,applyDuelAnswer,buildDuelManifest,cancelWaiting,changeDuelSettings,
  decodeDuelRoom,deriveDuelHistory,duelMatchId,expireQuestion,finishMatch,openParallelQuestion,reconnectDuel,rematch,startMatch,DUEL_LIMITS } from './duel';
import { DuelNetworkError,freshDuelToken,readDuelPointer,writeDuelPointer,type DuelTransport } from './duelTransport';
import type { Catalogs,DuelRoom,DuelScope,DuelSettings,Response } from './types';
export const DEFAULT_DUEL_SETTINGS:DuelSettings={subject:'kana',kind:'kana-read',count:10,difficulty:'medium',durationMs:10000,mode:'competitive',pool:{filter:'all',label:'Hiragana · Core',script:'hiragana',stages:['basic']}};
export function useDuelSession({uid,network,catalogs,autoNext,onRestore,canAdvance=()=>true}:{uid:string|null;network:DuelTransport;catalogs:Catalogs;autoNext:boolean;onRestore:()=>void;canAdvance?:()=>boolean}) {
  const [code,setCode]=useState(''),[room,setRoom]=useState<DuelRoom|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const [connection,setConnection]=useState({connected:false,clockReady:false}),[now,setNow]=useState(network.now());
  const [draft,setDraft]=useState(''),[cancelled,setCancelled]=useState<string|null>(null);
  const live=useRef({uid,code,room});live.current={uid,code,room};
  const inflight=useRef(new Set<string>()),retryAt=useRef(new Map<string,number>()),generation=useRef(0),restoreUid=useRef<string|null>(null);
  const historySaved=useRef(new Set<string>()),onRestoreRef=useRef(onRestore);onRestoreRef.current=onRestore;
  const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
  const run=useCallback(async <T,>(key:string,action:()=>Promise<T>,quiet=false):Promise<T|undefined>=>{
    const owner=live.current.uid,version=generation.current;
    const operationKey=`${version}:${owner}:${key}`;
    if(!owner||inflight.current.has(operationKey)||network.now()<(retryAt.current.get(operationKey)??0))return;
    inflight.current.add(operationKey);if(!quiet)setBusy(true);
    try{const value=await action();if(!alive.current||live.current.uid!==owner||generation.current!==version)return;setError(null);return value;}
    catch(e){if(e instanceof DuelNetworkError&&((quiet&&['stale','locked','early','answered'].includes(e.code))||key.startsWith('answer:')&&['locked','answered'].includes(e.code)))return;
      if(alive.current&&live.current.uid===owner&&generation.current===version){setError(e instanceof Error?e.message:'The duel request failed.');retryAt.current.set(operationKey,network.now()+1500);}return;}
    finally{inflight.current.delete(operationKey);if(alive.current&&generation.current===version&&!quiet)setBusy(false);}
  },[network]);
  useEffect(()=>{
    generation.current++;restoreUid.current=null;setCode('');setRoom(null);setError(null);setBusy(false);setDraft('');setCancelled(null);setConnection({connected:false,clockReady:false});historySaved.current.clear();retryAt.current.clear();
    if(!uid)return;
    return network.watchConnection(setConnection,setError);
  },[uid,network]);
  useEffect(()=>{if(!code)return;setNow(network.now());const timer=setInterval(()=>setNow(network.now()),100);return()=>clearInterval(timer);},[network,code]);
  const attach=useCallback((newCode:string,next:DuelRoom)=>{
    const actor=live.current.uid;if(!actor||next.hostId!==actor&&next.guestId!==actor)throw Error('You are not a participant in this room.');
    if(next.v2.expiresAt<=network.now())throw Error('This room has expired.');
    setCode(newCode);setRoom(next);setError(null);
    try{writeDuelPointer(actor,{code:newCode,matchId:next.v2.matchId,lastSeen:Date.now()});}catch(e){setError((e as Error).message);}
  },[network]);
  useEffect(()=>{
    if(!uid||!connection.connected||!connection.clockReady||restoreUid.current===uid)return;
    restoreUid.current=uid;const pointer=readDuelPointer(uid);if(!pointer)return;
    onRestoreRef.current();
    void run('restore',async()=>{const next=await network.fetchRoom(pointer.code);if(!next)throw Error('Your saved duel room no longer exists.');return next;}).then(next=>{
      if(live.current.uid!==uid)return;
      if(!next){restoreUid.current=null;return;}
      // A finished previous match may have rematched; retain immutable membership, then show current lobby.
      try{attach(pointer.code,next);}catch(e){setError((e as Error).message);}
    });
  },[uid,connection,network,run,attach]);
  useEffect(()=>{
    if(!uid||!code)return;
    const owner=uid;
    let active=true;
    const stop=network.watchRoom(code,next=>{
      if(!active||live.current.uid!==owner)return;
      if(!next){setRoom(null);setError('This duel room was closed. Return to Practice or create a new room.');return;}
      if(next.hostId!==owner&&next.guestId!==owner){setRoom(null);setError('Your membership is no longer available.');return;}
      setRoom(next);try{writeDuelPointer(owner,{code,matchId:next.v2.matchId,lastSeen:Date.now()});}catch(e){setError((e as Error).message);}
    },message=>{if(active&&live.current.uid===owner)setError(message);});
    return()=>{active=false;stop();};
  },[uid,code,network]);
  useEffect(()=>{
    if(!uid||!code||!connection.connected||!connection.clockReady)return;
    let disposed=false,stop:(()=>void)|undefined;
    void network.presence(code,message=>{if(!disposed&&live.current.uid===uid)setError(message);}).then(cleanup=>{if(disposed)cleanup();else stop=cleanup;}).catch(e=>{if(!disposed)setError(e.message);});
    return()=>{disposed=true;stop?.();};
  },[uid,code,connection.connected,connection.clockReady,network]);
  let view:ReturnType<typeof reconnectDuel>|null=null;
  if(uid&&room)try{view=reconnectDuel(room,uid,room.v2.matchId,now);}catch{/* TTL finalized below; keep a visible error instead of an unbounded spinner. */}
  const draftKey=view?.draftKey;
  useEffect(()=>{setDraft('');setCancelled(null);},[draftKey]); // NEVER depends on opponent progress.
  const transact=useCallback(async(key:string,transition:(raw:unknown,scope:DuelScope)=>ReturnType<typeof finishMatch>,quiet=false)=>{
    const current=live.current;if(!current.room||!current.code)return;
    const captured={matchId:current.room.v2.matchId,revision:current.room.v2.settingsRevision};
    return run(key,()=>network.transact(current.code,captured,transition),quiet);
  },[network,run]);
  useEffect(()=>{
    if(!room||!uid||!code||!connection.connected||!connection.clockReady)return;
    if(room.v2.expiresAt<=now&&room.status!=='finished'){void transact('expire-room',(raw,s)=>finishMatch(raw,s,'expired'),true);return;}
    if(room.status==='finished'&&room.v2.manifest){const key=`${uid}:${room.v2.matchId}`;if(!historySaved.current.has(key)){
      void run('history',async()=>{await network.recordHistory(deriveDuelHistory(room,uid,code));if(live.current.uid===uid)historySaved.current.add(key);},true);}
      return;
    }
    if(room.status!=='playing'||!view)return;
    const index=view.index,round=room.v2.rounds?.[`r_${index}`],own=round?.answers?.[view.role];
    if(view.phase==='opening'){void transact(`open:${draftKey}`,(raw,s)=>openParallelQuestion(raw,s,index),true);return;}
    if(room.v2.settings.mode==='competitive'){
      if(round?.lockedAt!==undefined&&now>=round.lockedAt+1600){const nextStartAt=network.now()+1500;void transact(`advance:${draftKey}`,(raw,s)=>advanceCompetitive(raw,s,index,nextStartAt),true);}
      else if(round?.lockedAt===undefined&&view.deadlineAt!==null&&now>=view.deadlineAt)void transact(`expire:${draftKey}`,(raw,s)=>expireQuestion(raw,s,index),true);
    }else if(!own&&view.deadlineAt!==null&&now>=view.deadlineAt)void transact(`expire:${draftKey}`,(raw,s)=>expireQuestion(raw,s,index),true);
    else if(own?.outcome==='correct'&&autoNext&&canAdvance()&&cancelled!==draftKey&&now>=own.acceptedAt+1600)void transact(`advance:${draftKey}`,(raw,s)=>advanceParallel(raw,s,index,'auto'),true);
  },[room,uid,code,connection,now,view?.phase,draftKey,autoNext,cancelled,network,run,transact,canAdvance]);
  const enter=async(name:string,settings:DuelSettings)=>{const result=await run('create',()=>network.create(name,settings));if(result)attach(result.code,result.room);};
  const join=async(newCode:string,name:string)=>{const next=await run('join',()=>network.join(newCode,name));if(next){attach(newCode.trim().toUpperCase(),next);return true;}return false;};
  const next=()=>{if(!view||!room||room.v2.settings.mode==='parallel'&&!canAdvance())return;const index=view.index;if(room.v2.settings.mode==='parallel')void transact(`next:${draftKey}`,(raw,s)=>advanceParallel(raw,s,index,'manual'));
    else {const startAt=network.now()+1500;void transact(`next:${draftKey}`,(raw,s)=>advanceCompetitive(raw,s,index,startAt));}};
  const submit=(response:Response)=>{
    if(!view||view.phase!=='asking'||!connection.connected||!connection.clockReady||busy)return;
    const event={index:view.index,receiptId:freshDuelToken(),capturedAt:network.now(),response};
    return transact(`answer:${draftKey}`,(raw,s)=>applyDuelAnswer(raw,s,event));
  };
  const start=()=>{if(!room)return;try{
    const manifest=buildDuelManifest(catalogs,room.v2.settings,room.v2.matchId,parseInt(freshDuelToken().slice(0,8),16),room.v2.settingsRevision),startAt=network.now()+1500;
    void transact('start',(raw,s)=>startMatch(raw,s,manifest,startAt));
  }catch(e){setError((e as Error).message);}};
  const forget=()=>{generation.current++;if(uid)try{writeDuelPointer(uid,null);}catch(e){setError((e as Error).message);}setCode('');setRoom(null);setBusy(false);setDraft('');};
  const leave=async()=>{
    if(!room){forget();return true;}
    const result=await transact('leave',(raw,s)=>room.status==='waiting'&&room.hostId===uid?cancelWaiting(raw,s):finishMatch(raw,s,'left'));
    if(result===undefined)return false;
    if(result===null){forget();return true;}setRoom(result);return true;
  };
  return {uid,code,room,view,now,error,busy,connected:connection.connected&&connection.clockReady,draft,setDraft,enter,join,start,next,submit,forget,leave,
    cancelAuto:()=>setCancelled(draftKey??null),autoCancelled:cancelled===draftKey,
    ready:()=>transact('ready',(raw,s)=>acknowledgeReady(raw,s,2)),
    changeSettings:(settings:DuelSettings)=>{return transact('settings',(raw,s)=>changeDuelSettings(raw,s,settings));},
    rematch:()=>{if(!room)return;const id=duelMatchId(room.v2.seriesId,room.v2.generation+1);return transact('rematch',(raw,s)=>rematch(raw,s,id));},
    endConnection:()=>transact('connection-end',(raw,s)=>finishMatch(raw,s,'connection')),
    retry:()=>run('retry',async()=>{if(!code)throw Error('Create or join a room to continue.');const next=await network.fetchRoom(code);if(!next)throw Error('This duel room no longer exists.');attach(code,next);}),
  };
}
export type DuelSessionController=ReturnType<typeof useDuelSession>;
