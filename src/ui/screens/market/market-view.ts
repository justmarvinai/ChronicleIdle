/**
 * What the Market's screens print (docs/tech/UI_DESIGN.md §5.25).
 *
 * Its own module so the screen files export only their components — the react-refresh rule — and
 * so the Bag and the Market can say the same things about the same item.
 */
import type { CurrencyAmount } from '@content/currencies/types';
import type { Grant } from '@content/grants';
import { grantCurrencies } from '@content/grants';
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
