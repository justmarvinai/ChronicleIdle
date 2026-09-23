/**
 * What the Market's screens print (docs/tech/UI_DESIGN.md §5.25).
 *
 * Its own module so the screen files export only their components — the react-refresh rule — and
 * so the Bag and the Market can say the same things about the same item.
 */
import { BOOST_HOURS } from '@content/balance/boosts';
import { GOLD_MARKET_POOL } from '@content/balance/market';
import type { ConsumableDef } from '@content/consumables/types';
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import type { Grant } from '@content/grants';
import { grantCurrencies } from '@content/grants';
import type { GemShelfEntry } from '@content/market/types';
import { content } from '@content/registry';
import { formatDuration } from '@engine/time/clock';
import { t, translate, type I18nKey } from '@i18n/index';
import type { UseResult } from '@state/bag';

/** The wallet rows of a grant list, for a `RewardList`. */
export function grantAmounts(grants: readonly Grant[]): readonly CurrencyAmount[] {
  return grantCurrencies(grants);
}

/** "Brewery Token ×2", for the item rows of a bundle. */
export function itemLine(item: string, count: number): string {
  const def = content.consumableById(item);
  const name = def ? translate(def.name) : item;
  return count > 1 ? `${name} ${t('bag.count', { count })}` : name;
}

/** Everything a shelf entry hands over, as one readable list. */
export function contentsLines(grants: readonly Grant[]): readonly string[] {
  return grants.map((grant) =>
    grant.kind === 'consumable'
      ? itemLine(grant.item, grant.count)
      : `${translate(content.currencyById[grant.currency].name)} ${t('bag.count', { count: grant.amount })}`,
  );
}

/** A gem shelf entry's id without its namespace — what its test ids and keys are built from. */
export function shelfSlug(entry: GemShelfEntry): string {
  return entry.id.replace('shelf.', '');
}

/** Whether a stall slot carries one of the pool's rare finds (MARKET.md §1.1). */
export function isRareFind(currency: CurrencyId): boolean {
  return GOLD_MARKET_POOL.some((row) => row.currency === currency && row.rareFind === true);
}

/**
 * What a consumable is for, in a few words over its name ("Boost · 24 h"). Exhaustive over the
 * effect union, like `outcomeLine`, so a new kind of item cannot reach the shelf unlabelled.
 */
export function consumableKind(def: ConsumableDef): string {
  const effect = def.effect;
  switch (effect.kind) {
    case 'boost':
      return t('market.kind.boost', { hours: BOOST_HOURS[effect.boost] });
    case 'brewery_runs':
      return t('market.kind.brewery');
    case 'quest_reset':
      return t(effect.period === 'daily' ? 'market.kind.daily' : 'market.kind.weekly');
    case 'mission_skip':
      return t('market.kind.path');
    case 'champion_level':
    case 'champion_stars':
      return t('market.kind.champion');
  }
}

/** The single a shelf sells an item as, if it sells it on its own. */
function singleOf(item: string, shelf: readonly GemShelfEntry[]): GemShelfEntry | undefined {
  return shelf.find(
    (entry) =>
      entry.once !== true &&
      entry.contents.length === 1 &&
      entry.contents[0]?.kind === 'consumable' &&
      entry.contents[0].item === item,
  );
}

/**
 * What a bundle's parts would cost bought one by one off the same shelf (MARKET.md §2.2), or
 * `null` when a part is not sold singly — the Quartermaster's Crate pays currencies — because a
 * saving is only worth printing where the player can check it against the shelf.
 */
export function bundleWorth(entry: GemShelfEntry, shelf: readonly GemShelfEntry[]): number | null {
  let worth = 0;
  for (const grant of entry.contents) {
    if (grant.kind !== 'consumable') return null;
    const single = singleOf(grant.item, shelf);
    if (!single) return null;
    worth += single.price * grant.count;
  }
  return worth;
}

/** The share of `worth` a price saves, as a whole percentage. */
export function bundleSaving(price: number, worth: number): number {
  return worth > 0 ? Math.round((1 - price / worth) * 100) : 0;
}

/**
 * The sentence the Bag prints after an item is used.
 *
 * Exhaustive over the outcome union, so a new consumable kind cannot ship without someone deciding
 * what it says to the player.
 */
export function outcomeLine(result: UseResult): string {
  const outcome = result.outcome;
  switch (outcome.kind) {
    case 'boost':
      return `${t(`boost.${outcome.boost}` as I18nKey)} · ${t('boost.remaining', {
        time: formatDuration(Math.max(0, outcome.until - Date.now())),
      })}`;
    case 'brewery_runs':
      return t('bag.outcome.breweryRuns');
    case 'quest_reset':
      return t(outcome.period === 'daily' ? 'bag.outcome.dailyReset' : 'bag.outcome.weeklyReset');
    case 'mission_skip':
      return t('bag.outcome.missionSkipped');
    case 'champion_level':
      return t('bag.outcome.levelled', { level: outcome.level });
    case 'champion_stars':
      return t('bag.outcome.starred', { stars: outcome.stars });
  }
}
