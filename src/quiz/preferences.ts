import type { VocabCategory } from '../types';
import { VOCAB_CATEGORY_META } from '../vocab/vocabCategories';
import type { ChallengeTier, KanaStage, Subject } from './types';

export interface QuizPreferences {
  quizSubject: Subject;
  quizLength: 5 | 10 | 20 | 30;
  quizAutoNext: boolean;
  quizKanaKind: 'read' | 'pick' | 'type' | 'mixed';
  quizVocabKind: 'meaning' | 'reading' | 'reverse' | 'mixed';
  quizKanjiKind: 'meaning' | 'on' | 'kun' | 'word' | 'mixed';
  quizKanaScript: 'hiragana' | 'katakana' | 'both';
  quizKanaStagesMask: number;
  quizVocabPool: 'recommended' | 'all' | 'learned' | `theme:${VocabCategory}`;
  quizKanjiPool: 'recommended' | 'all' | 'studied';
  quizChoiceCount: 4 | 6;
  quizChallengeTier: ChallengeTier;
}

export const DEFAULT_QUIZ_PREFERENCES: Readonly<QuizPreferences> = Object.freeze({
  quizSubject: 'kana', quizLength: 10, quizAutoNext: true, quizKanaKind: 'read',
  quizVocabKind: 'meaning', quizKanjiKind: 'meaning', quizKanaScript: 'hiragana',
  quizKanaStagesMask: 1, quizVocabPool: 'recommended', quizKanjiPool: 'recommended',
  quizChoiceCount: 4, quizChallengeTier: 'steady',
});
export const QUIZ_PREFERENCE_KEYS = Object.keys(DEFAULT_QUIZ_PREFERENCES) as (keyof QuizPreferences)[];
export const QUIZ_STORAGE_KEYS: Record<keyof QuizPreferences, string> = {
  quizSubject: 'astra_quiz_subject', quizLength: 'astra_quiz_length', quizAutoNext: 'astra_quiz_auto_next',
  quizKanaKind: 'astra_quiz_kana_kind', quizVocabKind: 'astra_quiz_vocab_kind', quizKanjiKind: 'astra_quiz_kanji_kind',
  quizKanaScript: 'astra_quiz_kana_script', quizKanaStagesMask: 'astra_quiz_kana_stages',
  quizVocabPool: 'astra_quiz_vocab_pool', quizKanjiPool: 'astra_quiz_kanji_pool',
  quizChoiceCount: 'astra_quiz_choices', quizChallengeTier: 'astra_quiz_challenge_tier',
};
const options: Partial<Record<keyof QuizPreferences, readonly unknown[]>> = {
  quizSubject: ['kana', 'vocab', 'kanji'],
  quizLength: [5, 10, 20, 30],
  quizKanaKind: ['read', 'pick', 'type', 'mixed'],
  quizVocabKind: ['meaning', 'reading', 'reverse', 'mixed'],
  quizKanjiKind: ['meaning', 'on', 'kun', 'word', 'mixed'],
  quizKanaScript: ['hiragana', 'katakana', 'both'],
  quizVocabPool: ['recommended', 'all', 'learned', ...VOCAB_CATEGORY_META.map(category => `theme:${category.id}`)],
  quizKanjiPool: ['recommended', 'all', 'studied'],
  quizChoiceCount: [4, 6],
  quizChallengeTier: ['steady', 'quick', 'lightning'],
};

export function validateQuizPreference(key: keyof QuizPreferences, value: unknown): QuizPreferences[keyof QuizPreferences] | undefined {
  if (key === 'quizAutoNext') return typeof value === 'boolean' ? value : undefined;
  if (key === 'quizKanaStagesMask') return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 15 ? value : undefined;
  return options[key]?.includes(value) ? value as QuizPreferences[keyof QuizPreferences] : undefined;
}

export function parseQuizPreferenceString(key: keyof QuizPreferences, raw: string): unknown {
  if (key === 'quizAutoNext') return raw === 'true' ? true : raw === 'false' ? false : undefined;
  if (key === 'quizLength' || key === 'quizChoiceCount' || key === 'quizKanaStagesMask') {
    return /^\d{1,2}$/u.test(raw) ? Number(raw) : undefined;
  }
  return raw;
}

export function pickQuizPreferences(values: QuizPreferences): QuizPreferences {
  return Object.fromEntries(QUIZ_PREFERENCE_KEYS.map(key => [key, values[key]])) as unknown as QuizPreferences;
}

const STAGES: readonly KanaStage[] = ['basic', 'dakuon', 'handakuon', 'yoon'];
export function quizKanaStages(mask: number): KanaStage[] {
  const safeMask = validateQuizPreference('quizKanaStagesMask', mask) ?? 1;
  return STAGES.filter((_, index) => (Number(safeMask) & (1 << index)) !== 0);
}
