/**
 * Minimal i18n: a flat dictionary of English strings with `{param}` interpolation. Keys are typed,
 * so a typo is a compile error; content files store keys as strings and are checked by
 * `pnpm content:validate`.
 */
import { en } from './en/index';

export type I18nKey = keyof typeof en;
export type I18nParams = Record<string, string | number>;

const dictionary: Record<string, string> = en;
export const I18N_KEYS: ReadonlySet<string> = new Set(Object.keys(dictionary));

const missing = new Set<string>();

export function hasKey(key: string): key is I18nKey {
  return key in dictionary;
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
