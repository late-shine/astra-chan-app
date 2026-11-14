/** QZ10 adapter checks. --live explicitly creates two disposable anonymous Firebase accounts.
 * No profile/progress/friend writes. Cleanup is restricted to the test's own rooms/history. */
import assert from 'node:assert/strict';
import {createDuelTransport,cleanDuelCode,readDuelPointer,writeDuelPointer,duelPointerKey} from '../src/quiz/duelTransport';
import {createDuelRoom,acknowledgeReady,changeDuelSettings,buildDuelManifest,startMatch,applyDuelAnswer,advanceCompetitive,openParallelQuestion,
  advanceParallel,finishMatch,rematch,duelMatchId,deriveDuelHistory,reconnectDuel,summarizeDuel} from '../src/quiz/duel';
import type {DuelRoom,DuelSettings,DuelScope,Catalogs} from '../src/quiz/types';
let passed=0;
function check(name:string,value:unknown){assert.ok(value,name);passed++;console.log(`PASS ${name}`);}
const store=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v),removeItem:(k:string)=>store.delete(k)}});
check('room code normalized',cleanDuelCode(' abc123 ')==='ABC123');
assert.throws(()=>cleanDuelCode('../bad'));passed++;
writeDuelPointer('A',{code:'ABC123',matchId:'series_0',lastSeen:Date.now()});
check('pointer is scoped to auth owner',readDuelPointer('A')?.code==='ABC123'&&readDuelPointer('B')===null);
check('pointer stores no profile, answers or credentials',Object.keys(JSON.parse(store.get(duelPointerKey('A'))!)).sort().join() === 'code,lastSeen,matchId');
store.set(duelPointerKey('A'),JSON.stringify({code:'ABC123',matchId:'series_0',lastSeen:Date.now()-7200001}));
check('expired pointer ignored',readDuelPointer('A')===null);
store.set(duelPointerKey('A'),'{');check('corrupt pointer ignored',readDuelPointer('A')===null);
writeDuelPointer('A',null);check('forget removes only own pointer',!store.has(duelPointerKey('A')));
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:()=>{throw Error('Quota');}}});
assert.throws(()=>writeDuelPointer('A',{code:'ABC123',matchId:'series_0',lastSeen:Date.now()}),/cannot save a duel reconnect pointer/);passed++;
if(process.argv.includes('--live'))await live();
console.log(`QZ10 network checks: ${passed} passed; 0 failed.${process.argv.includes('--live')?' Real Firebase SDK clients; physical devices NOT tested.':' Live network NOT RUN (use --live).'} `);

async function live(){
  const {config}=await import('dotenv');config({quiet:true});
  const {initializeApp,deleteApp}=await import('firebase/app');
  const {getAuth,signInAnonymously,deleteUser,inMemoryPersistence,setPersistence}=await import('firebase/auth');
  const {getDatabase,ref,get,set,goOffline,goOnline}=await import('firebase/database');
  const data=await import('../src/data');
  const catalogs:Catalogs={hiragana:data.HIRAGANA_DATA,katakana:data.KATAKANA_DATA,vocabulary:[],kanji:[]};
  const options={apiKey:process.env.VITE_FIREBASE_API_KEY,authDomain:process.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:process.env.VITE_FIREBASE_PROJECT_ID,databaseURL:process.env.VITE_FIREBASE_DATABASE_URL,appId:process.env.VITE_FIREBASE_APP_ID};
  assert.ok(options.apiKey&&options.databaseURL,'Firebase environment required; values are never printed');
  const clients=[] as Array<{app:ReturnType<typeof initializeApp>;db:ReturnType<typeof getDatabase>;auth:ReturnType<typeof getAuth>;net:ReturnType<typeof createDuelTransport>;online:boolean;stop:()=>void;presence?:()=>void}>;
  const owned:string[]=[],history:string[]=[];
  const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
  async function until(test:()=>Promise<boolean>|boolean,label:string,timeout=14000){const end=Date.now()+timeout;while(!await test()){if(Date.now()>end)throw Error('Timed out: '+label);await sleep(100);}}
  let code='',r:DuelRoom;
  try{
    for(const role of ['host','guest']){
      const app=initializeApp(options,`QZ10-${role}-${Date.now()}`),auth=getAuth(app);await setPersistence(auth,inMemoryPersistence);await signInAnonymously(auth);
      const db=getDatabase(app),net=createDuelTransport(db,()=>auth.currentUser?.uid??null);
      const client={app,auth,db,net,online:false,stop:()=>{}};clients.push(client);
      client.stop=net.watchConnection(v=>{client.online=v.connected&&v.clockReady;},e=>{throw Error(e);});
      await until(()=>client.online,'connection');
    }
    const [h,g]=clients,host=h.auth.currentUser!.uid,guest=g.auth.currentUser!.uid;
    const settings:DuelSettings={subject:'kana',kind:'kana-read',mode:'competitive',difficulty:'easy',durationMs:15000,count:5,pool:{filter:'all',label:'Public core',script:'hiragana',stages:['basic']}};
    const created=await h.net.create('QZ10 test host',settings);code=created.code;r=created.room;owned.push(code);
    r=await g.net.join(code,'QZ10 test guest');check('deployed rules allow child guest claim',r.guestId===guest&&r.hostId===host);
    async function fresh(){const next=await h.net.fetchRoom(code);assert.ok(next);r=next;return r;}
    async function tx(client:typeof h,fn:(raw:unknown,s:DuelScope)=>ReturnType<typeof finishMatch>){await fresh();const out=await client.net.transact(code,{matchId:r.v2.matchId,revision:r.v2.settingsRevision},fn);assert.ok(out);r=out;return r;}
    async function readyStart(){await tx(h,(raw,s)=>acknowledgeReady(raw,s,2));await tx(g,(raw,s)=>acknowledgeReady(raw,s,2));
      const manifest=buildDuelManifest(catalogs,r.v2.settings,r.v2.matchId,42,r.v2.settingsRevision),startAt=h.net.now()+1500;
      await tx(h,(raw,s)=>startMatch(raw,s,manifest,startAt));
      check('both clients read same frozen strings and choice order',JSON.stringify((await g.net.fetchRoom(code))!.v2.manifest)===JSON.stringify(r.v2.manifest));
    }
    h.presence=await h.net.presence(code,e=>{throw Error(e);});g.presence=await g.net.presence(code,e=>{throw Error(e);});
    const extraPresence=await h.net.presence(code,e=>{throw Error(e);});extraPresence();
    await until(async()=>{await fresh();return Object.keys(r.presence?.[host]??{}).length===1;},'one connection cleanup');
    check('closing another tab retains original host presence',!reconnectDuel(r,guest,r.v2.matchId,g.net.now()).opponentDisconnected);
    await tx(h,(raw,s)=>acknowledgeReady(raw,s,2));await tx(g,(raw,s)=>acknowledgeReady(raw,s,2));
    await tx(h,(raw,s)=>changeDuelSettings(raw,s,settings));check('settings update clears both Ready on real server',!r.v2.readiness);
    await readyStart();await until(()=>h.net.now()>=r.v2.rounds!.r_0.windows.host!.startAt,'scheduled start');
    const event=(index:number,role:'host'|'guest',correct=true)=>{const q=r.v2.manifest!.questions[index];assert.ok(q.responseType==='choice');return {index,receiptId:`${role}_${index}_${Date.now()}`,capturedAt:h.net.now(),response:{type:'choice' as const,choiceId:correct?q.correctChoiceId:q.choices.find(c=>c.id!==q.correctChoiceId)!.id}};};
    const answer=async(client:typeof h,index:number,role:'host'|'guest',correct=true)=>{const capturedEvent=event(index,role,correct);return tx(client,(raw,s)=>applyDuelAnswer(raw,s,capturedEvent));};
    const e1=event(0,'host'),e2=event(0,'guest'),capture={matchId:r.v2.matchId,revision:r.v2.settingsRevision};
    const races=await Promise.allSettled([h.net.transact(code,capture,(raw,s)=>applyDuelAnswer(raw,s,e1)),g.net.transact(code,capture,(raw,s)=>applyDuelAnswer(raw,s,e2))]);
    await fresh();check('simultaneous correct accepts exactly one claim',Object.keys(r.v2.rounds!.r_0.answers!).length===1&&r.scores.host+r.scores.guest===1&&races.filter(x=>x.status==='fulfilled').length===1);
    await sleep(1700);const nextStart=h.net.now()+1500;
    await Promise.allSettled([h.net.transact(code,capture,(raw,s)=>advanceCompetitive(raw,s,0,nextStart)),g.net.transact(code,capture,(raw,s)=>advanceCompetitive(raw,s,0,nextStart))]);
    await fresh();check('racing advancement moves exactly one round',r.v2.competitiveIndex===1);
    await until(()=>h.net.now()>=nextStart,'next start');
    await answer(h,1,'host',false);await answer(g,1,'guest',false);
    check('wrong/wrong locks without a winner',r.v2.rounds!.r_1.lockedAt!==undefined&&!r.v2.rounds!.r_1.winner);
    await tx(g,(raw,s)=>finishMatch(raw,s,'left'));check('explicit guest leave is partial, not tie',summarizeDuel(r).partial&&summarizeDuel(r).winner===null);
    const first=r.v2.matchId;history.push(first);await h.net.recordHistory(deriveDuelHistory(r,host,code));await h.net.recordHistory({...deriveDuelHistory(r,host,code),result:'win'});
    check('history is match-ID keyed and write once',(await get(ref(h.db,`matchHistory/${host}/${first}`))).val().result==='aborted');
    const id1=duelMatchId(r.v2.seriesId,r.v2.generation+1);await tx(h,(raw,s)=>rematch(raw,s,id1));
    check('rematch clears private-round payload before public lobby',!r.v2.manifest&&!r.v2.rounds&&!r.v2.readiness);
    await tx(h,(raw,s)=>changeDuelSettings(raw,s,{...settings,mode:'parallel'}));await readyStart();
    await tx(h,(raw,s)=>openParallelQuestion(raw,s,0));await tx(g,(raw,s)=>openParallelQuestion(raw,s,0));
    const ownWindow=JSON.stringify(r.v2.rounds!.r_0.windows.guest),guestKey=reconnectDuel(r,guest,r.v2.matchId,g.net.now()).draftKey;
    await answer(h,0,'host');await tx(h,(raw,s)=>advanceParallel(raw,s,0,'manual'));await tx(h,(raw,s)=>openParallelQuestion(raw,s,1));
    check('opponent advances without resetting own window/draft key',r.v2.progress.guest.index===0&&JSON.stringify(r.v2.rounds!.r_0.windows.guest)===ownWindow&&reconnectDuel(r,guest,r.v2.matchId,g.net.now()).draftKey===guestKey);
    const stale=event(0,'guest');goOffline(g.db);await until(()=>!g.online,'guest offline');
    await assert.rejects(()=>g.net.transact(code,{matchId:r.v2.matchId,revision:r.v2.settingsRevision},(raw,s)=>applyDuelAnswer(raw,s,stale)),/connection/);passed++;
    await until(async()=>{await fresh();return !r.presence?.[guest]||!Object.keys(r.presence[guest]).length;},'guest onDisconnect');
    check('guest disconnect retains room membership and frozen round',r.guestId===guest&&!!r.v2.manifest);
    goOnline(g.db);await until(()=>g.online,'guest reconnect');g.presence?.();g.presence=await g.net.presence(code,e=>{throw Error(e);});
    check('guest reconnect reads persisted own index',(await g.net.fetchRoom(code))!.v2.progress.guest.index===0);
    goOffline(h.db);await until(()=>!h.online,'host offline');
    await until(async()=>{const next=await g.net.fetchRoom(code);return !next?.presence?.[host]||!Object.keys(next.presence[host]).length;},'host onDisconnect');
    check('host disconnect does not delete active room',!!await g.net.fetchRoom(code));
    console.log('Waiting 61 seconds for real continuous host absence (no simulated clock).');await sleep(61000);
    r=(await g.net.fetchRoom(code))!;
    await assert.rejects(()=>g.net.transact(code,{matchId:r.v2.matchId,revision:r.v2.settingsRevision},(raw,s)=>applyDuelAnswer(raw,s,stale)),/after the deadline/);passed++;
    check('60-second absence permits connected guest to end',reconnectDuel(r,guest,r.v2.matchId,g.net.now()).canEndForConnection);
    r=(await g.net.transact(code,{matchId:r.v2.matchId,revision:r.v2.settingsRevision},(raw,s)=>finishMatch(raw,s,'connection')))!;
    check('connection ending preserves partial summary',r.v2.endedReason==='connection'&&summarizeDuel(r).partial);
    goOnline(h.db);await until(()=>h.online,'host reconnect');h.presence?.();h.presence=await h.net.presence(code,e=>{throw Error(e);});
    await fresh();const id2=duelMatchId(r.v2.seriesId,r.v2.generation+1);await tx(h,(raw,s)=>rematch(raw,s,id2));
    check('second rematch has a distinct ID and retained members',id2!==id1&&id2!==first&&r.hostId===host&&r.guestId===guest);
    // Own legacy room exercises pre-claim version rejection using deployed rules.
    const legacy=createDuelRoom(host,'QZ10 legacy fixture',settings,'legacyfixture',h.net.now());assert.ok(legacy.ok&&legacy.room);
    const legacyCode='Z'+code.slice(1);const vacant=await get(ref(h.db,`rooms/${legacyCode}`));
    if(!vacant.exists()){const raw=JSON.parse(JSON.stringify(legacy.room));delete raw.protocolVersion;delete raw.v2;await set(ref(h.db,`rooms/${legacyCode}`),raw);owned.push(legacyCode);
      await assert.rejects(()=>g.net.join(legacyCode,'Guest'),/older duel version/);passed++;
      check('legacy rejected before claiming guest membership',!(await get(ref(h.db,`rooms/${legacyCode}/guestId`))).exists());}
    const payload=JSON.stringify(await h.net.fetchRoom(code));check('actual database payload contains no learner stats',!/quizSkills|quizReceipts|srsCards|characterProgress|vocabularyProgress/.test(payload));
  }finally{
    for(const c of clients){goOnline(c.db);c.presence?.();}
    if(clients[0]){const h=clients[0];for(const roomCode of owned){const target=ref(h.db,`rooms/${roomCode}`),snap=await get(target);if(snap.exists()&&snap.val().hostId===h.auth.currentUser?.uid)await set(target,null);}
      for(const id of history)await set(ref(h.db,`matchHistory/${h.auth.currentUser!.uid}/${id}`),null);}
    for(const c of clients){c.stop();if(c.auth.currentUser)await deleteUser(c.auth.currentUser);await deleteApp(c.app);}
    console.log('Removed only owned test rooms/history and disposable anonymous accounts.');
  }
}
