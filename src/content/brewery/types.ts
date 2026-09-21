/**
 * The Brewery's content types (docs/design/BREWERY.md).
 *
 * A hall is an element, the brew it pays, the days it opens and the five stages you fight through
 * it. A stage is a number, a price in difficulty and a reward in brews — never a wave list: which
 * guards stand in it comes from the faction that holds that stage, so a hall is twelve lines of
 * data and no authored encounters (`CONTENT_AUTHORING.md` §15).
 */
import type { Element } from '@content/champions/types';
import type { CurrencyId } from '@content/currencies/types';

export interface BreweryStageDef {
  /** 1..`BREWERY_STAGES`. */
  number: number;
  /** Brews a clear pays — the stage's own number (the owner's rule). */
  brews: number;
  /** The single multiplier on this stage's guards; the only curve acting on a brewery fight. */
  scale: number;
  /** Guards in the wave, and whether the faction's captain leads them. */
  guards: number;
  boss: boolean;
  /** Plate level, display only. */
  enemyLevel: number;
  /** Ally turns before the run is lost. */
  turnLimit: number;
  /**
   * The settlement whose faction holds this stage and whose art the fight borrows. Deeper stages
   * are held by later factions of the hall's own element, so a hall reads as a descent.
   */
  settlement: number;
}

export interface BreweryDef {
  /** `brewery.<element>`. */
  id: string;
  /** i18n keys. */
  name: string;
  description: string;
  element: Element;
  /** The brew every stage of this hall pays. */
  brew: CurrencyId;
  /** Days it opens, `0` = Sunday … `6` = Saturday (`BREWERY_OPEN_DAYS`). */
  openDays: readonly number[];
  /** Exactly `BREWERY_STAGES` stages, in order. */
  stages: readonly BreweryStageDef[];
  version: number;
}
