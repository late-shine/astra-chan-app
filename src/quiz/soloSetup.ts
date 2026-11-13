import { quizBuildLength, quizKanaStages, type QuizPreferences } from './preferences';
import type { BuildConfig, QuestionKind } from './types';
export type SoloSubject = 'kana' | 'vocab' | 'kanji';
export const soloSubjectLabel = (subject: SoloSubject) => subject === 'vocab' ? 'Words' : subject === 'kanji' ? 'Kanji' : 'Kana';
export const isSoloCustomId = (id: string, subject: SoloSubject) => subject === 'vocab' ? id.startsWith('v_') : subject === 'kanji' ? /^[jw]_/.test(id) : /^[hk]_/.test(id);
export function soloConfig(preferences: QuizPreferences, subject: SoloSubject, mode: 'practice'|'timed'|'survival', kind: string,
  custom: readonly string[] | undefined, learnedWords: readonly string[], sessionId: string, now: number, studiedKanji: readonly string[] = []): BuildConfig {
  if (subject === 'kanji') {
    // Mixed stays isolated. Whole-word reading is an explicit, curated practice choice.
    const kinds: QuestionKind[] = kind === 'mixed' ? ['kanji-meaning','kanji-on','kanji-kun'] : [`kanji-${kind}` as QuestionKind];
    return { sessionId, now, subject, kinds, length: quizBuildLength(preferences.quizLength), choiceCount: 4,
      pool: custom ? {filter:'custom',itemIds:custom} : preferences.quizKanjiPool === 'studied' ? {filter:'studied',studiedKanji} : {filter:'all'} };
  }
  if (subject === 'vocab') {
    const kinds: QuestionKind[] = kind === 'mixed' ? ['vocab-meaning','vocab-reading','vocab-reverse'] : [`vocab-${kind}` as QuestionKind];
    const pool = preferences.quizVocabPool;
    return { sessionId, now, subject, kinds, length: quizBuildLength(preferences.quizLength), choiceCount: 4,
      pool: { ...(pool.startsWith('theme:') ? {category:pool.slice(6)} : {}),
        ...(custom ? {filter:'custom',itemIds:custom} : pool === 'learned' ? {filter:'learned',learnedWords} : {filter:'all'}) } };
  }
  const kinds: QuestionKind[] = kind === 'mixed' ? ['kana-read','kana-pick',...(mode === 'survival' ? [] : ['kana-type' as const])]
    : [mode === 'survival' && kind === 'type' ? 'kana-read' : `kana-${kind}` as QuestionKind];
  return {sessionId,now,subject,kinds,length:quizBuildLength(preferences.quizLength),choiceCount:preferences.quizChoiceCount,
    pool:{script:preferences.quizKanaScript,stages:quizKanaStages(preferences.quizKanaStagesMask),...(custom?{filter:'custom',itemIds:custom}:{})}};
}

/** One existing owner draft holds all subjects. Keep other-subject choices before capping. */
export function mergeSoloCustomDraft(previous: readonly string[], incoming: readonly string[], subject: SoloSubject) {
  const matches = (id: string) => isSoloCustomId(id, subject);
  const others = [...new Set(previous.filter(id => !matches(id)))];
  const selected = [...new Set(incoming.filter(matches))].slice(0, Math.max(0,256-others.length));
  return { ids: [...others,...selected], selected, truncated: selected.length < incoming.length };
}
