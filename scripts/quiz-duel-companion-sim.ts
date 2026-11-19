/** Local presentation edge checks. No browser, Firebase, clocks, or network calls. */
import assert from 'node:assert/strict';
import { advanceDuelCompanion, type DuelCompanionSnapshot, type DuelCompanionState } from '../src/quiz/duelCompanion';

let passed = 0;
function check(name: string, assertion: unknown) { assert.ok(assertion, name); passed += 1; }
const entry: DuelCompanionSnapshot = {
  uid: 'host', code: '', matchId: null, status: 'entry', role: 'host', guestId: null,
  revision: 0, mode: 'competitive', bothReady: false, connected: true, opponentDisconnected: false,
  connectionError: false, saveError: false, savePending: false, learningEligible: true, speechEnabled: true,
  partial: false, winner: null,
};
const waiting: DuelCompanionSnapshot = { ...entry, code: 'ABC123', matchId: 'match-1', status: 'waiting', revision: 1 };
const step = (state: DuelCompanionState, patch: Partial<DuelCompanionSnapshot>) => advanceDuelCompanion(state, { ...state.snapshot, ...patch });

let state = advanceDuelCompanion(null, entry);
check('lobby entry has one finite reveal', state.view.expression === 'welcome' && !!state.view.revealId);
const initial = state;
for (let i = 0; i < 100; i++) state = advanceDuelCompanion(state, { ...entry });
check('clock ticks, heartbeats, and equivalent rerenders retain the same view/state', state === initial);

state = advanceDuelCompanion(state, waiting);
check('room attachment uses the current waiting situation without historical replay', state.view.expression === 'focused' && !state.view.revealId);
state = step(state, { guestId: 'guest' });
check('observed guest arrival greets the waiting host', state.view.speech.startsWith('Your friend is here') && !!state.view.revealId);
const joined = state;
state = step(state, {});
check('guest arrival does not repeat on an equivalent snapshot', state === joined);
state = step(state, { bothReady: true });
check('confirmed both-ready interrupts the joined reveal', state.view.expression === 'encouraging' && state.view.revealId !== joined.view.revealId && state.view.speech.includes('Start whenever'));
const ready = state;

state = step(state, { revision: 2, mode: 'parallel', bothReady: false });
check('applied mode revision replaces a stale ready line', state.view.expression === 'welcome' && state.view.speech.startsWith('The same set') && state.view.revealId !== ready.view.revealId);
const mode = state;
state = step(state, {});
check('local edits and sheet toggles are absent from inputs and cannot repeat mode copy', state === mode);
state = step(state, { bothReady: true });
check('both-ready may occur again on a new revision', state.view.revealId !== ready.view.revealId && state.view.speech.startsWith('Both ready'));
state = step(state, { revision: 3, bothReady: false });
check('same-mode settings changes clear old both-ready copy', !state.view.speech.startsWith('Both ready') && !state.view.revealId);
state = step(state, { revision: 4, mode: 'competitive' });
check('competitive mode uses the approved focused reaction', state.view.expression === 'focused' && state.view.speech.startsWith('A race for each question'));

state = advanceDuelCompanion(null, waiting);
state = step(state, { guestId: 'guest', bothReady: true });
check('both-ready has priority over a simultaneous guest-arrival edge', state.view.speech.startsWith('Both ready'));
state = step(state, { bothReady: false });
state = step(state, { bothReady: true });
check('duplicate ready acknowledgement at the same revision does not replay', !state.view.revealId);

state = advanceDuelCompanion(null, waiting);
state = step(state, { connected: false, guestId: 'guest', bothReady: true });
check('disconnection suppresses coincident celebration', state.view.expression === 'focused' && !state.view.revealId && !state.view.speech.startsWith('Both ready'));
state = step(state, { connected: true });
check('reconnection shows current confirmed readiness without queued events', state.view.speech.startsWith('Both ready') && !state.view.revealId);
state = step(state, { connected: false, revision: 2, mode: 'parallel', bothReady: false });
state = step(state, { connected: true });
check('mode changes while disconnected do not replay later', !state.view.speech.startsWith('The same set') && !state.view.revealId);
state = step(state, { opponentDisconnected: true, bothReady: true });
check('confirmed opponent disconnection suppresses ready celebration', state.view.speech.includes('friend reconnects') && !state.view.revealId);
state = step(state, { opponentDisconnected: false });
check('opponent reconnection resumes current state without replay', state.view.speech.startsWith('Both ready') && !state.view.revealId);

state = advanceDuelCompanion(null, { ...waiting, guestId: 'guest', bothReady: true });
check('restoring a ready room is static and current', state.view.speech.startsWith('Both ready') && !state.view.revealId);
state = advanceDuelCompanion(null, { ...waiting, uid: 'guest', role: 'guest', guestId: 'guest' });
check('fresh or restored guest gets a present-tense greeting, not a historical join claim', state.view.speech.startsWith("You're both here") && !state.view.revealId);
state = step(state, { bothReady: true });
check('guest both-ready copy leaves the start action with the host', state.view.speech.includes('Your host can begin') && !!state.view.revealId);

state = advanceDuelCompanion(null, waiting);
state = step(state, { speechEnabled: false });
state = step(state, { guestId: 'guest', bothReady: true });
check('speech off consumes events without speech or reveal timers', state.view.speech === '' && !state.view.revealId);
state = step(state, { speechEnabled: true });
check('turning speech back on does not replay old events', state.view.speech.startsWith('Both ready') && !state.view.revealId);

state = advanceDuelCompanion(null, waiting);
state = step(state, { saveError: true, guestId: 'guest', bothReady: true });
check('save failures replace misleading celebration', state.view.expression === 'intro' && !state.view.revealId);
state = step(state, { saveError: false });
check('repairing a save does not replay suppressed events', state.view.speech.startsWith('Both ready') && !state.view.revealId);
state = step(state, { savePending: true });
check('pending lobby saves do not invite starting immediately', state.view.speech.includes('saving') && !state.view.revealId);
state = step(state, { savePending: false, connectionError: true });
check('controller errors suppress celebration without claiming every error is connectivity', state.view.speech.includes('room notice') && !state.view.revealId);

state = step(state, { uid: 'another-user', role: 'guest', connectionError: false });
check('changing the local user cancels the old reveal and event ledger', !state.view.revealId && state.scope !== ready.scope);
state = step(state, { matchId: 'match-2', revision: 1, bothReady: false });
state = step(state, { bothReady: true });
check('a rematch owns a new ready edge even if revision numbering repeats', !!state.view.revealId && state.view.revealId.includes('match-2'));
state = step(state, { status: 'playing' });
const playing = state.view;
state = step(state, { savePending: true });
check('ordinary active-question saves keep the attentive expression and text', state.view.expression === playing.expression && state.view.speech === playing.speech && !state.view.revealId);
state = step(state, { status: 'finished', partial: true, winner: null, savePending: false });
check('interrupted results never use a victory expression or claim completion', state.view.expression === 'intro' && !state.view.speech.includes('complete'));
state = step(state, { partial: false, winner: 'guest' });
check('complete results use existing artwork and no invented reward copy', state.view.expression === 'pleased' && state.view.speech.includes('shared set, complete'));
state = advanceDuelCompanion(state, entry);
check('leaving a room cancels its dialogue and starts the entry context', state.view.speech.startsWith('Shall we open') && state.view.revealId !== ready.view.revealId);
check('input snapshot stays unchanged', waiting.guestId === null && waiting.revision === 1);
state = advanceDuelCompanion(null, {...waiting, guestId:'guest', bothReady:true, learningEligible:false});
check('an unenrolled local player does not receive a misleading Start invitation', state.view.speech.includes('learning status') && !state.view.revealId);
state = step(state, {learningEligible:true});
check('learning enrollment shows current readiness without replaying its old edge', state.view.speech.startsWith('Both ready') && !state.view.revealId);
console.log(`Duel companion: ${passed} local event checks passed.`);
