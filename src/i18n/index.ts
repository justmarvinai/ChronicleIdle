/**
 * Minimal i18n: a flat dictionary of English strings with `{param}` interpolation. Keys are typed,
 * so a typo is a compile error; content files store keys as strings and are checked by
 * `pnpm content:validate`.
 */
import { en } from './en/index';

export type I18nKey = keyof typeof en;
export type I18nParams = Record<string, string | number>;

const dictionary: Record<string, string> = { ...en };
/** The keys the first screen loads with. A table loaded later joins through `registerStrings`. */
export const I18N_KEYS: ReadonlySet<string> = new Set(Object.keys(en));

/** Raw English text for a key (content validation of description placeholders). */
export function textOf(key: string): string | undefined {
  return dictionary[key];
}

const missing = new Set<string>();

/**
 * Joins a table that ships in its own chunk to the dictionary. The Chronicle of Changes' releases
 * arrive with the panel that prints them rather than with the first screen (ADR-049); their keys
 * come out of content data, so they are read with `translate`, never with the typed `t`.
 */
export function registerStrings(table: Readonly<Record<string, string>>): void {
  Object.assign(dictionary, table);
}

export function hasKey(key: string): key is I18nKey {
  return key in dictionary;
}

/** A literal run of a string, or one of its `{param}` slots. */
export type TemplatePart = { kind: 'text'; text: string } | { kind: 'slot'; name: string };

/**
 * A string split into its literal runs and its slots, so a caller can draw a slot as something
 * other than text — a name in its rarity's colour, a number in its own weight, an icon. The
 * sentence stays one translatable string; only its rendering changes.
 */
export function templateParts(key: string): TemplatePart[] {
  const template = dictionary[key];
  if (template === undefined) return [{ kind: 'text', text: key }];
  const parts: TemplatePart[] = [];
  let at = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    const name = match[1];
    if (name === undefined) continue;
    const start = match.index;
    if (start > at) parts.push({ kind: 'text', text: template.slice(at, start) });
    parts.push({ kind: 'slot', name });
    at = start + match[0].length;
  }
  if (at < template.length) parts.push({ kind: 'text', text: template.slice(at) });
  return parts;
}

export function t(key: I18nKey, params?: I18nParams): string {
  return translate(key, params);
}

/** Untyped variant for keys that come from content data. */
export function translate(key: string, params?: I18nParams): string {
  const template = dictionary[key];
  if (template === undefined) {
    if (!missing.has(key)) {
      missing.add(key);
      console.warn(`[i18n] missing key "${key}"`);
    }
    return key;
  }
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
