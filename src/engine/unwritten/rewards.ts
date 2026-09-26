/**
 * What an expedition pays (docs/design/UNWRITTEN.md §14): Recovered Pages every time, the
 * Warden's Tithe for the week's first six Wardens, and an Omen's seal the first time it falls.
 */
import {
  OMEN_SEALS,
  PAGES_PER_OMEN,
  PASSAGE_PAGES,
  TITHE,
  TITHE_GOLD_PER_OMEN,
  TITHE_LEGENDARY_FROM,
  TITHE_PER_WEEK,
  VICTORY_PAGES,
} from '@content/balance/unwritten';
import type { CurrencyAmount } from '@content/currencies/types';
import type { PassageKind } from '@content/unwritten/types';
import type { UnwrittenSave } from '@engine/schema/unwritten-save';
import type { Rules } from './rules';

/** Pages a finished passage adds to the expedition's count, before the Omen's multiplier. */
export function passagePages(kind: PassageKind, rules: Rules): number {
  return PASSAGE_PAGES[kind] + Math.max(0, Math.round(rules.pages_per_passage));
}

/** The multiplier on Pages banked: `1 + 0.15 × Omen`, and the Scriptorium's margins. */
export function pagesMultiplier(omen: number, rules: Rules): number {
  return 1 + PAGES_PER_OMEN * omen + rules.pages_mult;
}

/** Pages an expedition banks when it ends: what it earned, and the victory's own, multiplied. */
export function bankedPages(earned: number, omen: number, rules: Rules, won: boolean): number {
  return Math.round((earned + (won ? VICTORY_PAGES : 0)) * pagesMultiplier(omen, rules));
}

/** The Tithe of a folio's Warden at an Omen: its gold grown by the Omen, a Legendary Tome deep enough. */
export function titheOf(folio: number, omen: number): CurrencyAmount[] {
  const base = TITHE[folio - 1] ?? [];
  const chest = base.map(({ currency, amount }) => ({
    currency,
    amount: currency === 'gold' ? Math.round(amount * (1 + TITHE_GOLD_PER_OMEN * omen)) : amount,
  }));
  if (folio === TITHE.length && omen >= TITHE_LEGENDARY_FROM)
    chest.push({ currency: 'tome_legendary', amount: 1 });
  return chest;
}

/**
 * Pays a Warden's Tithe if the week still owes one: the week turns the count back to zero. Returns
 * what was paid — nothing once six Wardens have paid this week.
 */
export function takeTithe(
  unwritten: UnwrittenSave,
  weekKey: string,
  folio: number,
  omen: number,
): CurrencyAmount[] {
  if (unwritten.tithe.weekKey !== weekKey) unwritten.tithe = { weekKey, paid: 0 };
  if (unwritten.tithe.paid >= TITHE_PER_WEEK) return [];
  unwritten.tithe.paid += 1;
  return titheOf(folio, omen);
}

/** Wardens that may still pay the Tithe this week. */
export function titheLeft(unwritten: Pick<UnwrittenSave, 'tithe'>, weekKey: string): number {
  return unwritten.tithe.weekKey === weekKey
    ? Math.max(0, TITHE_PER_WEEK - unwritten.tithe.paid)
    : TITHE_PER_WEEK;
}

/** An Omen's seal, once: nothing if it was paid before. */
export function takeSeal(unwritten: UnwrittenSave, omen: number): CurrencyAmount[] {
  if (unwritten.omen.sealed.includes(omen)) return [];
  unwritten.omen.sealed.push(omen);
  return [...(OMEN_SEALS[omen] ?? [])];
}
