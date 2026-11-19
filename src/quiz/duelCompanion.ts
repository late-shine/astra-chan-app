import type { QuizCompanionView } from '../components/quiz/viewTypes';
import type { DuelRole, DuelSettings } from './types';

/** Only confirmed, local presentation inputs. No clock, drafts, names, or shared writes. */
export interface DuelCompanionSnapshot {
  uid: string | null;
  code: string;
  matchId: string | null;
  status: 'entry' | 'waiting' | 'playing' | 'finished';
  role: DuelRole;
  guestId: string | null;
  revision: number;
  mode: DuelSettings['mode'];
  bothReady: boolean;
  connected: boolean;
  opponentDisconnected: boolean;
  connectionError: boolean;
  saveError: boolean;
  savePending: boolean;
  learningEligible: boolean;
  speechEnabled: boolean;
  partial: boolean;
  winner: DuelRole | 'tie' | null;
}

export interface DuelCompanionState {
  readonly snapshot: DuelCompanionSnapshot;
  readonly signature: string;
  readonly scope: string;
  readonly seen: ReadonlySet<string>;
  readonly serial: number;
  readonly view: QuizCompanionView;
}

function scopeOf(s: DuelCompanionSnapshot) {
  return JSON.stringify([s.uid, s.code, s.matchId]);
}

function blocked(s: DuelCompanionSnapshot) {
  return s.saveError || (s.status === 'waiting' && !s.learningEligible) || (s.savePending && (s.status === 'waiting' || s.status === 'finished'))
    || s.connectionError || (s.status !== 'entry' && !s.connected)
    || (s.opponentDisconnected && (s.status === 'waiting' || s.status === 'playing'));
}

function bothReadyView(s: DuelCompanionSnapshot): QuizCompanionView {
  return { expression: 'encouraging', speech: s.role === 'host'
    ? "Both ready. Start whenever you'd like."
    : 'Both ready. Your host can begin the set.' };
}

/** Current-state copy is deliberately not an arrival/reconnection announcement. */
function currentView(s: DuelCompanionSnapshot): QuizCompanionView {
  if (!s.uid) return { expression: 'intro', speech: '' };
  if (s.saveError) return { expression: 'intro', speech: "Let's check your learning save before we continue." };
  if (s.savePending && (s.status === 'waiting' || s.status === 'finished')) {
    return { expression: 'focused', speech: "Your learning progress is saving. I'll stay with you." };
  }
  if (s.connectionError) return { expression: 'focused', speech: "Let's check the room notice before we continue." };
  if (s.status !== 'entry' && !s.connected) {
    return { expression: 'focused', speech: "I'll stay here while we check the room connection." };
  }
  if (s.status === 'waiting' && !s.learningEligible) return { expression: 'focused', speech: "Let's check your learning status before we begin." };
  if (s.opponentDisconnected && (s.status === 'waiting' || s.status === 'playing')) {
    return { expression: 'focused', speech: "I'll stay with you while your friend reconnects." };
  }
  if (s.status === 'entry') return { expression: 'welcome', speech: 'Shall we open a room, or join a friend?' };
  if (s.status === 'playing') return { expression: 'focused', speech: "One question at a time. I'm here with you." };
  if (s.status === 'finished') {
    if (s.partial) return { expression: 'intro', speech: "We stopped here. Let's look at your confirmed answers." };
    return { expression: s.winner === s.role ? 'pleased' : 'encouraging', speech: "A shared set, complete. Let's look at what you've learned." };
  }
  if (s.bothReady) return bothReadyView(s);
  if (s.guestId) return { expression: 'pleased', speech: "You're both here. Shall we get ready?" };
  return { expression: 'focused', speech: "Your place is ready. I'll keep you company while we wait." };
}

function observedKeys(s: DuelCompanionSnapshot): string[] {
  if (s.status !== 'waiting') return [];
  return [
    `mode:${s.revision}:${s.mode}`,
    ...(s.guestId ? [`guest:${s.guestId}`] : []),
    ...(s.bothReady ? [`ready:${s.revision}`] : []),
  ];
}

/**
 * A pure edge reducer. It consumes suppressed events too: reconnecting, restoring,
 * re-enabling speech or fixing a save never queues historical celebration.
 * Initial room attachment is a current-state view because the controller does not
 * label restored versus freshly joined snapshots. Guest copy still welcomes both.
 */
export function advanceDuelCompanion(previous: DuelCompanionState | null, snapshot: DuelCompanionSnapshot): DuelCompanionState {
  const signature = JSON.stringify(snapshot);
  if (previous?.signature === signature) return previous;
  const scope = scopeOf(snapshot);
  const sameScope = previous?.scope === scope;
  const seen = new Set(sameScope ? previous.seen : []);
  let view = currentView(snapshot);
  let event: string | null = null;
  let serial = previous?.serial ?? 0;

  if ((!previous || !sameScope) && snapshot.status === 'entry' && snapshot.speechEnabled && !blocked(snapshot) && snapshot.uid) {
    event = 'entry';
  } else if (sameScope && previous && snapshot.status === 'waiting' && previous.snapshot.status === 'waiting'
    && snapshot.speechEnabled && previous.snapshot.speechEnabled && !blocked(snapshot) && !blocked(previous.snapshot)) {
    const before = previous.snapshot;
    const readyKey = `ready:${snapshot.revision}`;
    const guestKey = `guest:${snapshot.guestId}`;
    const modeKey = `mode:${snapshot.revision}:${snapshot.mode}`;
    // Both-ready wins when a single acknowledged snapshot contains several edges.
    if (snapshot.bothReady && (!before.bothReady || snapshot.revision !== before.revision) && !seen.has(readyKey)) {
      event = readyKey;
      view = bothReadyView(snapshot);
    } else if (snapshot.revision > before.revision && snapshot.mode !== before.mode && !seen.has(modeKey)) {
      event = modeKey;
      view = snapshot.mode === 'competitive'
        ? { expression: 'focused', speech: 'A race for each question. Ready for this new set?' }
        : { expression: 'welcome', speech: 'The same set, answered independently. Ready to begin?' };
    } else if (snapshot.guestId && snapshot.guestId !== before.guestId && !seen.has(guestKey)) {
      event = guestKey;
      view = { expression: 'pleased', speech: snapshot.role === 'host'
        ? 'Your friend is here. Shall we get ready?'
        : "You're both here. Shall we get ready?" };
    } else if (snapshot.revision === before.revision && snapshot.guestId === before.guestId && snapshot.bothReady === before.bothReady) {
      // An unrelated input must not replace or restart the current finite reveal.
      view = previous.view;
    }
  }

  if (event) {
    serial += 1;
    view = { ...view, revealId: `duel:${scope}:${serial}:${event}` };
  }
  if (!snapshot.speechEnabled) view = { expression: view.expression, speech: '' };
  for (const key of observedKeys(snapshot)) seen.add(key);
  return { snapshot, signature, scope, seen, serial, view };
}
