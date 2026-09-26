/**
 * Every string the game has — the tables the first screen loads and the ones that arrive later
 * with their panels (ADR-049) — for the content validator and the tests, which check keys against
 * all of them. The game itself never imports this: doing so would fold the late tables back into
 * the first screen's bundle.
 */
import { changelog } from './en/changelog';
import { en } from './en/index';

const every: Readonly<Record<string, string>> = { ...en, ...changelog };

export const ALL_I18N_KEYS: ReadonlySet<string> = new Set(Object.keys(every));

/** Raw English text for any key, early or late. */
export function allTextOf(key: string): string | undefined {
  return every[key];
}
