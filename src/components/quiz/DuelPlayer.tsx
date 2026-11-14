import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {DuelSessionController} from '../../quiz/useDuelSession';
import {summarizeDuel} from '../../quiz/duel';
import {QuizPlayer,QuizMoreMenu} from './QuizPlayer';
import {QuizFeedback} from './QuizFeedback';
import {useKeyboardViewport} from './QuizFlow';
import {StudioSheet,type StudioPresentation} from './StudioShell';
import type {QuizQuestionView,QuizAnswerState} from './viewTypes';
export function DuelPlayer({controller:c,shell,autoNext,onAutoNext}:{controller:DuelSessionController;shell:StudioPresentation;autoNext:boolean;onAutoNext:(enabled:boolean)=>void}) {
  const [why,setWhy]=useState(false),[exit,setExit]=useState(false);const input=useRef<HTMLInputElement>(null),prompt=useRef<HTMLDivElement>(null);
  const q=c.room!.v2.manifest!.questions[c.view!.index],v=c.view!,room=c.room!,round=room.v2.rounds?.[`r_${v.index}`],own=round?.answers?.[v.role];
  const competitive=room.v2.settings.mode==='competitive',locked=round?.lockedAt!==undefined;
  const frame=useKeyboardViewport(input,q.responseType==='typed');
  useLayoutEffect(()=>{setWhy(false);if(v.phase==='asking')(input.current??prompt.current)?.focus({preventScroll:true});},[v.draftKey,v.phase==='asking']);
  const blocked=c.busy||!c.connected||v.phase==='countdown'||v.phase==='opening';
  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{if(event.defaultPrevented||event.repeat||event.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||exit)return;
      const target=event.target instanceof HTMLElement?event.target:null;
      if(event.key==='Escape'){setExit(true);return;}
      if(target?.closest('button,a,select,textarea,[contenteditable]'))return;
      if(v.phase==='asking'&&!blocked&&q.responseType==='choice'&&/^[1-4]$/u.test(event.key)){event.preventDefault();void c.submit({type:'choice',choiceId:q.choices[Number(event.key)-1].id});}
      if(event.key==='Enter'&&own&&!competitive&&target!==input.current){event.preventDefault();c.next();}
    };document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);
  },[c,q,v.phase,blocked,exit,own,competitive]);
  const summary=summarizeDuel(room);
  const question:QuizQuestionView={id:q.id,index:v.index,total:room.v2.manifest!.questions.length,subjectLabel:'Kana duel',kindLabel:q.kind==='kana-type'?'Type romaji':'Read the kana',instruction:v.phase==='countdown'?`Shared round starts in ${Math.max(0,Math.ceil(((v.startAt??c.now)-c.now)/1000))}s`:q.instruction,
    prompt:{text:q.face,size:'glyph',ja:true},mode:q.responseType,choices:q.choices?.map(choice=>({...choice,ja:false}))??[],choiceLayout:'short',typedPlaceholder:'Type in romaji',
    timer:{kind:'question',label:v.phase==='countdown'?'Get ready':`${Math.ceil(v.remainingMs/1000)} s`,fraction:Math.min(1,v.remainingMs/room.v2.settings.durationMs)}};
  const answer:QuizAnswerState=own?{status:'answered',outcome:own.outcome,selectedId:own.response?.type==='choice'?own.response.choiceId:undefined,typedValue:own.response?.type==='typed'?own.response.value:undefined,correctId:q.correctChoiceId}:{status:'unanswered'};
  const status=<div className="quiz-stack"><div className="quiz-duel-score" aria-label="Match score"><span>{room.hostName} · {competitive?summary.host.points:summary.host.correct}</span><span>{room.guestName} · {competitive?summary.guest.points:summary.guest.correct}</span></div>
    {!c.connected&&<p className="quiz-notice" role="status">Your connection was lost. Reconnecting… The room deadline keeps running.</p>}
    {v.opponentDisconnected&&<p className="quiz-notice" role="status">Your friend lost connection. Reconnecting…</p>}
    {v.canEndForConnection&&<button className="quiz-btn quiz-btn--secondary" onClick={()=>void c.endConnection()}>End this interrupted match</button>}
    {c.error&&<div className="quiz-notice" role="alert"><p>{c.error}</p><button className="quiz-btn quiz-btn--quiet" onClick={()=>void c.retry()}>Retry connection</button></div>}
    {c.busy&&<p className="quiz-help" role="status">Waiting for the room to confirm…</p>}
  </div>;
  const feedback=own?<QuizFeedback view={{outcome:own.outcome,verdict:own.outcome==='correct'?'Correct':own.outcome==='timeout'?'Time is up':'Not quite',correctAnswer:q.reveal.answer,sentence:`${q.face} is read “${q.reveal.answer}”.`,canListen:false,announcement:`${own.outcome}. Answer: ${q.reveal.answer}.`,why:{mnemonic:q.reveal.note??`The taught reading is ${q.reveal.answer}.`}}}
    whyOpen={why} onToggleWhy={()=>{c.cancelAuto();setWhy(!why);}} onInteract={c.cancelAuto}
    autoNext={!competitive&&own.outcome==='correct'&&autoNext?{phase:c.autoCancelled?'paused':'counting',label:c.autoCancelled?'Auto-next paused':'Next in 1.6s',durationMs:1600}:undefined} onPauseAutoNext={c.cancelAuto}/>
    :locked?<section className="quiz-feedback"><p className="quiz-body">{round?.winner?'Your friend claimed this round.':'This round ended without a point.'} No answer was recorded for you.</p><p className="quiz-body">Answer: {q.reveal.answer}</p></section>:undefined;
  return <QuizPlayer question={question} answer={answer} typedValue={c.draft} autoNextEnabled={autoNext} blocked={blocked} announcement={own?`${own.outcome}. Answer: ${q.reveal.answer}.`:locked?'Round resolved. No answer recorded for you.':''} status={status} feedback={feedback} inputRef={input} promptRef={prompt}
    headerActions={<QuizMoreMenu competitive={competitive} speechEnabled={shell.speechEnabled} onSpeechChange={shell.onSpeechChange} autoNext={autoNext} onAutoNextChange={onAutoNext} onOpen={c.cancelAuto}/>}
    footerOverride={competitive&&(own||locked)?<button className="quiz-btn quiz-btn--primary quiz-btn--block" aria-disabled={!locked||c.now<(round.lockedAt??0)+1600||!c.connected} onClick={()=>{if(locked&&c.now>=(round.lockedAt??0)+1600&&c.connected)c.next();}}>{locked?'Next shared round':'Waiting for the round to resolve'}</button>:undefined}
    shell={{...shell,keyboardOpen:!!frame,liveViewport:frame??{},onCompanionInteract:c.cancelAuto,overlay:exit?<StudioSheet title="Leave this duel?" closeLabel="Keep playing" onClose={()=>setExit(false)} footer={<button className="quiz-btn quiz-btn--primary" onClick={()=>void c.leave().then(ok=>{if(ok)setExit(false);})}>Leave and keep partial results</button>}><p className="quiz-body">The shared clock keeps running. Leaving ends this match with the answers already confirmed.</p></StudioSheet>:undefined,modalOpen:exit}}
    actions={{onChoose:choiceId=>{if(!blocked)void c.submit({type:'choice',choiceId});},onTypedChange:c.setDraft,onSubmitTyped:event=>{event?.stopPropagation();if(!blocked&&c.draft.trim())void c.submit({type:'typed',value:c.draft});},onNext:c.next,onExit:()=>setExit(true),onFeedbackFocus:c.cancelAuto,onAutoNextChange:onAutoNext}}/>;
}
