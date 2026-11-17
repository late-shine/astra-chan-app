import { useState } from 'react';
import type { QuizCompanionView } from '../components/quiz/viewTypes';
import type { SoloSubject } from './soloSetup';

const LINES = {
  arrival: ['What shall we work on today?', 'A little kana, some words, or a few kanji?', 'Three paths for today. Where shall we begin?'],
  kana: ['Kana it is. Let’s find a rhythm with these characters.', 'A little kana together? Choose how you’d like to practise.', 'Welcome to kana. We can take it one character at a time.'],
  vocab: ['Words today? Let’s find a few you’d like to know better.', 'A little vocabulary together. Which way shall we practise?', 'Words it is. We can begin here, or choose a particular group.'],
  kanji: ['Kanji it is. Shall we explore meanings or readings?', 'A few kanji together. Choose what you’d like to focus on.', 'Welcome to kanji practice. We’ll take these one at a time.'],
};
let visits = 0;

/** Presentation only. Never dispatches a session, saves preferences, or gates Start. */
export function usePracticeArrival(owner: string | null, subject: SoloSubject, quiet: boolean,
  resume?: { subject: string; results: boolean }) {
  const [visit] = useState(() => visits++);
  const [arrival, setArrival] = useState({ owner, sequence: 0 });
  const sequence = arrival.owner === owner ? arrival.sequence : 0;
  const entered = sequence > 0;
  const context = entered ? subject : 'arrival';
  const speech = resume
    ? resume.results ? `Your ${resume.subject} results are ready. Shall we take a look?`
      : `Your ${resume.subject} round is waiting. Shall we pick up where you left off?`
    : LINES[context][(visit + sequence) % LINES[context].length];
  const id = `${owner ?? 'local'}:${visit}:${sequence}:${context}:${resume ? `${resume.subject}:${resume.results}` : 'new'}`;
  const companion: QuizCompanionView = {
    expression: resume || entered ? 'welcome' : 'focused',
    speech: quiet ? '' : speech,
    revealId: id,
  };
  return { entered, id, companion, arrive: () => setArrival(previous => ({ owner,
    sequence: previous.owner === owner ? previous.sequence + 1 : 1 })) };
}
