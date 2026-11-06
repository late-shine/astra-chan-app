import { finishFactory, readingKey } from '../distractors';
import { compareText, encodeId, normalizeTyped, skillKey } from '../ids';
import { freeze, type Candidate, type Catalogs, type Exclusion, type FactoryResult, type KanaScript } from '../types';

/** These aliases belong to glyphs, never to a global romaji replacement rule. */
export const KANA_ALIASES: Readonly<Record<string, readonly string[]>> = freeze({
  'し': ['shi', 'si'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'ふ': ['fu', 'hu'],
  'じ': ['ji', 'zi'], 'ぢ': ['ji'], 'ず': ['zu'], 'づ': ['zu'],
  'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'],
  'ちゃ': ['cha', 'tya'], 'ちゅ': ['chu', 'tyu'], 'ちょ': ['cho', 'tyo'],
  'じゃ': ['ja', 'zya'], 'じゅ': ['ju', 'zyu'], 'じょ': ['jo', 'zyo'], 'ん': ['n', 'nn'],
});
const CONFUSIONS = freeze([
  ['ぬ', 'め'], ['わ', 'れ', 'ね'], ['る', 'ろ'], ['は', 'ほ'], ['あ', 'お'],
  ['シ', 'ツ'], ['ソ', 'ン'],
]);
export function kanaAliases(glyph: string, canonical: string): readonly string[] {
  const taught = normalizeTyped(canonical);
  const aliases = KANA_ALIASES[readingKey(glyph)];
  return freeze([...new Set([taught, ...(aliases?.includes(taught) ? aliases : [])])]);
}

export function createKanaCandidates(catalogs: Pick<Catalogs, 'hiragana' | 'katakana'>): FactoryResult {
  const candidates: Candidate[] = [];
  const exclusions: Exclusion[] = [];
  const duplicates: string[] = [];
  const kinds = ['kana-read', 'kana-pick', 'kana-type'] as const;
  for (const script of ['hiragana', 'katakana'] as const) {
    const byGlyph = new Map<string, typeof catalogs.hiragana[number]>();
    const sorted = [...catalogs[script]].sort((a, b) => compareText(JSON.stringify(a), JSON.stringify(b)));
    for (const item of sorted) {
      if (byGlyph.has(item.kana)) duplicates.push(encodeId(script === 'hiragana' ? 'h' : 'k', [script, item.kana]));
      else byGlyph.set(item.kana, item);
    }
    const rows = [...byGlyph.values()].filter(item => {
      const glyphPattern = script === 'hiragana' ? /^[\u3041-\u3096]+$/u : /^[\u30a1-\u30faー]+$/u;
      const conflict = catalogs[script].some(other => other.kana === item.kana && normalizeTyped(other.romaji) !== normalizeTyped(item.romaji));
      const valid = glyphPattern.test(item.kana) && /^[a-z]+$/u.test(normalizeTyped(item.romaji)) && !conflict;
      if (!valid) for (const kind of kinds) exclusions.push({ source: item.kana, kind, reason: conflict ? 'ambiguous-prompt' : 'invalid-content', detail: 'Invalid glyph/romaji or conflicting taught readings for the same glyph.' });
      return valid;
    });
    for (const item of rows) {
      const itemId = encodeId(script === 'hiragana' ? 'h' : 'k', [script, item.kana]);
      const romaji = normalizeTyped(item.romaji);
      const aliases = kanaAliases(item.kana, romaji);
      const sameSound = rows.filter(other => kanaAliases(other.kana, other.romaji).some(alias => aliases.includes(alias)));
      for (const kind of kinds) {
        if (kind === 'kana-pick' && sameSound.length > 1) {
          exclusions.push({ source: item.kana, kind, reason: 'ambiguous-prompt', detail: `Taught reading ${romaji} maps to multiple same-script glyphs.` });
          continue;
        }
        const foils = rows.filter(other => other.kana !== item.kana
          && !kanaAliases(other.kana, other.romaji).some(alias => aliases.includes(alias))).map(other => ({
          label: kind === 'kana-pick' ? other.kana : normalizeTyped(other.romaji),
          score: (CONFUSIONS.some(group => group.includes(item.kana) && group.includes(other.kana)) ? 8 : 0)
            + (item.group === other.group ? 2 : 0)
            + (romaji[0] === other.romaji[0] ? 1 : 0)
            + (romaji.slice(-1) === other.romaji.slice(-1) ? 1 : 0),
        }));
        candidates.push({ itemId, skillKey: skillKey(itemId, kind), targetKey: itemId, subject: 'kana', kind,
          instruction: kind === 'kana-read' ? 'What is the reading of this character?'
            : kind === 'kana-pick' ? `Which character is read “${romaji}”?` : 'Type the reading in romaji.',
          face: kind === 'kana-pick' ? romaji : item.kana,
          answers: [kind === 'kana-pick' ? item.kana : romaji],
          ...(kind === 'kana-type' ? { typed: [...aliases] } : {}), foils,
          reveal: { answer: kind === 'kana-pick' ? item.kana : romaji, reading: romaji },
          speechText: item.kana, deck: { itemKey: item.kana, type: script as KanaScript }, script, stage: item.category,
        });
      }
    }
  }
  return finishFactory(catalogs.hiragana.length + catalogs.katakana.length, candidates, exclusions, duplicates);
}
