import { useState } from 'react';
import { advanceCompanion, createCompanion, drawCompanion, type CompanionRecord } from '../../../quiz/companion';
import { COMPANION_COPY, type CompanionCategory } from '../../../quiz/companionCopy';
import { StudioShell } from '../StudioShell';

/** DEV-only coarse-event harness. No quiz engine, storage or progression. */
export function CompanionFixture() {
  const [state, setState] = useState(() => createCompanion(42));
  const [records, setRecords] = useState<CompanionRecord[]>([]);
  const [challenge, setChallenge] = useState(false);
  const [category, setCategory] = useState<CompanionCategory>('greeting');
  const [quiet, setQuiet] = useState(false);
  function event(phase: 'asking'|'feedback'|'paused', outcome?: 'correct'|'wrong'|'timeout') {
    const next = outcome ? [...records,{seq:records.length+1,outcome}] : records;
    setRecords(next);
    setState(advanceCompanion(state,{scope:'fixture',records:next,phase,question:String(next.length),challenge,explicitPause:phase==='paused',now:performance.now(),quiet}));
  }
  return <StudioShell label="Companion behavior fixture" companion={{expression:state.expression,speech:quiet?'':state.speech}}>
    <div className="quiz-stack">
      <h1 className="quiz-title">Companion word bank</h1>
      <p className="quiz-body">DEV fixture: accepted coarse events only. No study progress is saved.</p>
      <select className="quiz-select" aria-label="Speech category" value={category} onChange={e=>setCategory(e.target.value as CompanionCategory)}>
        {(Object.keys(COMPANION_COPY) as CompanionCategory[]).map(id=><option key={id}>{id}</option>)}
      </select>
      <button className="quiz-btn" onClick={()=>setState(drawCompanion(state,category))}>Draw authored line</button>
      <label><input type="checkbox" checked={challenge} onChange={e=>setChallenge(e.target.checked)}/> Timed / Survival suppression</label>
      <label><input type="checkbox" checked={quiet} onChange={e=>setQuiet(e.target.checked)}/> Quiet personality</label>
      <button className="quiz-btn" onClick={()=>event('asking')}>Begin / next asking</button>
      <button className="quiz-btn" onClick={()=>event('feedback','wrong')}>Record wrong</button>
      <button className="quiz-btn" onClick={()=>event('feedback','timeout')}>Record timeout</button>
      <button className="quiz-btn" onClick={()=>event('feedback','correct')}>Record correct</button>
      <button className="quiz-btn" onClick={()=>event('paused')}>Explicit pause</button>
      <p className="quiz-help">{state.lineId || 'No line selected'} · pending support {String(state.pending)}</p>
    </div>
  </StudioShell>;
}
