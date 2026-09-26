/**
 * The Unwritten's strings, joined to the dictionary the moment its chunk loads (ADR-050): the
 * screen's module imports this before it renders a word, so every key below is there when asked
 * for, and the first screen never carried one of them.
 */
import { unwritten } from '@i18n/en/unwritten';
import { registerStrings, translate, type I18nParams } from '@i18n/index';

registerStrings(unwritten);

export type UnwrittenKey = keyof typeof unwritten;

/** A string of the Unwritten's own table, typed like `t` though it ships with the chunk. */
export function u(key: UnwrittenKey, params?: I18nParams): string {
  return translate(key, params);
}

/** A content line (an inscription's, a relic's) with the numbers its `show` table carries. */
export function line(key: string, show: Readonly<Record<string, number>>): string {
  return translate(key, show);
}
