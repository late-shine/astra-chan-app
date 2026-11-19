import type {DuelLearning} from '../../quiz/useDuelLearning';
import {DuelLearningStatus} from './DuelLearningStatus';
import {duelSubjectLabel,DUEL_KIND_OPTIONS} from '../../quiz/duelSetup';
import {summarizeDuel} from '../../quiz/duel';
import type {DuelSessionController} from '../../quiz/useDuelSession';
import {StudioHeader,StudioMark,StudioShell,type StudioPresentation} from './StudioShell';
import './duel-match-results.css';

export function DuelResults({controller:c,learning,onRepair,repairCount,repairUnavailable,shell,onBack}:{controller:DuelSessionController;learning:DuelLearning;onRepair:()=>void;repairCount:number;repairUnavailable?:string;shell:StudioPresentation;onBack:()=>void}) {
  const room=c.room!,settings=room.v2.settings,s=summarizeDuel(room),role=room.hostId===c.uid?'host':'guest';
  const mine=s[role],competitive=settings.mode==='competitive',host=role==='host';
  const tiebreak=!competitive&&s.complete&&s.host.correct===s.guest.correct&&s.winner!=='tie';
  const title=s.partial?'A partial match':s.winner==='tie'?'A shared finish':competitive
    ?s.winner===role?'You won this match':'Your friend won this match'
    :s.winner===role?'You led this parallel set':'Your friend led this parallel set';
  const reason=s.endedReason==='left'?'A player left the room.':s.endedReason==='connection'?'The match ended after a connection interruption.':s.endedReason==='expired'?'The room expired.':'The shared set ended early.';
  const saveLabel=learning.volatile?'In memory only':learning.error?'Save needs attention':learning.pending?'Saving…':'Saved on this device';
  const rematchBlocked=c.busy||!c.connected||learning.pending||!!learning.error;
  const repairBlocked=learning.pending||!!repairUnavailable;
  const backBlocked=learning.pending&&!learning.volatile;

  return <StudioShell {...shell} presentation="duel-results" label="Friendly duel results" width="results" header={<StudioHeader backLabel="Back to Practice" onBack={onBack}><p className="quiz-header__progress">Our shared session</p></StudioHeader>}>
    <div className="duel-results" data-partial={s.partial||undefined}>
      <section className="duel-results__hero" aria-labelledby="duel-result-title">
        <p className="duel-results__eyebrow">{s.partial?'Session ended early':competitive?'Competitive · complete':'Parallel · complete'}</p>
        <h1 id="duel-result-title" className="quiz-title">{title}</h1>
        <div className="duel-results__ornament" aria-hidden="true">{s.complete&&<StudioMark/>}</div>
        <p className="quiz-body">{duelSubjectLabel(settings.subject)} · {DUEL_KIND_OPTIONS[settings.subject].find(k=>k.id===settings.kind)?.label}</p>
        {s.partial&&<p className="quiz-notice" role="status">{reason} These are confirmed answers only. No winner is declared.</p>}
      </section>

      <section className="duel-results__outcomes" aria-label={competitive?'Final match points':'Final correct answers'}>
        {(['host','guest'] as const).map(player=>{
          const local=player===role,won=s.complete&&s.winner===player;
          return <div className="duel-outcome" data-winner={won||undefined} key={player}>
            <p className="duel-outcome__role">{local?'You · ':''}{player==='host'?'Host':'Guest'}</p>
            <h2 className="duel-outcome__name">{player==='host'?room.hostName:room.guestName??'Friend'}</h2>
            <p className="duel-outcome__score"><strong>{competitive?s[player].points:s[player].correct}</strong><span>{competitive?'match points':'correct answers'}</span></p>
            <p className="duel-outcome__result">{s.partial?'Partial result':s.winner==='tie'?'Tie':won?competitive?'Winner':'Leading score':'Set complete'}</p>
          </div>;
        })}
      </section>
      {tiebreak&&<p className="quiz-notice">Correct answers were tied. The lower total response time decided this parallel set: {room.hostName} {(s.host.elapsedMs/1000).toFixed(3)}s · {room.guestName} {(s.guest.elapsedMs/1000).toFixed(3)}s.</p>}
      {!competitive&&s.complete&&s.winner==='tie'&&<p className="quiz-help duel-results__tie">Both correct answers and total response time were equal.</p>}

      <section className="duel-results__learning" aria-labelledby="duel-learning-title">
        <div className="duel-results__learning-head"><h2 id="duel-learning-title" className="quiz-section-title">Your learning</h2><p className="quiz-help">{s.total} actual questions in this set</p></div>
        <dl className="duel-results__counts"><div><dt>Correct</dt><dd>{mine.correct}</dd></div><div><dt>Answered</dt><dd>{mine.attempted}</dd></div><div><dt>Unattempted</dt><dd>{mine.unattempted}</dd></div></dl>
        {learning.eligible&&<div className="duel-results__xp"><p><strong>{learning.totals.total}</strong> personal study XP</p><span className="quiz-help">{saveLabel}</span></div>}
        <DuelLearningStatus learning={learning}/>
        <details className="duel-results__details"><summary>Response times and study breakdown</summary><div className="quiz-stack">
          <p className="quiz-body">Total response time: {room.hostName} {(s.host.elapsedMs/1000).toFixed(3)}s · {room.guestName} {(s.guest.elapsedMs/1000).toFixed(3)}s.</p>
          {!competitive&&<p className="quiz-help">Parallel ranks correct answers first, then lower total response time. Every question has a deadline.</p>}
          {competitive&&<p className="quiz-help">Competitive ranks match points. The first accepted correct answer claims each round.</p>}
          <p className="quiz-help">Your answered count includes {mine.timeout} timeout{mine.timeout===1?'':'s'}. Unattempted questions have no recorded answer.</p>
          {learning.eligible&&<p className="quiz-body">{learning.totals.base} base + {learning.totals.challenge} difficulty + 0 completion = {learning.totals.total} study XP.</p>}
          <p className="quiz-help">Match points are separate from personal study XP. No win bonus.</p>
        </div></details>
      </section>

      <section className="duel-results__actions" aria-label="Continue studying">
        {repairCount>0&&<button type="button" className="quiz-btn quiz-btn--primary" aria-disabled={repairBlocked} onClick={()=>{if(!repairBlocked)onRepair();}}>Practice my misses · {Math.min(5,repairCount)}</button>}
        {repairUnavailable&&<p className="quiz-help">{repairUnavailable}</p>}
        {!c.connected&&<p className="quiz-notice" role="status">Reconnecting to the room. Another shared set needs a confirmed connection.</p>}
        {c.error&&<div className="quiz-notice" role="alert"><p>{c.error}</p><button type="button" className="quiz-btn quiz-btn--secondary" onClick={()=>void c.retry()}>Retry connection</button></div>}
        {host?<><button type="button" className={`quiz-btn ${repairCount>0?'quiz-btn--secondary':'quiz-btn--primary'}`} aria-disabled={rematchBlocked} onClick={()=>{if(!rematchBlocked)void c.rematch();}}>{c.busy?'Opening another set…':'Play another shared set'}</button><p className="quiz-help">Both players will need to ready again.</p></>:<p className="quiz-notice" role="status">Waiting for the host to open another set. Both players will need to ready again.</p>}
        <button type="button" className="quiz-btn quiz-btn--quiet" aria-disabled={backBlocked} onClick={()=>{if(!backBlocked)onBack();}}>Back to Practice</button>
      </section>
    </div>
  </StudioShell>;
}

