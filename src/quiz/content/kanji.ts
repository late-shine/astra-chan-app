import { parseReadingRecords } from '../../kanjiReadingAdapter';
import { finishFactory, meaningsOverlap, readingKey } from '../distractors';
import { compareText, encodeId, normalizeLabel, skillKey } from '../ids';
import type { Candidate, Catalogs, Exclusion, FactoryResult, KanjiSource, ReadingSource } from '../types';

/** Dash is okurigana notation, not part of a selectable kana reading. */
function legalReading(value: string, type: 'onyomi' | 'kunyomi'): boolean {
  return type === 'onyomi' ? /^[\u30a1-\u30f6ー]+$/u.test(value) : /^[\u3041-\u3096ー]+(?:-[\u3041-\u3096ー]+)?$/u.test(value);
}
export function isolatedReadings(item: KanjiSource, catalogs: Pick<Catalogs, 'readingRecords'>, type: 'onyomi' | 'kunyomi'): readonly string[] {
  const structured = catalogs.readingRecords?.[item.kanji]?.[type]
    ?? (type === 'onyomi' ? item.onyomiRecords : item.kunyomiRecords);
  let records: readonly ReadingSource[];
  if (structured !== undefined) {
    records = structured.filter(record => record.type === type && record.proofreadingStatus === 'reviewed' && record.source === 'legacy-declared');
  } else {
    const kana = type === 'onyomi' ? item.onyomi : item.kunyomi;
    const romaji = type === 'onyomi' ? item.onyomiRomaji : item.kunyomiRomaji;
    const tokens = kana.split('、').map(value => value.trim());
    const latin = romaji.split(',').map(value => value.trim());
    // The existing adapter pads mismatches. A quiz must instead reject the whole pair.
    if (tokens.length !== latin.length || tokens.some(value => !value) || latin.some(value => !/^[a-z]+(?:-[a-z]+)*$/iu.test(value))) return [];
    records = parseReadingRecords(kana, romaji, type, { source: 'legacy-declared', proofreadingStatus: 'unverified' });
  }
  return [...new Set([...records].sort((a, b) => a.priority - b.priority || compareText(a.kana, b.kana))
    .filter(record => legalReading(record.kana, type) && /^[a-z]+(?:-[a-z]+)*$/iu.test(record.romaji))
    .map(record => record.kana.replace(/-/gu, '')))];
}
/** Includes undeclared/unsupported known readings for exclusion, never as answers. */
export function allKnownReadings(item: KanjiSource, catalogs: Pick<Catalogs, 'readingRecords'>): readonly string[] {
  return [...item.onyomi.split('、'), ...item.kunyomi.split('、'),
    ...(item.onyomiRecords ?? []).map(record => record.kana), ...(item.kunyomiRecords ?? []).map(record => record.kana),
    ...(catalogs.readingRecords?.[item.kanji]?.onyomi ?? []).map(record => record.kana),
    ...(catalogs.readingRecords?.[item.kanji]?.kunyomi ?? []).map(record => record.kana),
  ].map(readingKey).filter(Boolean);
}

export function createKanjiCandidates(catalogs: Pick<Catalogs, 'kanji' | 'readingRecords'>): FactoryResult {
  const candidates: Candidate[] = [];
  const exclusions: Exclusion[] = [];
  const duplicates: string[] = [];
  const unique = new Map<string, KanjiSource>();
  const kinds = ['kanji-meaning', 'kanji-on', 'kanji-kun'] as const;
  for (const item of [...catalogs.kanji].sort((a, b) => compareText(JSON.stringify(a), JSON.stringify(b)))) {
    const id = encodeId('j', [item.kanji]);
    if (unique.has(id)) duplicates.push(id); else unique.set(id, item);
  }
  const rows = [...unique.values()];
  for (const item of rows) {
    const itemId = encodeId('j', [item.kanji]);
    const conflicting = catalogs.kanji.some(other => other.kanji === item.kanji &&
      (normalizeLabel(other.meaning) !== normalizeLabel(item.meaning) || other.onyomi !== item.onyomi || other.kunyomi !== item.kunyomi));
    for (const kind of kinds) {
      if (!/^[\u3400-\u9fff]$/u.test(item.kanji) || !item.meaning.trim() || conflicting) {
        exclusions.push({ source: item.kanji, kind, reason: conflicting ? 'ambiguous-prompt' : 'invalid-content', detail: 'Expected one kanji with nonempty, nonconflicting catalog fields.' });
        continue;
      }
      const type = kind === 'kanji-on' ? 'onyomi' : 'kunyomi';
      const answers = kind === 'kanji-meaning' ? [item.meaning] : isolatedReadings(item, catalogs, type);
      if (!answers.length) {
        exclusions.push({ source: item.kanji, kind, reason: 'unsupported-reading', detail: 'No supported declared reading; placeholders, mismatches and unreviewed structured records are excluded.' });
        continue;
      }
      const blocked = new Set(allKnownReadings(item, catalogs));
      const foils = rows.filter(other => other.kanji !== item.kanji).flatMap(other => {
        if (kind === 'kanji-meaning') return meaningsOverlap(item.meaning, other.meaning) ? [] : [{ label: other.meaning,
          score: Math.max(0, 5 - Math.abs(item.strokeCount - other.strokeCount)) }];
        return isolatedReadings(other, catalogs, type).filter(reading => !blocked.has(readingKey(reading)))
          .map(reading => ({ label: reading, score: Math.max(0, 3 - Math.abs(reading.length - answers[0].length)) }));
      });
      candidates.push({ itemId, skillKey: skillKey(itemId, kind), targetKey: itemId, subject: 'kanji', kind,
        instruction: kind === 'kanji-meaning' ? 'What does this kanji mean?'
          : kind === 'kanji-on' ? 'Which is an on’yomi of this kanji?' : 'Which is a kun’yomi of this kanji?',
        face: item.kanji, answers, foils, reveal: { answer: answers[0], meaning: item.meaning },
        speechText: item.kanji, deck: { itemKey: item.kanji, type: 'kanji' }, roots: [item.kanji],
      });
    }
  }
  return finishFactory(catalogs.kanji.length, candidates, exclusions, duplicates);
}
