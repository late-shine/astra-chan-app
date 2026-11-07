import { useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { StudentStats } from '../types';
import type { QuizStorage, StatsBinding, StorageResult } from './browserStorage';
import { applyQuizRecord, QUIZ_SKILL_LIMIT, receiptThrough, type ProgressEntry } from './progress';

type Options = {
  stats: StudentStats;
  setStats: Dispatch<SetStateAction<StudentStats>>;
  storage: QuizStorage;
  binding?: StatsBinding;
  writeEnabled: boolean;
  canWrite: () => boolean;
  isCurrentOwner: (owner: string) => boolean;
};
type CommitRequest = {
  owner: string;
  entries: readonly ProgressEntry[];
  now: number;
  current: () => boolean;
  complete: (result: StorageResult<void>) => void;
};
const unavailable = (message: string): StorageResult<never> => ({ ok: false, reason: 'unavailable', message });

export function useQuizProgressBridge(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [wake, setWake] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [skillPrune, setSkillPrune] = useState<{ count: number } | null>(null);
  const ticket = useRef<CommitRequest | null>(null);
  const written = useRef<{ stats: StudentStats; binding: string } | null>(null);
  const observed = useRef<StudentStats | null>(null);
  const volatile = useRef(new Set<string>());
  const recordKey = (owner: string, entry: ProgressEntry) => JSON.stringify([owner, entry.record.sessionId, entry.record.seq]);

  function update(entries: readonly ProgressEntry[], owner: string, now: number, beforeQueue: () => void) {
    const { stats, storage, setStats } = latest.current;
    const outbox = storage.readOutbox(owner);
    const pins = new Set<string>(outbox.ok === true ? outbox.value.map(entry => entry.record.sessionId) : []);
    for (const entry of entries) pins.add(entry.record.sessionId);
    const apply = (previous: StudentStats) => entries.reduce((current, entry) => applyQuizRecord(current, entry, now, pins), previous);
    try {
      const proposed = apply(stats);
      if (proposed !== stats && Object.keys(proposed.quizSkills ?? {}).length >= QUIZ_SKILL_LIMIT) {
        const before = new Set(Object.keys(stats.quizSkills ?? {}));
        for (const { record } of entries) {
          if (record.type === 'answer' && record.outcome !== 'unattempted' && record.seq > receiptThrough(stats, record.sessionId)) before.add(record.skillKey);
        }
        const pruned = [...before].filter(key => !Object.hasOwn(proposed.quizSkills ?? {}, key)).length;
        if (pruned) setSkillPrune({ count: pruned });
      }
    } catch { return false; }
    beforeQueue();
    setStats(previous => {
      try { return apply(previous); }
      catch { return previous; } // The post-render receipt check reports a gap without crashing React.
    });
    return true;
  }

  function submit(request: CommitRequest): boolean {
    const { isCurrentOwner, canWrite, writeEnabled } = latest.current;
    if (!request.entries.length || ticket.current || !writeEnabled || !canWrite() ||
      !request.current() || !isCurrentOwner(request.owner)) return false;
    ticket.current = request;
    if (!update([request.entries[0]], request.owner, request.now, () => {
      // prepareQuizCommit has now journaled the complete volatile suffix.
      for (const entry of request.entries) volatile.current.delete(recordKey(request.owner, entry));
    })) {
      ticket.current = null;
      return false;
    }
    setWake(value => value + 1);
    return true;
  }

  function applyVolatile(owner: string, entries: readonly ProgressEntry[], now: number): boolean {
    if (!latest.current.isCurrentOwner(owner) || ticket.current || !entries.length) return false;
    return update(entries, owner, now, () => {
      for (const entry of entries) volatile.current.add(recordKey(owner, entry));
    });
  }

  function cancel(dropVolatile = false) {
    ticket.current = null;
    if (dropVolatile) {
      volatile.current.clear();
      written.current = null;
    }
  }

  const { stats, binding, writeEnabled, storage } = options;
  const bindingKey = JSON.stringify(binding ?? null);
  useLayoutEffect(() => {
    const request = ticket.current;
    const writable = writeEnabled && latest.current.canWrite();
    if (!writable || request && (!request.current() || !latest.current.isCurrentOwner(request.owner))) {
      if (request) {
        volatile.current.add(recordKey(request.owner, request.entries[0]));
        ticket.current = null;
        request.complete(unavailable('Quiz owner or tab changed before the record could be saved.'));
      }
      return;
    }
    const record = request?.entries[0].record;
    if (record && receiptThrough(stats, record.sessionId) < record.seq) {
      ticket.current = null;
      request?.complete(unavailable('Quiz receipt sequence could not be applied.'));
      return;
    }
    if (volatile.current.size) {
      if (request) {
        ticket.current = null;
        request.complete(unavailable('Earlier in-memory quiz records still need a recovery checkpoint.'));
      }
      return;
    }
    const alreadyWritten = written.current?.stats === stats && written.current.binding === bindingKey;
    const result: StorageResult<void> = alreadyWritten ? { ok: true, value: undefined } : storage.writeStats(stats, binding, observed.current);
    if (result.ok === true) {
      written.current = { stats, binding: bindingKey };
      observed.current = stats;
    }
    setStorageError(result.ok === false ? result.message : null);
    if (request) {
      ticket.current = null;
      request.complete(result);
    }
  }, [stats, bindingKey, writeEnabled, wake, storage]);

  return {
    submit, applyVolatile, cancel, storageError, skillPrune,
    observeDeviceStats: (value: StudentStats | null) => { observed.current = value; },
    isDurable: (value: StudentStats) => written.current?.stats === value &&
      written.current.binding === bindingKey && volatile.current.size === 0,
    retryLocalWrite: () => setWake(value => value + 1),
    hasVolatile: () => volatile.current.size > 0,
  };
}
export type QuizProgressBridge = ReturnType<typeof useQuizProgressBridge>;
