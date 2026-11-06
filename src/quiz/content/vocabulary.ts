import { finishFactory, isHiraganaReading, isKanjiWord, meaningMatcher } from '../distractors';
import { compareText, encodeId, normalizeLabel, skillKey } from '../ids';
import type { Candidate, Catalogs, Exclusion, FactoryResult, VocabularySource } from '../types';

export const vocabularyId = (item: VocabularySource): string => encodeId('v', [item.word, item.hiragana, normalizeLabel(item.english)]);

export function createVocabularyCandidates(catalogs: Pick<Catalogs, 'vocabulary'>): FactoryResult {
  const candidates: Candidate[] = [];
  const exclusions: Exclusion[] = [];
  const duplicates: string[] = [];
  const unique = new Map<string, VocabularySource>();
  // Category is mutable metadata: it breaks duplicate ties, never contributes to identity.
  const sorted = [...catalogs.vocabulary].sort((a, b) => compareText(
    JSON.stringify([vocabularyId(a), a.category, a.english]), JSON.stringify([vocabularyId(b), b.category, b.english])));
  const kinds = ['vocab-meaning', 'vocab-reading', 'vocab-reverse'] as const;
  for (const item of sorted) {
    const id = vocabularyId(item);
    if (!item.word.trim() || !item.hiragana.trim() || !item.english.trim()) {
      for (const kind of kinds) exclusions.push({ source: item.word, kind, reason: 'invalid-content', detail: 'Word, reading and meaning must be nonempty.' });
    } else if (unique.has(id)) duplicates.push(id);
    else unique.set(id, item);
  }
  const rows = [...unique.values()];
  const overlap = meaningMatcher(rows.map(item => item.english));
  for (const item of rows) {
    const itemId = vocabularyId(item);
    const homographs = rows.filter(other => other.word === item.word);
    const allMeanings = homographs.map(other => other.english);
    const reverseAnswers = new Set(rows.filter(other => overlap(item.english, other.english)).map(other => other.word));
    const ambiguousMeaning = new Set(homographs.filter(other => other.hiragana === item.hiragana).map(other => normalizeLabel(other.english))).size > 1;
    const ambiguousReading = new Set(homographs.map(other => other.hiragana)).size > 1;
    for (const kind of kinds) {
      const unsupported = kind === 'vocab-reading' && (!isKanjiWord(item.word) || !isHiraganaReading(item.hiragana) || item.word === item.hiragana);
      if (unsupported || (kind === 'vocab-reading' && ambiguousReading) || (kind === 'vocab-meaning' && ambiguousMeaning)) {
        exclusions.push({ source: item.word, kind, reason: unsupported ? 'unsupported-reading' : 'ambiguous-prompt',
          detail: unsupported ? 'Reading mode requires kanji and a distinct whole-word hiragana reading.' : 'Displayed word/reading does not identify a single catalog answer.' });
        continue;
      }
      const foils = rows.filter(other => {
        if (other.word === item.word) return false;
        if (kind === 'vocab-reading') return isHiraganaReading(other.hiragana) && !homographs.some(target => target.hiragana === other.hiragana);
        if (kind === 'vocab-meaning') return !allMeanings.some(meaning => overlap(meaning, other.english));
        // A written foil is unsafe if ANY of its senses answers this English prompt.
        return !reverseAnswers.has(other.word);
      }).map(other => ({
        label: kind === 'vocab-meaning' ? other.english : kind === 'vocab-reading' ? other.hiragana : other.word,
        score: (item.category === other.category ? 4 : 0)
          + Math.max(0, 2 - Math.abs(item.hiragana.length - other.hiragana.length))
          + (item.hiragana.slice(-1) === other.hiragana.slice(-1) ? 1 : 0),
      }));
      const answer = kind === 'vocab-meaning' ? item.english : kind === 'vocab-reading' ? item.hiragana : item.word;
      candidates.push({ itemId, skillKey: skillKey(itemId, kind), targetKey: encodeId('v', [item.word]), subject: 'vocab', kind,
        instruction: kind === 'vocab-meaning' ? 'What does this word mean?'
          : kind === 'vocab-reading' ? 'How is this word read?' : `Which word means “${item.english}”?`,
        face: kind === 'vocab-reverse' ? item.english : item.word,
        ...(kind === 'vocab-meaning' ? { faceSub: item.hiragana } : {}),
        answers: [answer], foils, reveal: { answer, reading: item.hiragana, meaning: item.english },
        // Safe views omit this field for every kind; listening is a feedback action.
        speechText: item.word, deck: { itemKey: item.word, type: 'vocab' }, category: item.category,
      });
    }
  }
  return finishFactory(catalogs.vocabulary.length, candidates, exclusions, duplicates);
}
