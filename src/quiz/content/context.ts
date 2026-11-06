import { finishFactory, isHiraganaReading } from '../distractors';
import { compareText, encodeId, normalizeLabel, skillKey } from '../ids';
import { freeze, type Candidate, type Catalogs, type Exclusion, type FactoryResult, type TextRange, type WordSource } from '../types';

/** Source itself teaches several readings of this naked character; no disambiguating context. */
export const CONTEXT_EXCLUSIONS: Readonly<Record<string, string>> = freeze({
  '生': 'Bare 生 does not disambiguate the multiple readings taught by this catalog. Use a whole word.',
});
export function contextHighlights(word: string, root: string): TextRange[] {
  const ranges: TextRange[] = [];
  if (!root) return ranges;
  for (let start = word.indexOf(root); start >= 0; start = word.indexOf(root, start + root.length)) {
    ranges.push({ start, end: start + root.length });
  }
  return ranges;
}

export function createContextCandidates(catalogs: Pick<Catalogs, 'kanji' | 'vocabulary' | 'wordFamilies'>): FactoryResult {
  const entries = Object.entries(catalogs.wordFamilies ?? {}).sort(([a], [b]) => compareText(a, b))
    .flatMap(([root, family]) => family.map(item => ({ root, item })));
  const exclusions: Exclusion[] = [];
  const duplicates: string[] = [];
  const accepted: { root: string; item: WordSource }[] = [];
  const roots = new Set(catalogs.kanji.filter(item => /^[\u3400-\u9fff]$/u.test(item.kanji)).map(item => item.kanji));
  for (const entry of entries) {
    const { root, item } = entry;
    let reason: Exclusion['reason'] | undefined;
    let detail = '';
    if (item.proofreadingStatus !== 'reviewed') { reason = 'unreviewed'; detail = 'Curated word is not marked reviewed.'; }
    else if (!item.word.trim() || !item.meaning.trim() || !isHiraganaReading(item.reading)) { reason = 'invalid-content'; detail = 'Expected a whole word, hiragana reading and meaning.'; }
    else if (!root || !roots.has(root) || !item.word.includes(root)) { reason = 'missing-target'; detail = 'Target kanji is absent from the word or kanji catalog.'; }
    else if (item.commonness !== 'common' && item.commonness !== 'moderate') { reason = 'rare-word'; detail = 'Curated set is restricted to common/moderate words.'; }
    else if (CONTEXT_EXCLUSIONS[item.word]) { reason = 'ambiguous-prompt'; detail = CONTEXT_EXCLUSIONS[item.word]; }
    else {
      // Even an unreviewed conflicting record is evidence that the naked prompt needs review.
      const readings = new Set([...entries.filter(other => other.item.word === item.word).map(other => other.item.reading),
        ...catalogs.vocabulary.filter(other => other.word === item.word).map(other => other.hiragana)].filter(Boolean));
      if (readings.size > 1) { reason = 'conflicting-word'; detail = 'Displayed word has contradictory catalog readings; no disambiguating context is provided.'; }
    }
    if (reason) exclusions.push({ source: `${root}:${item.id}`, kind: 'kanji-word', reason, detail });
    else accepted.push(entry);
  }
  const byWord = new Map<string, typeof accepted>();
  for (const entry of accepted) {
    const group = byWord.get(entry.item.word) ?? [];
    group.push(entry); byWord.set(entry.item.word, group);
  }
  const rows = [...byWord.values()].map(group => {
    const sorted = [...group].sort((a, b) => compareText(JSON.stringify([a.item.reading, normalizeLabel(a.item.meaning), a.root, a.item.id, a.item.note ?? '', a.item.source]),
      JSON.stringify([b.item.reading, normalizeLabel(b.item.meaning), b.root, b.item.id, b.item.note ?? '', b.item.source])));
    const chosen = sorted[0];
    const id = encodeId('w', [chosen.item.word, chosen.item.reading, normalizeLabel(chosen.item.meaning)]);
    for (const duplicate of sorted.slice(1)) duplicates.push(encodeId('w', [duplicate.item.word, duplicate.item.reading, normalizeLabel(duplicate.item.meaning)]));
    return { ...chosen, id, roots: [...new Set(group.map(entry => entry.root))].sort(compareText),
      notes: [...new Set(sorted.map(entry => entry.item.note).filter((note): note is string => Boolean(note)))].sort(compareText).join('\n') };
  }).sort((a, b) => compareText(a.id, b.id));
  const candidates: Candidate[] = rows.map(({ root, item, id, roots: wordRoots, notes }) => ({
    itemId: id, skillKey: skillKey(id, 'kanji-word'), targetKey: encodeId('w', [item.word]), subject: 'kanji', kind: 'kanji-word',
    instruction: 'How is this word read?', face: item.word,
    highlights: contextHighlights(item.word, root),
    answers: [item.reading], foils: rows.filter(other => other.item.word !== item.word && other.item.reading !== item.reading)
      .map(other => ({ label: other.item.reading, score: Math.max(0, 3 - Math.abs(item.reading.length - other.item.reading.length))
        + (item.reading.slice(-1) === other.item.reading.slice(-1) ? 1 : 0) })),
    reveal: { answer: item.reading, reading: item.reading, meaning: item.meaning, ...(notes ? { note: notes } : {}) },
    speechText: item.word, deck: { itemKey: root, type: 'kanji' }, roots: wordRoots,
  }));
  return finishFactory(entries.length, candidates, exclusions, duplicates);
}
