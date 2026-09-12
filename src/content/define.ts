/**
 * Typed content helpers. They return the object unchanged; the value of `define*` is the
 * autocomplete and the compile-time check against the content type. Runtime validation happens in
 * the registry (`validateContent`) with the Zod schemas from `@engine/schema/content`.
 */
import type { CurrencyDef } from './currencies/types';

export function defineCurrency(def: CurrencyDef): CurrencyDef {
  return def;
}

/** Champions are built by `@content/champions/dsl` (`defineChampion`), which fills in ids and keys. */
export { defineChampion } from './champions/dsl';
