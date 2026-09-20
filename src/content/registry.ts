/**
 * The content registry: every definition the game knows, indexed by id. Built once at boot from
 * the content modules and validated by `validateContent` (dev boot, tests, CI).
 */
import { LATEST_RELEASE, RELEASES, RELEASE_BY_ID } from '@content/changelog/index';
import type { ReleaseDef } from '@content/changelog/types';
import { CHAMPIONS, CHAMPION_BY_ID } from '@content/champions/index';
import type { ChampionDef, ChampionId } from '@content/champions/types';
import { CURRENCIES, CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyDef, CurrencyId } from '@content/currencies/types';
import { ENCOUNTERS, ENCOUNTER_BY_ID } from '@content/encounters/index';
import type { EncounterDef } from '@content/encounters/types';
import { ENEMIES, ENEMY_BY_ID } from '@content/enemies/index';
import { towerFaction } from '@content/balance/tower';
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
import { BANNERS, BANNER_BY_ID } from '@content/banners/index';
import type { BannerDef } from '@content/banners/types';
import { BOSSES, BOSS_BY_ID, bossTier } from '@content/bosses/index';
import type { BossDef, BossTierDef } from '@content/bosses/types';
import { GEAR_SETS, GEAR_SET_BY_ID } from '@content/sets/index';
import type { GearSetDef } from '@content/sets/types';
import { MISSIONS, MISSION_BY_ID, MISSION_CHAPTERS } from '@content/missions/index';
import type { MissionChapterDef, MissionDef } from '@content/missions/types';
import { QUESTS, QUEST_BOARDS, QUEST_BOARD_BY_PERIOD, QUEST_BY_ID } from '@content/quests/index';
import type { QuestBoardDef, QuestDef, QuestPeriod } from '@content/quests/types';
import { TITLES, TITLE_BY_ID } from '@content/titles/index';
import type { TitleDef } from '@content/titles/types';
import { TUTORIAL_CHAPTERS, TUTORIAL_STEPS, TUTORIAL_STEP_BY_ID } from '@content/tutorial/index';
import type { TutorialChapterDef, TutorialStepDef } from '@content/tutorial/types';
import type { Difficulty } from '@content/balance/battle';
import { parseStageEncounterId, stageEncounter } from '@engine/campaign/encounter';
import { bossEncounter, parseBossEncounterId } from '@engine/bosses/encounter';
import { parseTowerEncounterId, towerEncounter, towerEncounterId } from '@engine/tower/encounter';

export interface ContentRegistry {
  currencies: readonly CurrencyDef[];
  currencyById: Readonly<Record<CurrencyId, CurrencyDef>>;
  champions: readonly ChampionDef[];
  championById(id: ChampionId): ChampionDef | undefined;
  enemies: readonly EnemyDef[];
  enemyById(id: string): EnemyDef | undefined;
  /** Authored encounters only; campaign fights are derived from their stage. */
  encounters: readonly EncounterDef[];
  /** Resolves authored ids and, on demand, campaign stages, boss tiers and tower floors. */
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
  /** The Chronicle of Changes, newest first (CONTENT_AUTHORING.md §13). */
  releases: readonly ReleaseDef[];
  releaseById(id: string): ReleaseDef | undefined;
  /** The release the panel opens on; `undefined` only if nothing has shipped. */
  latestRelease: ReleaseDef | undefined;
  /** The fourteen gear sets (GEAR.md §5); two-piece sets first. */
  gearSets: readonly GearSetDef[];
  gearSetById(id: string): GearSetDef | undefined;
  /** The summoning banners (SUMMONING.md §3): the standard portal and the featured cycle. */
  banners: readonly BannerDef[];
  bannerById(id: string): BannerDef | undefined;
  /** The period bosses (BOSSES.md): Gravemaw daily, Nyxara weekly. */
  bosses: readonly BossDef[];
  bossById(id: string): BossDef | undefined;
  /** The quest boards (QUESTS_MISSIONS.md §2–§3): one a day, one a week. */
  questBoards: readonly QuestBoardDef[];
  questBoard(period: QuestPeriod): QuestBoardDef;
  /** The Chronicler's Path, in the order it is walked (`QUESTS_MISSIONS.md` §4). */
  missionChapters: readonly MissionChapterDef[];
  missions: readonly MissionDef[];
  missionById(id: string): MissionDef | undefined;
  /** Every quest either board can show, the replacements included. */
  quests: readonly QuestDef[];
  questById(id: string): QuestDef | undefined;
  bossTier(bossId: string, tierId: string): BossTierDef | undefined;
  /** The encounter a key buys on a boss tier (BOSSES.md §1). */
  bossEncounter(bossId: string, tierId: string): EncounterDef | undefined;
  /** The encounter a key buys on a tower floor (ETERNAL_TOWER.md §3). */
  towerEncounter(floor: number): EncounterDef | undefined;
  /** The tutorial script, in the order it is taught (`TUTORIAL.md`). */
  tutorialChapters: readonly TutorialChapterDef[];
  tutorialSteps: readonly TutorialStepDef[];
  tutorialStepById(id: string): TutorialStepDef | undefined;
  /** Champions a shard may pull: every definition whose `obtain` lists `summon`. */
  summonPool: readonly ChampionDef[];
}

/** Eldric is mission-only, so the pool is whoever's own definition says it can be summoned. */
const SUMMON_POOL: readonly ChampionDef[] = CHAMPIONS.filter((def) => def.obtain.includes('summon'));

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
  const tierOf = (bossId: string, tierId: string): BossTierDef | undefined => {
    const boss = BOSS_BY_ID[bossId];
    return boss ? bossTier(boss, tierId) : undefined;
  };
  const bossEncounterOf = (bossId: string, tierId: string): EncounterDef | undefined => {
    const boss = BOSS_BY_ID[bossId];
    const tier = tierOf(bossId, tierId);
    return boss && tier ? bossEncounter(boss, tier) : undefined;
  };
  /** A tower floor's encounter: derived from its number and the faction holding it. */
  const towerEncounterOf = (floor: number): EncounterDef | undefined => {
    const id = towerEncounterId(floor);
    const cached = derived.get(id);
    if (cached) return cached;
    const settlement = SETTLEMENT_BY_INDEX[towerFaction(floor)];
    const faction = settlement ? FACTION_BY_ID[settlement.faction] : undefined;
    if (!settlement || !faction) return undefined;
    const encounter = towerEncounter(floor, faction, settlement);
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
      if (stage) return stageEncounterOf(stage.stageId, stage.difficulty);
      const boss = parseBossEncounterId(id);
      if (boss) return bossEncounterOf(boss.bossId, boss.tierId);
      const floor = parseTowerEncounterId(id);
      return floor === null ? undefined : towerEncounterOf(floor);
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
    releases: RELEASES,
    releaseById: (id) => RELEASE_BY_ID[id],
    latestRelease: LATEST_RELEASE,
    gearSets: GEAR_SETS,
    gearSetById: (id) => GEAR_SET_BY_ID[id],
    banners: BANNERS,
    bannerById: (id) => BANNER_BY_ID[id],
    bosses: BOSSES,
    bossById: (id) => BOSS_BY_ID[id],
    questBoards: QUEST_BOARDS,
    questBoard: (period) => QUEST_BOARD_BY_PERIOD[period],
    missionChapters: MISSION_CHAPTERS,
    missions: MISSIONS,
    missionById: (id) => MISSION_BY_ID[id],
    quests: QUESTS,
    questById: (id) => QUEST_BY_ID[id],
    bossTier: tierOf,
    bossEncounter: bossEncounterOf,
    towerEncounter: towerEncounterOf,
    tutorialChapters: TUTORIAL_CHAPTERS,
    tutorialSteps: TUTORIAL_STEPS,
    tutorialStepById: (id) => TUTORIAL_STEP_BY_ID[id],
    summonPool: SUMMON_POOL,
  };
}

/** Module-level singleton for layers that only read content. */
export const content: ContentRegistry = buildContentRegistry();
