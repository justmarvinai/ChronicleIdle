/**
 * The content registry: every definition the game knows, indexed by id. Built once at boot from
 * the content modules and validated by `validateContent` (dev boot, tests, CI).
 */
import { CURRENCIES, CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyDef, CurrencyId } from '@content/currencies/types';

export interface ContentRegistry {
  currencies: readonly CurrencyDef[];
  currencyById: Readonly<Record<CurrencyId, CurrencyDef>>;
}

export function buildContentRegistry(): ContentRegistry {
  return { currencies: CURRENCIES, currencyById: CURRENCY_BY_ID };
}

/** Module-level singleton for layers that only read content. */
export const content: ContentRegistry = buildContentRegistry();
