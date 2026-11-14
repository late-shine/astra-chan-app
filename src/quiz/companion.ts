import { COMPANION_COPY, type CompanionCategory } from './companionCopy';
import type { AtelierExpression } from './atelierAssets';

export type CompanionRecord = { seq: number; outcome: 'correct' | 'wrong' | 'timeout' | 'unattempted' };
export interface CompanionInput {
  scope: string; records: readonly CompanionRecord[]; phase: 'entry' | 'asking' | 'feedback' | 'paused' | 'results' | 'committing';
  question: string; challenge: boolean; now: number; hidden?: boolean; explicitPause?: boolean; blocked?: boolean; quiet?: boolean;
  result?: { complete: boolean; accuracy: number | null };
}
export interface CompanionState {
  scope: string; seq: number; run: number; answered: number; triggers: number; lastSupport: number; pending: boolean;
  seed: number; bags: Partial<Record<CompanionCategory, number[]>>; recent: string[];
  speech: string; lineId: string; ordinaryAt: number; scene: string; expression: AtelierExpression; support: boolean;
}
export function createCompanion(seed = 1): CompanionState {
  return { scope: '', seq: 0, run: 0, answered: 0, triggers: 0, lastSupport: -Infinity, pending: false,
    seed: seed >>> 0, bags: {}, recent: [], speech: '', lineId: '', ordinaryAt: -Infinity, scene: '', expression: 'focused', support: false };
}
/** Pure shuffle-bag draw. State owns the PRNG, independent of engine randomness. */
export function drawCompanion(state: CompanionState, category: CompanionCategory): CompanionState {
  let seed = state.seed;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let bag = [...(state.bags[category] ?? [])];
  if (!bag.length) {
    bag = COMPANION_COPY[category].map((_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    // Prefer a fresh ID on refill, while exhausting every bag before a repeat.
    const fresh = bag.findIndex(i => !state.recent.includes(COMPANION_COPY[category][i].id));
    const different = bag.findIndex(i => COMPANION_COPY[category][i].id !== state.lineId);
    const first = fresh >= 0 ? fresh : different;
    if (first > 0) [bag[0], bag[first]] = [bag[first], bag[0]];
  }
  const line = COMPANION_COPY[category][bag.shift()!];
  return { ...state, seed, bags: { ...state.bags, [category]: bag }, lineId: line.id, speech: line.text,
    recent: [...state.recent, line.id].slice(-8) };
}
function accept(state: CompanionState, record: CompanionRecord): { state: CompanionState; category?: CompanionCategory } {
  if (!Number.isSafeInteger(record.seq) || record.seq <= state.seq || !['correct', 'wrong', 'timeout', 'unattempted'].includes(record.outcome)) return { state };
  let next = { ...state, seq: record.seq };
  if (record.outcome === 'unattempted') return { state: next };
  next = { ...next, answered: next.answered + 1 };
  if (record.outcome === 'correct') return { state: { ...next, run: 0, pending: false }, category: state.run >= 3 ? 'recovery' : 'correct' };
  next = { ...next, run: state.run + 1 };
  if (next.run === 3 && next.triggers < 2 && next.answered - next.lastSupport >= 5) {
    return { state: { ...next, triggers: next.triggers + 1, lastSupport: next.answered, pending: true }, category: 'support' };
  }
  return { state: next, category: record.outcome };
}
/** Input contains settled coarse records only. No raw response, answer, XP or clock command. */
export function advanceCompanion(previous: CompanionState, input: CompanionInput): CompanionState {
  const fresh = previous.scope !== input.scope;
  let state = fresh ? { ...createCompanion(previous.seed), scope: input.scope } : previous;
  let category: CompanionCategory | undefined;
  for (const record of [...input.records].sort((a, b) => a.seq - b.seq)) {
    const accepted = accept(state, record); state = accepted.state;
    if (accepted.category) category = accepted.category;
  }
  const scene = `${input.phase}:${input.question}`;
  const changed = scene !== state.scene;
  // Hydration reconstructs run/cap/cooldown but never replays historical answer speech/support.
  if (fresh) { category = input.records.length ? 'resume' : input.phase === 'entry' ? 'greeting' : 'neutral'; state = { ...state, pending: false }; }
  let expression: AtelierExpression = state.expression;
  let support = false;
  if (input.phase === 'asking') expression = 'focused';
  else if (input.phase === 'entry') expression = 'welcome';
  if (input.phase === 'paused') {
    expression = 'intro';
    if (changed && !fresh) category = 'pause';
    if (state.pending && state.run >= 3 && input.explicitPause && !input.hidden && !input.blocked) { category = 'support'; expression = 'trying'; support = true; state = { ...state, pending: false }; }
  } else if (input.phase === 'results') {
    const complete = input.result?.complete === true;
    expression = complete ? (input.result!.accuracy ?? 0) >= .8 ? 'celebrate' : 'encouraging' : 'intro';
    if (changed || fresh) category = complete ? expression === 'celebrate' ? 'result-strong' : 'result-mixed' : 'result-partial';
    state = { ...state, pending: false };
  } else if (category && ['correct','recovery','wrong','timeout','support'].includes(category)) {
    expression = category === 'correct' || category === 'recovery' ? 'pleased' : category === 'support' && !input.challenge ? 'trying' : 'encouraging';
    support = category === 'support' && !input.challenge;
    if (category === 'support' && input.challenge) category = undefined;
    else if (category === 'support') state = { ...state, pending: false };
  } else if (changed && previous.scene.startsWith('paused:') && !fresh) { category = 'resume'; expression = 'focused'; }
  if (input.phase === 'feedback' && !category && !changed) support = state.support;
  if (category === 'support' && !input.challenge && input.phase === 'feedback') support = true;
  // Once support activates in this miss run, hold its art until a correct answer.
  // Speech cooldown/cap and pause/results/challenge precedence remain independent.
  const holdingTrying = !input.challenge && state.run >= 3 && state.lastSupport > state.answered - state.run;
  if (holdingTrying && ['asking', 'feedback', 'committing'].includes(input.phase)) expression = 'trying';
  const ordinary = category === 'correct' || category === 'wrong' || category === 'timeout';
  if (category && !input.blocked && !input.hidden && !input.quiet && (!ordinary || input.now - state.ordinaryAt >= 4000)) {
    state = drawCompanion(state, category);
    if (ordinary) state = { ...state, ordinaryAt: input.now };
  }
  return { ...state, scene, expression: input.blocked ? 'intro' : expression, support: !input.blocked && !input.quiet && support };
}
export function companionView(state: CompanionState, quiet = false, blocked = false) {
  return { expression: blocked ? 'intro' as const : state.expression, speech: quiet || blocked ? '' : state.speech,
    support: !quiet && !blocked && state.support, lineId: state.lineId };
}
