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
import { FACTIONS, FACTION_BY_ID } from '@content/enemies/factions/index';
import type { FactionDef } from '@content/enemies/faction';
import type { EnemyDef } from '@content/enemies/types';
import {
  SETTLEMENTS,
  SETTLEMENT_BY_ID,
  SETTLEMENT_BY_INDEX,
  SETTLEMENT_OF_STAGE,
  STAGES,
  STAGE_BY_ID,
} from '@content/stages/index';
import type { SettlementDef, StageDef } from '@content/stages/types';
import { GEAR_SETS, GEAR_SET_BY_ID } from '@content/sets/index';
import type { GearSetDef } from '@content/sets/types';
import { TITLES, TITLE_BY_ID } from '@content/titles/index';
import type { TitleDef } from '@content/titles/types';
import type { Difficulty } from '@content/balance/battle';
import { parseStageEncounterId, stageEncounter } from '@engine/campaign/encounter';

export interface ContentRegistry {
  currencies: readonly CurrencyDef[];
  currencyById: Readonly<Record<CurrencyId, CurrencyDef>>;
  champions: readonly ChampionDef[];
  championById(id: ChampionId): ChampionDef | undefined;
  enemies: readonly EnemyDef[];
  enemyById(id: string): EnemyDef | undefined;
  /** Authored encounters only; campaign fights are derived from their stage. */
  encounters: readonly EncounterDef[];
  /** Resolves authored ids and, on demand, `encounter.stage.<nn>.<nn>.<difficulty>`. */
  encounterById(id: string): EncounterDef | undefined;
  /** The encounter fought when a stage is run on a difficulty (CAMPAIGN.md §8). */
  stageEncounter(stageId: string, difficulty: Difficulty): EncounterDef | undefined;
  factions: readonly FactionDef[];
  factionById(id: string): FactionDef | undefined;
  settlements: readonly SettlementDef[];
  settlementById(id: string): SettlementDef | undefined;
  /** 1..12 (docs/design/CAMPAIGN.md §1). */
  settlementByIndex(index: number): SettlementDef | undefined;
  stages: readonly StageDef[];
  stageById(id: string): StageDef | undefined;
  /** The settlement a stage belongs to, for scaling, energy cost and drops. */
  settlementOfStage(stageId: string): SettlementDef | undefined;
  /** Titles in display order, earliest first (ECONOMY.md §4). */
  titles: readonly TitleDef[];
  titleById(id: string): TitleDef | undefined;
  /** The fourteen gear sets (GEAR.md §5); two-piece sets first. */
  gearSets: readonly GearSetDef[];
  gearSetById(id: string): GearSetDef | undefined;
}

export function buildContentRegistry(): ContentRegistry {
  // Derived encounters are memoised: 360 of them exist in principle, a handful in a session.
  const derived = new Map<string, EncounterDef>();
  const stageEncounterOf = (stageId: string, difficulty: Difficulty): EncounterDef | undefined => {
    const id = `encounter.${stageId}.${difficulty}`;
    const cached = derived.get(id);
    if (cached) return cached;
    const stage = STAGE_BY_ID[stageId];
    const settlement = SETTLEMENT_OF_STAGE[stageId];
    if (!stage || !settlement) return undefined;
    const encounter = stageEncounter(settlement, stage, difficulty);
    derived.set(id, encounter);
    return encounter;
  };
  return {
    currencies: CURRENCIES,
    currencyById: CURRENCY_BY_ID,
    champions: CHAMPIONS,
    championById: (id) => CHAMPION_BY_ID[id],
    enemies: ENEMIES,
    enemyById: (id) => ENEMY_BY_ID[id],
    encounters: ENCOUNTERS,
    encounterById: (id) => {
      const authored = ENCOUNTER_BY_ID[id];
      if (authored) return authored;
      const stage = parseStageEncounterId(id);
      return stage ? stageEncounterOf(stage.stageId, stage.difficulty) : undefined;
    },
    stageEncounter: stageEncounterOf,
    factions: FACTIONS,
    factionById: (id) => FACTION_BY_ID[id],
    settlements: SETTLEMENTS,
    settlementById: (id) => SETTLEMENT_BY_ID[id],
    settlementByIndex: (index) => SETTLEMENT_BY_INDEX[index],
    stages: STAGES,
    stageById: (id) => STAGE_BY_ID[id],
    settlementOfStage: (id) => SETTLEMENT_OF_STAGE[id],
    titles: TITLES,
    titleById: (id) => TITLE_BY_ID[id],
    gearSets: GEAR_SETS,
    gearSetById: (id) => GEAR_SET_BY_ID[id],
  };
}

/** Module-level singleton for layers that only read content. */
export const content: ContentRegistry = buildContentRegistry();
