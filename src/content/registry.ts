/**
 * The content registry: every definition the game knows, indexed by id. Built once at boot from
 * the content modules and validated by `validateContent` (dev boot, tests, CI).
 */
import { CHAMPIONS, CHAMPION_BY_ID } from '@content/champions/index';
import type { ChampionDef, ChampionId } from '@content/champions/types';
import { CURRENCIES, CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyDef, CurrencyId } from '@content/currencies/types';
import { ENCOUNTERS, ENCOUNTER_BY_ID } from '@content/encounters/index';
import type { EncounterDef } from '@content/encounters/types';
import { ENEMIES, ENEMY_BY_ID } from '@content/enemies/index';
import type { EnemyDef } from '@content/enemies/types';

export interface ContentRegistry {
  currencies: readonly CurrencyDef[];
  currencyById: Readonly<Record<CurrencyId, CurrencyDef>>;
  champions: readonly ChampionDef[];
  championById(id: ChampionId): ChampionDef | undefined;
  enemies: readonly EnemyDef[];
  enemyById(id: string): EnemyDef | undefined;
  encounters: readonly EncounterDef[];
  encounterById(id: string): EncounterDef | undefined;
}

export function buildContentRegistry(): ContentRegistry {
  return {
    currencies: CURRENCIES,
    currencyById: CURRENCY_BY_ID,
    champions: CHAMPIONS,
    championById: (id) => CHAMPION_BY_ID[id],
    enemies: ENEMIES,
    enemyById: (id) => ENEMY_BY_ID[id],
    encounters: ENCOUNTERS,
    encounterById: (id) => ENCOUNTER_BY_ID[id],
  };
}

/** Module-level singleton for layers that only read content. */
export const content: ContentRegistry = buildContentRegistry();
