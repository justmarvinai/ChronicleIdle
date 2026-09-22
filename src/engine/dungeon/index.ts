/** The Dungeons' engine surface (docs/design/DUNGEONS.md): the ladder, the fights and the haul. */
export {
  dungeonEncounter,
  dungeonEncounterId,
  dungeonEnemyLevel,
  parseDungeonEncounterId,
} from './encounter';
export {
  NO_DUNGEON_PROGRESS,
  deepestLabel,
  highestOpenStage,
  isHardOpen,
  isStageOpen,
  nextStage,
  progressOf,
  recordClear,
  type ClearResult,
  type DungeonProgress,
} from './ladder';
export {
  dungeonGold,
  dungeonXp,
  rollDungeonRewards,
  type DungeonGearDrop,
  type DungeonRunInput,
  type DungeonRunRewards,
} from './rewards';
