import { deckKey, UNLIMITED_REVIEWS } from '../srsScheduler';
import { compareText, occurrenceId } from './ids';
import { poolHistory } from './pool';
import { questionTargetKey } from './session';
import { soloSubjectLabel } from './soloSetup';
import { summarize } from './summary';
import { freeze, SESSION_LIMITS, type ActiveSession, type BuildConfig, type Catalogs, type DeckTarget, type Question, type QuizHistory } from './types';

export function recommend(catalogs: Catalogs, config: BuildConfig, history: QuizHistory) {
  const {report,buckets,recentMisses} = poolHistory(catalogs,config,history);
  const oversized = report.eligibleTargets > SESSION_LIMITS.questions && config.length === SESSION_LIMITS.questions;
  const count = Math.min(config.length,report.eligibleTargets);
  return {count,report,needsSetup:!count||oversized||report.requiresFourChoiceAcknowledgement,
    summary:`${oversized ? report.eligibleTargets : count} questions · ${soloSubjectLabel(config.subject)} · Untimed`,
    note:!count ? 'No targets match these settings. Choose another pool or question type.'
      : oversized ? 'This All pool exceeds the recovery limit. Choose a shorter length or a smaller pool.'
      : recentMisses ? 'A little extra practice on recent mistakes.'
      : !buckets.weak&&!buckets.other ? 'Start with the basics.'
      : buckets.new ? 'A mix of new items and familiar practice.' : 'Keep familiar items fresh.'};
}

/** On reload a repair bank is itself proof of previously missed targets; never invent first-try numbers. */
export function remainingQuestions(session: ActiveSession, repairs: readonly ActiveSession[] = []): readonly Question[] {
  if (session.config.origin === 'repair') {
    const corrected = new Set(session.records.filter(r=>r.type==='answer'&&r.outcome==='correct').map(r=>r.type==='answer'?r.skillKey:''));
    return session.questions.filter(q=>!corrected.has(q.skillKey));
  }
  const remaining = new Set(summarize(session,repairs).remainingMisses.map(m=>m.skillKey));
  return session.questions.filter(q=>remaining.has(q.skillKey));
}

export function repairQuestions(questions: readonly Question[], sessionId: string): readonly Question[] {
  const seen = new Set<string>();
  const selected = questions.filter(q=>{const key=questionTargetKey(q);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,5);
  return freeze(selected.map((q,index)=>({...q,id:occurrenceId(sessionId,index)})));
}

export interface ReviewChoice { readonly id:string; readonly target:DeckTarget; readonly label:string; readonly present:boolean }
/** Rank by first-pass accuracy then recency, deduplicating actual SRS identity across kinds/roots. */
export function reviewChoices(questions: readonly Question[], history: QuizHistory, hasCard:(key:string,type:DeckTarget['type'])=>boolean): ReviewChoice[] {
  const ranked = [...questions].sort((a,b)=>{
    const left=history.skills?.[a.skillKey],right=history.skills?.[b.skillKey];
    const accuracy=(r:typeof left)=>r?.firstAttempts ? r.firstCorrect/r.firstAttempts : 0;
    return accuracy(left)-accuracy(right)||(right?.lastFirstMissAt??0)-(left?.lastFirstMissAt??0)||compareText(a.skillKey,b.skillKey);
  });
  const seen=new Set<string>();
  return ranked.flatMap(q=>{
    if(!q.deck)return [];
    const id=deckKey(q.deck.type,q.deck.itemKey);
    if(seen.has(id))return [];seen.add(id);
    return [{id,target:q.deck,label:`Add ${q.deck.itemKey} to Review Deck`,present:hasCard(q.deck.itemKey,q.deck.type)}];
  });
}
export const reviewBatch = (choices:readonly ReviewChoice[]) => choices.filter(c=>!c.present).slice(0,5);
export function reviewAddedCopy(count:number,dailyNewCap:number) {
  return dailyNewCap>=UNLIMITED_REVIEWS ? `Added ${count} to your Review Deck.` : dailyNewCap===0 ? `Added ${count}. New-card introductions are currently paused.`
    : `Added ${count}. Your Review Deck introduces up to ${dailyNewCap} new cards a day.`;
}
