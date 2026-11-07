import type { StudentStats } from '../types';
import { isSafeKey } from './ids';
import { hasUnseenQuizReceipt, parseProgressEntry, progressEntryForPending, QUIZ_OUTBOX_LIMIT, receiptThrough, type ProgressEntry } from './progress';
import { normalizeOwnerKey, serializeSnapshot, snapshotKey, validateSnapshot } from './snapshot';
import type { ActiveSession, ClockStamp, CommitFailure } from './types';

export const MASTER_STATS_KEY = 'hirachan_master_stats_v1';
export const STATS_OWNER_KEY = 'astra_quiz_stats_owner_v1';
export const LOCAL_OWNER_KEY = 'astra_quiz_local_owner_v1';
const LEASE_MS = 15_000;

export interface StatsBinding {
  readonly owner: string;
  readonly backupUpload?: string;
}
export type StorageResult<T> = { ok: true; value: T } |
  { ok: false; reason: 'unavailable' | 'quota' | 'invalid' | 'limit' | 'conflict'; message: string };
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const ok = <T>(value: T): StorageResult<T> => ({ ok: true, value });
const fail = (reason: Extract<StorageResult<never>, { ok: false }>['reason'], message: string): StorageResult<never> => ({ ok: false, reason, message });
function accessError(error: unknown): StorageResult<never> {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'QuotaExceededError'
    ? fail('quota', 'Device storage is full.') : fail('unavailable', 'Device storage is unavailable.');
}
const ownerSuffix = (owner: string) => encodeURIComponent(normalizeOwnerKey(owner));
export const outboxKey = (owner: string) => `astra_quiz_outbox_v1:${ownerSuffix(owner)}`;
export const activeLeaseKey = (owner: string) => `astra_quiz_active_v1:${ownerSuffix(owner)}`;
export const customQuizKey = (owner: string) => `astra_quiz_custom_v1:${ownerSuffix(owner)}`;

function parseBinding(raw: string | null): StatsBinding | 'transition' | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StatsBinding> | null;
    if (!value || typeof value.owner !== 'string') return 'transition';
    const owner = normalizeOwnerKey(value.owner);
    return typeof value.backupUpload === 'string' && value.backupUpload.length <= 128
      ? { owner, backupUpload: value.backupUpload } : { owner };
  } catch { return 'transition'; }
}

type Lease = { tab: string; session: string; expires: number };
function readLease(raw: string | null, now: number): Lease | null {
  if (!raw) return null;
  const value = JSON.parse(raw) as Partial<Lease> | null;
  if (!value || typeof value.tab !== 'string' || typeof value.session !== 'string' ||
    typeof value.expires !== 'number' || !Number.isFinite(value.expires)) throw new Error('Invalid quiz tab lease');
  // A large backward clock jump cannot lock this device out indefinitely.
  return value.expires > now && value.expires <= now + LEASE_MS * 2 ? value as Lease : null;
}

function cleanCustomIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((value): value is string => typeof value === 'string' && isSafeKey(value) &&
    /^[hkvjw]_(?:[0-9a-f]{2})+$/u.test(value)))].slice(0, 256);
}

export function createQuizStorage(getStorage: () => StorageAccess = () => window.localStorage) {
  function useStorage<T>(action: (storage: StorageAccess) => StorageResult<T>): StorageResult<T> {
    try { return action(getStorage()); } catch (error) { return accessError(error); }
  }
  function readOutbox(owner: string): StorageResult<ProgressEntry[]> {
    return useStorage(storage => {
      const raw = storage.getItem(outboxKey(owner));
      if (!raw) return ok([]);
      try {
        const wire = JSON.parse(raw) as { version?: unknown; owner?: unknown; entries?: unknown };
        if (wire.version !== 1 || wire.owner !== owner || !Array.isArray(wire.entries) || wire.entries.length > QUIZ_OUTBOX_LIMIT) {
          return fail('invalid', 'Quiz cloud queue is invalid. Its records were retained.');
        }
        const entries: ProgressEntry[] = [];
        const through = new Map<string, number>();
        for (const rawEntry of wire.entries) {
          const entry = parseProgressEntry(rawEntry);
          if (!entry) return fail('invalid', 'Quiz cloud queue contains an invalid record.');
          const old = through.get(entry.record.sessionId);
          if (old !== undefined && entry.record.seq !== old + 1) return fail('invalid', 'Quiz cloud queue contains a sequence gap.');
          through.set(entry.record.sessionId, entry.record.seq);
          entries.push(entry);
        }
        return ok(entries);
      } catch { return fail('invalid', 'Quiz cloud queue could not be read.'); }
    });
  }
  function writeOutbox(owner: string, entries: readonly ProgressEntry[]): StorageResult<void> {
    return useStorage(storage => {
      if (entries.length) storage.setItem(outboxKey(owner), JSON.stringify({ version: 1, owner, entries }));
      else storage.removeItem(outboxKey(owner));
      return ok(undefined);
    });
  }
  function writeStats(stats: StudentStats, binding?: StatsBinding, observed?: StudentStats | null): StorageResult<void> {
    return useStorage(storage => {
      const raw = JSON.stringify(stats);
      const wanted = binding ? JSON.stringify(binding) : null;
      const storedBinding = storage.getItem(STATS_OWNER_KEY);
      const rebind = wanted !== null && storedBinding !== wanted;
      const previous = parseBinding(storedBinding);
      if (observed !== undefined && previous !== 'transition' && previous?.owner === binding?.owner) {
        const disk = storage.getItem(MASTER_STATS_KEY);
        if (disk && hasUnseenQuizReceipt(JSON.parse(disk), observed)) {
          return fail('conflict', 'Device progress changed in another tab. Reload before saving.');
        }
      }
      if (rebind) storage.setItem(STATS_OWNER_KEY, 'null');
      storage.setItem(MASTER_STATS_KEY, raw);
      if (rebind) storage.setItem(STATS_OWNER_KEY, wanted);
      return ok(undefined);
    });
  }
  return {
    readStats: () => useStorage(storage => {
      const raw = storage.getItem(MASTER_STATS_KEY);
      try {
        const value = raw ? JSON.parse(raw) as StudentStats | null : null;
        if (raw && (!value || typeof value.xp !== 'number' || !Number.isFinite(value.xp))) return fail('invalid', 'Saved progress could not be read.');
        return ok(value);
      } catch { return fail('invalid', 'Saved progress could not be read.'); }
    }),
    readBinding: () => useStorage(storage => ok(parseBinding(storage.getItem(STATS_OWNER_KEY)))),
    writeStats,
    acknowledgeBackupUpload: (binding: StatsBinding) => useStorage(storage => {
      if (storage.getItem(STATS_OWNER_KEY) === JSON.stringify(binding)) {
        storage.setItem(STATS_OWNER_KEY, JSON.stringify({ owner: binding.owner }));
        return ok(true);
      }
      return ok(false);
    }),
    localOwner: (newId: string) => useStorage(storage => {
      const existing = storage.getItem(LOCAL_OWNER_KEY);
      if (existing?.startsWith('local:')) {
        try { return ok(normalizeOwnerKey(existing)); } catch { /* replace corrupt owner */ }
      }
      const owner = normalizeOwnerKey(`local:${newId}`);
      storage.setItem(LOCAL_OWNER_KEY, owner);
      return ok(owner);
    }),
    readSnapshot: (owner: string, clock: ClockStamp) => useStorage(storage => {
      const raw = storage.getItem(snapshotKey(owner));
      if (!raw) return ok(null);
      const result = validateSnapshot(raw, owner, clock);
      return result.ok === true ? ok(result.state) : fail('invalid', result.message);
    }),
    writeSnapshot: (state: ActiveSession, owner: string, clock: ClockStamp) => useStorage(storage => {
      let serialized: string;
      try { serialized = serializeSnapshot(state, owner, clock); }
      catch { return fail('limit', 'This practice could not be checkpointed.'); }
      storage.setItem(snapshotKey(owner), serialized);
      return ok(undefined);
    }),
    removeSnapshot: (owner: string) => useStorage(storage => { storage.removeItem(snapshotKey(owner)); return ok(undefined); }),
    readOutbox,
    appendOutbox: (owner: string, incoming: readonly ProgressEntry[]): StorageResult<void> => {
      if (!incoming.length) return ok(undefined);
      const found = readOutbox(owner);
      if (found.ok === false) return found;
      const entries = found.value;
      const bySession = new Map<string, ProgressEntry[]>();
      for (const entry of entries) {
        const id = entry.record.sessionId;
        if (!bySession.has(id)) bySession.set(id, []);
        bySession.get(id)!.push(entry);
      }
      let changed = false;
      for (const input of incoming) {
        const entry = parseProgressEntry(input);
        if (!entry) return fail('invalid', 'Invalid quiz record. Progress was not queued.');
        const id = entry.record.sessionId;
        const batch = bySession.get(id) ?? [];
        const existing = batch.find(row => row.record.seq === entry.record.seq);
        if (existing) {
          if (JSON.stringify(existing) !== JSON.stringify(entry)) return fail('invalid', 'Conflicting quiz record.');
          continue;
        }
        const previous = batch.at(-1);
        if (previous && previous.record.seq + 1 !== entry.record.seq) return fail('invalid', 'Quiz cloud queue contains a sequence gap.');
        if (entries.length >= QUIZ_OUTBOX_LIMIT) return fail('limit', 'Quiz cloud queue is full. Sync pending records before adding more.');
        batch.push(entry);
        bySession.set(id, batch);
        entries.push(entry);
        changed = true;
      }
      return changed ? writeOutbox(owner, entries) : ok(undefined);
    },
    acknowledgeOutbox: (owner: string, payload: StudentStats): StorageResult<void> => {
      const found = readOutbox(owner);
      if (found.ok === false) return found;
      const keep = new Set(found.value.filter(entry => entry.record.seq > receiptThrough(payload, entry.record.sessionId))
        .map(entry => entry.record.sessionId));
      const remaining = found.value.filter(entry => keep.has(entry.record.sessionId));
      return remaining.length === found.value.length ? ok(undefined) : writeOutbox(owner, remaining);
    },
    replaceFromBackup: (stats: StudentStats, binding: StatsBinding) => useStorage(storage => {
      const keys = [snapshotKey(binding.owner), outboxKey(binding.owner), MASTER_STATS_KEY, STATS_OWNER_KEY];
      const before = keys.map(key => storage.getItem(key));
      try {
        storage.removeItem(keys[0]);
        storage.removeItem(keys[1]);
        const result = writeStats(stats, binding);
        if (result.ok === true) return result;
        for (const [index, key] of keys.entries()) {
          if (before[index] === null) storage.removeItem(key);
          else storage.setItem(key, before[index]!);
        }
        return result;
      } catch (error) {
        for (const [index, key] of keys.entries()) {
          try { if (before[index] === null) storage.removeItem(key); else storage.setItem(key, before[index]!); }
          catch { /* best effort under denied storage */ }
        }
        return accessError(error);
      }
    }),
    leaseAvailable: (owner: string, tab: string, now: number) => useStorage(storage => {
      const lease = readLease(storage.getItem(activeLeaseKey(owner)), now);
      return !lease || lease.tab === tab ? ok(undefined) : fail('conflict', 'Practice is open in another tab.');
    }),
    claimLease: (owner: string, tab: string, session: string, now: number) => useStorage(storage => {
      const key = activeLeaseKey(owner);
      const lease = readLease(storage.getItem(key), now);
      if (lease && lease.tab !== tab) return fail('conflict', 'Practice is open in another tab.');
      storage.setItem(key, JSON.stringify({ tab, session, expires: now + LEASE_MS }));
      return readLease(storage.getItem(key), now)?.tab === tab ? ok(undefined) : fail('conflict', 'Practice is open in another tab.');
    }),
    releaseLease: (owner: string, tab: string, now: number) => useStorage(storage => {
      const key = activeLeaseKey(owner);
      if (readLease(storage.getItem(key), now)?.tab === tab) storage.removeItem(key);
      return ok(undefined);
    }),
    readCustom: (owner: string) => useStorage(storage => {
      const raw = storage.getItem(customQuizKey(owner));
      try { return ok(raw ? cleanCustomIds(JSON.parse(raw)) : []); }
      catch { return fail('invalid', 'Custom quiz selection could not be read.'); }
    }),
    writeCustom: (owner: string, ids: readonly string[]) => useStorage(storage => {
      const clean = cleanCustomIds(ids);
      if (clean.length) storage.setItem(customQuizKey(owner), JSON.stringify(clean));
      else storage.removeItem(customQuizKey(owner));
      return ok(undefined);
    }),
  };
}

export type QuizStorage = ReturnType<typeof createQuizStorage>;
export const quizBrowserStorage = createQuizStorage();

/** Make the complete unacknowledged suffix recoverable before React applies the oldest record. */
export function prepareQuizCommit(store: QuizStorage, owner: string, cloud: boolean, state: ActiveSession, clock: ClockStamp):
  { ok: true; entries: ProgressEntry[] } | { ok: false; failure: CommitFailure; message: string } {
  const saved = store.writeSnapshot(state, owner, clock);
  if (saved.ok === false) return { ok: false, failure: 'snapshot', message: saved.message };
  let entries: ProgressEntry[];
  try { entries = unacknowledgedProgress(state); }
  catch { return { ok: false, failure: 'unavailable', message: 'The quiz record could not be verified.' }; }
  if (cloud) {
    const durable = store.readStats();
    const binding = store.readBinding();
    const covered = durable.ok === true && durable.value && binding.ok === true && binding.value !== 'transition' && binding.value?.owner === owner
      ? durable.value : null;
    const appended = store.appendOutbox(owner, entries.filter(entry => !covered || receiptThrough(covered, entry.record.sessionId) < entry.record.seq));
    if (appended.ok === false) return { ok: false, failure: 'outbox', message: appended.message };
  }
  return { ok: true, entries };
}

export function unacknowledgedProgress(state: ActiveSession): ProgressEntry[] {
  const pending = state.pending;
  if (!pending) return [];
  return state.records.slice(state.acknowledgedSeq).map(record =>
    progressEntryForPending({ ...state, pending: { ...pending, record } }));
}

/** Recover the crash window between the snapshot write and account outbox append. */
export function readHydrationJournal(store: QuizStorage, owner: string, baseline: StudentStats, clock: ClockStamp):
  StorageResult<{ entries: ProgressEntry[]; activeSessions: ReadonlySet<string> }> {
  const snapshot = store.readSnapshot(owner, clock);
  if (snapshot.ok === false && snapshot.reason !== 'invalid') return snapshot;
  const active = snapshot.ok === true ? snapshot.value : null;
  if (active?.pending) {
    let entries: ProgressEntry[];
    try { entries = unacknowledgedProgress(active); }
    catch { return fail('invalid', 'The pending quiz record could not be verified.'); }
    const appended = store.appendOutbox(owner, entries.filter(entry =>
      entry.record.seq > receiptThrough(baseline, entry.record.sessionId)));
    if (appended.ok === false) return appended;
  }
  const outbox = store.readOutbox(owner);
  if (outbox.ok === false) return outbox;
  return ok({ entries: outbox.value, activeSessions: new Set(active ? [active.config.sessionId] : []) });
}

export interface CloudSaveRequest {
  readonly binding: StatsBinding;
  readonly stats: StudentStats;
}

/** A single writer with one replaceable queued payload, shared across account boundaries. */
export function createCloudSaveQueue(
  write: (request: CloudSaveRequest) => Promise<void>,
  acknowledge: (request: CloudSaveRequest) => void,
  onError: (error: unknown, request: CloudSaveRequest) => void,
  waitMs = 700,
  retryMs = 5000,
) {
  let queued: CloudSaveRequest | null = null;
  let inFlight: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  const cancelTimer = () => { if (timer !== null) clearTimeout(timer); timer = null; };
  const schedule = (delay: number) => {
    cancelTimer();
    timer = setTimeout(() => { timer = null; void flush(); }, delay);
  };
  function flush(): Promise<void> {
    if (inFlight || !queued) return inFlight ?? Promise.resolve();
    cancelTimer();
    const request = queued;
    const run = generation;
    queued = null;
    let failed = false;
    inFlight = Promise.resolve().then(() => generation === run ? write(request) : undefined).then(() => {
      if (generation === run) acknowledge(request);
    }).catch(error => {
      if (generation !== run) return;
      failed = true;
      if (!queued) queued = request;
      onError(error, request);
    }).finally(() => {
      inFlight = null;
      if (queued && timer === null) schedule(failed ? retryMs : 0);
    });
    return inFlight;
  }
  return {
    enqueue(request: CloudSaveRequest) { queued = request; schedule(waitMs); },
    flush,
    cancel() { generation++; queued = null; cancelTimer(); },
    drained() { return inFlight ?? Promise.resolve(); },
  };
}
