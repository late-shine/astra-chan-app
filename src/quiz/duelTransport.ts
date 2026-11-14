/** QZ10 Firebase boundary. Public room/history paths only; no learner stats or rewards. */
import { get, onValue, onDisconnect, ref, runTransaction, set, serverTimestamp, type Database } from 'firebase/database';
import { createDuelRoom, decodeDuelRoom, DUEL_LIMITS, type DuelResult } from './duel';
import type { DuelHistory, DuelRoom, DuelScope, DuelSettings } from './types';

export class DuelNetworkError extends Error {constructor(message:string,readonly code='network'){super(message);}}
export const cleanDuelCode=(code:string)=>{const value=code.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/u.test(value))throw new DuelNetworkError('Enter a six-character room code.','code');return value;};
const message=(error:unknown)=>error instanceof Error?error.message:'The connection could not be completed.';
export function freshDuelToken():string {const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export function createDuelTransport(database:Database,identity:()=>string|null) {
  let offset=0,online=false,clockReady=false;
  const now=()=>Math.round(Date.now()+offset);
  const uid=()=>{const id=identity();if(!id)throw new DuelNetworkError('Sign in before opening a duel.','identity');return id;};
  const demandOnline=()=>{if(!online||!clockReady)throw new DuelNetworkError('Waiting for the duel connection. Please retry when connected.','offline');};
  const at=(code:string)=>ref(database,`rooms/${cleanDuelCode(code)}`);
  async function bounded<T>(action:Promise<T>):Promise<T> {
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([action,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(new DuelNetworkError('The request timed out. Reconnect and retry.','timeout')),12000);})]);}
    finally{if(timer)clearTimeout(timer);}
  }
  function watchConnection(callback:(value:{connected:boolean;clockReady:boolean})=>void,error:(message:string)=>void) {
    const report=()=>callback({connected:online,clockReady});
    const a=onValue(ref(database,'.info/connected'),snapshot=>{online=snapshot.val()===true;report();},e=>error(message(e)));
    const b=onValue(ref(database,'.info/serverTimeOffset'),snapshot=>{const value=snapshot.val();if(typeof value==='number'&&Number.isFinite(value)){offset=value;clockReady=true;}report();},e=>error(message(e)));
    return ()=>{a();b();};
  }
  async function fetchRoom(code:string):Promise<DuelRoom|null> {uid();demandOnline();const snap=await bounded(get(at(code)));return snap.exists()?decodeDuelRoom(snap.val()):null;}
  async function transact(code:string,captured:{matchId:string;revision:number},transition:(raw:unknown,scope:DuelScope)=>DuelResult):Promise<DuelRoom|null> {
    const actor=uid();demandOnline();const target=at(code);
    // get() alone does not retain the SDK transaction cache when no screen listener exists.
    // Keep a scoped subscription through commit, including invite/restore entry paths.
    let warmStop:(()=>void)|undefined;
    try {
    await bounded(new Promise<void>((resolve,reject)=>{warmStop=onValue(target,()=>resolve(),reject);}));demandOnline();
    let failure:string|undefined,failureCode:string|undefined,stopped=false;
    const promise=runTransaction(target,raw=>{
      if(stopped||identity()!==actor||!online)return undefined;
      const next=transition(raw,{uid:actor,matchId:captured.matchId,revision:captured.revision,now:now()}); // FRESH each retry.
      if(next.ok===false){failure=next.message;failureCode=next.code;return undefined;}
      return next.changed ? next.room : undefined;
    },{applyLocally:false});
    try{const result=await bounded(promise);if(identity()!==actor)throw new DuelNetworkError('The account changed.','identity');
      if(!result.committed&&failure)throw new DuelNetworkError(failure,failureCode);
      return result.snapshot.exists()?decodeDuelRoom(result.snapshot.val()):null;
    }catch(error){stopped=true;throw error;}
    }finally{warmStop?.();}
  }
  async function create(name:string,settings:DuelSettings):Promise<{code:string;room:DuelRoom}> {
    const actor=uid();demandOnline();const initialResult=createDuelRoom(actor,name.trim().slice(0,24)||'Host',settings,freshDuelToken(),now());
    if(initialResult.ok===false||!initialResult.room)throw new DuelNetworkError(initialResult.ok===false?initialResult.message:'Room could not be created.');
    const initial=initialResult.room;
    for(let attempt=0;attempt<5;attempt++){
      const code=freshDuelToken().slice(0,6).toUpperCase();let stopped=false;
      try{const result=await bounded(runTransaction(at(code),raw=>!stopped&&online&&identity()===actor&&!raw?initial:undefined,{applyLocally:false}));
        if(result.committed)return {code,room:decodeDuelRoom(result.snapshot.val())};
      }catch(error){stopped=true;throw error;}
    }
    throw new DuelNetworkError('No room code was available. Please retry.');
  }
  async function join(code:string,name:string):Promise<DuelRoom> {
    code=cleanDuelCode(code);const actor=uid();demandOnline();const before=await fetchRoom(code);
    if(!before)throw new DuelNetworkError('This room no longer exists.');
    if(before.hostId===actor)return before;
    if(before.v2.expiresAt<=now()||before.status!=='waiting'||before.guestId&&before.guestId!==actor)throw new DuelNetworkError('This lobby is full, expired, or already playing.');
    const guestRef=ref(database,`rooms/${code}/guestId`);let stopped=false;
    try{
      const result=await bounded(runTransaction(guestRef,current=>!stopped&&online&&identity()===actor&&(!current||current===actor)?actor:undefined,{applyLocally:false}));
      if(!result.committed&&result.snapshot.val()!==actor)throw new DuelNetworkError('The guest place was taken.');
      if(identity()!==actor)throw new DuelNetworkError('The account changed.');
      await bounded(set(ref(database,`rooms/${code}/guestName`),name.trim().slice(0,24)||'Guest'));
      const after=await fetchRoom(code);
      if(!after||after.guestId!==actor||after.hostId!==before.hostId||after.v2.matchId!==before.v2.matchId)throw new DuelNetworkError('The lobby changed while joining. Create a new room.');
      return after;
    }catch(error){stopped=true;throw error;}
  }
  function watchRoom(code:string,receive:(room:DuelRoom|null)=>void,error:(message:string)=>void) {
    return onValue(at(code),snapshot=>{try{receive(snapshot.exists()?decodeDuelRoom(snapshot.val()):null);}catch(e){error(message(e));}},e=>error(message(e)));
  }
  async function presence(code:string,onError:(message:string)=>void):Promise<()=>void> {
    const actor=uid(),connection=freshDuelToken();const target=ref(database,`rooms/${cleanDuelCode(code)}/presence/${actor}/${connection}`),seen=ref(database,`rooms/${cleanDuelCode(code)}/lastSeen/${actor}`);
    const disconnect=onDisconnect(target),lastSeen=onDisconnect(seen);let active=true;
    try{
      await bounded(disconnect.remove());await bounded(lastSeen.set(serverTimestamp())); // Register BEFORE online publication.
      if(identity()!==actor||!online)throw new DuelNetworkError('Connection changed while registering presence.');
      await bounded(set(target,true));await bounded(set(seen,serverTimestamp()));
    }catch(error){await disconnect.cancel().catch(()=>{});await lastSeen.cancel().catch(()=>{});throw error;}
    return ()=>{if(!active)return;active=false;
      // Remove only this connection, retaining all membership and other tabs.
      void set(target,null).then(()=>Promise.all([disconnect.cancel(),set(seen,serverTimestamp()),lastSeen.cancel()])).catch(e=>onError(message(e)));
    };
  }
  async function recordHistory(record:DuelHistory):Promise<void> {
    const actor=uid();demandOnline();await bounded(runTransaction(ref(database,`matchHistory/${actor}/${record.id}`),current=>identity()===actor&&!current?record:undefined,{applyLocally:false}));
  }
  return {now,watchConnection,fetchRoom,transact,create,join,watchRoom,presence,recordHistory};
}
export type DuelTransport=ReturnType<typeof createDuelTransport>;
export interface DuelResumePointer {readonly code:string;readonly matchId:string;readonly lastSeen:number}
export const duelPointerKey=(uid:string)=>`astra_duel_resume_v2:${uid}`;
export function readDuelPointer(uid:string):DuelResumePointer|null {
  try{const value=JSON.parse(localStorage.getItem(duelPointerKey(uid))??'null');return value&&/^[A-Z0-9]{6}$/u.test(value.code)&&/^[A-Za-z0-9_]{1,80}$/u.test(value.matchId)&&Number.isSafeInteger(value.lastSeen)&&value.lastSeen>=0&&Date.now()-value.lastSeen<DUEL_LIMITS.ttlMs?{code:value.code,matchId:value.matchId,lastSeen:value.lastSeen}:null;}catch{return null;}
}
export function writeDuelPointer(uid:string,value:DuelResumePointer|null):void {try{if(value)localStorage.setItem(duelPointerKey(uid),JSON.stringify(value));else localStorage.removeItem(duelPointerKey(uid));}catch{throw new DuelNetworkError('This browser cannot save a duel reconnect pointer. Keep this room code before leaving.','storage');}}
