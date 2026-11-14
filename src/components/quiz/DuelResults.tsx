import {summarizeDuel} from '../../quiz/duel';
import type {DuelSessionController} from '../../quiz/useDuelSession';
import {StudioHeader,StudioShell,type StudioPresentation} from './StudioShell';
export function DuelResults({controller:c,shell,onBack}:{controller:DuelSessionController;shell:StudioPresentation;onBack:()=>void}) {
  const s=summarizeDuel(c.room!),role=c.room!.hostId===c.uid?'host':'guest',mine=s[role],other=s[role==='host'?'guest':'host'];
  return <StudioShell {...shell} label="Friendly duel results" width="results" header={<StudioHeader backLabel="Back to Practice" onBack={onBack}><p className="quiz-header__progress">Duel results</p></StudioHeader>}>
    <section className="quiz-card quiz-stack"><h1 className="quiz-title">{s.partial?'A partial match':s.winner==='tie'?'A shared finish':s.winner===role?'You won this match':'Your friend won this match'}</h1>
      {s.partial&&<p className="quiz-body">Ended: {s.endedReason}. These counts include confirmed answers only.</p>}
      <p className="quiz-body">{c.room!.v2.settings.mode==='competitive'?`${mine.points} — ${other.points} match points`:`${mine.correct} — ${other.correct} correct`}</p>
      <p className="quiz-body">You: {mine.correct} correct · {mine.attempted} answered · {mine.unattempted} unattempted · {s.total} actual questions.</p>
      <p className="quiz-help">Total response time: {(mine.elapsedMs/1000).toFixed(2)}s · friend {(other.elapsedMs/1000).toFixed(2)}s. Match points are separate from study XP.</p>
      {c.error&&<div className="quiz-notice" role="alert"><p>{c.error}</p><button className="quiz-btn quiz-btn--secondary" onClick={()=>void c.retry()}>Retry connection</button></div>}
      {c.room!.hostId===c.uid?<button className="quiz-btn quiz-btn--primary" aria-disabled={c.busy||!c.connected} onClick={()=>{if(!c.busy&&c.connected)void c.rematch();}}>Play another shared set</button>:<p className="quiz-help">The host can open another set. Both players will Ready again.</p>}
      <button className="quiz-btn quiz-btn--secondary" onClick={onBack}>Back to Practice</button>
    </section>
  </StudioShell>;
}
