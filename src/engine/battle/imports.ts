/**
 * Everything the battle engine takes from the content layer: balance tunables and type-only
 * shapes (CLAUDE.md §5.1). Content *data* (champions, enemies, encounters) reaches the engine
 * through the `BattleContent` lookup passed to `createBattle`.
 */
export * from '@content/balance/battle';
export {
  ELEMENT_BEATS,
  ELEMENT_STRONG_CRIT,
  ELEMENT_STRONG_DMG,
  ELEMENT_WEAK_CRIT,
  ELEMENT_WEAK_DMG,
} from '@content/balance/element';
export {
  ABILITY_SLOTS,
  BUFF_IDS,
  DEBUFF_IDS,
  STAT_IDS,
  STATUS_IDS,
  TARGET_PREFERENCES,
} from '@content/champions/types';
export type {
  AbilityAi,
  AbilityDef,
  AbilitySlot,
  AuraDef,
  BuffId,
  ChampionDef,
  ChampionId,
  ChampionStats,
  Condition,
  DamageStat,
  DebuffId,
  Effect,
  Element,
  HealStat,
  PassiveDef,
  PassiveEffect,
  PassiveTrigger,
  Rarity,
  Role,
  StatId,
  StatusId,
  Target,
  TargetPreference,
} from '@content/champions/types';
export type { EnemyDef, EnemyBossConfig } from '@content/enemies/types';
export type { EncounterDef, EncounterKind, EncounterWave } from '@content/encounters/types';
