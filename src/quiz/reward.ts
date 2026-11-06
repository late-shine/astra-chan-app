import { QUESTION_KINDS, freeze, type RewardBreakdown, type RewardContext } from './types';

/** Version 1 only. No elapsed-time multiplier, XP subtraction or UI side effects. */
export function rewardFor(context: RewardContext): RewardBreakdown {
  if (!['practice', 'timed', 'survival', 'repair', 'duel'].includes(context.origin)) throw new RangeError('Unknown reward origin');
  if (context.type === 'completion') {
    if (!Number.isSafeInteger(context.uniqueFirstPassCount) || context.uniqueFirstPassCount < 0) throw new RangeError('Invalid completion target count');
    const completion = context.complete && ['practice', 'timed'].includes(context.origin) && context.uniqueFirstPassCount >= 10 ? 20 : 0;
    return freeze({ base: 0, challenge: 0, completion, total: completion });
  }
  if (!QUESTION_KINDS.includes(context.kind) || !context.kind.startsWith(context.subject === 'vocab' ? 'vocab-' : `${context.subject}-`)
    || !['correct', 'wrong', 'timeout', 'unattempted'].includes(context.outcome)) throw new RangeError('Invalid reward target/outcome');
  const tier = context.challenge ?? 'steady';
  const difficulty = context.difficulty ?? 'medium';
  if (!['steady', 'quick', 'lightning'].includes(tier) || !['easy', 'medium', 'hard', 'superhard'].includes(difficulty)) throw new RangeError('Invalid reward tier');
  if ((context.origin === 'timed' && tier === 'lightning' || context.origin === 'duel' && difficulty === 'superhard') && context.subject !== 'kana') throw new RangeError('Fastest tier is kana only');
  if (context.origin === 'survival' && (context.subject !== 'kana' || context.kind === 'kana-type')) throw new RangeError('Survival is kana choice only');
  if (context.outcome !== 'correct') return freeze({ base: 0, challenge: 0, completion: 0, total: 0 });
  const base = context.origin === 'repair' ? 5 : context.kind === 'kana-type' ? 25 : 15;
  const challenge = context.origin === 'timed' ? { steady: 0, quick: 5, lightning: 10 }[tier]
    : context.origin === 'duel' ? { easy: 0, medium: 0, hard: 5, superhard: 10 }[difficulty] : 0;
  return freeze({ base, challenge, completion: 0, total: base + challenge });
}
