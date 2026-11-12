import { useEffect, useRef, useState } from 'react';
import { activeLeaseKey, prepareQuizCommit, unacknowledgedProgress, type QuizStorage } from './browserStorage';
import type { ProgressEntry } from './progress';
import { createSession, reduceSession } from './session';
import type { ActiveSession, ClockStamp, CommitFailure, SessionEvent, SessionState } from './types';
import type { QuizProgressBridge } from './useQuizProgressBridge';

export function quizClock(): ClockStamp {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return { monoMs: performance.now(), epochMs: now.getTime(), localDate: `${now.getFullYear()}-${month}-${day}` };
}

export function quizDeviceId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}

type Options = {
  owner: string | null;
  ready: boolean;
  cloud: boolean;
  isCurrentOwner: (owner: string) => boolean;
  storage: QuizStorage;
  bridge: QuizProgressBridge;
};
type Prepared = { owner: string; sessionId: string; seq: number; attempt: number; entries: ProgressEntry[] };
const scope = (state: ActiveSession, clock: ClockStamp) => ({ sessionId: state.config.sessionId, questionId: state.current.id, clock });
function pendingScope(state: ActiveSession, clock: ClockStamp) {
  const pending = state.pending;
  return pending ? { sessionId: state.config.sessionId, seq: pending.record.seq, attempt: pending.attempt, clock } : null;
}

export function useQuizSession(options: Options) {
  const current = useRef(options);
  current.current = options;
  const live = useRef<{ owner: string | null; state: SessionState }>({ owner: null, state: createSession() });
  const tab = useRef<string | null>(null);
  const prepared = useRef<Prepared | null>(null);
  const submitted = useRef<Prepared | null>(null);
  const detached = useRef(false);
  const parked = useRef(false);
  const lastCheckpoint = useRef(0);
  const [state, setState] = useState<SessionState>(live.current.state);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [otherTab, setOtherTab] = useState(false);

  function tabId() { return tab.current ?? (tab.current = quizDeviceId()); }
  function publish(next: SessionState) {
    live.current = { owner: live.current.owner, state: next };
    setState(next);
  }
  function eligible(owner: string) {
    return !parked.current && !detached.current && current.current.ready && current.current.owner === owner &&
      live.current.owner === owner && current.current.isCurrentOwner(owner);
  }
  function pauseForConflict() {
    const previous = live.current.state;
    detached.current = true;
    prepared.current = null;
    setOtherTab(true);
    if (previous.phase !== 'idle') publish(reduceSession(previous, { type: 'PAUSE', ...scope(previous, quizClock()) }));
  }
  function claim(owner: string, sessionId: string, clock: ClockStamp) {
    const result = current.current.storage.claimLease(owner, tabId(), sessionId, clock.epochMs);
    if (result.ok === false && result.reason === 'conflict') {
      pauseForConflict();
      return false;
    }
    if (result.ok === false) setRecoveryError(result.message);
    return true;
  }
  function checkpoint(next: ActiveSession, owner: string, clock: ClockStamp) {
    const result = current.current.storage.writeSnapshot(next, owner, clock);
    lastCheckpoint.current = clock.monoMs;
    setRecoveryError(result.ok === false ? result.message : null);
    return result.ok;
  }
  function failed(next: ActiveSession, failure: CommitFailure, message: string, clock: ClockStamp) {
    const pending = pendingScope(next, clock);
    setRecoveryError(message);
    return pending ? reduceSession(next, { type: 'COMMIT_FAILED', failure, ...pending }) : next;
  }
  function prepare(next: ActiveSession, owner: string, clock: ClockStamp): SessionState {
    const result = prepareQuizCommit(current.current.storage, owner, current.current.cloud, next, clock);
    lastCheckpoint.current = clock.monoMs;
    if (result.ok === false) return failed(next, result.failure, result.message, clock);
    const pending = pendingScope(next, clock)!;
    prepared.current = { owner, sessionId: pending.sessionId, seq: pending.seq, attempt: pending.attempt, entries: result.entries };
    setRecoveryError(null);
    return next;
  }

  function dispatch(event: SessionEvent): boolean {
    const { owner, state: previous } = live.current;
    if (!owner || !eligible(owner)) return false;
    const available = current.current.storage.leaseAvailable(owner, tabId(), event.clock.epochMs);
    if (available.ok === false && available.reason === 'conflict') {
      pauseForConflict();
      return false;
    }
    let next: SessionState;
    try { next = reduceSession(previous, event); }
    catch { setRecoveryError('This practice could not be started.'); return false; }
    if (next === previous || next.phase === 'idle') return false;
    if (event.type !== 'TICK' && !claim(owner, next.config.sessionId, event.clock)) return false;
    if (event.type === 'CONTINUE_VOLATILE') {
      try {
        if (previous.phase === 'idle' || !current.current.bridge.applyVolatile(owner, unacknowledgedProgress(previous), event.clock.epochMs)) {
          setRecoveryError('The in-memory quiz receipt could not be applied.');
          return false;
        }
      } catch { setRecoveryError('The in-memory quiz record could not be verified.'); return false; }
    }
    if (next.volatile && next.pending?.status === 'failed' &&
      (event.type === 'NEXT' || event.type === 'FINISH' || event.type === 'PAUSE' || event.type === 'RESUME')) {
      next = reduceSession(next, { type: 'RETRY_COMMIT', ...pendingScope(next, event.clock)! });
      if (next.phase === 'idle') return false;
    }
    const oldPending = previous.phase === 'idle' ? null : previous.pending;
    const newPending = next.pending;
    const changedPending = newPending?.status === 'pending' &&
      (oldPending?.record.seq !== newPending.record.seq || oldPending.attempt !== newPending.attempt || oldPending.status !== newPending.status);
    if (changedPending) {
      // Synchronous write-ahead on the event path. The effect starts React application afterward.
      next = prepare(next, owner, event.clock);
    } else if (event.type !== 'DRAFT' && event.type !== 'COMMIT_FAILED' && event.type !== 'CONTINUE_VOLATILE' &&
      (event.type !== 'TICK' || event.clock.monoMs - lastCheckpoint.current >= 1000)) {
      checkpoint(next, owner, event.clock);
    }
    publish(next);
    return true;
  }

  function restore(owner: string) {
    if (!eligible(owner) || live.current.state.phase !== 'idle') return;
    const clock = quizClock();
    const available = current.current.storage.leaseAvailable(owner, tabId(), clock.epochMs);
    if (available.ok === false && available.reason === 'conflict') { pauseForConflict(); return; }
    const result = current.current.storage.readSnapshot(owner, clock);
    if (result.ok === false) {
      setRecoveryError(result.message);
      if (result.reason === 'invalid' && available.ok === true) current.current.storage.removeSnapshot(owner);
      return;
    }
    if (result.value && claim(owner, result.value.config.sessionId, clock)) {
      publish(result.value.pending?.status === 'pending' ? prepare(result.value, owner, clock) : result.value);
    }
  }

  function suspend(resetSubmission = false) {
    const active = live.current.state;
    const paused = active.phase !== 'idle' && dispatch({ type: 'PAUSE', ...scope(active, quizClock()) });
    if (resetSubmission) {
      prepared.current = null;
      submitted.current = null;
    }
    return paused;
  }
  function detach(owner: string, keepOwner = false) {
    if (live.current.owner !== owner) return;
    current.current.storage.releaseLease(owner, tabId(), quizClock().epochMs);
    prepared.current = null;
    submitted.current = null;
    detached.current = false;
    live.current = { owner: keepOwner ? owner : null, state: createSession() };
    setOtherTab(false);
    setState(live.current.state);
  }
  function saveForLater(): boolean {
    suspend();
    const { owner, state: active } = live.current;
    return !!owner && active.phase !== 'idle' && eligible(owner) &&
      (active.phase === 'paused' || active.phase === 'results' || active.pauseRequested) &&
      checkpoint(active, owner, quizClock());
  }

  function discard(): boolean {
    const { owner, state: active } = live.current;
    if (!owner || active.phase === 'idle' || active.pending || !eligible(owner) ||
      (active.phase !== 'paused' && active.phase !== 'results' && active.records.length > 0)) return false;
    if (!claim(owner, active.config.sessionId, quizClock())) return false;
    const removed = current.current.storage.removeSnapshot(owner);
    if (removed.ok === false) { setRecoveryError(removed.message); return false; }
    detach(owner);
    live.current.owner = owner;
    return true;
  }

  useEffect(() => {
    const { owner } = options;
    if (live.current.owner !== owner) {
      const previous = live.current.owner;
      if (previous) detach(previous);
      live.current.owner = owner;
      setRecoveryError(null);
    }
    if (owner && options.ready) {
      const active = live.current.state;
      if (active.phase !== 'idle' && active.pending?.status === 'pending' && !prepared.current && eligible(owner)) {
        const clock = quizClock();
        if (claim(owner, active.config.sessionId, clock)) publish(prepare(active, owner, clock));
      } else restore(owner);
    }
  }, [options.owner, options.ready]);

  useEffect(() => {
    const job = prepared.current;
    if (!job || submitted.current === job || !eligible(job.owner) || state.phase === 'idle' ||
      state.pending?.record.seq !== job.seq || state.pending.attempt !== job.attempt) return;
    const canCommit = () => {
      if (!eligible(job.owner)) return false;
      const result = current.current.storage.leaseAvailable(job.owner, tabId(), quizClock().epochMs);
      return result.ok === true;
    };
    submitted.current = job;
    const accepted = current.current.bridge.submit({
      owner: job.owner, entries: job.entries, now: quizClock().epochMs, current: canCommit,
      complete(result) {
        if (prepared.current === job) prepared.current = null;
        const clock = quizClock();
        if (result.ok === true) dispatch({ type: 'COMMIT_OK', sessionId: job.sessionId, seq: job.seq, attempt: job.attempt, clock });
        else {
          dispatch({ type: 'COMMIT_FAILED', sessionId: job.sessionId, seq: job.seq, attempt: job.attempt, failure: 'stats', clock });
          setRecoveryError(result.message);
        }
      },
    });
    if (!accepted) {
      prepared.current = null;
      dispatch({ type: 'COMMIT_FAILED', sessionId: job.sessionId, seq: job.seq, attempt: job.attempt, failure: 'stats', clock: quizClock() });
      setRecoveryError('Quiz progress could not be applied. Retry saving the pending record.');
    }
  }, [state, options.ready, options.owner]);

  const draft = state.phase === 'idle' ? null : state.draft;
  useEffect(() => {
    if (draft === null || state.phase !== 'asking' || state.current.responseType !== 'typed') return;
    const timer = window.setTimeout(() => {
      const { owner, state: active } = live.current;
      const clock = quizClock();
      if (owner && active.phase === 'asking' && eligible(owner) && claim(owner, active.config.sessionId, clock)) checkpoint(active, owner, clock);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft, state.phase]);

  const hasDeadline = state.phase === 'asking' && state.runtime.deadlineMonoMs !== null;
  const autoDeadline = state.phase === 'feedback' ? state.runtime.autoNextDeadlineMonoMs : null;
  const questionId = state.phase === 'idle' ? null : state.current.id;
  useEffect(() => {
    if (!options.ready) return;
    if (hasDeadline) {
      const timer = window.setInterval(() => {
        const active = live.current.state;
        if (active.phase === 'asking' && active.current.id === questionId) dispatch({ type: 'TICK', ...scope(active, quizClock()) });
      }, 150);
      return () => window.clearInterval(timer);
    }
    if (autoDeadline !== null && state.phase === 'feedback' && state.autoNextToken !== null) {
      const token = state.autoNextToken;
      const timer = window.setTimeout(() => dispatch({ type: 'AUTO_NEXT', token, ...scope(state, quizClock()) }),
        Math.max(0, Math.ceil(autoDeadline - performance.now())) + 1);
      return () => window.clearTimeout(timer);
    }
  }, [options.ready, hasDeadline, questionId, autoDeadline]);

  useEffect(() => {
    const refreshLease = () => {
      const { owner, state: active } = live.current;
      if (owner && active.phase !== 'idle' && eligible(owner)) claim(owner, active.config.sessionId, quizClock());
      else if (owner && active.phase === 'idle' && detached.current && current.current.isCurrentOwner(owner)) {
        const available = current.current.storage.leaseAvailable(owner, tabId(), quizClock().epochMs);
        if (available.ok === true) { detached.current = false; setOtherTab(false); restore(owner); }
      }
    };
    const visibility = () => { if (document.visibilityState === 'hidden') suspend(); else refreshLease(); };
    const pagehide = () => {
      const paused = suspend();
      const { owner, state: active } = live.current;
      const clock = quizClock();
      if (owner && active.phase !== 'idle' && eligible(owner) && claim(owner, active.config.sessionId, clock)) {
        if (!paused) checkpoint(active, owner, clock);
        current.current.storage.releaseLease(owner, tabId(), clock.epochMs);
      }
      parked.current = true;
    };
    const pageshow = () => {
      parked.current = false;
      refreshLease();
      const { owner, state: active } = live.current;
      if (owner && active.phase !== 'idle' && active.pending?.status === 'pending' && !prepared.current && eligible(owner)) {
        publish(prepare(active, owner, quizClock()));
      }
    };
    const storageChanged = (event: StorageEvent) => {
      const owner = live.current.owner;
      if (owner && event.key === activeLeaseKey(owner)) refreshLease();
    };
    const heartbeat = window.setInterval(refreshLease, 5000);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', pageshow);
    window.addEventListener('storage', storageChanged);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', pageshow);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);

  return {
    state, dispatch, suspend, detach, discard, saveForLater, recoveryError, otherTab,
    canReplace: (owner: string) => current.current.storage.leaseAvailable(owner, tabId(), quizClock().epochMs),
  };
}
export type QuizSessionController = ReturnType<typeof useQuizSession>;
