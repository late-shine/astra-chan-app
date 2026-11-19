import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {BookOpen,Check,Copy,UserRound,Users,Volume2,VolumeX} from 'lucide-react';
import {assertDuelSettings,duelDuration} from '../../quiz/duel';
import {cleanDuelCode} from '../../quiz/duelTransport';
import {DUEL_KIND_OPTIONS,duelSubjectLabel,switchDuelSubject,publicDuelTargets} from '../../quiz/duelSetup';
import {VOCAB_CATEGORY_META} from '../../vocab/vocabCategories';
import {DuelLearningStatus} from './DuelLearningStatus';
import type {DuelLearning} from '../../quiz/useDuelLearning';
import {DEFAULT_DUEL_SETTINGS,type DuelSessionController} from '../../quiz/useDuelSession';
import type {Catalogs,DuelSettings} from '../../quiz/types';
import {useKeyboardViewport} from './QuizFlow';
import {StudioHeader,StudioSegmented,StudioSheet,StudioShell,type StudioPresentation} from './StudioShell';
import './duel-lobby.css';

const modeLabel=(mode:DuelSettings['mode'])=>mode==='competitive'?'Competitive':'Parallel';
const stages=[{id:'basic',label:'Core'},{id:'dakuon',label:'Dakuten'},{id:'handakuon',label:'Handakuten'},{id:'yoon',label:'Yōon'}] as const;
// Object property order and selection order do not turn an unchanged draft into a new revision.
const settingsKey=(s:DuelSettings)=>JSON.stringify([s.subject,s.kind,s.count,s.difficulty,s.durationMs,s.mode,s.pool.filter,s.pool.script,[...(s.pool.stages??[])].sort(),s.pool.category,[...(s.pool.targetIds??[])].sort()]);
const materialLabel=(s:DuelSettings)=>s.subject==='kana'
  ? `${s.pool.script==='both'?'Both scripts':s.pool.script==='katakana'?'Katakana':'Hiragana'} · ${stages.filter(stage=>s.pool.stages?.includes(stage.id)).map(stage=>stage.label).join(', ')}${s.pool.filter==='explicit'?' · Selected targets':''}`
  : s.pool.label;

function MatchSummary({settings,eligible,guest=false,adjust,preview}:{settings:DuelSettings;eligible:number;guest?:boolean;adjust?:ReactNode;preview?:ReactNode}) {
  const actual=settings.count==='all'?eligible:Math.min(settings.count,eligible);
  return <section className="duel-lobby-summary" aria-label="Applied match">
    <div className="duel-lobby-summary__main"><BookOpen aria-hidden="true"/><div>
      <h2 className="quiz-section-title">{duelSubjectLabel(settings.subject)} · {materialLabel(settings)}</h2>
      <p className="quiz-help">{DUEL_KIND_OPTIONS[settings.subject].find(kind=>kind.id===settings.kind)?.label} · {settings.durationMs/1000}s each</p>
      <p className="quiz-help">{guest?`${settings.count==='all'?'All eligible':settings.count} requested questions · final count confirmed at Start`:`${actual} questions${settings.count==='all'?' (All)':actual!==settings.count?` (${settings.count} requested)`:''} · ${eligible} eligible targets`}</p>
      <p className="quiz-help"><strong>{modeLabel(settings.mode)}</strong> · {settings.mode==='competitive'?'Race each question':'Answer independently, with a deadline for each question'}</p>
    </div></div>
    {(adjust||preview)&&<div className="duel-lobby-summary__actions">{adjust}{preview}</div>}
  </section>;
}

export function DuelLobby({controller:c,catalogs,name,shell,onBack,friends,learning}:{controller:DuelSessionController;catalogs:Catalogs;name:string;shell:StudioPresentation;onBack:()=>void;friends?:ReactNode;learning:DuelLearning}) {
  const [entry,setEntry]=useState<'create'|'join'>('create');
  const [entrySettings,setEntrySettings]=useState<DuelSettings>(DEFAULT_DUEL_SETTINGS);
  const [draft,setDraft]=useState<DuelSettings>(c.room?.v2.settings??DEFAULT_DUEL_SETTINGS);
  const [joinCode,setJoinCode]=useState(''),[publicName,setPublicName]=useState(name),[formError,setFormError]=useState('');
  const [sheet,setSheet]=useState<'settings'|'preview'|'invite'|null>(null),[search,setSearch]=useState(''),[draftPreview,setDraftPreview]=useState(false);
  const [applying,setApplying]=useState(false),[expectedRevision,setExpectedRevision]=useState<number|null>(null),[applyError,setApplyError]=useState('');
  const [editRevision,setEditRevision]=useState<number|null>(null),[updatedNotice,setUpdatedNotice]=useState(''),[copyStatus,setCopyStatus]=useState('');
  const adjustRef=useRef<HTMLButtonElement>(null),previewRef=useRef<HTMLButtonElement>(null),inviteRef=useRef<HTMLButtonElement>(null),codeRef=useRef<HTMLInputElement>(null),activeInput=useRef<HTMLInputElement>(null);
  const roomKey=`${c.uid??''}:${c.code}:${c.room?.v2.matchId??''}`;
  const identity=useRef(roomKey);identity.current=roomKey;
  const previous=useRef<{key:string;revision:number;mode:DuelSettings['mode']}|null>(null);
  const applied=c.room?.v2.settings??entrySettings;
  const frame=useKeyboardViewport(activeInput,true);
  const targets=useMemo(()=>publicDuelTargets(catalogs,draft),[catalogs,draft]);
  const allTargets=useMemo(()=>publicDuelTargets(catalogs,draft,true),[catalogs,draft]);
  const appliedTargets=useMemo(()=>publicDuelTargets(catalogs,applied),[catalogs,applied]);
  const shownTargets=allTargets.filter(q=>q.face.toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0,80);
  const host=c.room?.hostId===c.uid,canEdit=!c.room||host,disabled=c.busy||!c.connected;
  const bothReady=!!c.room?.guestId&&(['host','guest'] as const).every(role=>c.room?.v2.readiness?.[role]?.revision===c.room?.v2.settingsRevision);
  const role=host?'host':'guest',ownReady=!!c.room&&c.room.v2.readiness?.[role]?.revision===c.room.v2.settingsRevision;
  const changed=settingsKey(draft)!==settingsKey(applied);
  const staleDraft=!!c.room&&sheet==='settings'&&editRevision!==c.room.v2.settingsRevision;
  const learningBlocked=!learning.eligible||!!learning.error&&!learning.volatile||learning.pending&&!learning.volatile;
  const actionBlocked=disabled||learningBlocked||sheet==='settings'||applying;
  let draftValidation='';
  try{assertDuelSettings(draft);}catch{draftValidation='Choose a valid public set and match options.';}
  if(targets.length<5)draftValidation='At least five distinct eligible targets are needed. Select more targets or choose a broader public set.';

  useEffect(()=>{
    setSheet(null);setApplying(false);setExpectedRevision(null);setApplyError('');setUpdatedNotice('');setCopyStatus('');setFormError('');
  },[roomKey]);
  useEffect(()=>{
    if(!c.room){previous.current=null;return;}
    const next={key:roomKey,revision:c.room.v2.settingsRevision,mode:c.room.v2.settings.mode};
    const old=previous.current;
    if(old?.key===next.key&&old.revision!==next.revision){
      setUpdatedNotice(`Match updated — both players need to ready again.${old.mode!==next.mode?` Mode changed from ${modeLabel(old.mode)} to ${modeLabel(next.mode)}.`:''}`);
    }
    previous.current=next;
  },[roomKey,c.room?.v2.settingsRevision,c.room?.v2.settings.mode]);
  useEffect(()=>{
    if(expectedRevision!==null&&c.room&&c.room.v2.settingsRevision>=expectedRevision){setApplying(false);setExpectedRevision(null);setSheet(null);setApplyError('');}
  },[expectedRevision,c.room?.v2.settingsRevision]);

  const openSettings=()=>{if(!canEdit||applying)return;setDraft(applied);setEditRevision(c.room?.v2.settingsRevision??null);setSearch('');setDraftPreview(false);setApplyError('');setSheet('settings');};
  const closeSheet=()=>{if(applying&&expectedRevision===null)return;setDraft(applied);setApplyError('');setSheet(null);};
  const patch=(value:Partial<DuelSettings>)=>setDraft(p=>({...p,...value}));
  const setPool=(value:Partial<DuelSettings['pool']>)=>{const {category,targetIds,...base}=draft.pool;patch({pool:{...base,...value}});};
  const apply=async()=>{
    if(!changed||draftValidation||staleDraft||applying||!canEdit||c.room&&disabled)return;
    if(!c.room){setEntrySettings(draft);setSheet(null);return;}
    const owner=roomKey,revision=c.room.v2.settingsRevision;
    setApplying(true);setApplyError('');
    const confirmed=await c.changeSettings(draft);
    if(identity.current!==owner)return;
    if(confirmed&&confirmed.v2.settingsRevision>revision&&settingsKey(confirmed.v2.settings)===settingsKey(draft)){
      // Keep the draft and action gate until the subscribed room actually shows the confirmed revision.
      setExpectedRevision(confirmed.v2.settingsRevision);
    }else{setApplying(false);setApplyError('The match was not updated. Your draft is still here; review the connection message and try Apply again.');}
  };
  const copyCode=async()=>{
    const owner=roomKey,code=c.code;
    try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(code);if(identity.current===owner)setCopyStatus('Room code copied.');}
    catch{if(identity.current!==owner)return;setCopyStatus('Copy is unavailable. Select the room code and copy it manually.');codeRef.current?.focus();codeRef.current?.select();}
  };
  const join=()=>{
    if(disabled)return;
    try{const code=cleanDuelCode(joinCode);setJoinCode(code);setFormError('');void c.join(code,publicName);}
    catch(error){setFormError(error instanceof Error?error.message:'Enter a six-character room code.');}
  };
  const connection=<>
    {!c.connected&&<p className="quiz-notice" role="status">Connecting to the duel service. Confirmed answers and deadlines stay in the room.</p>}
    {expectedRevision!==null&&<div className="quiz-notice duel-lobby-notice" role="status"><p>The update was accepted. Waiting for the room to confirm its current settings before Ready or Start.</p><button type="button" className="quiz-btn quiz-btn--secondary" disabled={c.busy||!c.connected} onClick={()=>void c.retry()}>Refresh room</button></div>}
    {c.error&&<div className="quiz-notice duel-lobby-notice" role="alert"><p>{c.error}</p>{c.code&&<button type="button" className="quiz-btn quiz-btn--secondary" disabled={c.busy} onClick={()=>void c.retry()}>Retry connection</button>}</div>}
  </>;
  const previewButton=<button ref={previewRef} type="button" className="quiz-btn quiz-btn--quiet" aria-haspopup="dialog" onClick={()=>setSheet('preview')}>Preview public set</button>;
  const adjustButton=canEdit?<button ref={adjustRef} type="button" className="quiz-btn quiz-btn--secondary" aria-haspopup="dialog" disabled={applying} onClick={openSettings}>Adjust match</button>:undefined;
  const footer=c.room?<footer className="duel-lobby-dock"><div className="duel-lobby-dock__inner">
    <p className="quiz-help">{actionBlocked?c.busy||applying?'Waiting for confirmation…':!c.connected?'Reconnect to continue.':learningBlocked?'Resolve the learning status above before continuing.':'Finish adjusting the match to continue.':bothReady?host?'Both ready. Begin whenever you like.':'Both ready. Waiting for host.':ownReady?'You’re ready. Waiting for your friend.':'Both players confirm this set before starting.'}</p>
    {host&&bothReady?<button type="button" className="quiz-btn quiz-btn--primary quiz-btn--block" aria-disabled={actionBlocked} disabled={actionBlocked} onClick={()=>{if(!actionBlocked&&bothReady)c.start();}}>Start shared set</button>
      :<button type="button" className="quiz-btn quiz-btn--primary quiz-btn--block" aria-disabled={actionBlocked||ownReady} disabled={actionBlocked||ownReady} onClick={()=>{if(!actionBlocked&&!ownReady)void c.ready();}}>{c.busy?'Confirming…':ownReady?host?'You’re ready':bothReady?'Waiting for host':'You’re ready':'Ready'}</button>}
  </div></footer>:undefined;

  const settingsSheet=sheet==='settings'?<StudioSheet title="Adjust match" onClose={closeSheet} returnFocusRef={adjustRef} closeLabel={applying?'Applying match':'Cancel adjustments'} footer={<div className="duel-lobby-sheet-actions">
    <button type="button" className="quiz-btn quiz-btn--secondary" disabled={applying&&expectedRevision===null} aria-disabled={applying&&expectedRevision===null} onClick={closeSheet}>{expectedRevision!==null?'Close':'Cancel'}</button>
    <button type="button" className="quiz-btn quiz-btn--primary" disabled={!changed||!!draftValidation||staleDraft||applying||!!c.room&&disabled} aria-disabled={!changed||!!draftValidation||staleDraft||applying||!!c.room&&disabled} onClick={()=>void apply()}>{applying?'Applying…':'Apply match'}</button>
  </div>}><div className="quiz-stack duel-lobby-settings">
    <p className="quiz-help">{c.room?'Changes stay here until Apply. Updating the match clears both players’ readiness.':'Choose the public set for your new room. Applying here does not create a room.'}</p>
    {applyError&&<p className="quiz-notice" role="alert">{applyError}</p>}
    {c.room&&connection}
    {staleDraft&&!applying&&<div className="quiz-notice duel-lobby-notice" role="alert"><p>The applied match changed while this draft was open. Reload it before applying changes.</p><button type="button" className="quiz-btn quiz-btn--secondary" onClick={openSettings}>Reload applied match</button></div>}
    <fieldset className="duel-lobby-settings__fields quiz-stack" disabled={applying}>
      <StudioSegmented label="Subject" value={draft.subject} columns={3} options={[{id:'kana',label:'Kana'},{id:'vocab',label:'Words'},{id:'kanji',label:'Kanji'}]} onChange={subject=>{setDraft(p=>switchDuelSubject(p,subject as DuelSettings['subject']));setSearch('');}} />
      {draft.subject==='kana'&&<>
        <StudioSegmented label="Kana script" value={draft.pool.script??'hiragana'} columns={3} options={[{id:'hiragana',label:'Hiragana'},{id:'katakana',label:'Katakana'},{id:'both',label:'Both'}]} onChange={script=>patch({pool:{filter:'all',label:`${script==='both'?'Both scripts':script} · selected groups`,script:script as 'hiragana'|'katakana'|'both',stages:draft.pool.stages}})} />
        <div className="quiz-field"><span className="quiz-field__label">Public groups</span><div className="quiz-chips">{stages.map(stage=><button type="button" key={stage.id} className="quiz-chip-toggle" aria-pressed={draft.pool.stages?.includes(stage.id)} onClick={()=>{
          const selected=draft.pool.stages?.includes(stage.id)?draft.pool.stages.filter(s=>s!==stage.id):[...(draft.pool.stages??[]),stage.id];if(selected.length)patch({pool:{filter:'all',label:'Selected kana groups',script:draft.pool.script,stages:selected}});
        }}>{stage.label}</button>)}</div></div>
      </>}
      {draft.subject==='vocab'&&<label className="quiz-field">Public word theme<select className="quiz-input" value={draft.pool.filter==='theme'?draft.pool.category:'all'} onChange={e=>patch({pool:e.target.value==='all'?{filter:'all',label:'All words'}:{filter:'theme',category:e.target.value,label:VOCAB_CATEGORY_META.find(category=>category.id===e.target.value)?.label??'Public word theme'}})}><option value="all">All words</option>{VOCAB_CATEGORY_META.map(category=><option key={category.id} value={category.id}>{category.label}</option>)}</select></label>}
      <StudioSegmented label="Question type" value={draft.kind} columns={2} options={[...DUEL_KIND_OPTIONS[draft.subject]]} onChange={kind=>patch({kind:kind as DuelSettings['kind']})} />
      <StudioSegmented label="Match mode" value={draft.mode} columns={2} options={[{id:'competitive',label:'Competitive'},{id:'parallel',label:'Parallel'}]} onChange={mode=>patch({mode:mode as DuelSettings['mode']})} />
      <StudioSegmented label="Questions" value={draft.count} columns={3} options={[{id:10,label:'10'},{id:20,label:'20'},{id:'all',label:'All'}]} onChange={count=>patch({count:count as DuelSettings['count']})} />
      <StudioSegmented label="Time per question" value={draft.difficulty} columns={2} options={(['easy','medium','hard',...(draft.subject==='kana'?['superhard']:[])] as DuelSettings['difficulty'][]).map(id=>({id,label:`${id[0].toUpperCase()+id.slice(1)} · ${duelDuration(draft.subject,id)/1000}s`}))} onChange={difficulty=>patch({difficulty:difficulty as DuelSettings['difficulty'],durationMs:duelDuration(draft.subject,difficulty as DuelSettings['difficulty'])})} />
      <details><summary className="quiz-help">Choose an explicit public set</summary><div className="quiz-stack">
        <button type="button" className="quiz-btn quiz-btn--quiet" onClick={()=>patch({pool:{filter:'all',label:duelSubjectLabel(draft.subject)+' public set',...(draft.subject==='kana'?{script:draft.pool.script,stages:draft.pool.stages}:{})}})}>Use all matching targets</button>
        <label className="quiz-field">Search public set<input className="quiz-input" value={search} onFocus={e=>{activeInput.current=e.currentTarget;}} onChange={e=>setSearch(e.target.value)} /></label>
        <p className="quiz-help">{allTargets.length} eligible targets · {draft.pool.targetIds?.length??0} selected. Select up to 256. Showing up to 80 matches.</p>
        <div className="quiz-chips">{shownTargets.map(q=><button type="button" key={q.id} lang="ja" className="quiz-chip-toggle quiz-jp" aria-pressed={draft.pool.filter==='explicit'&&draft.pool.targetIds?.includes(q.id)} onClick={()=>{
          const ids=draft.pool.filter==='explicit'?[...(draft.pool.targetIds??[])]:[];if(!ids.includes(q.id)&&ids.length>=256)return;setPool({filter:'explicit',label:`Explicit ${duelSubjectLabel(draft.subject)} set`,targetIds:ids.includes(q.id)?ids.filter(id=>id!==q.id):[...ids,q.id]});
        }}>{q.face}</button>)}</div>
      </div></details>
    </fieldset>
    <p className="quiz-body">{draft.count==='all'?targets.length:Math.min(draft.count,targets.length)} questions from {targets.length} eligible targets · {draft.count==='all'?'All selected':`${draft.count} requested`} · {draft.durationMs/1000}s each.</p>
    {draftValidation&&<p className="quiz-notice" role="status">{draftValidation}</p>}
    <button type="button" className="quiz-btn quiz-btn--quiet" aria-expanded={draftPreview} onClick={()=>setDraftPreview(!draftPreview)}>Preview draft public set</button>
    {draftPreview&&<p className="quiz-body quiz-jp duel-lobby-preview" lang="ja">{targets.map(q=>q.face).join(' · ')||'No eligible targets in this selection.'}</p>}
  </div></StudioSheet>:null;
  const overlay=settingsSheet??(sheet==='preview'?<StudioSheet title="Applied public set" size="compact" onClose={closeSheet} returnFocusRef={previewRef}>
    <div className="quiz-stack"><p className="quiz-help">{appliedTargets.length} eligible targets in your local public catalog. {c.room&&!host?'The host confirms the final question set at Start.':`${applied.count==='all'?appliedTargets.length:Math.min(applied.count,appliedTargets.length)} will be used (${applied.count==='all'?'All selected':`${applied.count} requested`}).`}</p><p className="quiz-body quiz-jp duel-lobby-preview" lang="ja">{appliedTargets.map(q=>q.face).join(' · ')||'No matching targets are available in this local catalog.'}</p></div>
  </StudioSheet>:sheet==='invite'?<StudioSheet title="Invite a friend" size="compact" onClose={closeSheet} returnFocusRef={inviteRef}>{friends}</StudioSheet>:undefined);

  return <StudioShell {...shell} presentation="duel-lobby" dockedFooter={!!c.room} label="Friendly duel lobby" width="setup" keyboardOpen={!!frame} liveViewport={frame??{}} modalOpen={!!sheet} overlay={overlay} footer={footer}
    header={<StudioHeader backLabel={c.room?host?'Close room and return to Practice':'Leave room and return to Practice':'Back to Practice'} onBack={onBack} trailing={shell.onSpeechChange&&<button type="button" className="quiz-icon-btn" aria-label={shell.speechEnabled?'Turn Astra speech off':'Turn Astra speech on'} aria-pressed={!!shell.speechEnabled} onClick={()=>shell.onSpeechChange?.(!shell.speechEnabled)}>{shell.speechEnabled?<Volume2 aria-hidden="true"/>:<VolumeX aria-hidden="true"/>}</button>}><p className="quiz-header__progress">Friendly duels</p></StudioHeader>}>
    <section className="quiz-card duel-lobby">
      <div className="duel-lobby-heading"><p className="duel-lobby-eyebrow">A shared study room</p><h1 className="quiz-title">Two seats, one shared set</h1></div>
      {!c.room?<>
        <StudioSegmented label="Room entry" value={entry} columns={2} options={[{id:'create',label:'Create a room'},{id:'join',label:'Join a room'}]} onChange={next=>{setEntry(next as 'create'|'join');setFormError('');}} />
        <form className="quiz-stack duel-lobby-entry" onSubmit={event=>{event.preventDefault();if(entry==='join')join();else if(!disabled&&appliedTargets.length>=5)void c.enter(publicName,entrySettings);}}>
          <label className="quiz-field">Your name<input className="quiz-input" autoComplete="nickname" maxLength={24} value={publicName} onFocus={e=>{activeInput.current=e.currentTarget;}} onChange={e=>setPublicName(e.target.value)} /></label>
          {entry==='create'?<><MatchSummary settings={entrySettings} eligible={appliedTargets.length} adjust={adjustButton} preview={previewButton}/>{appliedTargets.length<5&&<p className="quiz-notice">At least five distinct eligible targets are needed. Adjust the match to choose a broader public set.</p>}</>:<label className="quiz-field">Six-character room code<input className="quiz-input duel-lobby-code-input" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={joinCode} placeholder="ABC123" aria-invalid={!!formError} aria-describedby={formError?'duel-entry-error':undefined} onFocus={e=>{activeInput.current=e.currentTarget;}} onChange={e=>{setJoinCode(e.target.value.trim().toUpperCase());setFormError('');}} /></label>}
          {connection}{formError&&<p id="duel-entry-error" className="quiz-notice" role="alert">{formError}</p>}
          <button type="submit" className="quiz-btn quiz-btn--primary quiz-btn--block" disabled={disabled||entry==='create'&&appliedTargets.length<5} aria-disabled={disabled||entry==='create'&&appliedTargets.length<5}>{c.busy?entry==='create'?'Opening room…':'Joining room…':entry==='create'?'Create room':'Join room'}</button>
        </form>
      </>:<>
        <div className="duel-lobby-code"><label htmlFor="duel-room-code">Room code</label><input ref={codeRef} id="duel-room-code" readOnly value={c.code} onFocus={e=>e.currentTarget.select()} aria-label="Room code, select to copy"/><button type="button" className="quiz-btn quiz-btn--secondary" onClick={()=>void copyCode()}><Copy aria-hidden="true"/>Copy</button></div>
        {copyStatus&&<p className="quiz-help" role="status">{copyStatus}</p>}
        <div className="duel-lobby-seats" aria-label="Players">{(['host','guest'] as const).map(player=>{
          const present=player==='host'||!!c.room!.guestId,local=player===role,playerName=player==='host'?c.room!.hostName:c.room!.guestName??'Friend';
          const ready=present&&c.room!.v2.readiness?.[player]?.revision===c.room!.v2.settingsRevision;
          return <section className="duel-lobby-seat" key={player} data-ready={ready?'true':'false'} data-empty={!present?'true':undefined} aria-label={present?`${playerName}${local?', you':''}${player==='host'?', host':''}`:'Waiting for a friend'}>
            <span className="duel-lobby-seat__avatar" aria-hidden="true">{present?Array.from(String(playerName).trim())[0]?.toUpperCase()||<UserRound/>:<Users/>}</span>
            <h2 className="duel-lobby-seat__name">{present?playerName:'Waiting for a friend'}</h2>
            <p className="quiz-help">{present?`${local?'You':'Friend'}${player==='host'?' · Host':''}`:'Share the room code'}</p>
            {present&&<span className="duel-lobby-seat__status">{ready&&<Check aria-hidden="true"/>}{ready?'Ready':'Not ready'}</span>}
          </section>;
        })}</div>
        {updatedNotice&&<p className="quiz-notice" role="status">{updatedNotice}</p>}
        <MatchSummary settings={applied} eligible={appliedTargets.length} guest={!host} adjust={adjustButton} preview={previewButton}/>
        <div className="duel-lobby-secondary"><button ref={inviteRef} type="button" className="quiz-btn quiz-btn--quiet" aria-haspopup="dialog" onClick={()=>setSheet('invite')}>Invite / friends</button><button type="button" className="quiz-btn quiz-btn--quiet" disabled={c.busy||applying} onClick={()=>{if(!c.busy&&!applying)void c.leave();}}>{host?'Close room':'Leave room'}</button></div>
        {connection}<DuelLearningStatus learning={learning}/>
      </>}
    </section>
  </StudioShell>;
}

