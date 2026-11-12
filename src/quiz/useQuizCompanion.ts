import { useEffect, useRef, useState } from 'react';
import { advanceCompanion, companionView, createCompanion, type CompanionRecord } from './companion';
import { summarize } from './summary';
import type { ActiveSession } from './types';

/** Projects settled coarse records only. Never dispatches or receives response/answer text. */
export function settledCompanionRecords(active: ActiveSession | null): CompanionRecord[] {
  if (!active) return [];
  return active.records.filter(record => record.type === 'answer' && record.sessionId === active.config.sessionId &&
    (record.seq <= active.acknowledgedSeq || active.volatile && (record.seq !== active.pending?.record.seq ||
      active.phase !== 'committing' && (active.phase === 'feedback' || active.phase === 'results' || active.resumeState === 'feedback'))))
    .map(record => ({ seq: record.seq, outcome: record.type === 'answer' ? record.outcome : 'unattempted' }));
}
export function useQuizCompanion(owner: string | null, active: ActiveSession | null, blocked: boolean, quiet = false, pauseIntent = 0) {
  const consumedPause = useRef(0);
  const local = useRef(createCompanion());
  const [view, setView] = useState(companionView(local.current));
  useEffect(() => {
    const summary = active?.phase === 'results' ? summarize(active) : null;
    const next = advanceCompanion(local.current, {
      scope: `${owner ?? 'unbound'}:${active?.config.sessionId ?? 'entry'}`,
      records: settledCompanionRecords(active), phase: active?.phase ?? 'entry', question: active?.current.id ?? '',
      challenge: active?.config.origin === 'timed' || active?.config.origin === 'survival',
      result: summary ? { complete: summary.complete && !summary.partial, accuracy: summary.firstPass.accuracy } : undefined,
      now: performance.now(), blocked, quiet, explicitPause: pauseIntent > consumedPause.current, hidden: document.visibilityState === 'hidden',
    });
    consumedPause.current = pauseIntent;
    local.current = next;
    const result = companionView(next, quiet, blocked);
    setView(previous => previous.expression === result.expression && previous.speech === result.speech && previous.support === result.support && previous.lineId === result.lineId ? previous : result);
  }, [owner, active, blocked, quiet, pauseIntent]);
  // Errors suppress immediately, before the effect; no old-owner presentation can leak for a frame.
  const scope = `${owner ?? 'unbound'}:${active?.config.sessionId ?? 'entry'}`;
  return local.current.scope !== scope ? { expression: 'intro' as const, speech: '', support: false, lineId: '' } : blocked ? { ...view, expression: 'intro' as const, speech: '', support: false } : quiet ? { ...view, speech: '', support: false } : view;
}
