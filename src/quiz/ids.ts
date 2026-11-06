import type { QuestionKind } from './types';

export type IdPrefix = 'h' | 'k' | 'v' | 'j' | 'w' | 'q';
export const compareText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
export const normalizeLabel = (value: string): string => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
export const normalizeTyped = (value: string): string => value.normalize('NFKC').trim().toLowerCase().replace(/\s/gu, '');
export const keyBytes = (key: string): number => new TextEncoder().encode(key).length;
export const isSafeKey = (key: string): boolean => key.length > 0 && !/[.#$\[\]/\u0000-\u001f\u007f]/u.test(key) && keyBytes(key) <= 768;

/** JSON array boundaries preserve punctuation and tuple boundaries without collisions. */
export function encodeId(prefix: IdPrefix, tuple: readonly string[]): string {
  const bytes = new TextEncoder().encode(JSON.stringify(tuple));
  return `${prefix}_${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
export function decodeId(id: string): { prefix: IdPrefix; tuple: string[] } {
  if (!/^[hkvjwq]_(?:[0-9a-f]{2})+$/u.test(id)) throw new Error('Invalid quiz ID');
  const bytes = Uint8Array.from(id.slice(2).match(/../gu) ?? [], byte => parseInt(byte, 16));
  const tuple: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!Array.isArray(tuple) || !tuple.every((part): part is string => typeof part === 'string')) throw new Error('Invalid quiz tuple');
  const prefix = id[0] as IdPrefix;
  if (encodeId(prefix, tuple) !== id) throw new Error('Noncanonical quiz ID');
  return { prefix, tuple };
}
export const skillKey = (itemId: string, kind: QuestionKind): string => `${itemId}__${kind}`;
export function occurrenceId(sessionId: string, index: number): string {
  if (!sessionId.trim() || !Number.isSafeInteger(index) || index < 0) throw new RangeError('Invalid question occurrence');
  const id = encodeId('q', [sessionId, String(index)]);
  if (!isSafeKey(id)) throw new RangeError('Session ID exceeds the quiz key limit');
  return id;
}
