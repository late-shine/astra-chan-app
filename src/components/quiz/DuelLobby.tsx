import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {duelDuration} from '../../quiz/duel';
import {buildQuestions} from '../../quiz/pool';
import {seededRandom} from '../../quiz/random';
import {DEFAULT_DUEL_SETTINGS,type DuelSessionController} from '../../quiz/useDuelSession';
import type {Catalogs,DuelSettings} from '../../quiz/types';
import {StudioHeader,StudioSegmented,StudioShell,type StudioPresentation} from './StudioShell';

export function DuelLobby({controller:c,catalogs,name,shell,onBack,friends}:{controller:DuelSessionController;catalogs:Catalogs;name:string;shell:StudioPresentation;onBack:()=>void;friends?:ReactNode}) {
  const [draft,setDraft]=useState<DuelSettings>(c.room?.v2.settings??DEFAULT_DUEL_SETTINGS),[joinCode,setJoinCode]=useState(''),[publicName,setPublicName]=useState(name),[preview,setPreview]=useState(false);
  useEffect(()=>{if(c.room)setDraft(c.room.v2.settings);},[c.room?.v2.settingsRevision,c.room?.v2.matchId]);
  const targets=useMemo(()=>buildQuestions(catalogs,{sessionId:'duel-preview',subject:'kana',kinds:[draft.kind],choiceCount:4,length:256,now:0,pool:{script:draft.pool.script,stages:draft.pool.stages,...(draft.pool.filter==='explicit'?{filter:'custom',itemIds:draft.pool.targetIds}:{})}},{},seededRandom(1)).questions,[catalogs,draft]);
  const allTargets=useMemo(()=>buildQuestions(catalogs,{sessionId:'duel-picker',subject:'kana',kinds:[draft.kind],choiceCount:4,length:256,now:0,pool:{script:draft.pool.script,stages:draft.pool.stages}},{},seededRandom(2)).questions,[catalogs,draft.kind,draft.pool.script,draft.pool.stages]);
  const host=c.room?.hostId===c.uid,canEdit=!c.room||host,disabled=c.busy||!c.connected;
  const patch=(value:Partial<DuelSettings>)=>setDraft(p=>({...p,...value}));
  const bothReady=!!c.room?.guestId&&(['host','guest'] as const).every(role=>c.room?.v2.readiness?.[role]?.revision===c.room?.v2.settingsRevision);
  const role=host?'host':'guest',ownReady=c.room?.v2.readiness?.[role]?.revision===c.room?.v2.settingsRevision;
  const changed=c.room&&JSON.stringify(draft)!==JSON.stringify(c.room.v2.settings);
  const actual=Math.min(draft.count,targets.length);
  const setPool=(value:Partial<DuelSettings['pool']>)=>patch({pool:{...draft.pool,...value}});
  return <StudioShell {...shell} label="Friendly duel lobby" width="setup" header={<StudioHeader backLabel="Back to Practice" onBack={onBack}><p className="quiz-header__progress">Friendly duels</p></StudioHeader>}>
    <section className="quiz-card quiz-stack">
      <h1 className="quiz-title">A shared set, two desks</h1>
      <p className="quiz-body">{c.room?`Room ${c.code} · Kana · ${c.room.v2.settings.mode==='competitive'?'First accepted correct claims the round.':'Each player answers the whole set independently.'}`:'Choose a public kana set, or join a friend’s room.'}</p>
      {!c.connected&&<p className="quiz-notice" role="status">Connecting to the duel service. Your saved answers and deadlines stay in the room.</p>}
      {c.error&&<div className="quiz-notice" role="alert"><p>{c.error}</p><button className="quiz-btn quiz-btn--secondary" onClick={()=>void c.retry()}>Retry connection</button></div>}
      {!c.room&&<label className="quiz-field">Your name<input className="quiz-input" maxLength={24} value={publicName} onChange={e=>setPublicName(e.target.value)} /></label>}
      {c.room&&<div className="quiz-duel-players" aria-label="Players">{(['host','guest'] as const).map(player=><div className="quiz-duel-player" key={player}>
        <strong>{player==='host'?c.room!.hostName:c.room!.guestName??'Waiting for a friend'}</strong>
        <span className="quiz-help">{c.room!.v2.readiness?.[player]?.revision===c.room!.v2.settingsRevision?'Ready on this set':'Not ready yet'}</span>
      </div>)}</div>}
      {canEdit&&<>
        <StudioSegmented label="Kana script" value={draft.pool.script??'hiragana'} columns={3} options={[{id:'hiragana',label:'Hiragana'},{id:'katakana',label:'Katakana'},{id:'both',label:'Both'}]}
          onChange={script=>patch({pool:{filter:'all',label:`${script==='both'?'Both scripts':script} · selected groups`,script:script as 'hiragana'|'katakana'|'both',stages:draft.pool.stages}})} />
        <div className="quiz-field"><span className="quiz-field__label">Public groups</span><div className="quiz-chips">{([{id:'basic',label:'Core'},{id:'dakuon',label:'Dakuten'},{id:'handakuon',label:'Handakuten'},{id:'yoon',label:'Yōon'}] as const).map(stage=><button key={stage.id} className="quiz-chip-toggle" aria-pressed={draft.pool.stages?.includes(stage.id)} onClick={()=>{
          const stages=draft.pool.stages?.includes(stage.id)?draft.pool.stages.filter(s=>s!==stage.id):[...(draft.pool.stages??[]),stage.id];if(stages.length)patch({pool:{filter:'all',label:'Selected kana groups',script:draft.pool.script,stages}});
        }}>{stage.label}</button>)}</div></div>
        <StudioSegmented label="Question type" value={draft.kind} columns={2} options={[{id:'kana-read',label:'Read the kana'},{id:'kana-type',label:'Type romaji'}]} onChange={kind=>patch({kind:kind as 'kana-read'|'kana-type'})} />
        <StudioSegmented label="Match mode" value={draft.mode} columns={2} options={[{id:'competitive',label:'Competitive'},{id:'parallel',label:'Parallel'}]} onChange={mode=>patch({mode:mode as DuelSettings['mode']})} />
        <StudioSegmented label="Questions" value={draft.count} columns={3} options={[5,10,20].map(id=>({id,label:String(id)}))} onChange={count=>patch({count:count as 5|10|20})} />
        <StudioSegmented label="Time per question" value={draft.difficulty} columns={2} options={[{id:'easy',label:'Easy · 15 s'},{id:'medium',label:'Medium · 10 s'},{id:'hard',label:'Hard · 5 s'},{id:'superhard',label:'Superhard · 3 s'}]} onChange={difficulty=>patch({difficulty:difficulty as DuelSettings['difficulty'],durationMs:duelDuration('kana',difficulty as DuelSettings['difficulty'])})} />
        <details><summary className="quiz-help">Choose an explicit public set</summary><div className="quiz-stack">
          <button className="quiz-btn quiz-btn--quiet" onClick={()=>patch({pool:{filter:'all',label:'Selected kana groups',script:draft.pool.script,stages:draft.pool.stages}})}>Use all matching kana</button>
          <div className="quiz-chips">{allTargets.map(q=><button key={q.itemId} lang="ja" className="quiz-chip-toggle quiz-jp" aria-pressed={draft.pool.filter==='explicit'&&draft.pool.targetIds?.includes(q.itemId)} onClick={()=>{
            const ids=draft.pool.filter==='explicit'?[...(draft.pool.targetIds??[])]:[];setPool({filter:'explicit',label:'Explicit kana set',targetIds:ids.includes(q.itemId)?ids.filter(id=>id!==q.itemId):[...ids,q.itemId]});
          }}>{q.face}</button>)}</div>
        </div></details>
      </>}
      <p className="quiz-body">{c.room&&!host?`${c.room.v2.settings.pool.label} · ${actual} actual questions (${c.room.v2.settings.count} requested) · ${c.room.v2.settings.durationMs/1000}s · ${c.room.v2.settings.kind==='kana-type'?'Type romaji':'Read the kana'}`:`${actual} questions will be used from ${targets.length} eligible targets · ${draft.durationMs/1000}s each.`}</p>
      {targets.length<5&&<p className="quiz-notice">At least five distinct targets are needed. Add kana or choose broader groups.</p>}
      <button className="quiz-btn quiz-btn--quiet" aria-expanded={preview} onClick={()=>setPreview(!preview)}>Preview public set</button>
      {preview&&<p className="quiz-body quiz-jp" lang="ja">{targets.map(q=>q.face).join(' · ')}</p>}
      {!c.room?<>
        <button className="quiz-btn quiz-btn--primary" aria-disabled={disabled||targets.length<5} onClick={()=>{if(!disabled&&targets.length>=5)void c.enter(publicName,draft);}}>{c.busy?'Opening room…':'Create room'}</button>
        <div className="quiz-field"><label htmlFor="duel-code">Room code</label><input id="duel-code" className="quiz-input" value={joinCode} maxLength={6} autoCapitalize="characters" onChange={e=>setJoinCode(e.target.value.toUpperCase())} /><button className="quiz-btn quiz-btn--secondary" aria-disabled={disabled||joinCode.length!==6} onClick={()=>{if(!disabled&&joinCode.length===6)void c.join(joinCode,publicName);}}>Join room</button></div>
      </>:<>
        {changed&&host&&<button className="quiz-btn quiz-btn--secondary" aria-disabled={disabled||targets.length<5} onClick={()=>{if(!disabled&&targets.length>=5)void c.changeSettings(draft);}}>Apply settings · both players will Ready again</button>}
        <button className="quiz-btn quiz-btn--secondary" aria-disabled={disabled||ownReady||!!changed} onClick={()=>{if(!disabled&&!ownReady&&!changed)void c.ready();}}>{ownReady?'You’re ready':'Ready on this set'}</button>
        {host?<button className="quiz-btn quiz-btn--primary" aria-disabled={disabled||!bothReady||!!changed} onClick={()=>{if(!disabled&&bothReady&&!changed)c.start();}}>Start shared set</button>:<p className="quiz-help">The host starts once both players are ready.</p>}
        <button className="quiz-btn quiz-btn--quiet" onClick={()=>void c.leave()}>Close this lobby</button>
        {friends}
      </>}
    </section>
  </StudioShell>;
}
