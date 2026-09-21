/**
 * What the Brewery screen prints (docs/tech/UI_DESIGN.md §5.23).
 *
 * Display only: which element to bring, which days a hall keeps, what a stage is pitched at, and
 * whose art the hall wears. The rules are the engine's and the numbers are content's.
 */
import { ELEMENT_BEATS } from '@content/balance/element';
import { WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import type { BackdropKey } from '@assets/manifest.generated';
import type { BreweryDef, BreweryStageDef } from '@content/brewery/types';
import { ELEMENTS, type Element } from '@content/champions/types';
import { content } from '@content/registry';
import { t, type I18nKey } from '@i18n/index';

/** What each stage is pitched at, in the words the rows print. */
export const tierKey = (stage: number): I18nKey => `brewery.tier.${stage}` as I18nKey;

/**
 * The element that has the advantage in a hall — the one that beats the guards' own. The Brewery
 * is where the element wheel is taught, and Eclipse is the hall nothing counters (`CHAMPIONS.md`
 * §1): `null` there, and the screen says so instead of naming an element.
 */
export function counterOf(element: Element): Element | null {
  return ELEMENTS.find((candidate) => ELEMENT_BEATS[candidate] === element) ?? null;
}

/**
 * `every day`, or `Wed, Sat, Sun` — in the order of the game's own week, which starts on the day
 * the weekly reset falls on rather than on `getDay`'s Sunday.
 */
export function openDaysLabel(def: BreweryDef): string {
  if (def.openDays.length >= 7) return t('brewery.everyDay');
  const fromWeekStart = (day: number): number => (day - WEEKLY_RESET_WEEKDAY + 7) % 7;
  return [...def.openDays]
    .sort((a, b) => fromWeekStart(a) - fromWeekStart(b))
    .map((day) => t(`brewery.dayShort.${day}` as I18nKey))
    .join(', ');
}

/**
 * Who holds a stage — the faction of the settlement its cellar is cut under. It is the one thing
 * about a stage a player can actually prepare for, so the row prints it.
 */
export function stageHolder(stage: BreweryStageDef): string | null {
  const settlement = content.settlementByIndex(stage.settlement);
  const faction = settlement ? content.factionById(settlement.faction) : undefined;
  return faction?.name ?? null;
}

/** The art a hall wears: the place its deepest cellar is cut into. */
export function hallBackdrop(def: BreweryDef): BackdropKey {
  const deepest = def.stages[def.stages.length - 1];
  const settlement = deepest ? content.settlementByIndex(deepest.settlement) : undefined;
  return settlement?.backdrop ?? 'bg.bg5';
}

/** The colour grade over that art, so four halls in the same kit read as four places. */
export function hallGrade(element: Element): string {
  switch (element) {
    case 'justice':
      return 'rgba(40, 30, 10, 0.62)';
    case 'valor':
      return 'rgba(44, 14, 10, 0.62)';
    case 'faith':
      return 'rgba(12, 26, 44, 0.62)';
    case 'eclipse':
      return 'rgba(26, 12, 42, 0.64)';
  }
}
