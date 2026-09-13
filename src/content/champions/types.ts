/**
 * Champion content types (docs/design/CHAMPIONS.md §1–3, effect DSL in docs/design/BATTLE.md §6).
 * Content files are plain objects of these shapes; `@engine/schema/content` validates them at the
 * door and the battle engine (Phase 2) resolves the effects.
 */
import type { AvatarKey, ModelKey, SpellKey } from '@assets/manifest.generated';

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
export type Rarity = (typeof RARITIES)[number];

export const ELEMENTS = ['justice', 'valor', 'faith', 'eclipse'] as const;
export type Element = (typeof ELEMENTS)[number];

export const ROLES = ['attack', 'defense', 'health', 'support'] as const;
export type Role = (typeof ROLES)[number];

export const STAT_IDS = ['hp', 'atk', 'def', 'spd', 'critRate', 'critDmg', 'res', 'acc'] as const;
export type StatId = (typeof STAT_IDS)[number];
/** Authored at 6★ level 60 (CHAMPIONS.md §2); HP/ATK/DEF scale with stars and level. */
export type ChampionStats = Record<StatId, number>;

export const GEAR_SLOTS = ['weapon', 'helmet', 'shield', 'gauntlets', 'chestplate', 'boots'] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

export const ABILITY_SLOTS = ['a1', 'a2', 'a3', 'a4'] as const;
export type AbilitySlot = (typeof ABILITY_SLOTS)[number];

export const OBTAIN_SOURCES = ['summon', 'mission', 'starter', 'campaign_drop'] as const;
export type ObtainSource = (typeof OBTAIN_SOURCES)[number];

/** EA-0.1 status set (BATTLE.md §5). Buffs first, then debuffs. */
export const BUFF_IDS = [
  'atk_up',
  'def_up',
  'spd_up',
  'crit_rate_up',
  'res_up',
  'shield',
  'regen',
  'block_debuffs',
  'counter',
  'ally_protection',
  'revive_on_death',
  'veil',
] as const;
export const DEBUFF_IDS = [
  'atk_down',
  'def_down',
  'spd_down',
  'weaken',
  'poison',
  'burn',
  'bleed',
  'stun',
  'freeze',
  'sleep',
  'provoke',
  'heal_reduction',
  'block_buffs',
  'fear',
] as const;
export const STATUS_IDS = [...BUFF_IDS, ...DEBUFF_IDS] as const;
export type StatusId = (typeof STATUS_IDS)[number];
export type BuffId = (typeof BUFF_IDS)[number];
export type DebuffId = (typeof DEBUFF_IDS)[number];

export type Target =
  | 'self'
  | 'single_enemy'
  | 'all_enemies'
  | { random_enemies: number }
  | 'single_ally'
  | 'all_allies'
  | 'lowest_hp_ally'
  | 'lowest_hp_allies_2'
  | 'all_dead_allies'
  | { adjacent_to_target: number }
  | 'highest_atk_enemies_2'
  | 'provoker';

export type Condition =
  | { targetHas: StatusId }
  | { targetHasAnyDebuff: true }
  | { targetHpBelow: number }
  | { killedThisAction: true }
  | { selfHpBelow: number }
  | { alliesBelowHp: { percent: number; count: number } }
  | { alliesBelowTm: { percent: number; count: number } }
  | { enemiesAlive: { gte?: number; lte?: number } }
  | { waveStart: true }
  | { attackerElement: Element };

export type DamageStat = 'ATK' | 'DEF' | 'HP' | 'TARGET_MAX_HP';
export type HealStat = 'ATK' | 'HP' | 'CASTER_MAX_HP' | 'TARGET_MAX_HP';

/** Active effects (resolved in order by the battle engine). */
export type Effect =
  | {
      kind: 'damage';
      target: Target;
      mult: number;
      stat: DamageStat;
      hits?: number;
      /** Chance (%) that the whole hit lands a second time (Reva's Quick Cut). */
      repeatChance?: number;
      defIgnore?: number;
      critBonus?: number;
      guaranteedCritIf?: Condition;
      onKill?: Effect[];
      /** Extra hits added per kill up to `maxHits` (Vorrak's Feeding Frenzy). */
      extendOnKill?: { maxHits: number };
    }
  | { kind: 'heal'; target: Target; mult: number; stat: HealStat }
  | { kind: 'apply_status'; target: Target; status: StatusId; value?: number; turns: number; chance: number }
  | { kind: 'remove_status'; target: Target; which: 'debuffs' | 'buffs'; count: number | 'all' }
  | { kind: 'tm'; target: Target; delta: number; chance?: number }
  | { kind: 'revive'; target: Target; hpPercent: number }
  | { kind: 'extra_turn'; target: 'self'; if?: Condition }
  | { kind: 'detonate'; target: Target; status: 'poison' | 'burn' | 'bleed'; percentOfRemaining: number }
  | { kind: 'leech'; percentOfDamage: number }
  | { kind: 'conditional'; if: Condition; then: Effect[]; else?: Effect[] };

/** Passive/aura/set-bonus effects; any active effect is also allowed on a trigger. */
export type PassiveEffect =
  | { kind: 'stat_mod'; stat: StatId; percent?: number; flat?: number; if?: Condition }
  | { kind: 'damage_bonus'; value: number; scope?: 'all' | 'crit' | 'dot'; if?: Condition }
  | {
      kind: 'damage_bonus_per';
      per: 'target_debuff' | 'missing_hp_10' | 'enemy_with_def_down';
      value: number;
      max: number;
    }
  | { kind: 'crit_rate_per'; per: 'enemy_with_def_down'; value: number; max: number }
  | { kind: 'damage_reduction'; value: number; if?: Condition }
  | { kind: 'counterattack' }
  | { kind: 'survive_lethal'; hpPercent: number; oncePerBattle: true; shield?: number; healNextTurn?: number }
  | { kind: 'status_value_override'; status: StatusId; value: number }
  | { kind: 'retarget_single_attacks'; while: 'any_ally_alive' }
  | { kind: 'extra_turn_chance'; chance: number }
  | { kind: 'shield_ally_below'; hpPercent: number; shield: number; turns: number; oncePerAllyPerWave: true }
  | { kind: 'on_heal_grant'; status: StatusId; value?: number; turns: number }
  | { kind: 'on_stun_gain_tm'; delta: number }
  | Effect;

export const PASSIVE_TRIGGERS = [
  'static',
  'onTurnStart',
  'onHit',
  'onHitTaken',
  'onAllyHit',
  'onKill',
  'onDeath',
  'onWaveStart',
  'onHeal',
  'onDebuffLanded',
] as const;
export type PassiveTrigger = (typeof PASSIVE_TRIGGERS)[number];

export const UPGRADE_TYPES = ['damage', 'cooldown', 'chance', 'heal', 'duration', 'shield', 'tm'] as const;
export type UpgradeType = (typeof UPGRADE_TYPES)[number];

/** One Skill Tome step: percentages are relative (+5 % damage), `cooldown` and `duration` are turns. */
export interface AbilityUpgrade {
  type: UpgradeType;
  value: number;
}

/** Which enemy the AI should single out when an ability has a choice (BATTLE.md §7). */
export const TARGET_PREFERENCES = ['lowest_hp', 'lowest_hp_percent', 'highest_atk', 'lowest_def'] as const;
export type TargetPreference = (typeof TARGET_PREFERENCES)[number];

export interface AbilityAi {
  priority: number;
  when?: Condition;
  avoid?: Condition;
  /** Overrides the side's default target choice (enemies otherwise pick by threat). */
  prefer?: TargetPreference;
}

export interface AbilityDef {
  slot: AbilitySlot;
  id: string;
  /** i18n keys; the description may use `{dmg} {chance} {turns} {heal} {shield} {tm} {value} {cooldown} {hits}`. */
  name: string;
  description: string;
  icon: SpellKey;
  /** Turns between uses; A1 is always 0. */
  cooldown: number;
  startsOnCooldown?: boolean;
  effects: Effect[];
  upgrades: AbilityUpgrade[];
  ai: AbilityAi;
}

export interface PassiveDef {
  id: string;
  name: string;
  description: string;
  icon: SpellKey;
  trigger: PassiveTrigger;
  effects: PassiveEffect[];
  oncePerBattle?: boolean;
}

export interface AuraDef {
  id: string;
  name: string;
  description: string;
  icon: SpellKey;
  effects: PassiveEffect[];
  /** Where the aura applies; `all` by default. */
  scope?: 'all' | 'campaign' | 'boss';
}

export interface ChampionArt {
  model: ModelKey;
  avatar: AvatarKey;
  facing: 'left' | 'right';
  /** Multiply colour for placeholder art (docs/tech/ASSETS.md §3); null for finished models. */
  tint: string | null;
  /** True while the champion borrows the lizard model; cards and portraits say so. */
  placeholder: boolean;
}

/** All 23 EA-0.1 champions (CHAMPIONS.md §4). Order = index order (rarity, then name). */
export const CHAMPION_IDS = [
  'champ.gil_scrapper',
  'champ.wenna_novice',
  'champ.bran_militia',
  'champ.orla_hedge_witch',
  'champ.tobbe_pikeman',
  'champ.mire_stalker',
  'champ.sister_maelis',
  'champ.ser_corvin',
  'champ.reva_ashblade',
  'champ.anuria',
  'champ.darius',
  'champ.khazgor',
  'champ.maruan',
  'champ.rattledagger',
  'champ.sethlurias',
  'champ.thordakk',
  'champ.aurelia_dawnwarden',
  'champ.vorrak_bloodhowl',
  'champ.seraphine_vale',
  'champ.morrigan_nightweaver',
  'champ.kaelith_stormcaller',
  'champ.eldric_chronicler',
  'champ.varkos_sundered_king',
] as const;
export type ChampionId = (typeof CHAMPION_IDS)[number];

/** The Rare trio offered on a new chronicle (TUTORIAL.md step 1.2). */
export const STARTER_IDS = ['champ.sister_maelis', 'champ.ser_corvin', 'champ.reva_ashblade'] as const;
export type StarterId = (typeof STARTER_IDS)[number];

/** Champions granted alongside the starter (TUTORIAL.md step 1.5: Bran and Wenna fight, Gil waits). */
export const STARTING_COMPANION_IDS = [
  'champ.bran_militia',
  'champ.wenna_novice',
  'champ.gil_scrapper',
] as const;

export interface ChampionDef {
  id: ChampionId;
  /** i18n keys. */
  name: string;
  lore: string;
  rarity: Rarity;
  element: Element;
  role: Role;
  stats: ChampionStats;
  art: ChampionArt;
  obtain: ObtainSource[];
  abilities: AbilityDef[];
  passive?: PassiveDef;
  aura?: AuraDef;
  version: number;
}
