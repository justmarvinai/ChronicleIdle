/**
 * The Brewery: four halls, five stages each (docs/design/BREWERY.md).
 *
 * The ladder is authored **once** and stamped per element, the way the Palace's ring template is:
 * every hall asks the same five questions and pays in its own brew, so a player who has learned
 * one hall has learned all four. What differs per hall is the element, the brew, the days it opens
 * and which of that element's factions holds each stage.
 */
import {
  BREWERY_BOSS_STAGE,
  BREWERY_OPEN_DAYS,
  BREWERY_STAGES,
  BREWERY_STAGE_BREWS,
  BREWERY_STAGE_GUARDS,
  BREWERY_STAGE_LEVEL,
  BREWERY_STAGE_SCALE,
  BREWERY_TURN_LIMIT,
  BREWERY_TURN_LIMIT_BOSS,
} from '@content/balance/brewery';
import { ELEMENTS, type Element } from '@content/champions/types';
import type { CurrencyId } from '@content/currencies/types';
import type { BreweryDef, BreweryStageDef } from './types';

/**
 * Which settlement's faction holds each stage of a hall, deepest last.
 *
 * Every faction here shares its hall's element (`enemies/factions/**`), so the Brewery is where the
 * element wheel is taught: to take a hall you bring what beats it. An element with fewer than five
 * factions repeats its own — there is no fifth Faith warband in Veyrath, and inventing one for a
 * cellar door is content nobody asked for.
 */
const HALL_FACTIONS: Readonly<Record<Element, readonly number[]>> = {
  justice: [3, 3, 9, 9, 11],
  valor: [1, 5, 5, 7, 7],
  faith: [2, 2, 8, 8, 8],
  eclipse: [4, 6, 10, 12, 12],
};

const BREW_BY_ELEMENT: Readonly<Record<Element, CurrencyId>> = {
  justice: 'brew_justice',
  valor: 'brew_valor',
  faith: 'brew_faith',
  eclipse: 'brew_eclipse',
};

function stagesFor(element: Element): BreweryStageDef[] {
  const factions = HALL_FACTIONS[element];
  return Array.from({ length: BREWERY_STAGES }, (_unused, index) => {
    const number = index + 1;
    const boss = number === BREWERY_BOSS_STAGE;
    return {
      number,
      brews: BREWERY_STAGE_BREWS[index] ?? number,
      scale: BREWERY_STAGE_SCALE[index] ?? 1,
      guards: BREWERY_STAGE_GUARDS[index] ?? 3,
      boss,
      enemyLevel: BREWERY_STAGE_LEVEL[index] ?? 1,
      turnLimit: boss ? BREWERY_TURN_LIMIT_BOSS : BREWERY_TURN_LIMIT,
      settlement: factions[index] ?? 1,
    };
  });
}

const hall = (element: Element): BreweryDef => ({
  id: `brewery.${element}`,
  name: `brewery.${element}.name`,
  description: `brewery.${element}.description`,
  element,
  brew: BREW_BY_ELEMENT[element],
  openDays: BREWERY_OPEN_DAYS[element],
  stages: stagesFor(element),
  version: 1,
});

/**
 * Written out rather than mapped: `Record<Element, …>` then proves all four halls are here, and
 * every index below hands back the *same* object rather than a copy of it.
 */
export const BREWERY_BY_ELEMENT: Readonly<Record<Element, BreweryDef>> = {
  justice: hall('justice'),
  valor: hall('valor'),
  faith: hall('faith'),
  eclipse: hall('eclipse'),
};

/** The four halls, in the element order the rest of the game reads in. */
export const BREWERIES: readonly BreweryDef[] = ELEMENTS.map((element) => BREWERY_BY_ELEMENT[element]);

export const BREWERY_BY_ID: Readonly<Record<string, BreweryDef>> = Object.fromEntries(
  BREWERIES.map((def) => [def.id, def]),
);
