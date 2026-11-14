import {useEffect,useRef,useState} from 'react';
import type {StudentStats} from '../types';
import type {QuizStorage} from './browserStorage';
import type {QuizProgressBridge} from './useQuizProgressBridge';
import {receiptThrough} from './progress';
import {duelLearningTotals,enrollDuelLearning,projectDuelLearning,type DuelLearningJournal} from './duelProgress';
import type {DuelRoom} from './types';
const localDate=(epoch:number)=>{const d=new Date(epoch);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
type Options={uid:string|null;ready:boolean;cloud:boolean;room:DuelRoom|null;stats:StudentStats;storage:QuizStorage;bridge:QuizProgressBridge;reserve:(sessionId:string)=>boolean};
/** One local pending journal over the existing QZ4 receipt/outbox/master-blob bridge. */
export function useDuelLearning(options:Options){
  const current=useRef(options);current.current=options;
  const journal=useRef<DuelLearningJournal|null>(null),owner=useRef<string|null>(null),generation=useRef(0),inflight=useRef(false),failed=useRef(false),leaseAt=useRef(0);
  const [wake,setWake]=useState(0),[error,setError]=useState<string|null>(null),[volatile,setVolatile]=useState(false);
  const [view,setView]=useState<{journal:DuelLearningJournal|null;pending:boolean}>({journal:null,pending:false});
  useEffect(()=>{
    const o=current.current;if(!o.ready||!o.uid)return;
    if(owner.current!==o.uid){owner.current=o.uid;generation.current++;inflight.current=false;failed.current=false;leaseAt.current=0;setVolatile(false);
      const saved=o.storage.readDuelLearning(o.uid);if(saved.ok===false){owner.current=null;failed.current=true;setError(saved.message);return;}journal.current=saved.value;setError(null);
    }
    try{
      let j=journal.current;
      if(o.room?.status==='waiting'&&o.room.v2.matchId!==j?.matchId&&(!j||j.acknowledgedThrough===j.entries.length)){
        const next=enrollDuelLearning(o.room,o.uid);journal.current=j=next;const saved=o.storage.writeDuelLearning(next);
        if(saved.ok===false)throw Error(saved.message);journal.current=j=next;failed.current=false;setError(null);
      }
      if(!j){setView(v=>v.journal===null&&!v.pending?v:{journal:null,pending:false});return;}
      if(o.room?.v2.matchId===j.matchId){const projected=projectDuelLearning(o.room,j,localDate);
        if(projected.entries.length!==j.entries.length){journal.current=j=projected;}}
      const through=receiptThrough(o.stats,j.sessionId);
      if(o.bridge.isDurable(o.stats)&&through>j.acknowledgedThrough)journal.current=j={...j,acknowledgedThrough:Math.min(through,j.entries.length)};
      const pending=j.entries.length>j.acknowledgedThrough;
      setView(v=>v.journal===j&&v.pending===pending?v:{journal:j,pending});
      if(volatile){const unseen=j.entries.slice(through);if(unseen.length&&o.bridge.applyVolatile(o.uid,unseen,Date.now()))setWake(n=>n+1);return;}
      if(failed.current||inflight.current)return;
      // Write the verified checkpoint BEFORE outbox/master stats; never overwrite the solo snapshot.
      const saved=o.storage.writeDuelLearning(j);if(saved.ok===false)throw Error(saved.message);
      if(!pending)return;
      if(Date.now()-leaseAt.current>5000){if(!o.reserve(j.sessionId))throw Error('Learning progress is open in another tab. Retry after closing it.');leaseAt.current=Date.now();}
      if(o.cloud){const appended=o.storage.appendOutbox(o.uid,j.entries);if(appended.ok===false)throw Error(appended.message);}
      if(through<j.acknowledgedThrough)throw Error('The learning receipt is unavailable. Past answers will not be replayed.');
      const suffix=through<j.entries.length?j.entries.slice(through):j.entries;
      const version=generation.current,uid=o.uid;
      inflight.current=true;
      const accepted=o.bridge.submit({owner:uid,entries:suffix,now:Date.now(),current:()=>current.current.ready&&current.current.uid===uid&&generation.current===version,
        complete:result=>{if(generation.current!==version)return;inflight.current=false;if(result.ok===false){failed.current=true;setError(result.message);}else{setError(null);setVolatile(false);}setWake(n=>n+1);}});
      if(!accepted)inflight.current=false;
    }catch(e){failed.current=true;setError(e instanceof Error?e.message:'Learning progress could not be saved.');setView({journal:journal.current,pending:true});}
  },[options.uid,options.ready,options.room,options.stats,wake,volatile]);
  // Invalidate async completion across auth/hydration/import transitions, including same-UID import.
  useEffect(()=>{if(!options.ready){generation.current++;inflight.current=false;owner.current=null;journal.current=null;setView({journal:null,pending:false});}},[options.ready,options.uid]);
  const same=view.journal?.owner===options.uid&&view.journal?.matchId===options.room?.v2.matchId;
  let settled=0;
  if(same&&options.room){const room=options.room,role=room.hostId===options.uid?'host':'guest';for(const [index] of (room.v2.manifest?.questions??[]).entries()){const round=room.v2.rounds?.[`r_${index}`];if(!round?.answers?.[role]&&room.status!=='finished'&&!(room.v2.settings.mode==='competitive'&&round?.lockedAt!==undefined))break;settled++;}}
  const pending=view.pending||!!same&&(settled>(view.journal?.entries.length??0)||(view.journal?.entries.length??0)>(view.journal?.acknowledgedThrough??0));
  return {eligible:!!same,pending,error,volatile,totals:duelLearningTotals(same?view.journal:null),
    retry:()=>{failed.current=false;setVolatile(false);setError(null);setWake(n=>n+1);},
    continueWithoutRecovery:()=>{const o=current.current,j=journal.current;if(!o.ready||!o.uid||!j||j.owner!==o.uid)return;
      if(!j.entries.length||o.bridge.applyVolatile(o.uid,j.entries,Date.now())){setVolatile(true);setError('Learning progress is in memory only. Closing this page can lose it.');}},
  };
}
export type DuelLearning=ReturnType<typeof useDuelLearning>;
