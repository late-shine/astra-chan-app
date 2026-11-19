import { useState } from 'react';
import { summarizeDuel } from './duel';
import { advanceDuelCompanion, type DuelCompanionSnapshot } from './duelCompanion';
import type { DuelSessionController } from './useDuelSession';
import type { DuelLearning } from './useDuelLearning';

/** Lives only for this screen/user/room. QuizCompanion owns and cleans up reveal timers. */
export function useDuelCompanion({ controller: c, learning, speechEnabled }: {
  controller: DuelSessionController;
  learning: DuelLearning;
  speechEnabled: boolean;
}) {
  const room = c.room;
  const result = room?.status === 'finished' ? summarizeDuel(room) : null;
  const snapshot: DuelCompanionSnapshot = {
    uid: c.uid,
    code: room ? c.code : '',
    matchId: room?.v2.matchId ?? null,
    status: room?.status ?? 'entry',
    role: room?.hostId === c.uid ? 'host' : 'guest',
    guestId: room?.guestId ?? null,
    revision: room?.v2.settingsRevision ?? 0,
    mode: room?.v2.settings.mode ?? 'competitive',
    bothReady: !!room?.guestId && (['host', 'guest'] as const).every(role => room?.v2.readiness?.[role]?.revision === room?.v2.settingsRevision),
    connected: c.connected,
    opponentDisconnected: !!c.view?.opponentDisconnected,
    connectionError: !!c.error,
    saveError: !!learning.error,
    savePending: learning.pending && !learning.volatile,
    learningEligible: learning.eligible,
    speechEnabled,
    partial: result?.partial ?? false,
    winner: result?.winner ?? null,
  };
  const [state, setState] = useState(() => advanceDuelCompanion(null, snapshot));
  const next = advanceDuelCompanion(state, snapshot);
  // Guarded same-component state adjustment avoids painting an old celebratory
  // line for one frame when connection/save state changes. No effect or timers.
  if (next !== state) setState(next);
  return next.view;
}
