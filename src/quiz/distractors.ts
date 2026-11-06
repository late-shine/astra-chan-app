import { compareText, isSafeKey, normalizeLabel, skillKey } from './ids';
import { draw, shuffle } from './random';
import { freeze, type Candidate, type Exclusion, type FactoryResult, type Foil, type RandomInt } from './types';

/** Conservative English overlap filter, not a claim of full semantic validation. */
export const MEANING_EQUIVALENTS: readonly (readonly string[])[] = freeze([
  ['big', 'large'], ['small', 'little'], ['car', 'automobile'], ['shop', 'store'],
  ['movie', 'film'], ['toilet', 'restroom', 'bathroom'], ['photo', 'photograph'],
  ['hello', 'good afternoon'], ['goodbye', 'bye'],
]);
export function meaningAtoms(meaning: string): string[] {
  return normalizeLabel(meaning).replace(/\([^)]*\)/gu, '').split(/\s*(?:\/|;|,|\bor\b)\s*/u)
    .map(value => value.trim().replace(/^(?:to|a|an|the)\s+/u, '')).filter(Boolean)
    .map(value => MEANING_EQUIVALENTS.find(group => group.includes(value))?.[0] ?? value);
}
export function meaningsOverlap(a: string, b: string): boolean {
  const atoms = new Set(meaningAtoms(a));
  return normalizeLabel(a) === normalizeLabel(b) || meaningAtoms(b).some(atom => atoms.has(atom));
}
/** Per-factory index avoids repeatedly parsing the same catalog meanings. */
export function meaningMatcher(meanings: readonly string[]): (a: string, b: string) => boolean {
  const parsed = new Map(meanings.map(meaning => [meaning, { normalized: normalizeLabel(meaning), atoms: new Set(meaningAtoms(meaning)) }]));
  return (a, b) => {
    const left = parsed.get(a);
    const right = parsed.get(b);
    if (!left || !right) return meaningsOverlap(a, b);
    return left.normalized === right.normalized || [...right.atoms].some(atom => left.atoms.has(atom));
  };
}
export const readingKey = (value: string): string => normalizeLabel(value).replace(/-/gu, '')
  .replace(/[\u30a1-\u30f6]/gu, glyph => String.fromCharCode(glyph.charCodeAt(0) - 0x60));
export const isHiraganaReading = (value: string): boolean => /^[\u3041-\u3096ー]+$/u.test(value);
export const isKanjiWord = (value: string): boolean => /[\u3400-\u9fff々]/u.test(value);

export function uniqueFoils(foils: readonly Foil[], answers: readonly string[]): Foil[] {
  const blocked = new Set(answers.map(normalizeLabel));
  const labels = new Map<string, Foil>();
  for (const foil of foils) {
    const key = normalizeLabel(foil.label);
    if (!key || blocked.has(key)) continue;
    const previous = labels.get(key);
    if (!previous || foil.score > previous.score || (foil.score === previous.score && compareText(foil.label, previous.label) < 0)) {
      labels.set(key, { label: foil.label, score: foil.score });
    }
  }
  return [...labels.values()].sort((a, b) => compareText(normalizeLabel(a.label), normalizeLabel(b.label)));
}
/** At most two close foils, then a broader foil; ties are resolved by injected RNG. */
export function chooseFoils(foils: readonly Foil[], count: number, rng: RandomInt): string[] {
  const remaining = shuffle(foils, rng).sort((a, b) => b.score - a.score);
  const selected = remaining.splice(0, Math.min(2, count));
  if (count > 2 && remaining.length) {
    const lowest = Math.min(...remaining.map(foil => foil.score));
    const broad = remaining.filter(foil => foil.score === lowest);
    const picked = broad[draw(rng, broad.length)];
    selected.push(picked);
    remaining.splice(remaining.indexOf(picked), 1);
  }
  selected.push(...remaining.slice(0, count - selected.length));
  return selected.map(foil => foil.label);
}

export function finishFactory(sourceCount: number, candidates: readonly Candidate[], exclusions: readonly Exclusion[], duplicates: readonly string[] = []): FactoryResult {
  const valid: Candidate[] = [];
  const rejected = [...exclusions];
  for (const candidate of candidates) {
    if (!isSafeKey(candidate.itemId) || !isSafeKey(skillKey(candidate.itemId, candidate.kind))) {
      rejected.push({ source: candidate.face, kind: candidate.kind, reason: 'id-too-long', detail: 'Source identity or skill key exceeds 768 UTF-8 bytes.' });
      continue;
    }
    const foils = uniqueFoils(candidate.foils, candidate.answers);
    if (!candidate.typed && foils.length < 3) {
      rejected.push({ source: candidate.face, kind: candidate.kind, reason: 'insufficient-choices', detail: 'Fewer than three distinct unambiguous catalog foils.' });
      continue;
    }
    valid.push({ ...candidate, foils });
  }
  return freeze({ sourceCount, duplicateIdentities: [...duplicates].sort(compareText),
    candidates: valid.sort((a, b) => compareText(a.skillKey, b.skillKey)),
    exclusions: rejected.sort((a, b) => compareText(`${a.kind}:${a.source}:${a.reason}`, `${b.kind}:${b.source}:${b.reason}`)) });
}
